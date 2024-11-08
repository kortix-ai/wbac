const express = require('express');
const router = express.Router();
const browserbaseService = require('../services/browserbase-service');
const stagehandService = require('../services/stagehand-service');

// Create session
router.post('/create-session', async (req, res) => {
    try {
        const session = await browserbaseService.createSession();
        res.json({ success: true, sessionId: session.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stop session
router.post('/stop-session/:sessionId', async (req, res) => {
    try {
        await browserbaseService.stopSession(req.params.sessionId);
        await stagehandService.cleanupInstance(req.params.sessionId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get running sessions
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