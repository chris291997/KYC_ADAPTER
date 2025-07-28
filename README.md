# KYC Adapter

A comprehensive NestJS backend application that serves as an adapter for integrating multiple KYC (Know Your Customer) providers. Currently supports Persona and Regula with a unified API interface.

## 🚀 Features

### Multi-Tenant Architecture
- **Tenant Management**: Complete CRUD operations for tenant organizations
- **API Key Authentication**: Secure tenant authentication with `kya_` prefixed keys
- **JWT Authentication**: Email/password login for both admins and tenants
- **Role-Based Access Control**: Admin roles (super_admin, admin, viewer)

### Authentication System
- **Admin Authentication**: 
  - API Key: `kya_admin_*` format
  - JWT: Email/password with refresh tokens
  - Multiple authentication methods supported
- **Tenant Authentication**:
  - API Key: `kya_*` format  
  - JWT: Email/password with refresh tokens
  - Cross-compatible with admin access

### KYC Verification System
- **Document Verification**: Full support for 15+ document types (passport, license, ID card, etc.)
- **Regula Provider Integration**: Forensic-grade document analysis with 26+ security checks
- **Automatic User Management**: Creates user accounts from successful verifications
- **Verification Expiration**: Configurable time-limited verifications (5 minutes to 24 hours)
- **Production-Ready DTOs**: Comprehensive validation with 15+ configurable fields
- **File Upload Support**: Both base64 JSON and multipart file uploads
- **Provider Abstraction**: Easy switching between KYC providers

### Database & Infrastructure
- **PostgreSQL**: Multi-tenant database with optimized indexes
- **TypeORM**: Database migrations and entity management
- **Rate Limiting**: Built-in request throttling
- **Security**: Helmet, CORS, input validation
- **Logging**: Structured logging with Winston

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd KYC_ADAPTER
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   # Create database
   createdb kyc_adapter
   
   # Run migrations
   npm run migration:run
   ```

5. **Start the application**
   ```bash
   # Development
   npm run start:dev
   
   # Production
   npm run build
   npm run start:prod
   ```

## 🔧 Environment Variables

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_DATABASE=kyc_adapter

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ACCESS_TOKEN_EXPIRES=15m
JWT_REFRESH_TOKEN_EXPIRES_DAYS=7
JWT_ISSUER=kyc-adapter
JWT_AUDIENCE_ADMIN=kyc-adapter-admin
JWT_AUDIENCE_TENANT=kyc-adapter-tenant

API_KEY_ENCRYPTION_KEY=your-32-char-encryption-key-here

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

## 🔐 Authentication

### Default Credentials

**Admin Account:**
- Email: `admin@kyc-adapter.dev`
- Password: `admin123`
- API Key: `kya_admin_56897aeb3aea5a45a97f7493c025f03765b2547e6c3e11e0`

**Test Tenant:**
- Email: `test@kyc-adapter.dev` 
- Password: `tenant123`
- API Key: `kya_b8f7e4a1c9d6f2e8a5b3c7d9f1e4a6c8d2f5a7b9c3e6f8a1d4b7c9e2f5a8b1c4`

### Authentication Methods

#### 1. API Key Authentication
```bash
# Admin endpoints
curl -H "Authorization: Bearer kya_admin_..." 
curl -H "X-Admin-API-Key: kya_admin_..."

# Tenant endpoints  
curl -H "Authorization: Bearer kya_..."
curl -H "X-API-Key: kya_..."
```

#### 2. JWT Authentication
```bash
# Login (Admin)
POST /api/v1/auth/login
{
  "email": "admin@kyc-adapter.dev",
  "password": "admin123"
}

# Login (Tenant)
POST /api/v1/tenant/auth/login  
{
  "email": "test@kyc-adapter.dev",
  "password": "tenant123"
}

# Use access token
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## 📚 API Documentation

### Admin Endpoints

#### Authentication
- `POST /api/v1/auth/login` - Admin login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (revoke refresh token)

#### Tenant Management
- `GET /api/v1/tenants` - List tenants (with pagination)
- `POST /api/v1/tenants` - Create tenant *(super_admin/admin only)*
- `GET /api/v1/tenants/:id` - Get tenant details
- `PUT /api/v1/tenants/:id` - Update tenant
- `DELETE /api/v1/tenants/:id` - Delete tenant

#### API Key Management
- `POST /api/v1/tenants/:id/api-keys` - Create tenant API key
- `GET /api/v1/tenants/:id/api-keys` - List tenant API keys
- `DELETE /api/v1/tenants/:id/api-keys/:keyId` - Revoke API key

### Tenant Endpoints

#### Authentication
- `POST /api/v1/tenant/auth/login` - Tenant login
- `POST /api/v1/tenant/auth/refresh` - Refresh access token
- `POST /api/v1/tenant/auth/logout` - Logout
- `POST /api/v1/tenant/auth/logout-all` - Logout from all devices

### Response Format

All API responses follow a standardized format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "requestId": "uuid"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "ErrorCode",
    "message": "Human readable message",
    "status": 400,
    "timestamp": "2025-01-27T10:30:00.000Z",
    "path": "/api/endpoint",
    "method": "POST"
  },
  "requestId": "uuid"
}
```

## 🗄️ Database Schema

### Core Entities

- **tenants**: Tenant organizations with authentication
- **tenant_api_keys**: API keys for tenant authentication  
- **tenant_refresh_tokens**: JWT refresh tokens for tenants
- **admins**: System administrators
- **admin_api_keys**: API keys for admin authentication
- **admin_refresh_tokens**: JWT refresh tokens for admins

### Multi-Tenant Entities (Future KYC Features)

- **accounts**: KYC verification subjects
- **inquiries**: Verification sessions
- **documents**: Uploaded verification documents
- **inquiry_templates**: Verification flow templates
- **webhooks**: Provider webhook configurations

## 🔧 Development

### Database Commands
```bash
# Create migration
npm run migration:create -- --name=MigrationName

# Generate migration (from entity changes)
npm run migration:generate -- src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Testing
```bash
# Unit tests
npm run test

# E2E tests  
npm run test:e2e

# Test coverage
npm run test:cov
```

### Code Quality
```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

## 🏗️ Architecture

### Module Structure
```
src/
├── auth/              # Authentication (JWT, API keys, guards)
├── tenants/           # Tenant management
├── database/          # Entities, migrations, data source
├── common/            # Shared utilities, filters, interceptors
├── config/            # Configuration management
└── main.ts           # Application bootstrap
```

### Security Features
- **Input Validation**: Class-validator with DTOs
- **Rate Limiting**: Configurable request throttling  
- **CORS**: Cross-origin resource sharing
- **Helmet**: Security headers
- **Password Hashing**: bcrypt with salt rounds
- **API Key Encryption**: Secure key storage
- **JWT Security**: Signed tokens with audience validation

## 🎯 Current Verification Capabilities

### Document Verification API

```bash
# Create verification with document images
POST /api/v1/verifications
Content-Type: application/json
Authorization: Bearer {token}

{
  "verificationType": "document",
  "documentImages": {
    "front": "data:image/jpeg;base64,/9j/4AAQ...",
    "back": "data:image/jpeg;base64,/9j/4AAQ...",
    "selfie": "data:image/jpeg;base64,/9j/4AAQ..."
  },
  "allowedDocumentTypes": ["passport", "drivers_license", "id_card"],
  "expectedCountries": ["US", "CA", "GB"],
  "expiresIn": 3600,
  "requireLiveness": true,
  "minimumConfidence": 85
}
```

### File Upload API

```bash
# Upload document files directly
POST /api/v1/verifications/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

# Form fields:
# - front: Document front image file
# - back: Document back image file (optional)
# - selfie: Selfie photo file (optional)
# - verificationType: "document"
# - metadata: JSON string with additional data
```

### User Management

```bash
# Get verified users for tenant
GET /api/v1/verifications/users?page=1&limit=20
Authorization: Bearer {token}

# Response includes:
# - User profiles created from document data
# - Verification counts and last verified date
# - Pagination metadata
```

### Verification Status

```bash
# Get verification status and results
GET /api/v1/verifications/{verificationId}
Authorization: Bearer {token}

# Returns comprehensive results:
# - Overall status and confidence score
# - Extracted document data (name, DOB, etc.)
# - Security checks (authenticity, validity)
# - Regula-specific analysis details
```

## 🚧 Upcoming Features

- [ ] **Persona Provider Integration** 
- [ ] **Biometric Verification Endpoints**
- [ ] **Webhook System**
- [ ] **Dashboard Analytics**
- [ ] **One-time Verification Links**
- [ ] **Frontend Demo Application**
- [ ] **Real-time Status Updates**

## 📝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

---

**⚠️ Security Notice**: Change all default passwords and API keys before deploying to production! 