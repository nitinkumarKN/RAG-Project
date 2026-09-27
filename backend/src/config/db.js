import mongoose from 'mongoose';
import { env } from "./env.js";

export const databaseMode = {
  current: 'mongo',
};

export async function connectDatabase() {
  if (!env.mongoUri) {
    databaseMode.current = 'local';
    console.warn('⚠️ No MONGODB_URI configured. Falling back to local JSON storage.');
    return databaseMode.current;
  }

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });

    databaseMode.current = 'mongo';
    console.log('✅ MongoDB Connected');
    console.log('State:', mongoose.connection.readyState);
    return databaseMode.current;
  } catch (err) {
    databaseMode.current = 'local';
    console.warn('⚠️ MongoDB unavailable, using local JSON storage instead.');
    console.warn(err?.message || err);
    return databaseMode.current;
  }
}