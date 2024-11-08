const express = require('express');
const router = express.Router();
const stagehandService = require('../services/stagehand-service');
const { z } = require('zod');

// Helper function to ensure Stagehand instance exists
async function ensureStagehand(sessionId, options = {}) {
    return await stagehandService.getOrCreateInstance(sessionId, options);
}


router.post('/navigate/:sessionId', async (req, res) => {
    try {
        const stagehand = await ensureStagehand(req.params.sessionId);
        const { url } = req.body;
        if (!url) {
            throw new Error('URL is required for navigation');
        }

        await stagehand.page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        res.json({ 
            success: true,
            url: url,
        });
    } catch (error) {
        console.error('Navigation error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

router.post('/act/:sessionId', async (req, res) => {
    try {
        const { action, useVision, modelName } = req.body;
        const stagehand = await ensureStagehand(req.params.sessionId, { modelName });

        const result = await stagehand.act({ 
            action,
            useVision: useVision || 'fallback',
            modelName
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/extract/:sessionId', async (req, res) => {
    try {
        const { instruction, schema, modelName } = req.body;
        const stagehand = await ensureStagehand(req.params.sessionId, { modelName });

        const result = await stagehand.extract({
            instruction,
            schema: z.object(schema),
            modelName
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/observe/:sessionId', async (req, res) => {
    try {
        const { instruction, useVision, modelName } = req.body;
        const stagehand = await ensureStagehand(req.params.sessionId, { modelName });

        const actions = await stagehand.observe({ 
            instruction,
            useVision: useVision || 'fallback',
            modelName 
        });

        res.json(actions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/screenshot/:sessionId', async (req, res) => {
    try {
        const stagehand = await ensureStagehand(req.params.sessionId);
        const screenshot = await stagehand.page.screenshot({
            type: 'jpeg',
            quality: 80
        });

        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': screenshot.length
        });
        res.end(screenshot);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/dom-state/:sessionId', async (req, res) => {
    try {
        const stagehand = await ensureStagehand(req.params.sessionId);
        const state = await stagehand.page.evaluate(() => document.documentElement.outerHTML);
        res.json({ state });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/console-logs/:sessionId', async (req, res) => {
    try {
        const stagehand = await ensureStagehand(req.params.sessionId);
        const logs = stagehandService.getLogs(req.params.sessionId);
        if (!logs) throw new Error('Session not initialized');

        // Default to showing errors if no filters specified
        const filters = {
            includeErrors: req.query.includeErrors !== 'false',
            includeWarnings: req.query.includeWarnings === 'true',
            includeInfo: req.query.includeInfo === 'true',
            includeTrace: req.query.includeTrace === 'true',
            startTime: req.query.startTime ? new Date(req.query.startTime) : null,
            endTime: req.query.endTime ? new Date(req.query.endTime) : null
        };

        const filteredLogs = logs.console.filter(log => {
            if (filters.startTime && new Date(log.timestamp) < filters.startTime) return false;
            if (filters.endTime && new Date(log.timestamp) > filters.endTime) return false;
            
            return (
                (log.type === 'error' && filters.includeErrors) ||
                (log.type === 'warning' && filters.includeWarnings) ||
                (log.type === 'info' && filters.includeInfo) ||
                (log.type === 'log' && filters.includeInfo) ||
                (log.type === 'trace' && filters.includeTrace)
            );
        });

        res.json({ logs: filteredLogs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/network-logs/:sessionId', async (req, res) => {
    try {
        const stagehand = await ensureStagehand(req.params.sessionId);
        const logs = stagehandService.getLogs(req.params.sessionId);
        if (!logs) throw new Error('Session not initialized');

        // Default to showing all status codes if none specified
        const filters = {
            statusCodes: {
                info: req.query.includeInfo !== 'false',
                success: req.query.includeSuccess !== 'false',
                redirect: req.query.includeRedirect !== 'false',
                clientError: req.query.includeClientError !== 'false',
                serverError: req.query.includeServerError !== 'false'
            },
            includeHeaders: req.query.includeHeaders === 'true',
            includeBody: req.query.includeBody === 'true',
            includeQueryParams: req.query.includeQueryParams === 'true',
            filterUrls: req.query.filterUrls ? req.query.filterUrls.split(',') : [],
            excludeUrls: req.query.excludeUrls ? req.query.excludeUrls.split(',') : [],
            startTime: req.query.startTime ? new Date(req.query.startTime) : null,
            endTime: req.query.endTime ? new Date(req.query.endTime) : null
        };

        const filteredLogs = logs.network
            .filter(log => {
                if (filters.startTime && new Date(log.timestamp) < filters.startTime) return false;
                if (filters.endTime && new Date(log.timestamp) > filters.endTime) return false;

                const status = log.status;
                const statusMatch = (
                    (status >= 100 && status <= 199 && filters.statusCodes.info) ||
                    (status >= 200 && status <= 299 && filters.statusCodes.success) ||
                    (status >= 300 && status <= 399 && filters.statusCodes.redirect) ||
                    (status >= 400 && status <= 499 && filters.statusCodes.clientError) ||
                    (status >= 500 && status <= 599 && filters.statusCodes.serverError)
                );

                if (!statusMatch) return false;

                if (filters.filterUrls.length > 0 && !filters.filterUrls.some(pattern => log.url.includes(pattern))) {
                    return false;
                }

                if (filters.excludeUrls.some(pattern => log.url.includes(pattern))) {
                    return false;
                }

                return true;
            })
            .map(log => {
                const filteredLog = {
                    url: log.url,
                    method: log.method,
                    status: log.status,
                    timestamp: log.timestamp
                };

                if (filters.includeHeaders) {
                    filteredLog.request = { ...filteredLog.request, headers: log.request.headers };
                    filteredLog.response = { ...filteredLog.response, headers: log.response.headers };
                }
                if (filters.includeBody) {
                    filteredLog.request = { ...filteredLog.request, body: log.request.body };
                    filteredLog.response = { ...filteredLog.response, body: log.response.body };
                }
                if (filters.includeQueryParams) {
                    filteredLog.request = { ...filteredLog.request, queryParams: log.request.queryParams };
                }

                return filteredLog;
            });

        res.json({ logs: filteredLogs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/clear-logs/:sessionId', (req, res) => {
    try {
        const logs = stagehandService.getLogs(req.params.sessionId);
        if (!logs) throw new Error('Session not initialized');

        logs.console = [];
        logs.network = [];
        logs.actErrors = { console: [], network: [], actionLogs: [] };

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 