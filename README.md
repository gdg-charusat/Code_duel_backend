# LeetCode Daily Challenge Tracker - Backend 

A production-ready backend application for tracking LeetCode daily challenges with automated evaluation, streak tracking, and penalty management.

## 🚀 Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Challenge Management**: Create and join challenges with customizable rules
- **LeetCode Integration**: Fetch submissions from LeetCode GraphQL API
- **Automated Evaluation**: Daily cron jobs to evaluate challenge progress
- **Streak Tracking**: Track current and longest streaks
- **Penalty System**: Virtual penalty tracking for missed days
- **Dashboard**: Comprehensive progress overview and leaderboards
- **Clean Architecture**: Service-based structure with separation of concerns

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Encryption**: AES-256-GCM (crypto)
- **Scheduling**: node-cron
- **HTTP Client**: Axios
- **Logging**: Winston
- **Validation**: express-validator

## 📁 Project Structure

```
src/
 ├── app.js                      # Express app setup
 ├── server.js                   # Server entry point
 ├── config/
 │    ├── env.js                 # Environment configuration
 │    ├── prisma.js              # Prisma client setup
 │    └── cron.js                # Cron job manager
 ├── routes/
 │    ├── auth.routes.js         # Authentication routes
 │    ├── challenge.routes.js    # Challenge routes
 │    └── dashboard.routes.js    # Dashboard routes
 ├── controllers/
 │    ├── auth.controller.js     # Auth request handlers
 │    ├── challenge.controller.js # Challenge request handlers
 │    └── dashboard.controller.js # Dashboard request handlers
 ├── services/
 │    ├── auth.service.js        # Authentication business logic
 │    ├── challenge.service.js   # Challenge business logic
 │    ├── leetcode.service.js    # LeetCode API integration
 │    ├── penalty.service.js     # Penalty management
 │    └── evaluation.service.js  # Daily evaluation logic
 ├── middlewares/
 │    ├── auth.middleware.js     # JWT authentication
 │    └── error.middleware.js    # Error handling
 ├── utils/
 │    ├── jwt.js                 # JWT utilities
 │    ├── encryption.js          # Encryption utilities
 │    └── logger.js              # Winston logger
 └── prisma/
      └── schema.prisma          # Database schema
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   cd "f:\DATA\College\Project and stuff\Leetcode streak"
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:

   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `ENCRYPTION_KEY`: Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Other configuration as needed

4. **Set up database**

   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Start the server**

   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## 📡 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)

### Challenges

- `POST /api/challenges` - Create new challenge (protected)
- `GET /api/challenges` - Get user's challenges (protected)
- `GET /api/challenges/:id` - Get challenge details (protected)
- `POST /api/challenges/:id/join` - Join a challenge (protected)
- `PATCH /api/challenges/:id/status` - Update challenge status (protected, owner only)

### Dashboard

- `GET /api/dashboard` - Get dashboard overview (protected)
- `GET /api/dashboard/today` - Get today's status (protected)
- `GET /api/dashboard/challenge/:id` - Get detailed challenge progress (protected)
- `GET /api/dashboard/challenge/:id/leaderboard` - Get challenge leaderboard (protected)

### Health Check

- `GET /health` - Server health status

## 🗄️ Database Schema

### User

- User authentication and profile information
- LeetCode username mapping

### Challenge

- Challenge configuration and rules
- Start/end dates, difficulty filters, penalty amounts

### ChallengeMember

- User participation in challenges
- Streak tracking and penalty totals

### DailyResult

- Daily evaluation results
- Submission counts and problem tracking

### PenaltyLedger

- Penalty transaction history

### LeetCodeSession

- Encrypted session storage for LeetCode API

## ⚙️ Configuration

### Cron Jobs

Daily evaluation runs automatically based on `DAILY_EVALUATION_TIME` in `.env`:

```env
# Run at 1:00 AM daily (recommended)
DAILY_EVALUATION_TIME=0 1 * * *

# For testing - run every 15 minutes
DAILY_EVALUATION_TIME=*/15 * * * *
```

### Challenge Rules

When creating a challenge, configure:

- `minSubmissionsPerDay`: Minimum accepted submissions required
- `difficultyFilter`: Array of difficulties (Easy, Medium, Hard)
- `uniqueProblemConstraint`: Whether to count unique problems only
- `penaltyAmount`: Virtual penalty for missed days

## 🔐 Security Features

- Password hashing with bcrypt (12 rounds)
- JWT-based authentication
- AES-256-GCM encryption for sensitive data
- Input validation on all endpoints
- SQL injection protection via Prisma ORM
- Environment variable validation on startup

## 📝 Development Notes

### Adding New Features

1. **Service Layer**: Add business logic in `src/services/`
2. **Controller**: Add request handlers in `src/controllers/`
3. **Routes**: Define endpoints in `src/routes/`
4. **Validation**: Add input validation in controllers

### Database Changes

```bash
# Create migration
npm run prisma:migrate

# Regenerate Prisma Client
npm run prisma:generate

# Open Prisma Studio (DB GUI)
npm run prisma:studio
```

### Logging

Uses Winston for structured logging:

- Console logs with colors (development)
- File logs: `logs/combined.log`, `logs/error.log`
- Exception/rejection logs

## 🐛 Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Ensure database exists: `createdb leetcode_tracker`

### LeetCode API Rate Limiting

- LeetCode may rate limit requests
- Consider adding delays between requests
- Store session data for authenticated requests

### Cron Jobs Not Running

- Check `CRON_ENABLED=true` in `.env`
- Verify cron expression syntax
- Check logs for error messages

## 🚀 Production Deployment

1. **Environment**

   - Set `NODE_ENV=production`
   - Use strong secrets for `JWT_SECRET` and `ENCRYPTION_KEY`
   - Configure `CORS_ORIGIN` to your frontend URL

2. **Database**

   - Use production PostgreSQL instance
   - Run migrations: `npm run prisma:migrate`

3. **Process Management**

   - Use PM2 or similar for process management
   - Enable clustering for high availability

4. **Monitoring**
   - Monitor logs in `logs/` directory
   - Set up error alerting
   - Monitor cron job execution

## 📄 License

ISC

## 👤 Author

Built with ❤️ for the LeetCode community
