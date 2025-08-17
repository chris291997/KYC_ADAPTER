# Quick Setup Guide

Follow these steps to get your KYC Adapter running in under 5 minutes!

## 🚀 Quick Start (Recommended)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
# Copy the environment template
cp env.example .env

# Edit the .env file with your settings (minimum required):
# - DB_PASSWORD: Change to a secure password
# - JWT_SECRET: Generate a secure secret
# - API_KEY_ENC_KEY: Generate a 32-character key (AES-256-GCM)
# - IMGBB_API_KEY: (optional) enable temporary image hosting
```

### 3. Start Database & Run Migrations
```bash
# Using Docker (recommended)
docker-compose up postgres -d

# Wait for database to be ready (about 10 seconds)
# Then run migrations and seed test data
npm run db:setup
```

### 4. Start Development Server
```bash
npm run start:dev
```

### 5. Test the API
- **Health Check**: http://localhost:3000/api/v1/health
- **API Documentation**: http://localhost:3000/api/docs
- **Database Admin** (optional): http://localhost:8080 (admin@kyc-adapter.local / admin123)

## 📋 Next Steps

### 1. Create a Tenant and API Key (via Admin API)
```bash
# 1) Login as admin to get JWT
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kyc-adapter.dev","password":"admin123"}' | jq

# 2) Create a tenant (temporaryPassword will be generated if not provided)
curl -s -X POST http://localhost:3000/api/v1/tenants \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Company","email":"demo@company.com","status":"active"}' | jq

# 3) Create a tenant API key (copy the returned apiKey now)
curl -s -X POST http://localhost:3000/api/v1/tenants/<TENANT_ID>/api-keys \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo API Key","expiresAt":"2026-01-01T00:00:00.000Z"}' | jq
```

### 2. Assign the Mock Provider to Tenant
```bash
# Regula mock provider is available out of the box
curl -s -X POST http://localhost:3000/api/v1/admin/providers/tenants/<TENANT_ID>/assign \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"providerName":"regula-mock","isPrimary":true,"config":{"processingMethod":"direct"}}' | jq
```

### 3. Test a Verification
```bash
curl -s -X POST http://localhost:3000/api/v1/verifications \
  -H "X-API-Key: <TENANT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "verificationType":"document",
    "documentImages":{"front":"data:image/jpeg;base64,/9j/4AAQ..."},
    "metadata":{"simulate":{"forceStatus":"passed"}}
  }' | jq
```

## 🛠️ Alternative Setup (Local PostgreSQL)

If you prefer not to use Docker:

### 1. Install PostgreSQL
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Setup Database
```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE kyc_adapter;
CREATE USER kyc_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE kyc_adapter TO kyc_user;
\q

# Run migrations and seed data
npm run db:setup
```

### 3. Update .env
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kyc_user
DB_PASSWORD=your_secure_password
DB_NAME=kyc_adapter
```

## 🔧 Environment Variables Reference

**Required:**
- `DB_PASSWORD` - PostgreSQL password
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `API_KEY_ENC_KEY` - Encryption key (exactly 32 chars)

**Provider Credentials (when ready):**
- `REGULA_API_KEY` - Your Regula API key
- `PERSONA_API_KEY` - Your Persona API key

**Optional:**
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (default: info)
- `THROTTLE_LIMIT` - Rate limit per minute (default: 100)
- `IMGBB_API_KEY` - Enable temporary image hosting of uploaded images

## 🎯 Testing Your Setup

### 1. Health Check
```bash
curl http://localhost:3000/api/v1/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 2. API Documentation
Visit http://localhost:3000/api/docs to see the Swagger documentation.

### 3. Database Connection
```bash
# Test database connection
docker-compose exec postgres psql -U kyc_user -d kyc_adapter -c "\dt"
# Should list all tables
```

## 🚨 Common Issues

### Dependencies Not Found
```bash
# If you see TypeScript/NestJS import errors:
npm install

# If still having issues:
npm run build
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Port Already in Use
```bash
# Change port in .env file
PORT=3001

# Or kill existing process
lsof -ti:3000 | xargs kill -9
```

## 📚 What's Next?

1. **Read the main README.md** for complete documentation
2. **Check database/README.md** for schema details
3. **Start implementing provider adapters** (next todo item)
4. **Set up your KYC provider accounts** (Regula/Persona)

---

**💡 Tip**: Keep the development server running with `npm run start:dev` for hot reloading during development! 