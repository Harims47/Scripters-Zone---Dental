import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import patientRoutes from './routes/patientRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import visitRoutes from './routes/visitRoutes';
import queueRoutes from './routes/queueRoutes';
import consultationRoutes from './routes/consultationRoutes';
import prescriptionRoutes from './routes/prescriptionRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import dispensingRoutes from './routes/dispensingRoutes';
import billingRoutes from './routes/billingRoutes';
import paymentRoutes from './routes/paymentRoutes';
import patientHistoryRoutes from './routes/patientHistoryRoutes';
import reportsRoutes from './routes/reportsRoutes';
import staffRoutes from './routes/staffRoutes';
import documentRoutes from './routes/documentRoutes';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/patients', patientHistoryRoutes); // Mounts /:patientId/history
app.use('/api/appointments', appointmentRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dispensings', dispensingRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/documents', documentRoutes);

// Minimal Health Endpoint for Phase 2.0
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DentalCore backend is running' });
});

import { errorHandler } from './middleware/errorHandler';

// Error Handler
app.use(errorHandler);

import { prisma } from './db';

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Graceful Shutdown Mechanism
const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  });

  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
