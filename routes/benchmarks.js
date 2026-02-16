const express = require('express');
const router = express.Router();
const { getBenchmarks } = require('../services/benchmark');

/**
 * GET /api/benchmarks/:industry/:location
 * Get benchmark data for industry/location
 */
router.get('/:industry/:location', async (req, res) => {
    try {
        const { industry, location } = req.params;

        const benchmarks = await getBenchmarks(industry, location, null, null);

        res.json({
            success: true,
            benchmarks: {
                industry,
                location,
                avgFollowers: Math.round(benchmarks.avg_followers),
                avgEngagement: parseFloat(benchmarks.avg_engagement).toFixed(1),
                avgPostFrequency: parseFloat(benchmarks.avg_post_frequency).toFixed(1),
                sampleSize: benchmarks.sample_size || 100
            }
        });

    } catch (error) {
        console.error('Benchmarks error:', error);
        res.status(500).json({
            error: 'Failed to fetch benchmarks'
        });
    }
});

module.exports = router;
