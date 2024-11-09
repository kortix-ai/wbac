const express = require('express');
const router = express.Router();
const stagehandService = require('../services/stagehand-service');
const { z } = require('zod');

// Helper function to ensure Stagehand instance exists
async function ensureStagehand(sessionId, options = {}) {
    try {
        return await stagehandService.getOrCreateInstance(sessionId, options);
    } catch (error) {
        throw new Error(`Failed to initialize browser session: ${error.message}`);
    }
}

/**
 * @api {post} /api/browser/navigate/:sessionId Navigate Browser
 * @apiName NavigateBrowser
 * @apiGroup Browser
 * @apiVersion 1.0.0
 * 
 * @apiDescription Navigates the browser to a specified URL with network idle waiting.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * @apiBody {String} url URL to navigate to
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {String} url Current browser URL after navigation
 * 
 * @apiError (Error 400) {Object} error URL is required
 * @apiError (Error 500) {Object} error Error object with message and optional stack trace
 */
router.post('/navigate/:sessionId', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ 
                success: false,
                error: 'URL is required for navigation'
            });
        }

        const stagehand = await ensureStagehand(req.params.sessionId);
        if (!stagehand?.page) {
            return res.status(500).json({
                success: false,
                error: 'Browser page not initialized'
            });
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
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * @api {post} /api/browser/act/:sessionId Perform Browser Action
 * @apiName PerformAction
 * @apiGroup Browser
 * @apiVersion 1.0.0
 * 
 * @apiDescription Performs a natural language action in the browser with optional vision capabilities.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * @apiBody {String} action Natural language action to perform
 * @apiBody {String} [useVision='fallback'] Vision mode: 'fallback'
 * @apiBody {String} [modelName] Optional AI model name to use
 * @apiBody {Boolean} [includeLogs] Include logs from the action execution
 * @apiBody {Object} [logFilters] Filters for included logs
 * @apiBody {Object} [logFilters.console] Console log filters
 * @apiBody {Boolean} [logFilters.console.includeErrors=true] Include error logs
 * @apiBody {Boolean} [logFilters.console.includeWarnings=false] Include warning logs
 * @apiBody {Boolean} [logFilters.console.includeInfo=false] Include info logs
 * @apiBody {Boolean} [logFilters.console.includeTrace=false] Include trace logs
 * @apiBody {String[]} [logFilters.console.includeStringFilters] Strings to include in console logs
 * @apiBody {String[]} [logFilters.console.excludeStringFilters] Strings to exclude from console logs
 * @apiBody {Number} [logFilters.console.truncateLength=500] Maximum length for console messages
 * @apiBody {Object} [logFilters.network] Network log filters
 * @apiBody {Object} [logFilters.network.statusCodes] Status code filters
 * @apiBody {Boolean} [logFilters.network.statusCodes.info=true] Include 1xx responses
 * @apiBody {Boolean} [logFilters.network.statusCodes.success=true] Include 2xx responses
 * @apiBody {Boolean} [logFilters.network.statusCodes.redirect=true] Include 3xx responses
 * @apiBody {Boolean} [logFilters.network.statusCodes.clientError=true] Include 4xx responses
 * @apiBody {Boolean} [logFilters.network.statusCodes.serverError=true] Include 5xx responses
 * @apiBody {Boolean} [logFilters.network.includeHeaders=false] Include headers
 * @apiBody {Boolean} [logFilters.network.includeBody=true] Include bodies
 * @apiBody {Boolean} [logFilters.network.includeQueryParams=true] Include query parameters
 * @apiBody {String[]} [logFilters.network.includeStringFilters] Strings to include in network logs
 * @apiBody {String[]} [logFilters.network.excludeStringFilters] Strings to exclude from network logs
 * @apiBody {Number} [logFilters.network.truncateLength=500] Maximum length for bodies
 * 
 * @apiSuccess {Object} result Action execution result
 * @apiSuccess {Object} [logs] Filtered logs if requested
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.post('/act/:sessionId', async (req, res) => {
    try {
        const { action, useVision, modelName, includeLogs, logFilters } = req.body;
        
        if (!action) {
            return res.status(400).json({
                success: false,
                error: 'Action instruction is required'
            });
        }

        const stagehand = await ensureStagehand(req.params.sessionId, { modelName });
        if (!stagehand) {
            return res.status(500).json({
                success: false,
                error: 'Failed to initialize browser session'
            });
        }

        const actionStartTime = new Date().toISOString();

        const result = await stagehand.act({ 
            action,
            useVision: useVision || 'fallback',
            modelName
        });

        let logs = null;
        if (includeLogs) {
            const [consoleLogs, networkLogs] = await Promise.all([
                stagehandService.getConsoleLogs(req.params.sessionId, {
                    levels: {
                        error: logFilters?.console?.levels?.error ?? true,
                        warning: logFilters?.console?.levels?.warning ?? true,
                        info: logFilters?.console?.levels?.info ?? true,
                        trace: logFilters?.console?.levels?.trace ?? false
                    },
                    includeStringFilters: logFilters?.console?.includeStringFilters,
                    excludeStringFilters: logFilters?.console?.excludeStringFilters,
                    startTime: actionStartTime,
                    truncateLength: logFilters?.console?.truncateLength
                }),
                stagehandService.getNetworkLogs(req.params.sessionId, {
                    statusCodes: logFilters?.network?.statusCodes,
                    includeHeaders: logFilters?.network?.includeHeaders,
                    includeBody: logFilters?.network?.includeBody,
                    includeQueryParams: logFilters?.network?.includeQueryParams,
                    includeStringFilters: logFilters?.network?.includeStringFilters,
                    excludeStringFilters: logFilters?.network?.excludeStringFilters,
                    startTime: actionStartTime,
                    truncateLength: logFilters?.network?.truncateLength
                })
            ]);

            logs = { console: consoleLogs, network: networkLogs };
        }

        res.json({
            success: true,
            result,
            ...(includeLogs && { logs })
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * @api {post} /api/browser/extract/:sessionId Extract Data
 * @apiName ExtractData
 * @apiGroup Browser
 * @apiVersion 1.0.0
 * 
 * @apiDescription Extracts structured data from the current page using a Zod schema.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * @apiBody {String} instruction Natural language instruction for extraction
 * @apiBody {Object} schema Zod schema definition
 * @apiBody {String} [modelName] Optional AI model name to use
 * 
 * @apiSuccess {Object} result Extracted data matching schema
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
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

/**
 * @api {post} /api/browser/observe/:sessionId Observe Page
 * @apiName ObservePage
 * @apiGroup Browser
 * @apiVersion 1.0.0
 * 
 * @apiDescription Analyzes the page and returns possible actions based on content.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * @apiBody {String} [instruction] Optional instruction to guide observation
 * @apiBody {String} [useVision='fallback'] Vision mode: 'fallback'
 * @apiBody {String} [modelName] Optional AI model name to use
 * 
 * @apiSuccess {Object} actions List of possible actions and observations
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
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


/**
 * @api {post} /api/browser/screenshot/:sessionId Take Screenshot
 * @apiName TakeScreenshot
 * @apiGroup Browser
 * @apiVersion 1.0.0
 * 
 * @apiDescription Captures a screenshot of the current page state.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * 
 * @apiSuccess {Binary} image JPEG image data
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
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

/**
 * @api {get} /api/browser/dom-state/:sessionId Get DOM State
 * @apiName GetDOMState
 * @apiGroup Browser
 * @apiVersion 1.0.0
 * 
 * @apiDescription Retrieves the current DOM state as HTML.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * 
 * @apiSuccess {Object} state Current page HTML
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.get('/dom-state/:sessionId', async (req, res) => {
    try {
        const stagehand = await ensureStagehand(req.params.sessionId);
        const state = await stagehand.page.evaluate(() => document.documentElement.outerHTML);
        res.json({ state });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @api {get} /api/browser/console-logs/:sessionId Get Console Logs
 * @apiName GetConsoleLogs
 * @apiGroup Browser
 * @apiVersion 1.0.0
 * 
 * @apiDescription Retrieves filtered console logs from the browser session.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * @apiQuery {Boolean} [levels.error=true] Include error logs
 * @apiQuery {Boolean} [levels.warning=true] Include warning logs
 * @apiQuery {Boolean} [levels.info=true] Include info logs
 * @apiQuery {Boolean} [levels.trace=false] Include trace logs
 * @apiQuery {String[]} [includeStringFilters] Array of strings to include (matches message, path, type)
 * @apiQuery {String[]} [excludeStringFilters] Array of strings to exclude (matches message, path, type)
 * @apiQuery {String} [startTime] Filter logs after this ISO timestamp
 * @apiQuery {String} [endTime] Filter logs before this ISO timestamp
 * @apiQuery {Number} [truncateLength=500] Maximum length for log messages before truncation
 * 
 * @apiSuccess {Object[]} logs Filtered console logs
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.get('/console-logs/:sessionId', async (req, res) => {
    try {
        const stagehand = await ensureStagehand(req.params.sessionId);
        const logs = await stagehandService.getConsoleLogs(req.params.sessionId, {
            levels: {
                error: req.query.error !== 'false',
                warning: req.query.warning !== 'false',
                info: req.query.info !== 'false',
                trace: req.query.trace === 'true'
            },
            includeStringFilters: req.query.includeStringFilters,
            excludeStringFilters: req.query.excludeStringFilters,
            startTime: req.query.startTime,
            endTime: req.query.endTime,
            truncateLength: req.query.truncateLength ? parseInt(req.query.truncateLength) : undefined
        });
        res.json({ success: true, logs });
    } catch (error) {
        console.error('Error getting console logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @api {get} /api/browser/network-logs/:sessionId Get Network Logs
 * @apiName GetNetworkLogs
 * @apiGroup Browser
 * @apiVersion 1.0.0
 * 
 * @apiDescription Retrieves filtered network request/response logs.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * @apiQuery {Boolean} [includeHeaders=false] Include request/response headers
 * @apiQuery {Boolean} [includeBody=true] Include request/response bodies
 * @apiQuery {Boolean} [includeInfo=true] Include informational responses (100-199)
 * @apiQuery {Boolean} [includeSuccess=true] Include successful responses (200-299)
 * @apiQuery {Boolean} [includeRedirect=true] Include redirection responses (300-399)
 * @apiQuery {Boolean} [includeClientError=true] Include client error responses (400-499)
 * @apiQuery {Boolean} [includeServerError=true] Include server error responses (500-599)
 * @apiQuery {String[]} [includeStringFilters] Array of strings to include (matches URL, method, or headers)
 * @apiQuery {String[]} [excludeStringFilters] Array of strings to exclude (matches URL, method, or headers)
 * @apiQuery {String} [startTime] Filter logs after this ISO timestamp
 * @apiQuery {String} [endTime] Filter logs before this ISO timestamp
 * @apiQuery {Number} [truncateLength=500] Maximum length for request/response bodies before truncation
 * 
 * @apiSuccess {Object[]} logs Filtered network logs
 */
router.get('/network-logs/:sessionId', async (req, res) => {
    try {
        const stagehand = await ensureStagehand(req.params.sessionId);
        const logs = await stagehandService.getNetworkLogs(req.params.sessionId, {
            statusCodes: {
                info: req.query.includeInfo !== 'false',
                success: req.query.includeSuccess !== 'false',
                redirect: req.query.includeRedirect !== 'false',
                clientError: req.query.includeClientError !== 'false',
                serverError: req.query.includeServerError !== 'false'
            },
            includeHeaders: req.query.includeHeaders === 'true',
            includeBody: req.query.includeBody !== 'false',
            includeQueryParams: req.query.includeQueryParams !== 'false',
            includeStringFilters: req.query.includeStringFilters,
            excludeStringFilters: req.query.excludeStringFilters,
            startTime: req.query.startTime,
            endTime: req.query.endTime,
            truncateLength: req.query.truncateLength ? parseInt(req.query.truncateLength) : undefined
        });
        
        res.json({ success: true, logs });
    } catch (error) {
        console.error('Error getting network logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @api {post} /api/browser/clear-logs/:sessionId Clear Logs
 * @apiName ClearLogs
 * @apiGroup Browser
 * @apiVersion 1.0.0
 * 
 * @apiDescription Clears all logs for the specified session.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * 
 * @apiSuccess {Boolean} success Operation success status
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
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