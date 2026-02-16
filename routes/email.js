const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * POST /api/email
 * Capture email lead
 */
router.post('/capture', async (req, res) => {
    try {
        const {
            email,
            username,
            industry,
            locationCity,
            locationState,
            locationCountry,
            overallScore,
            followers,
            engagementRate,
            cityRank,
            stateRank,
            nationalRank,
            results,
            utm
        } = req.body;

        // Validation
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                error: 'Valid email address required'
            });
        }

        console.log(`📧 Capturing email lead: ${email} (${username})`);

        // Save to database
        const saved = await db.query(`
            INSERT INTO email_captures (
                email, username, industry,
                location_city, location_state, location_country,
                overall_score, followers, engagement_rate,
                city_rank, state_rank, national_rank,
                results,
                utm_source, utm_medium, utm_campaign,
                captured_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
            RETURNING *
        `, [
            email, username, industry,
            locationCity, locationState, locationCountry,
            overallScore, followers, engagementRate,
            cityRank, stateRank, nationalRank,
            JSON.stringify(results || {}),
            utm?.source, utm?.medium, utm?.campaign
        ]);

        console.log(`✓ Email captured: ${email}`);

        // TODO: Trigger email sequence (SendGrid/Mailchimp)
        // TODO: Add to Magnet Pro drip campaign

        res.json({
            success: true,
            message: 'Email captured successfully',
            leadId: saved.rows[0].id
        });

    } catch (error) {
        console.error('Email capture error:', error);
        res.status(500).json({
            error: 'Failed to capture email',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/email/stats
 * Get email capture statistics (admin only)
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                COUNT(*) as total_captures,
                COUNT(DISTINCT email) as unique_emails,
                COUNT(CASE WHEN converted_to_magnet_pro = true THEN 1 END) as conversions,
                ROUND(
                    COUNT(CASE WHEN converted_to_magnet_pro = true THEN 1 END)::numeric /
                    NULLIF(COUNT(*)::numeric, 0) * 100,
                    2
                ) as conversion_rate,
                COUNT(CASE WHEN captured_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
                COUNT(CASE WHEN captured_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days
            FROM email_captures
        `);

        res.json({
            success: true,
            stats: stats.rows[0]
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
