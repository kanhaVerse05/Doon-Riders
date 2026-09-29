# DOON Riders - Electric Vehicle Platform & Enterprise CRM

Full-Stack Next.js 14 + Node.js (Express) + MySQL enterprise web platform and CRM for **DOON Riders** Electric Vehicles & Scooty Rentals.

---

## 🏗️ Architecture

```
DOON Riders/
├── frontend/                     # Next.js 14 App Router (React, Tailwind CSS, TypeScript, Lucide)
├── backend/                      # Node.js + Express REST API (TypeScript, JWT, Multer, MySQL2)
├── database/                     # MySQL 18-Table Enterprise Schema & Seed Datasets
│   ├── mysql_schema.sql          # Complete DDL Schema (RBAC, Fleet, CRM Leads, Gallery, Rentals)
│   └── mysql_seed.sql            # Seed data (52 permissions, 4 roles, 7 users, fleet, FAQs)
├── DEPLOYMENT_GUIDE.md           # Step-by-Step Production Deployment Guide (VPS, Cloud, Docker)
└── docker-compose.yml            # 1-Click Container Orchestration (MySQL 8 + Backend + Frontend)
```

---

## 🚀 Quick Start (Local Development)

### 1. Run Database Migration
Make sure MySQL server is running (Port 3306), then run:
```bash
cd backend
npm run migrate:mysql
```

### 2. Run Backend API
```bash
cd backend
npm install
npm run dev
```
Backend API will start on `http://localhost:5000`.

### 3. Run Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend will be live on `http://localhost:3000`.

- **Website**: `http://localhost:3000`
- **Admin Portal**: `http://localhost:3000/admin/login`

---

## 📖 Production Deployment Guide

For full step-by-step instructions on deploying to **Ubuntu VPS (Nginx + PM2 + SSL)**, **Vercel + Cloud MySQL**, or **Docker**, please check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## 📡 REST API Modules

- **Auth & RBAC**: `/api/admin/auth/*` (Login, JWT, Role switching, Permissions)
- **CRM Leads**: `/api/admin/leads/*` (CRUD, status tracking, bulk assignment, CSV/Excel import)
- **Customers & Rentals**: `/api/admin/customers/*` (KYC verification, rental bookings)
- **Fleet & Maintenance**: `/api/admin/fleet/*` (Scooty inventory, battery health, service logs)
- **Reports & Analytics**: `/api/admin/reports/*` (Conversion funnel, ad channels, team performance)
- **Audit Logs**: `/api/admin/audit/*` (Immutable activity logs)
- **Dynamic Gallery**: `/api/gallery/*` (Image upload, categories, deletion)
- **Public Website APIs**: `/api/vehicles`, `/api/bookings`, `/api/newsletter`, `/api/testimonials`, `/api/faqs`
