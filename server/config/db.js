import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

/**
 * Establish a MongoDB connection.
 * 1. Try the configured URI (MONGODB_URI / MONGO_URI).
 * 2. If that fails (e.g., local mongod not installed / not running),
 *    fall back to an in-memory MongoDB instance so the app can run
 *    without additional setup. Ideal for local dev / CI.
 */
export default async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  // First attempt: user-provided Mongo instance
  if (uri) {
    try {
      await mongoose.connect(uri, {
        // modern driver no longer needs useNewUrlParser etc.
      });
      console.log(`Connected to MongoDB at ${uri}`);
      return;
    } catch (err) {
      console.warn(`Failed to connect to MongoDB at ${uri}: ${err.message}`);
      console.warn('Falling back to in-memory MongoDB instance...');
    }
  }

  // Fallback: spin up in-memory server
  const mongod = await MongoMemoryServer.create();
  const memUri = mongod.getUri();
  await mongoose.connect(memUri);
  process.env.MONGODB_URI = memUri; // make available elsewhere
  console.log('Connected to in-memory MongoDB');
  return memUri;
}
