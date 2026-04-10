import mongoose from 'mongoose';
let isConnected = false;
export function getConnectionStatus() {
    return isConnected;
}
export async function connectDB() {
    const uri = process.env.MONGODB_URI;
    mongoose.connection.on('connected', () => {
        isConnected = true;
        console.log(`MongoDB connected: ${mongoose.connection.host}`);
    });
    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        console.warn('MongoDB disconnected — retrying...');
    });
    mongoose.connection.on('error', () => {
        isConnected = false;
    });
    const MAX_RETRIES = 20;
    let retries = 0;
    while (!isConnected) {
        try {
            await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 5000,
            });
        }
        catch (err) {
            isConnected = false;
            retries++;
            if (retries >= MAX_RETRIES) {
                console.error(`MongoDB connection failed after ${MAX_RETRIES} attempts. Exiting.`);
                process.exit(1);
            }
            const delay = Math.min(3000 * Math.pow(1.5, Math.min(retries - 1, 5)), 15000);
            console.warn(`MongoDB not available — retry ${retries}/${MAX_RETRIES} in ${Math.round(delay / 1000)}s... (${err.message})`);
            console.warn(`Make sure MongoDB is running: net start MongoDB`);
            try {
                await mongoose.disconnect();
            }
            catch { }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
