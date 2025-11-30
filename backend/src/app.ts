import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import clubRoutes from './routes/clubs';
import env from './config/env';

const app = express();

const allowedOrigins = env.allowedOrigins.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.get('/health', async (_req, res) => {
  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };

  // Check database
  try {
    const { default: db } = await import('./config/db');
    db.prepare('SELECT 1').get();
    health.database = 'ok';
  } catch (err) {
    health.database = 'error';
    health.status = 'degraded';
  }

  // Check RPC provider
  try {
    const { getProvider } = await import('./config/contract');
    const blockNumber = await getProvider().getBlockNumber();
    health.rpc = 'ok';
    health.blockNumber = blockNumber;
  } catch (err) {
    health.rpc = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.use('/auth', authRoutes);
app.use('/clubs', clubRoutes);

app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Log error with request context
    const errorLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      error: {
        message: err?.message || 'Unknown error',
        stack: err?.stack,
        status: err?.status || 500
      },
      userId: (req as any).user?.id || 'unauthenticated'
    };

    console.error('Error occurred:', JSON.stringify(errorLog, null, 2));

    const status = err.status || 500;
    const message = status === 500
      ? 'Internal server error'
      : (typeof err?.message === 'string' ? err.message : 'Internal server error');

    res.status(status).json({ message });
  }
);

export default app;
