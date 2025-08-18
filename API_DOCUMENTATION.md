# KYC Adapter API Documentation

## Base URL
```
Development: http://localhost:3000/api/v1
Production: https://your-domain.com/api/v1
```

## Authentication

The KYC Adapter supports multiple authentication methods:

### 1. API Key Authentication

#### Admin API Keys
- **Format**: `kya_admin_` + 40 hex characters
- **Usage**: Admin operations, tenant management
- **Headers**: 
  - `Authorization: Bearer kya_admin_...`
  - `X-Admin-API-Key: kya_admin_...`
  - Query parameter: `?admin_api_key=kya_admin_...`

#### Tenant API Keys  
- **Format**: `kya_` + 64 hex characters
- **Usage**: Tenant-specific operations, KYC verification
- **Headers**:
  - `X-API-Key: kya_...` (preferred)
  - `Authorization: Bearer kya_...` (supported)
  - Query parameter: `?api_key=kya_...`

### 2. JWT Authentication

#### Admin JWT
```bash
# Login to get JWT tokens
POST /api/v1/auth/login
{
  "email": "admin@kyc-adapter.dev",
  "password": "admin123"
}

# Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "3217702fda5cab0b558d...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "admin": {
      "id": "73372879-3098-4a03-af0c-3c5a65d136e3",
      "name": "Development Admin",
      "email": "admin@kyc-adapter.dev",
      "role": "super_admin",
      "status": "active"
    }
  }
}

# Use JWT in requests
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

#### Tenant JWT
```bash
# Login to get JWT tokens
POST /api/v1/tenant/auth/login
{
  "email": "test@kyc-adapter.dev", 
  "password": "tenant123"
}

# Use JWT in requests
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "requestId": "uuid-request-id"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ErrorCode",
    "message": "Human readable error message",
    "status": 400,
    "timestamp": "2025-01-27T10:30:00.000Z",
    "path": "/api/v1/endpoint",
    "method": "POST"
  },
  "requestId": "uuid-request-id"
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "tenants": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Admin Authentication Endpoints

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@kyc-adapter.dev",
  "password": "admin123"
}
```

### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "3217702fda5cab0b558d11c357f8b11e..."
}
```

### Logout
```http
POST /api/v1/auth/logout
Content-Type: application/json

{
  "refreshToken": "3217702fda5cab0b558d11c357f8b11e..."
}
```

## Tenant Authentication Endpoints

### Login
```http
POST /api/v1/tenant/auth/login
Content-Type: application/json

{
  "email": "test@kyc-adapter.dev",
  "password": "tenant123"
}
```

### Refresh Token
```http
POST /api/v1/tenant/auth/refresh
Content-Type: application/json

{
  "refreshToken": "tenant-refresh-token-here"
}
```

### Logout
```http
POST /api/v1/tenant/auth/logout
Content-Type: application/json

{
  "refreshToken": "tenant-refresh-token-here"
}
```

### Logout All Devices
```http
POST /api/v1/tenant/auth/logout-all
Authorization: Bearer <tenant-jwt-token>
```

## Tenant Management Endpoints

> **Note**: All tenant management endpoints require admin authentication

### List Tenants
```http
GET /api/v1/tenants?page=1&limit=10&status=active&search=example
Authorization: Bearer kya_admin_... 
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status (`active`, `inactive`, `suspended`, `pending`)
- `search` (optional): Search by name or email

### Create Tenant
```http
POST /api/v1/tenants
Authorization: Bearer kya_admin_...
Content-Type: application/json

{
  "name": "Example Company",
  "email": "contact@example.com",
  "status": "active",
  "settings": {
    "maxApiKeys": 5,
    "allowedProviders": ["regula", "persona"]
  }
}
```

**Permissions**: Requires `super_admin` or `admin` role

**Response (example):**
```json
{
  "success": true,
  "data": {
    "id": "77815e4c-a3e8-41fb-90c5-ed3aeb79f859",
    "name": "Example Company",
    "email": "contact@example.com",
    "status": "active",
    "settings": {
      "imgbbPrefix": "tenant_77815e4c"
    },
    "createdAt": "2025-01-27T10:30:00.000Z",
    "updatedAt": "2025-01-27T10:30:00.000Z",
    "temporaryPassword": "ExampleCompany123"
  }
}
```

### Get Tenant
```http
GET /api/v1/tenants/{tenantId}
Authorization: Bearer kya_admin_...
```

### Update Tenant
```http
PUT /api/v1/tenants/{tenantId}
Authorization: Bearer kya_admin_...
Content-Type: application/json

{
  "name": "Updated Company Name",
  "status": "suspended",
  "settings": {
    "maxApiKeys": 3
  }
}
```

### Delete Tenant
```http
DELETE /api/v1/tenants/{tenantId}
Authorization: Bearer kya_admin_...
```

## API Key Management

### Create Tenant API Key
```http
POST /api/v1/tenants/{tenantId}/api-keys
Authorization: Bearer kya_admin_...
Content-Type: application/json

{
  "name": "Production API Key",
  "expiresAt": "2025-12-31T23:59:59.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Production API Key", 
    "apiKey": "kya_b8f7e4a1c9d6f2e8a5b3c7d9f1e4a6c8d2f5a7b9c3e6f8a1d4b7c9e2f5a8b1c4",
    "status": "active",
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "createdAt": "2025-01-27T10:30:00.000Z"
  }
}
```

### List Tenant API Keys
```http
GET /api/v1/tenants/{tenantId}/api-keys
Authorization: Bearer kya_admin_...
```

Returns all keys including revoked ones. Each key includes non-sensitive preview fields.

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "Production API Key",
      "status": "active",
      "expiresAt": "2026-01-01T00:00:00.000Z",
      "lastUsedAt": "2025-01-27T12:00:00.000Z",
      "createdAt": "2025-01-27T10:30:00.000Z",
      "updatedAt": "2025-01-27T10:30:00.000Z",
      "isActive": true,
      "isExpired": false,
      "maskedKey": "kya_****8b1c"
    }
  ]
}
```

### Revoke API Key
```http
DELETE /api/v1/tenants/{tenantId}/api-keys/{apiKeyId}
Authorization: Bearer kya_admin_...
```

### Reveal Tenant API Key
```http
POST /api/v1/tenants/{tenantId}/api-keys/{apiKeyId}/reveal
Authorization: Bearer kya_admin_...
```

**Response:**
```json
{ "success": true, "data": { "apiKey": "kya_..." } }
```

Notes:
- Keys are encrypted at rest (AES-256-GCM); reveal decrypts the value on demand.
- Listings never include raw keys; only maskedKey derived from a preview suffix.

### Get Tenant Statistics
```http
GET /api/v1/tenants/{tenantId}/stats
Authorization: Bearer kya_admin_...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKeysCount": 3,
    "activeApiKeysCount": 2,
    "verificationsCount": 1250,
    "verificationsThisMonth": 85,
    "lastVerificationAt": "2025-01-27T09:15:00.000Z"
  }
}
```

### Admin: Tenant Users
```http
GET /api/v1/tenants/{tenantId}/users?page=1&limit=20
Authorization: Bearer <admin-jwt>

GET /api/v1/tenants/{tenantId}/users/{accountId}
Authorization: Bearer <admin-jwt>
```

## Error Codes

### Authentication Errors
- `UNAUTHORIZED` (401): Invalid or missing authentication
- `FORBIDDEN` (403): Insufficient permissions
- `INVALID_API_KEY` (401): API key is invalid or expired
- `INVALID_JWT` (401): JWT token is invalid or expired

### Validation Errors
- `VALIDATION_ERROR` (400): Request validation failed
- `INVALID_EMAIL` (400): Email format is invalid
- `PASSWORD_TOO_SHORT` (400): Password doesn't meet requirements

### Resource Errors
- `NOT_FOUND` (404): Requested resource not found
- `CONFLICT` (409): Resource already exists
- `RATE_LIMITED` (429): Too many requests

### Server Errors
- `INTERNAL_ERROR` (500): Internal server error
- `DATABASE_ERROR` (500): Database operation failed

## Rate Limiting

The API implements rate limiting per IP address and API key:

- **Default Limit**: 100 requests per 60 seconds
- **Headers**: Response includes rate limit headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in window
  - `X-RateLimit-Reset`: Time when limit resets

When rate limited:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again later.",
    "status": 429,
    "retryAfter": 30
  }
}
```

## Request/Response Examples

### Create and Test Tenant Flow

1. **Admin login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kyc-adapter.dev","password":"admin123"}'
```

2. **Create tenant:**
```bash
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Company",
    "email": "demo@company.com",
    "status": "active"
  }'
```

3. **Create API key for tenant:**
```bash
curl -X POST http://localhost:3000/api/v1/tenants/TENANT_ID/api-keys \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo API Key"
  }'
```

4. **Test tenant authentication:**
```bash
curl -X GET http://localhost:3000/api/v1/verifications \
  -H "X-API-Key: TENANT_API_KEY"
```

## KYC Verification Endpoints

### Create Document Verification (JSON)
```http
POST /api/v1/verifications
Authorization: Bearer kya_...
Content-Type: application/json

{
  "verificationType": "document",
  "documentImages": {
    "front": "data:image/jpeg;base64,/9j/4AAQ...",
    "back": "data:image/jpeg;base64,/9j/4AAQ...",
    "selfie": "data:image/jpeg;base64,/9j/4AAQ..."
  },
  "allowedDocumentTypes": ["passport", "drivers_license", "id_card"],
  "expectedCountries": ["US", "CA", "GB"],
  "callbackUrl": "https://yourapp.com/webhook",
  "expiresIn": 3600,
  "requireLiveness": true,
  "requireAddressVerification": false,
  "minimumConfidence": 85,
  "processingMethod": "direct",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.100",
    "sessionId": "session-123",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "country": "US"
    }
  }
}
```

Notes:
- If imgbb is enabled via `IMGBB_API_KEY`, uploaded images are mirrored to imgbb and URLs are returned in `result.metadata.imageUrls`.
- Admins can act as a tenant using `X-Tenant-Id: <tenant-uuid>` header on verification endpoints.

### Create Document Verification (File Upload)
```http
POST /api/v1/verifications/upload
Authorization: Bearer kya_...
Content-Type: multipart/form-data

# Form fields:
front: <file>              # Required: Document front image
back: <file>               # Optional: Document back image  
selfie: <file>             # Optional: Selfie photo
additional: <file>         # Optional: Additional document
verificationType: document # Required: Verification type
callbackUrl: https://yourapp.com/webhook
metadata: {"custom": "data"}  # Optional: JSON string
```

Tip: For mock provider simulation during development, pass `{"simulate": { "forceStatus": "failed" | "passed", "failureRate": 0.2, "poorImageQuality": true, "expiredDocument": true, "confidence": 42 }}` in the `metadata` object.

### Get Verification Status
```http
GET /api/v1/verifications/{verificationId}
Authorization: Bearer kya_...

Response:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": {
    "overall": {
      "status": "passed",
      "confidence": 94,
      "riskLevel": "low"
    },
    "document": {
      "extracted": {
        "firstName": "John",
        "lastName": "Doe",
        "dateOfBirth": "1990-01-01",
        "nationality": "USA",
        "documentNumber": "123456789"
      },
      "checks": {
        "authenticity": "passed",
        "validity": "passed",
        "dataConsistency": "passed"
      }
    },
    "regula": {
      "documentType": "US_PASSPORT",
      "securityFeatures": {
        "hologram": true,
        "uvFeatures": true
      }
      },
      "metadata": {
        "imageUrls": {
          "frontUrl": "https://i.ibb.co/...",
          "backUrl": "https://i.ibb.co/...",
          "selfieUrl": "https://i.ibb.co/..."
        }
      }
    }
  },
  "providerName": "regula-mock"
}
```

### List Verifications
```http
GET /api/v1/verifications?page=1&limit=20&status=completed
Authorization: Bearer kya_...
```

Admins can query tenant verifications by adding `X-Tenant-Id: <tenant-uuid>` header or `?tenantId=<tenant-uuid>` query param.

### Get Verified Users
```http
GET /api/v1/verifications/users?page=1&limit=20
Authorization: Bearer kya_...

Response:
{
  "users": [
    {
      "id": "user-123",
      "name": {"first": "John", "last": "Doe"},
      "referenceId": "USA_123456789",
      "verificationCount": 2,
      "lastVerified": "2025-01-28T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 8
}
```

### Cancel Verification
```http
DELETE /api/v1/verifications/{verificationId}
Authorization: Bearer kya_...
```

## Future Biometric Verification Endpoints

> **Note**: These endpoints will be implemented in the next phase

### Biometric Verification
```http
POST /api/v1/verify/biometric
Authorization: Bearer kya_...
Content-Type: multipart/form-data

{
  "selfie": <file>,
  "referenceDocument": <file>
}
```

## Swagger Documentation

Interactive API documentation is available at:
- **Development**: http://localhost:3000/api/docs
- **Production**: https://your-domain.com/api/docs

## SDKs and Libraries

### Node.js Example
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Authorization': 'Bearer kya_your_api_key_here',
    'Content-Type': 'application/json'
  }
});

// List tenants
const tenants = await client.get('/tenants');

// Create tenant
const newTenant = await client.post('/tenants', {
  name: 'New Company',
  email: 'new@company.com'
});
```

### Python Example
```python
import requests

headers = {
    'Authorization': 'Bearer kya_your_api_key_here',
    'Content-Type': 'application/json'
}

# List tenants
response = requests.get('http://localhost:3000/api/v1/tenants', headers=headers)
tenants = response.json()

# Create tenant  
new_tenant = {
    'name': 'New Company',
    'email': 'new@company.com'
}
response = requests.post('http://localhost:3000/api/v1/tenants', 
                        json=new_tenant, headers=headers)
```

## Support

For API support:
- Check the interactive documentation at `/api/docs`
- Review error responses for detailed messages
- Contact the development team for integration assistance 