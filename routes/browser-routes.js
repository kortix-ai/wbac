const express = require('express');
const router = express.Router();
const stagehandService = require('../services/stagehand-service');
const { z } = require('zod');

async function ensureStagehand(sessionId, options = {}) {
    return await stagehandService.getOrCreateInstance(sessionId, options);
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
 * @apiBody {String} [useVision='fallback'] Vision mode: 'always', 'never', or 'fallback'
 * @apiBody {String} [modelName] Optional AI model name to use
 * 
 * @apiSuccess {Object} result Action execution result
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
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
 * @apiBody {String} [useVision='fallback'] Vision mode: 'always', 'never', or 'fallback'
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
 * @apiQuery {Boolean} [includeErrors=true] Include error logs
 * @apiQuery {Boolean} [includeWarnings=false] Include warning logs
 * @apiQuery {Boolean} [includeInfo=false] Include info logs
 * @apiQuery {Boolean} [includeTrace=false] Include trace logs
 * @apiQuery {String} [startTime] Filter logs after this ISO timestamp
 * @apiQuery {String} [endTime] Filter logs before this ISO timestamp
 * 
 * @apiSuccess {Object[]} logs Filtered console logs
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.get('/console-logs/:sessionId', async (req, res) => {
    // ... existing console-logs implementation ...
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
 * @apiQuery {Boolean} [includeBody=false] Include request/response bodies
 * @apiQuery {String[]} [filterUrls] URLs to include (comma-separated)
 * @apiQuery {String[]} [excludeUrls] URLs to exclude (comma-separated)
 * 
 * @apiSuccess {Object[]} logs Filtered network logs
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.get('/network-logs/:sessionId', async (req, res) => {
    // ... existing network-logs implementation ...
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
    // ... existing clear-logs implementation ...
});

module.exports = router;