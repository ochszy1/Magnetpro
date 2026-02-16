# Magnet Pro Backend API

Instagram Performance Analyzer backend built with Node.js + Express + PostgreSQL.

## 🚀 Features

- **Real Instagram Data**: Scrapes profiles via Apify API
- **Benchmark Calculations**: Compares accounts against industry/location averages
- **Geographic Rankings**: City, state, and national rankings
- **Email Capture**: Lead generation with conversion tracking
- **Caching**: 7-day profile cache to minimize Apify costs
- **Rate Limiting**: Built-in API rate limiting
- **Production Ready**: Helmet, CORS, compression, error handling

## 📦 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Instagram Scraping**: Apify API
- **Deployment**: Railway

## 🛠️ Local Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DATABASE_URL=postgresql://localhost:5432/magnet_pro
APIFY_TOKEN=your_apify_token_here
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5500
```

### 3. Setup Database

```bash
npm run db:setup
```

This creates all tables, indexes, and constraints.

### 4. Start Server

**Development** (with auto-reload):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

Server runs on `http://localhost:3000`

## 🔌 API Endpoints

### POST /api/analyze
Analyze an Instagram account.

**Request Body:**
```json
{
  "username": "example_user",
  "industry": "fitness",
  "locationCity": "Austin",
  "locationState": "Texas",
  "locationCountry": "United States"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "username": "example_user",
    "fullName": "Example User",
    "profilePicUrl": "https://...",
    "followers": 12543,
    "following": 847,
    "posts": 234,
    "engagementRate": 3.2,
    "avgLikes": 401,
    "avgComments": 32,
    "verified": false,
    "postFrequency": 4.2,
    "reelPercentage": 35
  },
  "score": {
    "overall": 87,
    "followerPercentile": 77,
    "engagementPercentile": 85
  },
  "benchmarks": {
    "industry": "fitness",
    "location": "Austin",
    "avgFollowers": 8500,
    "avgEngagement": "2.3",
    "avgPostFrequency": "5.2",
    "sampleSize": 156
  },
  "rankings": {
    "city": {
      "rank": 47,
      "total": 856,
      "name": "Austin"
    },
    "state": {
      "rank": 312,
      "total": 5421,
      "name": "Texas"
    },
    "national": {
      "rank": 2847,
      "total": 68000,
      "country": "United States"
    }
  },
  "insights": [
    {
      "type": "success",
      "category": "engagement",
      "message": "Excellent engagement rate! You're 39% above average",
      "recommendation": "Keep doing what you're doing and consider sharing your strategy"
    }
  ],
  "scrapedAt": "2025-02-16T12:34:56.789Z"
}
```

### POST /api/email/capture
Capture email lead.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "example_user",
  "industry": "fitness",
  "locationCity": "Austin",
  "locationState": "Texas",
  "locationCountry": "United States",
  "overallScore": 87,
  "followers": 12543,
  "engagementRate": 3.2,
  "cityRank": 47,
  "stateRank": 312,
  "nationalRank": 2847,
  "results": {},
  "utm": {
    "source": "facebook",
    "medium": "cpc",
    "campaign": "instagram_analyzer"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email captured successfully",
  "leadId": 123
}
```

### GET /api/benchmarks/:industry/:location
Get benchmark data.

**Example:** `GET /api/benchmarks/fitness/Austin`

**Response:**
```json
{
  "success": true,
  "benchmarks": {
    "industry": "fitness",
    "location": "Austin",
    "avgFollowers": 8500,
    "avgEngagement": "2.3",
    "avgPostFrequency": "5.2",
    "sampleSize": 156
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-02-16T12:34:56.789Z",
  "version": "1.0.0"
}
```

## 🚂 Railway Deployment

### 1. Create Railway Project

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link
```

### 2. Add PostgreSQL

In Railway dashboard:
1. Click "New" → "Database" → "PostgreSQL"
2. Database URL is automatically added to environment

### 3. Set Environment Variables

In Railway dashboard or via CLI:

```bash
railway variables set APIFY_TOKEN=your_apify_token_here
railway variables set NODE_ENV=production
railway variables set ALLOWED_ORIGINS=https://yourdomain.com
```

### 4. Deploy

```bash
railway up
```

Or connect GitHub repo for auto-deploy on push.

### 5. Setup Database

After first deploy:

```bash
railway run npm run db:setup
```

## 📊 Database Schema

### profiles
Stores scraped Instagram profiles with engagement metrics.

### email_captures
Stores email leads with conversion tracking.

### benchmarks
Cached industry/location benchmarks for fast lookups.

### top_performers
Leaderboards by industry/location.

## 🔐 Security

- **Helmet**: Security headers
- **CORS**: Configurable origins
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: All user inputs validated
- **SQL Injection Protection**: Parameterized queries
- **Error Handling**: No stack traces in production

## 💰 Cost Estimates

**Apify** (Instagram scraping):
- $0.20 per 1,000 profiles
- With 7-day caching: ~1,000 unique analyses/month = $0.20/mo

**Railway**:
- Hobby Plan: $5/mo (includes PostgreSQL)
- Pro Plan: $20/mo (more resources)

**Total**: ~$5-20/mo for backend infrastructure

## 🧪 Testing

Test the API locally:

```bash
# Analyze profile
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"username":"example","industry":"fitness","locationCity":"Austin","locationState":"Texas","locationCountry":"United States"}'

# Capture email
curl -X POST http://localhost:3000/api/email/capture \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"example","industry":"fitness"}'

# Get benchmarks
curl http://localhost:3000/api/benchmarks/fitness/Austin
```

## 📝 TODO

- [ ] Email service integration (SendGrid/Mailchimp)
- [ ] Admin dashboard for email leads
- [ ] Webhook for Magnet Pro conversions
- [ ] Analytics tracking (Google Analytics, Mixpanel)
- [ ] API authentication (optional)
- [ ] Automated benchmark calculations (cron job)
- [ ] Competitor tracking features

## 🤝 Support

For issues or questions:
- GitHub: [your-repo]
- Email: support@magnetpro.com

---

Built with ❤️ for Magnet Pro
