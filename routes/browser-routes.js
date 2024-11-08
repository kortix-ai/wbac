const express = require('express');
const router = express.Router();
const stagehandService = require('../services/stagehand-service');

/**
 * @api {post} /api/browser/navigate/:sessionId Navigate Browser
 * @apiName NavigateBrowser
 * @apiGroup Browser
 * @apiVersion 1.0.0
 * 
 * @apiDescription Navigates the browser to a specified URL.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * @apiBody {String} url URL to navigate to
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {String} currentUrl Current browser URL after navigation
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.post('/navigate/:sessionId', async (req, res) => {
    try {
        const { url } = req.body;
        await stagehandService.navigate(req.params.sessionId, url);
        res.json({ success: true, currentUrl: url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @api {post} /api/browser/act/:sessionId Perform Browser Action
 * @apiName PerformAction
 * @apiGroup Browser
 * @apiVersion 1.0.0
 * 
 * @apiDescription Performs a natural language action in the browser.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * @apiBody {String} action Natural language action to perform
 * @apiBody {Object} options Additional action options
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {Object} result Action result details
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.post('/act/:sessionId', async (req, res) => {
    try {
        const { action, options } = req.body;
        const result = await stagehandService.performAction(req.params.sessionId, action, options);
        res.json({ success: true, result });
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
 * @apiDescription Extracts structured data from the current page.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * @apiBody {Object} schema Data extraction schema
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {Object} data Extracted structured data
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.post('/extract/:sessionId', async (req, res) => {
    try {
        const { schema } = req.body;
        const data = await stagehandService.extractData(req.params.sessionId, schema);
        res.json({ success: true, data });
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
 * @apiDescription Gets possible actions and page state observations.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {Object} observations Page observations
 * @apiSuccess {String[]} possibleActions List of possible actions
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.post('/observe/:sessionId', async (req, res) => {
    try {
        const observations = await stagehandService.observePage(req.params.sessionId);
        res.json({ 
            success: true, 
            observations: observations.pageState,
            possibleActions: observations.actions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;