const db = require('../config/database');

/**
 * Calculate percentile ranking for a value
 * @param {number} value - The value to rank
 * @param {Array<number>} distribution - Array of all values to compare against
 * @returns {number} Percentile (0-100)
 */
function calculatePercentile(value, distribution) {
    if (!distribution || distribution.length === 0) return 50;

    const sorted = distribution.sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);

    if (index === -1) return 100; // Value is higher than all

    const percentile = (index / sorted.length) * 100;
    return Math.round(percentile);
}

/**
 * Get or calculate benchmarks for industry/location
 */
async function getBenchmarks(industry, locationCity, locationState, locationCountry) {
    try {
        // Try to get cached benchmarks (updated within last 24 hours)
        const cached = await db.query(`
            SELECT * FROM benchmarks
            WHERE industry = $1
            AND location_type = 'city'
            AND location_value = $2
            AND updated_at > NOW() - INTERVAL '24 hours'
            LIMIT 1
        `, [industry, locationCity]);

        if (cached.rows.length > 0) {
            console.log(`Using cached benchmarks for ${industry} in ${locationCity}`);
            return cached.rows[0];
        }

        // Calculate fresh benchmarks
        console.log(`Calculating fresh benchmarks for ${industry} in ${locationCity}`);
        return await calculateBenchmarks(industry, locationCity, locationState, locationCountry);

    } catch (error) {
        console.error('Error getting benchmarks:', error);
        throw error;
    }
}

/**
 * Calculate benchmarks from database profiles
 */
async function calculateBenchmarks(industry, locationCity, locationState, locationCountry) {
    try {
        // Get all profiles matching industry and location
        const profiles = await db.query(`
            SELECT followers, engagement_rate, post_frequency, reel_percentage
            FROM profiles
            WHERE industry = $1
            AND (
                location_city = $2
                OR location_state = $3
                OR location_country = $4
            )
            AND last_scraped > NOW() - INTERVAL '30 days'
        `, [industry, locationCity, locationState, locationCountry]);

        if (profiles.rows.length === 0) {
            // Return global averages if no local data
            return getGlobalBenchmarks(industry);
        }

        // Calculate averages
        const data = profiles.rows;
        const avgFollowers = data.reduce((sum, p) => sum + p.followers, 0) / data.length;
        const avgEngagement = data.reduce((sum, p) => sum + parseFloat(p.engagement_rate), 0) / data.length;
        const avgPostFreq = data.reduce((sum, p) => sum + parseFloat(p.post_frequency || 0), 0) / data.length;
        const avgReels = data.reduce((sum, p) => sum + (p.reel_percentage || 0), 0) / data.length;

        // Store distributions for percentile calculations
        const followerDistribution = data.map(p => p.followers);
        const engagementDistribution = data.map(p => parseFloat(p.engagement_rate));

        // Save to database
        await db.query(`
            INSERT INTO benchmarks (
                industry, location_type, location_value,
                avg_followers, avg_engagement, avg_post_frequency, avg_reel_percentage,
                follower_distribution, engagement_distribution,
                sample_size, last_calculated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT (industry, location_type, location_value)
            DO UPDATE SET
                avg_followers = $4,
                avg_engagement = $5,
                avg_post_frequency = $6,
                avg_reel_percentage = $7,
                follower_distribution = $8,
                engagement_distribution = $9,
                sample_size = $10,
                updated_at = NOW()
        `, [
            industry, 'city', locationCity,
            avgFollowers.toFixed(2), avgEngagement.toFixed(2), avgPostFreq.toFixed(2), avgReels.toFixed(2),
            JSON.stringify(followerDistribution),
            JSON.stringify(engagementDistribution),
            data.length
        ]);

        return {
            industry,
            location_type: 'city',
            location_value: locationCity,
            avg_followers: avgFollowers,
            avg_engagement: avgEngagement,
            avg_post_frequency: avgPostFreq,
            avg_reel_percentage: avgReels,
            follower_distribution: followerDistribution,
            engagement_distribution: engagementDistribution,
            sample_size: data.length
        };

    } catch (error) {
        console.error('Error calculating benchmarks:', error);
        throw error;
    }
}

/**
 * Get global industry benchmarks (fallback)
 */
function getGlobalBenchmarks(industry) {
    // Hardcoded industry benchmarks (will be replaced with real data over time)
    const benchmarks = {
        'fitness': { avg_followers: 15000, avg_engagement: 3.5, avg_post_frequency: 5.2 },
        'beauty': { avg_followers: 25000, avg_engagement: 4.2, avg_post_frequency: 7.5 },
        'health': { avg_followers: 18000, avg_engagement: 3.8, avg_post_frequency: 4.8 },
        'fashion': { avg_followers: 35000, avg_engagement: 3.2, avg_post_frequency: 9.2 },
        'food': { avg_followers: 20000, avg_engagement: 4.5, avg_post_frequency: 8.0 },
        'business': { avg_followers: 12000, avg_engagement: 2.5, avg_post_frequency: 4.0 },
        'default': { avg_followers: 15000, avg_engagement: 3.0, avg_post_frequency: 5.0 }
    };

    return benchmarks[industry] || benchmarks['default'];
}

/**
 * Calculate geographic rankings
 */
async function calculateRankings(username, industry, locationCity, locationState, locationCountry) {
    try {
        const profile = await db.query(
            'SELECT followers, engagement_rate FROM profiles WHERE username = $1',
            [username]
        );

        if (profile.rows.length === 0) {
            throw new Error('Profile not found in database');
        }

        const { followers, engagement_rate } = profile.rows[0];

        // City ranking
        const cityRank = await db.query(`
            SELECT COUNT(*) + 1 as rank
            FROM profiles
            WHERE location_city = $1
            AND industry = $2
            AND (followers > $3 OR (followers = $3 AND engagement_rate > $4))
        `, [locationCity, industry, followers, engagement_rate]);

        const cityTotal = await db.query(`
            SELECT COUNT(*) as total
            FROM profiles
            WHERE location_city = $1 AND industry = $2
        `, [locationCity, industry]);

        // State ranking
        const stateRank = await db.query(`
            SELECT COUNT(*) + 1 as rank
            FROM profiles
            WHERE location_state = $1
            AND industry = $2
            AND (followers > $3 OR (followers = $3 AND engagement_rate > $4))
        `, [locationState, industry, followers, engagement_rate]);

        const stateTotal = await db.query(`
            SELECT COUNT(*) as total
            FROM profiles
            WHERE location_state = $1 AND industry = $2
        `, [locationState, industry]);

        // National ranking
        const nationalRank = await db.query(`
            SELECT COUNT(*) + 1 as rank
            FROM profiles
            WHERE location_country = $1
            AND industry = $2
            AND (followers > $3 OR (followers = $3 AND engagement_rate > $4))
        `, [locationCountry, industry, followers, engagement_rate]);

        const nationalTotal = await db.query(`
            SELECT COUNT(*) as total
            FROM profiles
            WHERE location_country = $1 AND industry = $2
        `, [locationCountry, industry]);

        return {
            city: {
                rank: parseInt(cityRank.rows[0].rank),
                total: parseInt(cityTotal.rows[0].total || 1000), // Fallback if no data
                name: locationCity
            },
            state: {
                rank: parseInt(stateRank.rows[0].rank),
                total: parseInt(stateTotal.rows[0].total || 5000),
                name: locationState
            },
            national: {
                rank: parseInt(nationalRank.rows[0].rank),
                total: parseInt(nationalTotal.rows[0].total || 50000),
                country: locationCountry
            }
        };

    } catch (error) {
        console.error('Error calculating rankings:', error);
        throw error;
    }
}

/**
 * Calculate overall performance score (0-100)
 */
function calculateOverallScore(profile, benchmarks) {
    // Weighted scoring:
    // 30% - Follower count vs benchmark
    // 50% - Engagement rate vs benchmark
    // 20% - Post frequency vs benchmark

    const followerScore = Math.min(100, (profile.followers / benchmarks.avg_followers) * 100);
    const engagementScore = Math.min(100, (profile.engagement_rate / benchmarks.avg_engagement) * 100);
    const postScore = Math.min(100, (profile.post_frequency / benchmarks.avg_post_frequency) * 100);

    const overallScore = Math.round(
        (followerScore * 0.3) + (engagementScore * 0.5) + (postScore * 0.2)
    );

    return Math.min(100, Math.max(0, overallScore));
}

module.exports = {
    calculatePercentile,
    getBenchmarks,
    calculateBenchmarks,
    calculateRankings,
    calculateOverallScore
};
