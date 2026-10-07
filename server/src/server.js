import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import { securityHeaders } from './middlewares/securityMiddleware.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import facilityRoutes from './routes/facilityRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import repairRoutes from './routes/repairRoutes.js';
import movementRoutes from './routes/movementRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import disposalRoutes from './routes/disposalRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import sparePartRoutes from './routes/sparePartRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import masterDataRoutes from './routes/masterDataRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(securityHeaders);
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// System Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    system: 'Ruo — University Equipment Management System (UEMS)',
    version: '4.0.0',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// API Routes Mounting (UEMS 6 Canonical Modules)
app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/equipments', equipmentRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/transfers', movementRoutes); // Backward compatibility
app.use('/api/inventory', inventoryRoutes);
app.use('/api/disposals', disposalRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/spare-parts', sparePartRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/master', masterDataRoutes);
app.use('/api/master-data', masterDataRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Start Server with proper async DB initialization
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`[Ruo UEMS Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[Ruo UEMS Server] Healthcheck: http://localhost:${PORT}/api/health`);
    });
    return server;
  } catch (error) {
    console.error('[Ruo UEMS Server] Fatal startup failure:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
