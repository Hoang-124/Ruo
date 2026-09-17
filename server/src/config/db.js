import mongoose from 'mongoose';

export const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    console.log(`[Ruo Database] Connected to MongoDB host: ${conn.connection.host} | DB: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[Ruo Database Error]', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Ruo Database Warning] MongoDB connection disconnected. Attempting reconnect...');
    });

    return conn;
  } catch (error) {
    console.error(`[Ruo Database Connection Failure] ${error.message}`);
    process.exit(1);
  }
};
