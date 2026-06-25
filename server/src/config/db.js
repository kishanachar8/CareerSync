import dns from 'dns';
import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

// Node on Windows can fail to read IPv6-only system DNS config and silently
// fall back to an unreachable 127.0.0.1, breaking mongodb+srv:// SRV lookups
// even though the OS resolver works fine. Swap in public resolvers only when
// that broken fallback is detected — a no-op on any correctly configured host.
if (dns.getServers().every((server) => server === '127.0.0.1')) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  logger.warn('[DNS] Default resolver was unreachable 127.0.0.1 — switched to 8.8.8.8/1.1.1.1');
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnect…');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB error: ${err.message}`);
    });
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;
