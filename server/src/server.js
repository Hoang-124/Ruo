import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import { sweepExpiredCheckIns } from './services/bookingSweeper.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import facilityRoutes from './routes/facilityRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import disposalRoutes from './routes/disposalRoutes.js';
import academicRoutes from './routes/academicRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// System Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    system: 'Ruo — University Facilities Management System (UFMS)',
    version: '2.6.0',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/equipments', equipmentRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/disposals', disposalRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/audit', auditRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Start Server
const server = app.listen(PORT, () => {
  console.log(`[Ruo Backend Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[Ruo Backend Server] Healthcheck: http://localhost:${PORT}/api/health`);

  // Setup Automated Background Sweeper: Runs every 60 seconds to detect 15-min No-Shows
  setInterval(async () => {
    try {
      const processed = await sweepExpiredCheckIns();
      if (processed.length > 0) {
        console.log(`[No-Show Sweeper] Processed and released ${processed.length} expired bookings.`);
      }
    } catch (err) {
      console.error('[No-Show Sweeper Error]', err.message);
    }
  }, 60 * 1000);
});

export default app;
