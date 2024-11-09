const express = require('express');
const cors = require('cors');
const sessionRoutes = require('./routes/session-routes');
const browserRoutes = require('./routes/browser-routes');

const app = express();
app.use(express.json());
app.use(cors({
    origin: /^http:\/\/localhost(:[0-9]+)?$/,
    optionsSuccessStatus: 200
}));

// Routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/browser', browserRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle shutdown
process.on('SIGINT', async () => {
    try {
        console.log('\nShutting down server...');
        
        // Get browserbase service
        const browserbaseService = require('./services/browserbase-service');
        const stagehandService = require('./services/stagehand-service');
        
        // Get all running sessions
        const sessions = await browserbaseService.listRunningSessions();
        
        // Stop each session
        if (sessions && sessions.length > 0) {
            console.log(`Cleaning up ${sessions.length} browser sessions...`);
            
            await Promise.all(sessions.map(async (session) => {
                try {
                    await browserbaseService.stopSession(session.id);
                    await stagehandService.cleanupInstance(session.id);
                    console.log(`Stopped session: ${session.id}`);
                } catch (error) {
                    console.error(`Failed to stop session ${session.id}:`, error.message);
                }
            }));
        }
        
        console.log('Cleanup complete. Exiting...');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}); 