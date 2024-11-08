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
}

module.exports = new StagehandService(); 