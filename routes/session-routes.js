const express = require('express');
const router = express.Router();
const browserbaseService = require('../services/browserbase-service');
const stagehandService = require('../services/stagehand-service');
const sessionExpiryManager = require('../services/session-expiry-service');

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
        if (!session?.id) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create browser session'
            });
        }

        await sessionExpiryManager.trackSession(session.id);

        res.json({ 
            success: true, 
            sessionId: session.id 
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
        const { sessionId } = req.params;
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID is required'
            });
        }

        const session = await browserbaseService.getSession(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: `Session ${sessionId} not found`
            });
        }

        await browserbaseService.stopSession(sessionId);
        await stagehandService.cleanupInstance(sessionId);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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

/**
 * @api {get} /api/sessions/session/:sessionId Get Session Details
 * @apiName GetSession
 * @apiGroup Sessions
 * @apiVersion 1.0.0
 * 
 * @apiDescription Retrieves details for a specific Browserbase session.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * 
 * @apiSuccess {Object} session Session details
 * @apiSuccess {Boolean} success Operation success status
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.get('/session/:sessionId', async (req, res) => {
    try {
        const session = await browserbaseService.getSession(req.params.sessionId);
        res.json({
            success: true,
            session
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @api {get} /api/sessions/debug/:sessionId Get Session Debug URLs
 * @apiName GetSessionDebugUrls
 * @apiGroup Sessions
 * @apiVersion 1.0.0
 * 
 * @apiDescription Retrieves debug URLs for a specific Browserbase session.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * 
 * @apiSuccess {Object} debugUrls Debug URLs object containing debuggerUrl, debuggerFullscreenUrl, wsUrl, and pages
 * @apiSuccess {Boolean} success Operation success status
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.get('/debug/:sessionId', async (req, res) => {
    try {
        const debugUrls = await browserbaseService.getSessionDebugUrls(req.params.sessionId);
        res.json({
            success: true,
            debugUrls
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
 * @api {post} /api/sessions/reset-expiry/:sessionId Reset Session Expiry
 * @apiName ResetSessionExpiry
 * @apiGroup Sessions
 * @apiVersion 1.0.0
 * 
 * @apiDescription Resets the expiry timer for a specific Browserbase session.
 * 
 * @apiParam {String} sessionId Session's unique identifier
 * 
 * @apiSuccess {Boolean} success Indicates if operation was successful
 * 
 * @apiError (Error 500) {Object} error Error object with message
 */
router.post('/reset-expiry/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const isActive = await sessionExpiryManager.trackSession(sessionId);
        if (!isActive) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or not running'
            });
        }

        sessionExpiryManager.resetExpiry(sessionId);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router; 