import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import { securityHeaders } from './middlewares/securityMiddleware.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import facilityRoutes from './routes/facilityRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import warrantyClaimRoutes from './routes/warrantyClaimRoutes.js';
import repairRoutes from './routes/repairRoutes.js';
import movementRoutes from './routes/movementRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import disposalRoutes from './routes/disposalRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import sparePartRoutes from './routes/sparePartRoutes.js';
import partsRequestRoutes from './routes/partsRequestRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import masterDataRoutes from './routes/masterDataRoutes.js';
import adminMasterDataRoutes from './routes/adminMasterDataRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(securityHeaders);
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl) or allowed origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
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
app.use('/api/admin', authRoutes); // Supports GET /api/admin/users and POST /api/admin/users
app.use('/api/facilities', facilityRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/equipments', equipmentRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/warranty-claims', warrantyClaimRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/transfers', movementRoutes); // Backward compatibility
app.use('/api/inventory', inventoryRoutes);
app.use('/api/inventory-sessions', inventoryRoutes);
app.use('/api/disposals', disposalRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/spare-parts', sparePartRoutes);
app.use('/api/parts', sparePartRoutes);
app.use('/api/parts-requests', partsRequestRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/admin/roles', roleRoutes);
app.use('/api/admin', adminMasterDataRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/master', masterDataRoutes);
app.use('/api/master-data', masterDataRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testQrPath = path.resolve(__dirname, '../../test_qr_codes');

app.use('/test-qr', express.static(testQrPath));
app.get('/qr-test', (req, res) => {
  res.sendFile(path.join(testQrPath, 'qr_test_sheet.html'));
});

import { checkAndNotifyOverdueRepairs } from './controllers/repairController.js';

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Background Worker: UC-7.2 SLA Overdue Scanner
let slaTimer = null;
let slaInitialTimeout = null;

const startSlaBackgroundWorker = () => {
  if (process.env.NODE_ENV === 'test') return;
  const intervalMs = Number(process.env.SLA_SCAN_INTERVAL_MS) || 10 * 60 * 1000;
  console.log(`[Ruo UEMS Server] SLA overdue scanner worker initialized (Interval: ${intervalMs / 1000}s)`);

  slaInitialTimeout = setTimeout(async () => {
    try {
      if (mongoose.connection?.readyState !== 1) return;
      const res = await checkAndNotifyOverdueRepairs();
      if (res?.overdueCount > 0) {
        console.log(`[Ruo UEMS Server] Initial SLA scan found ${res.overdueCount} overdue tickets, dispatched ${res.notifiedCount} notifications.`);
      }
    } catch (err) {
      console.warn('[Ruo UEMS Server] Initial SLA scanner warning:', err.message);
    }
  }, 5000);
  slaInitialTimeout.unref?.();

  slaTimer = setInterval(async () => {
    try {
      if (mongoose.connection?.readyState !== 1) return;
      const res = await checkAndNotifyOverdueRepairs();
      if (res?.overdueCount > 0) {
        console.log(`[Ruo UEMS Server] Periodic SLA scan found ${res.overdueCount} overdue tickets, dispatched ${res.notifiedCount} notifications.`);
      }
    } catch (err) {
      console.warn('[Ruo UEMS Server] Periodic SLA scanner warning:', err.message);
    }
  }, intervalMs);
  slaTimer.unref?.();
};

// Start Server with proper async DB initialization & graceful shutdown
const startServer = async () => {
  try {
    await connectDB();
    startSlaBackgroundWorker();

    const server = app.listen(PORT, () => {
      console.log(`[Ruo UEMS Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[Ruo UEMS Server] Healthcheck: http://localhost:${PORT}/api/health`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Ruo UEMS Server] Port ${PORT} is already in use. Please free port ${PORT} or stop the other server instance.`);
      } else {
        console.error('[Ruo UEMS Server] HTTP server error:', err.message);
      }
      process.exit(1);
    });

    const shutdownGracefully = (signal) => {
      if (slaInitialTimeout) clearTimeout(slaInitialTimeout);
      if (slaTimer) clearInterval(slaTimer);
      server.close(() => {
        if (signal === 'SIGUSR2') {
          process.kill(process.pid, 'SIGUSR2');
        } else {
          process.exit(0);
        }
      });
    };

    process.once('SIGINT', () => shutdownGracefully('SIGINT'));
    process.once('SIGTERM', () => shutdownGracefully('SIGTERM'));
    process.once('SIGUSR2', () => shutdownGracefully('SIGUSR2'));

    return server;
  } catch (error) {
    console.error('[Ruo UEMS Server] Fatal startup failure:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
