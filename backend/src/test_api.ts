import express from 'express';
import cors from 'cors';
import vehicleRoutes from './routes/vehicleRoutes';
import bookingRoutes from './routes/bookingRoutes';
import newsletterRoutes from './routes/newsletterRoutes';
import { faqRouter, testimonialRouter } from './routes/faqRoutes';
import galleryRoutes from './routes/galleryRoutes';
import pricingRoutes from './routes/pricingRoutes';
import adminAuthRoutes from './routes/admin/adminAuthRoutes';
import adminLeadsRoutes from './routes/admin/adminLeadsRoutes';
import adminCustomersRoutes from './routes/admin/adminCustomersRoutes';
import adminReportsRoutes from './routes/admin/adminReportsRoutes';
import adminUsersRoutes from './routes/admin/adminUsersRoutes';
import adminRolesRoutes from './routes/admin/adminRolesRoutes';
import adminAuditRoutes from './routes/admin/adminAuditRoutes';
import adminSettingsRoutes from './routes/admin/adminSettingsRoutes';
import adminPricingRoutes from './routes/admin/adminPricingRoutes';
import { checkDbConnection, getDbStatus } from './config/db';
import http from 'http';

async function runEndToEndTests() {
  console.log('=====================================================');
  console.log('🧪 DOON RIDERS - FULL SYSTEM END-TO-END TEST SUITE');
  console.log('=====================================================\n');

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Mount routes
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/newsletter', newsletterRoutes);
  app.use('/api/faqs', faqRouter);
  app.use('/api/testimonials', testimonialRouter);
  app.use('/api/gallery', galleryRoutes);
  app.use('/api/pricing-plans', pricingRoutes);
  app.use('/api/admin/auth', adminAuthRoutes);
  app.use('/api/admin/leads', adminLeadsRoutes);
  app.use('/api/admin/customers', adminCustomersRoutes);
  app.use('/api/admin/reports', adminReportsRoutes);
  app.use('/api/admin/users', adminUsersRoutes);
  app.use('/api/admin/roles', adminRolesRoutes);
  app.use('/api/admin/audit', adminAuditRoutes);
  app.use('/api/admin/settings', adminSettingsRoutes);
  app.use('/api/admin/pricing-plans', adminPricingRoutes);

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'online',
      app: 'DOON Riders Backend & RBAC CRM API',
      mysqlConnected: getDbStatus()
    });
  });

  const TEST_PORT = 5055;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, async () => {
      console.log(`📡 Ephemeral Test Server running on port ${TEST_PORT}`);
      await checkDbConnection();
      resolve();
    });
  });

  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;
  let passedTests = 0;
  let failedTests = 0;

  async function test(name: string, fn: () => Promise<boolean>) {
    process.stdout.write(`⏳ Testing: ${name}... `);
    try {
      const ok = await fn();
      if (ok) {
        console.log('✅ PASSED');
        passedTests++;
      } else {
        console.log('❌ FAILED');
        failedTests++;
      }
    } catch (err: any) {
      console.log(`❌ ERROR: ${err.message}`);
      failedTests++;
    }
  }

  try {
    // 1. Healthcheck
    await test('GET /api/health (Server status)', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      const data = await res.json();
      return res.status === 200 && data.status === 'online';
    });

    // 2. Vehicles
    await test('GET /api/vehicles (Public fleet catalog)', async () => {
      const res = await fetch(`${baseUrl}/api/vehicles`);
      const data = await res.json();
      return res.status === 200 && Array.isArray(data.data) && data.data.length > 0;
    });

    // 3. Gallery
    await test('GET /api/gallery (Dynamic Media Gallery)', async () => {
      const res = await fetch(`${baseUrl}/api/gallery`);
      const data = await res.json();
      return res.status === 200 && Array.isArray(data.data) && data.data.length > 0;
    });

    // 4. Testimonials
    await test('GET /api/testimonials (Customer Reviews)', async () => {
      const res = await fetch(`${baseUrl}/api/testimonials`);
      const data = await res.json();
      return res.status === 200 && Array.isArray(data.data) && data.data.length > 0;
    });

    // 5. FAQs
    await test('GET /api/faqs (EV Knowledge Base)', async () => {
      const res = await fetch(`${baseUrl}/api/faqs`);
      const data = await res.json();
      return res.status === 200 && Array.isArray(data.data) && data.data.length > 0;
    });

    // 6. Public Pricing Plans (Default ₹1699 Plan)
    await test('GET /api/pricing-plans (Public Pricing Plans)', async () => {
      const res = await fetch(`${baseUrl}/api/pricing-plans`);
      const data = await res.json();
      return res.status === 200 && Array.isArray(data.data) && data.data.length > 0 && Number(data.data[0].price) === 1699;
    });

    // 7. Test Drive Booking Creation
    await test('POST /api/bookings (Submit Test Drive)', async () => {
      const payload = {
        fullName: 'Test User Rahul',
        email: 'rahul.test@example.com',
        phone: '+91 99999 88888',
        preferredDate: '2026-09-20',
        preferredTime: '11:00 AM',
        vehicleName: 'DOON Electro Pro'
      };
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return res.status === 201 && data.success === true;
    });

    // 8. Newsletter Subscription
    await test('POST /api/newsletter (Email Subscription)', async () => {
      const res = await fetch(`${baseUrl}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'newsletter_test@example.com' })
      });
      const data = await res.json();
      return res.status === 201 && data.success === true;
    });

    // 9. Admin Demo Role Switcher
    let authToken = '';
    await test('POST /api/admin/auth/switch-role-demo (Super Admin Token)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/auth/switch-role-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'SUPER_ADMIN' })
      });
      const data = await res.json();
      if (res.status === 200 && data.token) {
        authToken = data.token;
        return true;
      }
      return false;
    });

    // 10. Admin Leads Query (with JWT)
    await test('GET /api/admin/leads (Protected CRM Leads List)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/leads`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      return res.status === 200 && data.success === true;
    });

    // 11. Admin Pricing Plans CRUD (with JWT)
    let createdPlanId = 0;
    await test('POST /api/admin/pricing-plans (Admin Create Plan)', async () => {
      const newPlanPayload = {
        name: 'Monthly Corporate Fleet',
        price: 5999,
        period: 'month',
        tagline: 'Dedicated commercial fleet subscription with zero maintenance cost',
        badge: 'ENTERPRISE',
        features: ['Heavy Duty EV Scooty', 'Free Doorstep Maintenance', '24/7 Priority Support']
      };
      const res = await fetch(`${baseUrl}/api/admin/pricing-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(newPlanPayload)
      });
      const data = await res.json();
      if (res.status === 201 && data.data?.id) {
        createdPlanId = data.data.id;
        return true;
      }
      return false;
    });

    await test('PUT /api/admin/pricing-plans/:id (Admin Update Plan)', async () => {
      const updatePayload = {
        price: 5499,
        badge: 'BEST VALUE ENTERPRISE'
      };
      const res = await fetch(`${baseUrl}/api/admin/pricing-plans/${createdPlanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(updatePayload)
      });
      const data = await res.json();
      return res.status === 200 && data.success === true;
    });

    await test('DELETE /api/admin/pricing-plans/:id (Admin Delete Plan)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/pricing-plans/${createdPlanId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      return res.status === 200 && data.success === true;
    });

    // 12. Admin Reports Dashboard (with JWT)
    await test('GET /api/admin/reports/dashboard (Enterprise Analytics)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/dashboard`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      return res.status === 200 && data.success === true;
    });

    // 13. Admin Roles & Permissions (with JWT)
    await test('GET /api/admin/roles (RBAC Permission Matrix)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/roles`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      return res.status === 200 && data.success === true;
    });

    console.log('\n=====================================================');
    console.log(`📊 TEST RESULTS: ${passedTests} Passed | ${failedTests} Failed`);
    console.log('=====================================================\n');

    if (failedTests === 0) {
      console.log('🎉 ALL 14 API TESTS PASSED WITH 100% SUCCESS!');
    }
  } catch (err: any) {
    console.error('Fatal Test Runner Error:', err);
  } finally {
    server.close();
  }
}

runEndToEndTests();
