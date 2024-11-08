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
 * @apiParam (Path) {String} sessionId Session's unique identifier
 * @apiParam (Request Body) {String} url URL to navigate to
 * 
 * @apiParamExample {json} Request Body Example:
 *     {
 *       "url": "https://example.com"
 *     }
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {String} currentUrl Current browser URL after navigation
 * 
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "currentUrl": "https://example.com"
 *     }
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
 * @apiParam (Path) {String} sessionId Session's unique identifier
 * @apiParam (Request Body) {String} action Natural language action to perform
 * @apiParam (Request Body) {Object} [options] Additional action options
 * 
 * @apiParamExample {json} Request Body Example:
 *     {
 *       "action": "Click the submit button",
 *       "options": {
 *         "timeout": 5000,
 *         "force": false
 *       }
 *     }
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {Object} result Action result details
 * 
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "result": {
 *         "action": "click",
 *         "target": "Submit button",
 *         "status": "completed"
 *       }
 *     }
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
 * @apiParam (Path) {String} sessionId Session's unique identifier
 * @apiParam (Request Body) {Object} schema Data extraction schema
 * 
 * @apiParamExample {json} Request Body Example:
 *     {
 *       "schema": {
 *         "title": "h1",
 *         "items": ".item-list li"
 *       }
 *     }
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {Object} data Extracted structured data
 * 
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": {
 *         "title": "Page Title",
 *         "items": ["item1", "item2"]
 *       }
 *     }
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
 * @apiParam (Path) {String} sessionId Session's unique identifier
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {Object} observations Page observations
 * @apiSuccess {String[]} possibleActions List of possible actions
 * 
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "observations": {
 *         "title": "Current Page",
 *         "clickableElements": ["button1", "link2"]
 *       },
 *       "possibleActions": [
 *         "Click Submit button",
 *         "Fill login form"
 *       ]
 *     }
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