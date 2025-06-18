require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    wsPort: process.env.WS_PORT || 3001,
    env: process.env.NODE_ENV || 'development'
  },
  database: {
    url: process.env.DATABASE_URL,
    options: {
      connectionTimeoutMillis: 5000,
      max: 20
    }
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '7d',
    bcryptRounds: 10
  },
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENV,
      index: process.env.PINECONE_INDEX || 'yeongyul-experts'
    }
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3002',
    credentials: true
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100)
  }
};