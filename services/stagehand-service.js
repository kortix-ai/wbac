const { Stagehand } = require('../stagehand/dist/index');

class StagehandService {
    constructor() {
        this.instances = new Map();
        this.logs = new Map();
    }

    async getOrCreateInstance(sessionId, options = {}) {
        if (this.instances.has(sessionId)) {
            return this.instances.get(sessionId);
        }

        const config = {
            env: 'BROWSERBASE',
            verbose: options.verbose || 1,
            debugDom: options.debugDom || true,
            browserbaseResumeSessionID: sessionId,
            domSettleTimeoutMs: 30000,
            enableCaching: false
        };

        const stagehand = new Stagehand(config);
        await stagehand.init({ modelName: options.modelName });

        this.logs.set(sessionId, {
            console: [],
            network: [],
            actErrors: {
                console: [],
                network: [],
                actionLogs: []
            }
        });

        await this._setupMonitoring(sessionId, stagehand, options.monitorSettings);

        this.instances.set(sessionId, stagehand);
        return stagehand;
    }

    async _setupMonitoring(sessionId, stagehand, settings = {}) {
        const sessionLogs = this.logs.get(sessionId);

        stagehand.page.on('console', message => {
            const type = message.type();
            sessionLogs.console.push({
                type,
                message: message.text(),
                path: message.location()?.url || 'unknown',
                timestamp: new Date().toISOString(),
                stackTrace: message.stackTrace?.() || null
            });
        });

        stagehand.page.on('response', async response => {
            try {
                const request = response.request();
                const networkLog = {
                    url: response.url(),
                    method: request.method(),
                    status: response.status(),
                    timestamp: new Date().toISOString(),
                    request: {
                        headers: request.headers(),
                        body: await request.postData() || null,
                        queryParams: new URL(response.url()).searchParams.toString(),
                    },
                    response: {
                        headers: response.headers(),
                        body: null
                    }
                };

                try {
                    const contentType = response.headers()['content-type'] || '';
                    if (contentType.includes('application/json')) {
                        networkLog.response.body = await response.json();
                    } else {
                        networkLog.response.body = await response.text();
                    }
                } catch (e) {
                    networkLog.response.body = 'Could not parse response body';
                }

                sessionLogs.network.push(networkLog);
            } catch (error) {
                console.error('Error logging network response:', error);
            }
        });

        stagehand.page.on('pageerror', error => {
            sessionLogs.actErrors.console.push({
                type: 'error',
                message: error.message,
                timestamp: new Date().toISOString(),
                stackTrace: error.stack
            });
        });

        stagehand.page.on('console', message => {
            if (message.type() === 'error') {
                sessionLogs.actErrors.console.push({
                    type: 'error',
                    message: message.text(),
                    timestamp: new Date().toISOString(),
                    stackTrace: message.stackTrace?.() || null
                });
            }
        });

        stagehand.page.on('requestfailed', request => {
            sessionLogs.actErrors.network.push({
                type: 'error',
                url: request.url(),
                method: request.method(),
                timestamp: new Date().toISOString(),
                errorText: request.failure()?.errorText || 'Unknown error'
            });
        });
    }

    getInstance(sessionId) {
        return this.instances.get(sessionId);
    }

    getLogs(sessionId) {
        return this.logs.get(sessionId);
    }

    async cleanupInstance(sessionId) {
        const instance = this.instances.get(sessionId);
        if (instance) {
            await instance.context.close();
            this.instances.delete(sessionId);
            this.logs.delete(sessionId);
        }
    }

    _normalizeConsoleLogFilters(filters = {}) {
        return {
            levels: {
                error: filters.levels?.error ?? true,
                warning: filters.levels?.warning ?? true,
                info: filters.levels?.info ?? true,
                trace: filters.levels?.trace ?? false
            },
            excludeStringFilters: Array.isArray(filters.excludeStringFilters) ? 
                filters.excludeStringFilters.map(f => f.toLowerCase()) : [],
            includeStringFilters: Array.isArray(filters.includeStringFilters) ? 
                filters.includeStringFilters.map(f => f.toLowerCase()) : [],
            startTime: filters.startTime ? new Date(filters.startTime) : null,
            endTime: filters.endTime ? new Date(filters.endTime) : null,
            truncateLength: filters.truncateLength || 500
        };
    }

    async getConsoleLogs(sessionId, filters = {}) {
        const logs = this.getLogs(sessionId);
        if (!logs) throw new Error('Session not initialized');

        const normalizedFilters = this._normalizeConsoleLogFilters(filters);

        return logs.console
            .filter(log => {
                if (!log) return false;

                if (normalizedFilters.startTime && new Date(log.timestamp) < normalizedFilters.startTime) return false;
                if (normalizedFilters.endTime && new Date(log.timestamp) > normalizedFilters.endTime) return false;

                const typeMatch = (
                    (log.type === 'error' && normalizedFilters.levels.error) ||
                    (log.type === 'warning' && normalizedFilters.levels.warning) ||
                    ((log.type === 'info' || log.type === 'log') && normalizedFilters.levels.info) ||
                    (log.type === 'trace' && normalizedFilters.levels.trace)
                );
                if (!typeMatch) return false;

                const searchableContent = [
                    log.message?.toLowerCase() || '',
                    log.path?.toLowerCase() || '',
                    log.type?.toLowerCase() || '',
                    log.stackTrace?.toLowerCase() || '',
                    ...(log.args || []).map(arg => String(arg).toLowerCase())
                ].join(' ');

                for (const excludeFilter of normalizedFilters.excludeStringFilters) {
                    if (searchableContent.includes(excludeFilter)) {
                        return false;
                    }
                }

                if (normalizedFilters.includeStringFilters.length > 0) {
                    return normalizedFilters.includeStringFilters.some(filter => searchableContent.includes(filter));
                }

                return true;
            })
            .map(log => this._formatConsoleLog(log, normalizedFilters));
    }

    _formatConsoleLog(log, filters) {
        const truncate = (str, length) => {
            if (!str) return str;
            if (str.length <= length) return str;
            return str.substring(0, length) + '... (truncated)';
        };

        return {
            type: log.type,
            timestamp: log.timestamp,
            message: truncate(log.message, filters.truncateLength),
            path: log.path,
            stackTrace: truncate(log.stackTrace, filters.truncateLength),
            args: log.args ? log.args.map(arg => truncate(String(arg), filters.truncateLength)) : undefined
        };
    }

    _normalizeLogFilters(filters = {}) {
        return {
            statusCodes: {
                info: filters.statusCodes?.info ?? true,
                success: filters.statusCodes?.success ?? true,
                redirect: filters.statusCodes?.redirect ?? true,
                clientError: filters.statusCodes?.clientError ?? true,
                serverError: filters.statusCodes?.serverError ?? true
            },
            includeHeaders: filters.includeHeaders ?? false,
            includeBody: filters.includeBody ?? true,
            includeQueryParams: filters.includeQueryParams ?? true,
            excludeStringFilters: Array.isArray(filters.excludeStringFilters) ? 
                filters.excludeStringFilters.map(f => f.toLowerCase()) : [],
            includeStringFilters: Array.isArray(filters.includeStringFilters) ? 
                filters.includeStringFilters.map(f => f.toLowerCase()) : [],
            startTime: filters.startTime ? new Date(filters.startTime) : null,
            endTime: filters.endTime ? new Date(filters.endTime) : null,
            truncateLength: filters.truncateLength || 5000
        };
    }

    async getNetworkLogs(sessionId, filters = {}) {
        const logs = this.getLogs(sessionId);
        if (!logs) throw new Error('Session not initialized');

        const normalizedFilters = this._normalizeLogFilters(filters);

        const filteredLogs = logs.network
            .filter(log => {
                if (!log) return false;
                
                if (normalizedFilters.startTime && new Date(log.timestamp) < normalizedFilters.startTime) return false;
                if (normalizedFilters.endTime && new Date(log.timestamp) > normalizedFilters.endTime) return false;

                const status = log.status;
                const statusMatch = (
                    (status >= 100 && status <= 199 && normalizedFilters.statusCodes.info) ||
                    (status >= 200 && status <= 299 && normalizedFilters.statusCodes.success) ||
                    (status >= 300 && status <= 399 && normalizedFilters.statusCodes.redirect) ||
                    (status >= 400 && status <= 499 && normalizedFilters.statusCodes.clientError) ||
                    (status >= 500 && status <= 599 && normalizedFilters.statusCodes.serverError)
                );

                if (!statusMatch) return false;

                const searchableContent = [
                    log.url?.toLowerCase() || '',
                    log.method?.toLowerCase() || '',
                    JSON.stringify(log.request?.headers || {}).toLowerCase(),
                    JSON.stringify(log.response?.headers || {}).toLowerCase(),
                    (log.request?.body ? String(log.request.body).toLowerCase() : ''),
                    (log.response?.body ? String(log.response.body).toLowerCase() : '')
                ].join(' ');

                for (const excludeFilter of normalizedFilters.excludeStringFilters) {
                    if (searchableContent.includes(excludeFilter)) {
                        console.log(`Excluding log with URL ${log.url} due to filter: ${excludeFilter}`);
                        return false;
                    }
                }

                if (normalizedFilters.includeStringFilters.length > 0) {
                    return normalizedFilters.includeStringFilters.some(filter => searchableContent.includes(filter));
                }

                return true;
            })
            .map(log => this._formatNetworkLog(log, normalizedFilters));

        // console.log('Filtered network logs count:', filteredLogs.length);

        return filteredLogs;
    }

    _formatNetworkLog(log, filters) {
        const truncate = (str, length) => {
            if (!str) return str;
            if (typeof str === 'object') str = JSON.stringify(str);
            if (str.length <= length) return str;
            return str.substring(0, length) + '... (truncated)';
        };

        return {
            url: log.url,
            method: log.method,
            status: log.status,
            timestamp: log.timestamp,
            request: {
                method: log.method,
                url: log.url,
                queryParams: filters.includeQueryParams ? log.request?.queryParams : undefined,
                headers: filters.includeHeaders ? log.request?.headers : undefined,
                body: filters.includeBody ? truncate(log.request?.body, filters.truncateLength) : undefined
            },
            response: {
                status: log.status,
                headers: filters.includeHeaders ? log.response?.headers : undefined,
                body: filters.includeBody ? truncate(log.response?.body, filters.truncateLength) : undefined
            }
        };
    }
}

module.exports = new StagehandService(); 