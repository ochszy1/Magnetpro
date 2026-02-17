const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { scrapeInstagramProfile } = require('../services/apify');
const { getBenchmarks, calculateRankings, calculateOverallScore, calculatePercentile } = require('../services/benchmark');

/**
 * POST /api/analyze
 * Analyze an Instagram account
 */
router.post('/', async (req, res) => {
    try {
        const { username, industry, locationCity, locationState, locationCountry } = req.body;

        // Validation
        if (!username || !industry) {
            return res.status(400).json({
                error: 'Missing required fields: username, industry'
            });
        }

        console.log(`\n📊 Analyzing @${username} (${industry}) in ${locationCity || 'unknown location'}`);

        // Check if profile exists and is fresh (< 7 days old)
        const existingProfile = await db.query(`
            SELECT *
            FROM profiles
            WHERE username = $1
            AND last_scraped > NOW() - INTERVAL '7 days'
        `, [username]);

        let profile;

        if (existingProfile.rows.length > 0) {
            console.log(`✓ Using cached profile for @${username}`);
            profile = existingProfile.rows[0];
        } else {
            console.log(`Scraping fresh data for @${username}...`);
            // Scrape profile from Instagram via Apify
            const scrapedData = await scrapeInstagramProfile(username);

            // Save or update in database
            const saved = await db.query(`
                INSERT INTO profiles (
                    username, full_name, profile_pic_url,
                    followers, following, posts,
                    engagement_rate, avg_likes, avg_comments, avg_views,
                    verified, biography, external_url, business_category,
                    industry, location_city, location_state, location_country,
                    post_frequency, reel_percentage,
                    last_scraped, scrape_count
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), 1)
                ON CONFLICT (username)
                DO UPDATE SET
                    full_name = $2,
                    profile_pic_url = $3,
                    followers = $4,
                    following = $5,
                    posts = $6,
                    engagement_rate = $7,
                    avg_likes = $8,
                    avg_comments = $9,
                    avg_views = $10,
                    verified = $11,
                    biography = $12,
                    external_url = $13,
                    business_category = $14,
                    industry = $15,
                    location_city = $16,
                    location_state = $17,
                    location_country = $18,
                    post_frequency = $19,
                    reel_percentage = $20,
                    last_scraped = NOW(),
                    scrape_count = profiles.scrape_count + 1,
                    updated_at = NOW()
                RETURNING *
            `, [
                username, scrapedData.full_name, scrapedData.profile_pic_url,
                scrapedData.followers, scrapedData.following, scrapedData.posts,
                scrapedData.engagement_rate, scrapedData.avg_likes, scrapedData.avg_comments, scrapedData.avg_views,
                scrapedData.verified, scrapedData.biography, scrapedData.external_url, scrapedData.business_category,
                industry, locationCity, locationState, locationCountry,
                scrapedData.post_frequency, scrapedData.reel_percentage
            ]);

            profile = saved.rows[0];
        }

        // Get benchmarks for industry/location
        const benchmarks = await getBenchmarks(industry, locationCity, locationState, locationCountry);

        // Calculate rankings
        const rankings = await calculateRankings(
            username,
            industry,
            locationCity,
            locationState,
            locationCountry
        );

        // Calculate percentiles
        const followerPercentile = calculatePercentile(
            profile.followers,
            benchmarks.follower_distribution || []
        );

        const engagementPercentile = calculatePercentile(
            parseFloat(profile.engagement_rate),
            benchmarks.engagement_distribution || []
        );

        // Calculate overall score
        const overallScore = calculateOverallScore(profile, benchmarks);

        // Build response
        const response = {
            success: true,
            profile: {
                username: profile.username,
                fullName: profile.full_name,
                profilePicUrl: profile.profile_pic_url,
                followers: parseInt(profile.followers),
                following: parseInt(profile.following),
                posts: parseInt(profile.posts),
                engagementRate: parseFloat(profile.engagement_rate),
                avgLikes: parseInt(profile.avg_likes),
                avgComments: parseInt(profile.avg_comments),
                verified: profile.verified,
                biography: profile.biography,
                externalUrl: profile.external_url,
                postFrequency: parseFloat(profile.post_frequency || 0),
                reelPercentage: parseInt(profile.reel_percentage || 0)
            },
            score: {
                overall: overallScore,
                followerPercentile: followerPercentile,
                engagementPercentile: engagementPercentile
            },
            benchmarks: {
                industry: industry,
                location: locationCity,
                avgFollowers: Math.round(benchmarks.avg_followers),
                avgEngagement: parseFloat(benchmarks.avg_engagement).toFixed(1),
                avgPostFrequency: parseFloat(benchmarks.avg_post_frequency).toFixed(1),
                sampleSize: benchmarks.sample_size || 100
            },
            rankings: rankings,
            insights: generateInsights(profile, benchmarks, overallScore),
            scrapedAt: profile.last_scraped
        };

        console.log(`✓ Analysis complete for @${username}`);
        console.log(`  Overall Score: ${overallScore}/100`);
        console.log(`  City Rank: #${rankings.city.rank}/${rankings.city.total}`);

        res.json(response);

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            error: error.message || 'Failed to analyze profile',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Generate personalized insights based on profile data
 */
function generateInsights(profile, benchmarks, score) {
    const insights = [];

    // Engagement insights
    const engagementRate = parseFloat(profile.engagement_rate);
    if (engagementRate < benchmarks.avg_engagement * 0.7) {
        insights.push({
            type: 'warning',
            category: 'engagement',
            message: `Your engagement rate (${engagementRate.toFixed(1)}%) is below average for your industry`,
            recommendation: 'Add CTAs to every post and ask questions to boost comments by 40-60%'
        });
    } else if (engagementRate > benchmarks.avg_engagement * 1.3) {
        insights.push({
            type: 'success',
            category: 'engagement',
            message: `Excellent engagement rate! You're ${((engagementRate / benchmarks.avg_engagement - 1) * 100).toFixed(0)}% above average`,
            recommendation: 'Keep doing what you are doing and consider sharing your strategy'
        });
    }

    // Post frequency insights
    const postFreq = parseFloat(profile.post_frequency || 0);
    if (postFreq < benchmarks.avg_post_frequency * 0.7) {
        insights.push({
            type: 'warning',
            category: 'frequency',
            message: `You're posting less frequently than competitors (${postFreq.toFixed(1)}/week vs ${benchmarks.avg_post_frequency.toFixed(1)}/week)`,
            recommendation: `Increase posting frequency by 2-3 posts per week to reach ${benchmarks.avg_post_frequency.toFixed(0)} posts/week`
        });
    }

    // Reel insights
    if (profile.reel_percentage < 30) {
        insights.push({
            type: 'info',
            category: 'content',
            message: 'Reels make up less than 30% of your content',
            recommendation: 'Reels typically get 3.2x more engagement - aim for 40-60% Reels'
        });
    }

    // Overall performance
    if (score >= 85) {
        insights.push({
            type: 'success',
            category: 'overall',
            message: 'You are crushing it! Top-tier performance in your niche',
            recommendation: 'Focus on maintaining consistency and consider monetization opportunities'
        });
    } else if (score < 60) {
        insights.push({
            type: 'warning',
            category: 'overall',
            message: 'Your competitors are outpacing you',
            recommendation: 'Focus on engagement, post frequency, and leveraging trending content'
        });
    }

    return insights;
}

module.exports = router;
