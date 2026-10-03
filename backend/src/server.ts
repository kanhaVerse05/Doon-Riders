import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import vehicleRoutes from './routes/vehicleRoutes';
import bookingRoutes from './routes/bookingRoutes';
import newsletterRoutes from './routes/newsletterRoutes';
import faqRoutes, { faqRouter, testimonialRouter } from './routes/faqRoutes';
import galleryRoutes from './routes/galleryRoutes';
import pricingRoutes from './routes/pricingRoutes';
import path from 'path';
import { checkDbConnection, getDbStatus } from './config/db';

// Admin Routes (Streamlined CRM & RBAC)
import adminAuthRoutes from './routes/admin/adminAuthRoutes';
import adminLeadsRoutes from './routes/admin/adminLeadsRoutes';
import adminCustomersRoutes from './routes/admin/adminCustomersRoutes';
import adminReportsRoutes from './routes/admin/adminReportsRoutes';
import adminUsersRoutes from './routes/admin/adminUsersRoutes';
import adminRolesRoutes from './routes/admin/adminRolesRoutes';
import adminAuditRoutes from './routes/admin/adminAuditRoutes';
import adminSettingsRoutes from './routes/admin/adminSettingsRoutes';
import adminPricingRoutes from './routes/admin/adminPricingRoutes';
import adminPreBookingRoutes from './routes/admin/adminPreBookingRoutes';
import adminInventoryRoutes from './routes/admin/adminInventoryRoutes';
import adminRepairJobsRoutes from './routes/admin/adminRepairJobsRoutes';
import adminComplaintsRoutes from './routes/admin/adminComplaintsRoutes';
import adminReturnsRoutes from './routes/admin/adminReturnsRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Public Website API Routes
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/faqs', faqRouter);
app.use('/api/testimonials', testimonialRouter);
app.use('/api/gallery', galleryRoutes);
app.use('/api/pricing-plans', pricingRoutes);
app.use('/api/repair-jobs', adminRepairJobsRoutes);
app.use('/api/complaints', adminComplaintsRoutes);
app.use('/api/returns', adminReturnsRoutes);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Protected Admin Panel & RBAC Routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/leads', adminLeadsRoutes);
app.use('/api/admin/pre-bookings', adminPreBookingRoutes);
app.use('/api/admin/inventory', adminInventoryRoutes);
app.use('/api/admin/repair-jobs', adminRepairJobsRoutes);
app.use('/api/admin/complaints', adminComplaintsRoutes);
app.use('/api/admin/returns', adminReturnsRoutes);
app.use('/api/admin/customers', adminCustomersRoutes);
app.use('/api/admin/reports', adminReportsRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/roles', adminRolesRoutes);
app.use('/api/admin/audit', adminAuditRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/pricing-plans', adminPricingRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'DOON Riders Backend & RBAC CRM API (PostgreSQL)',
    timestamp: new Date().toISOString(),
    postgresConnected: getDbStatus(),
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 DOON Riders Node.js Server running on port ${PORT}`);
  await checkDbConnection();
});
