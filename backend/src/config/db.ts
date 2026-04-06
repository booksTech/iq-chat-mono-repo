import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(): Promise<typeof mongoose> {
  return mongoose.connect(env.MONGODB_URI, {
    dbName: 'iq-quizz',
    serverSelectionTimeoutMS: 10000
  });
}
