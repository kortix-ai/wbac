const express = require('express');
const cors = require('cors');
const sessionRoutes = require('./routes/session-routes');
const browserRoutes = require('./routes/browser-routes');

const app = express();
app.use(express.json());
app.use(cors());

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
    // Cleanup logic
    process.exit();
}); 