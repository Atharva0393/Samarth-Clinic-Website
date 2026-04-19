# Samarth Dental Clinic — Management System

A full-stack clinic management SaaS built for Dr. Rohan Hemke, Samarth Multispeciality Dental Clinic, Aurangabad.

---

## Project Structure

```
samarth-clinic/
├── frontend/          # Next.js 14 (App Router) + Tailwind CSS
├── backend/           # Node.js + Express REST API
└── database/          # PostgreSQL schema + seed data
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+

### 1. Database Setup
```bash
# Create the database
psql -U postgres -c "CREATE DATABASE samarth_dental;"

# Apply schema
psql -U postgres -d samarth_dental -f database/schema.sql

# Seed demo data
psql -U postgres -d samarth_dental -f database/seed.sql
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env        # Edit with your DB password
npm install
npm run dev                 # http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

---

## Demo Login Credentials
All passwords: `demo1234`

| Role | Email |
|------|-------|
| Super Admin | admin@samarth.com |
| Dentist | doctor@samarth.com |
| Receptionist | reception@samarth.com |

---

## API Endpoints (Step 1 — Auth)
| Method | Route | Access |
|--------|-------|--------|
| POST | /api/auth/login | Public |
| GET  | /api/auth/me | Authenticated |
| POST | /api/auth/register | Super Admin only |
| GET  | /health | Public |
