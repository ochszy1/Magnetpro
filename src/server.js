const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.get('/', (req, res) => {
    res.json({
        message: 'Magnet Pro Instagram Analyzer API',
        version: '1.0.0',
        endpoints: {
            analyze: 'POST /api/analyze',
            emailCapture: 'POST /api/email-capture',
            benchmarks: 'GET /api/benchmarks/:industry/:location'
        }
    });
});

// API routes
const analyzeRoutes = require('../routes/analyze');
const emailRoutes = require('../routes/email');
const benchmarkRoutes = require('../routes/benchmarks');

app.use('/api/analyze', analyzeRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/benchmarks', benchmarkRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║   MAGNET PRO BACKEND API                      ║
║   Server running on port ${PORT}                ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Ready to analyze Instagram profiles! 🚀     ║
╚═══════════════════════════════════════════════╝
    `);
});

module.exports = app;
