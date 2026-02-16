-- Instagram Performance Analyzer Database Schema

-- Profiles table (scraped Instagram accounts)
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    profile_pic_url TEXT,
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    posts INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    avg_likes INTEGER DEFAULT 0,
    avg_comments INTEGER DEFAULT 0,
    avg_views INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    biography TEXT,
    external_url TEXT,
    business_category VARCHAR(100),

    -- Targeting/segmentation
    industry VARCHAR(100),
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100),
    lat DECIMAL(10, 7),
    lon DECIMAL(10, 7),

    -- Content metrics
    post_frequency DECIMAL(5,2),
    stories_per_day DECIMAL(5,2),
    reel_percentage INTEGER DEFAULT 0,

    -- Metadata
    last_scraped TIMESTAMP DEFAULT NOW(),
    scrape_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Email captures (lead generation)
CREATE TABLE IF NOT EXISTS email_captures (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    industry VARCHAR(100),
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100),

    -- Performance snapshot
    overall_score INTEGER,
    followers INTEGER,
    engagement_rate DECIMAL(5,2),
    city_rank INTEGER,
    state_rank INTEGER,
    national_rank INTEGER,

    -- Full results JSON
    results JSONB,

    -- Conversion tracking
    captured_at TIMESTAMP DEFAULT NOW(),
    converted_to_magnet_pro BOOLEAN DEFAULT FALSE,
    conversion_date TIMESTAMP,

    -- Marketing
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100)
);

-- Benchmarks cache (pre-calculated industry/location averages)
CREATE TABLE IF NOT EXISTS benchmarks (
    id SERIAL PRIMARY KEY,
    industry VARCHAR(100) NOT NULL,
    location_type VARCHAR(50), -- 'city', 'state', 'country', 'global'
    location_value VARCHAR(100),

    -- Averages
    avg_followers DECIMAL(10,2) DEFAULT 0,
    avg_engagement DECIMAL(5,2) DEFAULT 0,
    avg_post_frequency DECIMAL(5,2) DEFAULT 0,
    avg_stories_per_day DECIMAL(5,2) DEFAULT 0,
    avg_reel_percentage DECIMAL(5,2) DEFAULT 0,

    -- Distribution (for percentile calculations)
    follower_distribution JSONB,
    engagement_distribution JSONB,

    -- Metadata
    sample_size INTEGER DEFAULT 0,
    last_calculated TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(industry, location_type, location_value)
);

-- Top performers (leaderboards)
CREATE TABLE IF NOT EXISTS top_performers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    location_type VARCHAR(50),
    location_value VARCHAR(100),

    followers INTEGER,
    engagement_rate DECIMAL(5,2),
    overall_score INTEGER,
    rank_position INTEGER,

    calculated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(industry, location_type, location_value, username)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_industry ON profiles(industry);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location_city, location_state, location_country);
CREATE INDEX IF NOT EXISTS idx_profiles_scraped ON profiles(last_scraped);

CREATE INDEX IF NOT EXISTS idx_email_captures_email ON email_captures(email);
CREATE INDEX IF NOT EXISTS idx_email_captures_date ON email_captures(captured_at);
CREATE INDEX IF NOT EXISTS idx_email_captures_converted ON email_captures(converted_to_magnet_pro);

CREATE INDEX IF NOT EXISTS idx_benchmarks_lookup ON benchmarks(industry, location_type, location_value);
CREATE INDEX IF NOT EXISTS idx_benchmarks_updated ON benchmarks(updated_at);

CREATE INDEX IF NOT EXISTS idx_top_performers_lookup ON top_performers(industry, location_type, location_value);
