const express = require('express');
const router = express.Router();
const browserbaseService = require('../services/browserbase-service');
const stagehandService = require('../services/stagehand-service');

/**
 * @api {post} /api/sessions/create-session Create Browser Session
 * @apiName CreateSession
 * @apiGroup Sessions
 * @apiVersion 1.0.0
 * 
 * @apiDescription Creates a new browser session in the cloud.
 * 
 * @apiParam (Request Body) {String} [region] Optional region for the browser session
 * @apiParam (Request Body) {Object} [options] Additional browser configuration options
 * 
 * @apiParamExample {json} Request Body Example:
 *     {
 *       "region": "us-east-1",
 *       "options": {
 *         "viewport": { "width": 1920, "height": 1080 },
 *         "userAgent": "Custom User Agent"
 *       }
 *     }
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {String} sessionId Unique identifier for the created session
 * 
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "sessionId": "d1e6720c-ae3b-434c-b83d-031949054f58"
 *     }
 * 
 * @apiError (Error 500) {Object} error Error object with message
 * @apiErrorExample {json} Error Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Failed to create browser session"
 *     }
 */
router.post('/create-session', async (req, res) => {
    try {
        const session = await browserbaseService.createSession();
        res.json({ success: true, sessionId: session.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @api {post} /api/sessions/stop-session/:sessionId Stop Browser Session
 * @apiName StopSession
 * @apiGroup Sessions
 * @apiVersion 1.0.0
 * 
 * @apiDescription Stops and cleans up an existing browser session.
 * 
 * @apiParam (Path) {String} sessionId Session's unique identifier
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * 
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true
 *     }
 * 
 * @apiError (Error 500) {Object} error Error object with message
 * @apiErrorExample {json} Error Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Failed to stop session"
 *     }
 */
router.post('/stop-session/:sessionId', async (req, res) => {
    try {
        await browserbaseService.stopSession(req.params.sessionId);
        await stagehandService.cleanupInstance(req.params.sessionId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @api {get} /api/sessions/running-sessions List Running Sessions
 * @apiName GetRunningSessions
 * @apiGroup Sessions
 * @apiVersion 1.0.0
 * 
 * @apiDescription Retrieves a list of all running browser sessions.
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {Object[]} sessions List of session objects
 * @apiSuccess {String} sessions.id Session's unique identifier
 * @apiSuccess {String} sessions.createdAt Session creation timestamp
 * @apiSuccess {String} sessions.region Session's geographic region
 * @apiSuccess {String} sessions.status Current session status
 * 
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "sessions": [
 *         {
 *           "id": "d1e6720c-ae3b-434c-b83d-031949054f58",
 *           "createdAt": "2024-03-20T10:30:00Z",
 *           "region": "us-east-1",
 *           "status": "running"
 *         }
 *       ]
 *     }
 * 
 * @apiError (Error 500) {Object} error Error object with message
 * @apiErrorExample {json} Error Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Failed to fetch running sessions"
 *     }
 */
router.get('/running-sessions', async (req, res) => {
    try {
        const sessions = await browserbaseService.listRunningSessions();
        res.json({ 
            success: true, 
            sessions: sessions.map(session => ({
                id: session.id,
                createdAt: session.createdAt,
                region: session.region,
                status: session.status
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 