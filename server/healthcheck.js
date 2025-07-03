import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/platform';

// Create a health check middleware function
const healthCheck = async (req, res, next) => {
  if (req.path !== '/health') {
    return next();
  }

  try {
    // Check database connection
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    // Check if connection is established
    if (mongoose.connection.readyState === 1) {
      return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
      });
    } else {
      throw new Error('Database connection not ready');
    }
  } catch (error) {
    console.error('Health check failed:', error);
    // Don't exit the process here, let the container handle the health check
    return res.status(500).json({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
};

// Export the middleware
export default healthCheck;
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Health check server closed');
    process.exit(0);
  });
});
