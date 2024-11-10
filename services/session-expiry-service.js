const browserbaseService = require('./browserbase-service');
const stagehandService = require('./stagehand-service');

class SessionExpiryManager {
    constructor() {
        this.expiryTasks = new Map(); // sessionId -> timeout handle
        this.EXPIRY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
    }

    async trackSession(sessionId) {
        try {
            // Cancel existing expiry task if any
            this.resetExpiry(sessionId);

            // Verify session is running
            const session = await browserbaseService.getSession(sessionId);
            if (!session || session.status !== 'RUNNING') {
                console.warn(`Session ${sessionId} is not running (status: ${session?.status})`);
                return false;
            }

            return true;
        } catch (error) {
            console.error(`Error tracking session ${sessionId}:`, error);
            return false;
        }
    }

    resetExpiry(sessionId) {
        // Clear existing timeout if any
        if (this.expiryTasks.has(sessionId)) {
            clearTimeout(this.expiryTasks.get(sessionId));
        }

        // Set new expiry timeout
        const timeoutHandle = setTimeout(async () => {
            await this.stopSession(sessionId);
        }, this.EXPIRY_TIMEOUT);

        this.expiryTasks.set(sessionId, timeoutHandle);
    }

    async stopSession(sessionId) {
        try {
            console.log(`Session ${sessionId} expired, stopping...`);
            
            // Stop the session
            await browserbaseService.stopSession(sessionId);
            await stagehandService.cleanupInstance(sessionId);
            
            // Clean up expiry task
            if (this.expiryTasks.has(sessionId)) {
                clearTimeout(this.expiryTasks.get(sessionId));
                this.expiryTasks.delete(sessionId);
            }

            console.log(`Session ${sessionId} stopped successfully`);
        } catch (error) {
            console.error(`Error stopping session ${sessionId}:`, error);
        }
    }

    async stopAllSessions() {
        try {
            const sessions = await browserbaseService.listRunningSessions();
            
            if (sessions && sessions.length > 0) {
                console.log(`Stopping ${sessions.length} expired sessions...`);
                
                await Promise.all(sessions.map(session => this.stopSession(session.id)));
            }
        } catch (error) {
            console.error('Error stopping all sessions:', error);
        }
    }
}

// Create singleton instance
const sessionExpiryManager = new SessionExpiryManager();
module.exports = sessionExpiryManager; 