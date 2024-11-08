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
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * @apiSuccess {String} sessionId Unique identifier for the created session
 * 
 * @apiError (Error 500) {Object} error Error object with message
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
 * @apiParam {String} sessionId Session's unique identifier
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * 
 * @apiError (Error 500) {Object} error Error object with message
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
 * 
 * @apiError (Error 500) {Object} error Error object with message
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