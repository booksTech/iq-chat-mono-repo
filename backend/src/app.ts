import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import chatRoomRoutes from './routes/chatRoom.routes.js';
import messageRoutes from './routes/message.routes.js';
import testSetRoutes from './routes/testSet.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 55,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  }
});

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'API is healthy' });
});

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth API is running',
    docs: {
      health: '/api/v1/health',
      signup: 'POST /api/v1/auth/signup',
      signin: 'POST /api/v1/auth/signin',
      forgotPassword: 'POST /api/v1/auth/forgot-password',
      resetPassword: 'POST /api/v1/auth/reset-password',
      signout: 'POST /api/v1/auth/signout'
    },
    chatRooms: {
      create: 'POST /api/v1/chat-rooms',
      join: 'POST /api/v1/chat-rooms/join'
    }
  });
});

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/test-sets', testSetRoutes);
app.use('/api/v1/chat-rooms', chatRoomRoutes);
app.use('/api/v1/messages', messageRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
