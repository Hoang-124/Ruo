import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import facilityRoutes from './routes/facilityRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import disposalRoutes from './routes/disposalRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import repairRoutes from './routes/repairRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';

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
    system: 'Ruo — University Facility Management System (UFMS)',
    version: '3.0.0',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// API Routes Mounting (6 Core Modules)
app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/equipments', equipmentRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/disposals', disposalRoutes);
app.use('/api/audit', auditRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Start Server
const server = app.listen(PORT, () => {
  console.log(`[Ruo Backend Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[Ruo Backend Server] Healthcheck: http://localhost:${PORT}/api/health`);
});

export default app;
