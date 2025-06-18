const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const redisService = require('./services/redis');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: config.cors
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.socket.io"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors(config.cors));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests, please try again later.'
});
app.use('/api', limiter);

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const authRoutes = require('./api/auth/routes');
const userRoutes = require('./api/users/routes');
const questionRoutes = require('./api/questions/routes');
const expertRoutes = require('./api/experts/routes');
const chatRoutes = require('./api/chat/routes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/experts', expertRoutes);
app.use('/api/chat', chatRoutes);

// Demo routes
const demoRoutes = require('./api/demo/routes');
const { demoAuthMiddleware } = require('./middleware/demoAuth');

// Apply demo auth middleware
app.use(demoAuthMiddleware);

// Demo API routes
app.use('/demo/api', demoRoutes);

// Serve static files from web-clients directory
app.use('/demo', express.static(path.join(__dirname, '..', 'web-clients')));

app.use(notFound);
app.use(errorHandler);

const setupSocketHandlers = require('./websocket/setupHandlers');
setupSocketHandlers(io);

const PORT = config.server.port;

const startServer = async () => {
  try {
    await redisService.connect();
    
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`WebSocket server running on same port`);
      logger.info(`Environment: ${config.server.env}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redisService.disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await redisService.disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});