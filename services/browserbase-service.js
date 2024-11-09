const Browserbase = require('@browserbasehq/sdk');

class BrowserbaseService {
    constructor() {
        this.apiKey = process.env.BROWSERBASE_API_KEY;
        this.projectId = process.env.BROWSERBASE_PROJECT_ID;
        this.client = new Browserbase({ apiKey: this.apiKey });
    }

    async listRunningSessions() {
        try {
            const sessions = await this.client.sessions.list({
                status: 'RUNNING',
                projectId: this.projectId
            });
            return sessions;
        } catch (error) {
            console.error('Error listing Browserbase sessions:', error);
            throw error;
        }
    }

    async createSession() {
        try {
            const session = await this.client.sessions.create({
                projectId: this.projectId,
                keepAlive: true,
                timeout: 10800 // 3 hours in seconds timeout
            });
            return session;
        } catch (error) {
            console.error('Error creating Browserbase session:', error);
            throw error;
        }
    }

    async stopSession(sessionId) {
        try {
            await this.client.sessions.update(sessionId, {
                status: "REQUEST_RELEASE",
                projectId: this.projectId
            });
            return true;
        } catch (error) {
            console.error('Error stopping Browserbase session:', error);
            throw error;
        }
    }

    async getSession(sessionId) {
        try {
            const session = await this.client.sessions.retrieve(sessionId);
            return session;
        } catch (error) {
            console.error('Error retrieving Browserbase session:', error);
            throw error;
        }
    }

    async getSessionDebugUrls(sessionId) {
        try {
            const debugUrls = await this.client.sessions.debug(sessionId);
            return debugUrls;
        } catch (error) {
            console.error('Error retrieving session debug URLs:', error);
            throw error;
        }
    }
}

module.exports = new BrowserbaseService(); 