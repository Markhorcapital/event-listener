const mongoose = require('mongoose');

// Database connection configuration
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

        if (!mongoUri) {
            console.warn('⚠️  No MongoDB URI found in environment variables. Database features will be disabled.');
            return null;
        }

        // Connect to MongoDB with modern Mongoose options
        await mongoose.connect(mongoUri, {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferCommands: false // Disable mongoose buffering
        });

        console.log('✅ Connected to MongoDB');
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        return null;
    }
};

// Handle connection events
mongoose.connection.on('error', (error) => {
    console.error('❌ MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed through app termination');
    process.exit(0);
});

module.exports = { connectDB, mongoose };
