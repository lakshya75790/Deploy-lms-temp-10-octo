const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const errorHandler = require('./middleware/errorMiddleware');
const ApiResponse = require('./utils/apiResponse');
const authRoutes = require('./routes/authRoutes');
const orgRoutes = require('./routes/orgRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const quizRoutes = require('./routes/quizRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const trainingAssignmentRoutes = require('./routes/trainingAssignmentRoutes');
const progressRoutes = require('./routes/progressRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

const { cacheMiddleware, invalidateServerCache } = require('./middleware/cacheMiddleware');

const app = express();

// Performance logging middleware for API response times
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const url = req.originalUrl || req.url || '';
    if (url.startsWith('/api') && !url.startsWith('/api/health')) {
      const duration = Date.now() - start;
      console.log(`[PERF] ${req.method} ${url} - ${duration} ms`);
    }
  });
  next();
});

app.set('trust proxy', 1);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://lms-org-rho.vercel.app',
  'https://lms.itsoftlab360.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.itsoftlab360.com') ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Server-Cache', 'Content-Disposition', 'Content-Length', 'Content-Type', 'Accept-Ranges', 'Content-Range'],
  maxAge: 86400
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(invalidateServerCache);

// Serve uploads directory statically for local media storage fallback
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Health Check Endpoint (verifies PostgreSQL connection & latency)
app.get('/api/health', async (req, res) => {
  try {
    const start = Date.now();
    const { prisma } = require('./config/prismaClient');
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    res.status(200).json(new ApiResponse(200, {
      status: 'healthy',
      database: 'connected',
      latencyMs,
      timestamp: new Date()
    }, 'Server and database operational'));
  } catch (error) {
    res.status(503).json(new ApiResponse(503, {
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message || 'Database connection failed',
      timestamp: new Date()
    }, 'Database connection error'));
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/assignments-engine', trainingAssignmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/certificates', certificateRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
