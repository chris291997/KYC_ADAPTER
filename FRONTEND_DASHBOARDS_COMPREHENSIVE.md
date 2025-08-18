# Frontend Context: Production-Ready Admin + Tenant Dashboards

## System Overview

- **Backend**: NestJS + TypeORM + PostgreSQL
- **API Base URL**: `http://localhost:3000/api/v1` (development)
- **Swagger Documentation**: `http://localhost:3000/api/docs`
- **Architecture**: Multi-tenant KYC verification system with provider abstraction

## Authentication System

### Admin Authentication
- **Methods**: JWT tokens only (no API keys for admin dashboard)
- **Default Credentials**:
  - Email: `admin@kyc-adapter.dev`
  - Password: `admin123`
  - Role: `super_admin`
- **Token Lifecycle**:
  - Access Token: 15 minutes
  - Refresh Token: 7 days
  - Auto-refresh on 401 responses

### Tenant Authentication
- **Methods**: JWT tokens (recommended) or API keys (programmatic)
- **Default Credentials**:
  - Email: `test@kyc-adapter.dev`
  - Password: `tenant123`
  - Status: `active`
- **API Key Format**: `kya_` + 64 hex characters
- **Headers**: `Authorization: Bearer <jwt>` OR `x-api-key: <api_key>`

### Environment Variables (Vite)
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SWAGGER_URL=http://localhost:3000/api/docs
VITE_TENANT_API_KEY=kya_test_key_for_development_only
```

### HTTP Client Setup (Axios)
```typescript
// API client configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken(); // JWT or API key
  if (token) {
    if (token.startsWith('kya_')) {
      config.headers['x-api-key'] = token;
    } else {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or redirect to login
      await handleTokenRefresh();
    }
    return Promise.reject(error);
  }
);
```

### Error Response Format
```typescript
interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  requestId?: string;
  path?: string;
  timestamp?: string;
}
```

### Pagination Standard
```typescript
interface PaginationQuery {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
```

## Admin Dashboard

### Core Features

1. **System Providers Management**
   - View all available KYC providers (Regula, Persona, etc.)
   - Check provider health status and capabilities
   - View provider metadata and versions

2. **Tenant Provider Assignment**
   - Assign providers to specific tenants
   - Set primary/secondary provider priority
   - Configure provider-specific settings
   - Manage provider configurations

3. **Tenant Management**
   - View all tenants and their status
   - Monitor tenant provider assignments
   - Global verification analytics (optional)

### Routes

```typescript
// Admin routes
const adminRoutes = {
  login: '/admin/login',
  dashboard: '/admin/dashboard',
  providers: '/admin/providers',
  tenants: '/admin/tenants',
  tenantDetail: '/admin/tenants/:tenantId',
  tenantProviders: '/admin/tenants/:tenantId/providers',
  analytics: '/admin/analytics', // Optional
};
```

### Authentication API

```typescript
// POST /auth/login
interface AdminLoginRequest {
  email: string;
  password: string;
}

interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 900 seconds (15 minutes)
  tokenType: 'Bearer';
  admin: {
    id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'admin';
    status: 'active' | 'inactive';
  };
}

// POST /auth/refresh
interface AdminRefreshRequest {
  refreshToken: string;
}

interface AdminRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}
```

### Provider Management API

```typescript
// GET /admin/providers
interface ProviderListResponse {
  name: string; // e.g., 'regula-mock'
  displayName: string; // e.g., 'Regula Document Reader SDK (Mock)'
  isHealthy: boolean;
  capabilities: {
    documentVerification: boolean;
    biometricVerification: boolean;
    livenessDetection: boolean;
    addressVerification: boolean;
  };
  version: string;
}

// POST /admin/providers/tenants/:tenantId/assign
interface AssignProviderRequest {
  providerName: string; // Must match available provider name
  isPrimary: boolean; // Sets priority: 1 (primary) or 10 (secondary)
  config: {
    processingMethod: 'direct' | 'external_link';
    maxDailyVerifications?: number; // Rate limiting
    supportedDocumentTypes?: string[]; // ['passport', 'drivers_license', etc.]
    enableMRZ?: boolean; // Machine Readable Zone
    enableRFID?: boolean; // RFID chip reading
    enableBiometric?: boolean; // Face matching
    webhookUrl?: string; // Callback URL for results
  };
}

interface AssignProviderResponse {
  id: string; // Configuration ID
  tenantId: string;
  providerName: string;
  isPrimary: boolean;
  config: AssignProviderRequest['config'];
  createdAt: string;
  updatedAt: string;
}

// GET /admin/providers/tenants/:tenantId
type TenantProviderListResponse = AssignProviderResponse[];

// PUT /admin/providers/configs/:configId
interface UpdateProviderConfigRequest {
  isPrimary?: boolean;
  config?: Partial<AssignProviderRequest['config']>;
}

// DELETE /admin/providers/configs/:configId
// Returns 204 No Content on success
```

### Admin UI Components

```typescript
// Provider assignment form
interface ProviderAssignmentForm {
  providerName: string; // Select from available providers
  isPrimary: boolean; // Radio buttons or toggle
  processingMethod: 'direct' | 'external_link'; // Required
  maxDailyVerifications: number; // Optional, default 1000
  supportedDocumentTypes: string[]; // Multi-select
  enableMRZ: boolean; // Checkbox
  enableRFID: boolean; // Checkbox
  enableBiometric: boolean; // Checkbox
  webhookUrl: string; // URL input with validation
}

// Validation rules
const validationRules = {
  providerName: 'required|in:regula-mock,persona-mock', // From GET /admin/providers
  processingMethod: 'required|in:direct,external_link',
  maxDailyVerifications: 'integer|min:1|max:100000',
  webhookUrl: 'url|https', // Must be HTTPS in production
};
```

### Error Handling

```typescript
// Common admin errors
const adminErrorHandling = {
  'ProviderNotAvailableException': 'Provider not found in system',
  'ProviderAlreadyAssignedException': 'Provider already assigned to this tenant',
  'TenantNotFoundException': 'Tenant not found',
  'UnauthorizedException': 'Admin authentication required',
  'ForbiddenException': 'Insufficient admin permissions',
};
```

## Tenant Dashboard

### Core Features

1. **Identity Verification Management**
   - Create verifications (JSON with base64 images OR file upload)
   - Monitor verification status in real-time
   - View detailed verification results
   - Cancel pending/in-progress verifications

2. **User Account Management**
   - View all verified users (auto-created from successful verifications)
   - Access extracted personal information
   - Track verification history per user
   - Export user data for compliance

3. **Analytics and Monitoring**
   - Verification success/failure rates
   - Processing time metrics
   - Provider performance comparison

### Routes

```typescript
// Tenant dashboard routes
const tenantRoutes = {
  login: '/login',
  dashboard: '/dashboard',
  verifications: {
    list: '/verifications',
    create: '/verifications/new',
    detail: '/verifications/:verificationId',
    users: '/users', // Verified users
  },
  settings: '/settings',
  analytics: '/analytics', // Optional
};
```

### Authentication API

```typescript
// POST /tenant/auth/login
interface TenantLoginRequest {
  email: string;
  password: string; // Min 8 characters
}

interface TenantLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 900 seconds (15 minutes)
  tokenType: 'Bearer';
  tenant: {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'inactive' | 'suspended' | 'pending';
  };
}

// POST /tenant/auth/refresh
interface TenantRefreshRequest {
  refreshToken: string;
}

// POST /tenant/auth/logout (single device)
// POST /tenant/auth/logout-all (all devices)
interface TenantLogoutRequest {
  refreshToken: string;
}
```

### Verification API (Complete)

```typescript
// Enums and types
export enum VerificationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum VerificationType {
  DOCUMENT = 'document',
  BIOMETRIC = 'biometric', 
  COMPREHENSIVE = 'comprehensive',
}

export enum DocumentType {
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  ID_CARD = 'id_card',
  VISA = 'visa',
  RESIDENCE_PERMIT = 'residence_permit',
  OTHER = 'other',
}

export enum ProcessingMethod {
  DIRECT = 'direct',
  EXTERNAL_LINK = 'external_link',
}

// POST /verifications (JSON method)
interface CreateVerificationRequest {
  verificationType: VerificationType; // Required
  accountId?: string; // UUID v4, optional (auto-creation if successful)
  documentImages?: {
    front?: string; // Base64: "data:image/jpeg;base64,..."
    back?: string;
    selfie?: string;
  };
  allowedDocumentTypes?: DocumentType[];
  expectedCountries?: string[]; // ISO 3166-1 alpha-2: ['US', 'CA']
  callbackUrl?: string; // HTTPS webhook URL
  expiresIn?: number; // 300-86400 seconds (5 min - 24 hours)
  requireLiveness?: boolean; // Default: true for biometric
  requireAddressVerification?: boolean; // Default: false
  minimumConfidence?: number; // 0-100, default: 85
  processingMethod?: ProcessingMethod; // Default: 'direct'
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    location?: {
      country?: string;
      state?: string;
      city?: string;
    };
    device?: {
      type?: 'mobile' | 'desktop' | 'tablet';
      os?: string;
      browser?: string;
      model?: string;
    };
    sessionId?: string;
    referrer?: string;
    appVersion?: string;
  };
  customProperties?: {
    kycLevel?: 'basic' | 'enhanced' | 'premium';
    riskProfile?: 'low' | 'standard' | 'high';
    complianceRegion?: 'US' | 'EU' | 'APAC';
    campaignId?: string;
    [key: string]: any;
  };
}

// POST /verifications/upload (Multipart method)
interface CreateVerificationUploadRequest {
  // Files (multipart fields)
  front: File; // Required
  back?: File;
  selfie?: File;
  additional?: File;
  
  // Form fields
  verificationType: VerificationType; // Required
  accountId?: string;
  callbackUrl?: string;
  metadata?: string; // JSON string, optional
}

// Verification response (both methods)
interface VerificationResponse {
  id: string; // System verification ID
  providerVerificationId: string; // Provider's ID
  providerName: string; // e.g., 'regula-mock'
  status: VerificationStatus;
  verificationType: VerificationType;
  processingMethod: ProcessingMethod;
  verificationLink?: string; // For external_link method
  expiresAt?: string; // ISO timestamp
  result?: {
    overall: {
      status: 'passed' | 'failed' | 'review';
      confidence: number; // 0-100
      riskLevel: 'low' | 'medium' | 'high';
    };
    document?: {
      extracted: {
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string; // YYYY-MM-DD
        nationality?: string; // ISO country code
        documentNumber?: string;
        expirationDate?: string;
        issuingCountry?: string;
      };
      checks: {
        authenticity: 'passed' | 'failed' | 'warning';
        validity: 'passed' | 'failed' | 'warning';
        dataConsistency: 'passed' | 'failed' | 'warning';
        securityFeatures: 'passed' | 'failed' | 'warning';
      };
    };
    biometric?: {
      faceMatch: {
        confidence: number;
        status: 'passed' | 'failed';
      };
      liveness: {
        confidence: number;
        status: 'passed' | 'failed';
      };
    };
  };
  accountId?: string; // May be populated after completion
  createdAt: string;
  updatedAt: string;
}

// GET /verifications (list with filters)
interface VerificationListQuery {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
  status?: VerificationStatus;
  verificationType?: VerificationType;
  accountId?: string; // Filter by user
}

interface VerificationListResponse {
  verifications: VerificationResponse[];
  total: number;
  page: number;
  totalPages: number;
}

// GET /verifications/:verificationId
// Returns single VerificationResponse with real-time status updates

// DELETE /verifications/:verificationId
// Returns 204 No Content on successful cancellation
// Only works for 'pending' or 'in_progress' status
```

### User Management API

```typescript
// GET /verifications/users
interface VerifiedUsersQuery {
  page?: number;
  limit?: number;
}

interface VerifiedUsersResponse {
  users: Array<{
    id: string; // Account UUID
    name?: {
      first?: string;
      last?: string;
    };
    birthdate?: string; // YYYY-MM-DD
    referenceId?: string; // e.g., "US_ABC123456" (nationality_documentNumber)
    verificationCount: number; // Total successful verifications
    lastVerified?: string; // ISO timestamp
    createdAt: string; // Account creation timestamp
  }>;
  total: number;
  page: number;
  totalPages: number;
}
```

### Frontend Implementation Examples

#### 1. Basic Document Verification (JSON)
```typescript
const createBasicVerification = async () => {
  const request: CreateVerificationRequest = {
    verificationType: VerificationType.DOCUMENT,
    documentImages: {
      front: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
      back: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
    },
    callbackUrl: "https://yourapp.com/webhooks/verification",
    expiresIn: 3600, // 1 hour
  };

  try {
    const response = await apiClient.post<VerificationResponse>('/verifications', request);
    // Navigate to verification detail page
    router.push(`/verifications/${response.data.id}`);
    // Optional: image URLs hosted (if enabled) in response.data.result.metadata.imageUrls
  } catch (error) {
    handleApiError(error);
  }
};
```

#### 2. Production-Ready Comprehensive Verification
```typescript
const createComprehensiveVerification = async (formData: VerificationForm) => {
  const request: CreateVerificationRequest = {
    verificationType: VerificationType.COMPREHENSIVE,
    accountId: formData.accountId, // Optional - auto-creation if not provided
    documentImages: {
      front: formData.frontImage, // Base64 with data URL prefix
      back: formData.backImage,
      selfie: formData.selfieImage,
    },
    allowedDocumentTypes: [DocumentType.PASSPORT, DocumentType.DRIVERS_LICENSE],
    expectedCountries: ['US', 'CA', 'GB'],
    callbackUrl: formData.webhookUrl,
    expiresIn: 3600,
    requireLiveness: true,
    requireAddressVerification: false,
    minimumConfidence: 85,
    metadata: {
      userAgent: navigator.userAgent,
      ipAddress: await getUserIP(),
      location: await getUserLocation(),
      device: {
        type: getDeviceType(),
        os: getOS(),
        browser: getBrowser(),
      },
      sessionId: getSessionId(),
      referrer: document.referrer,
      appVersion: import.meta.env.VITE_APP_VERSION,
    },
    customProperties: {
      kycLevel: 'enhanced',
      riskProfile: 'standard',
      complianceRegion: 'US',
      campaignId: 'spring2024',
    },
  };

  return apiClient.post<VerificationResponse>('/verifications', request);
};
```

#### 2.a Mock Simulation (Regula)

Use these simulation flags during development to control outcomes from the mock Regula provider. Simulation is opt-in via `metadata.simulate`.

- Defaults (no simulate): ~90% pass, ~10% fail
- `forceStatus`: `'failed' | 'passed'` forces overall result
- `failureRate`: number 0..1 (e.g., 0.3 for 30% fail probability)
- `poorImageQuality`: boolean (forces failure for poor-quality scenario)
- `expiredDocument`: boolean (forces failure for expired document)
- `confidence`: number 0..100 to override confidence in simulated result

Example (JSON):
```typescript
const request: CreateVerificationRequest = {
  verificationType: VerificationType.DOCUMENT,
  documentImages: {
    front: "data:image/jpeg;base64,....",
    back: "data:image/jpeg;base64,....",
  },
  metadata: {
    simulate: {
      // One of the following patterns:
      // forceStatus: 'failed',
      // forceStatus: 'passed',
      // failureRate: 0.3,
      // poorImageQuality: true,
      // expiredDocument: true,
      confidence: 22,
    },
  },
};
```

Example (multipart):
```typescript
const formData = new FormData();
formData.append('front', fileFront);
formData.append('back', fileBack);
formData.append('verificationType', 'document');
formData.append('metadata', JSON.stringify({
  simulate: { failureRate: 0.25 } // 25% chance to fail
}));
await apiClient.post('/verifications/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

#### 3. File Upload Implementation
```typescript
const createVerificationWithFiles = async (files: FileUploadForm) => {
  const formData = new FormData();
  
  // Add files
  if (files.front) formData.append('front', files.front);
  if (files.back) formData.append('back', files.back);
  if (files.selfie) formData.append('selfie', files.selfie);
  
  // Add form fields
  formData.append('verificationType', files.verificationType);
  if (files.accountId) formData.append('accountId', files.accountId);
  if (files.callbackUrl) formData.append('callbackUrl', files.callbackUrl);
  
  // Add metadata as JSON string
  if (files.metadata) {
    formData.append('metadata', JSON.stringify(files.metadata));
  }

  return apiClient.post<VerificationResponse>('/verifications/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // Extended timeout for file uploads
  });
};
```

#### 4. Real-Time Status Polling
```typescript
const useVerificationPolling = (verificationId: string) => {
  const [verification, setVerification] = useState<VerificationResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!verificationId || !isPolling) return;

    const pollVerification = async () => {
      try {
        const response = await apiClient.get<VerificationResponse>(
          `/verifications/${verificationId}`
        );
        setVerification(response.data);

        // Example: render preview URLs when available
        const urls = response.data.result?.metadata?.imageUrls;
        // urls?.frontUrl, urls?.backUrl, urls?.selfieUrl

        // Stop polling when verification is complete
        const finalStatuses = [
          VerificationStatus.COMPLETED,
          VerificationStatus.FAILED,
          VerificationStatus.EXPIRED,
          VerificationStatus.CANCELLED,
        ];
        
        if (finalStatuses.includes(response.data.status)) {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling on error, but maybe with exponential backoff
      }
    };

    // Initial fetch
    pollVerification();

    // Poll every 3 seconds for pending/in-progress
    const interval = setInterval(pollVerification, 3000);

    return () => clearInterval(interval);
  }, [verificationId, isPolling]);

  return { verification, isPolling, stopPolling: () => setIsPolling(false) };
};
```

#### 5. Verification List with Filters
```typescript
const useVerificationList = () => {
  const [filters, setFilters] = useState<VerificationListQuery>({
    page: 1,
    limit: 20,
  });
  
  const { data, error, mutate } = useSWR(
    ['/verifications', filters],
    ([url, params]) => apiClient.get<VerificationListResponse>(url, { params }).then(r => r.data)
  );

  const updateFilters = (newFilters: Partial<VerificationListQuery>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1
  };

  return {
    verifications: data?.verifications || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 0,
    filters,
    updateFilters,
    refresh: mutate,
    loading: !data && !error,
    error,
  };
};
```

### UI Component Examples

#### Verification Status Badge
```typescript
const VerificationStatusBadge: React.FC<{ status: VerificationStatus }> = ({ status }) => {
  const statusConfig = {
    [VerificationStatus.PENDING]: { color: 'yellow', text: 'Pending' },
    [VerificationStatus.IN_PROGRESS]: { color: 'blue', text: 'Processing' },
    [VerificationStatus.COMPLETED]: { color: 'green', text: 'Completed' },
    [VerificationStatus.FAILED]: { color: 'red', text: 'Failed' },
    [VerificationStatus.EXPIRED]: { color: 'gray', text: 'Expired' },
    [VerificationStatus.CANCELLED]: { color: 'gray', text: 'Cancelled' },
  };

  const config = statusConfig[status];
  return (
    <span className={`badge badge-${config.color}`}>
      {config.text}
    </span>
  );
};
```

#### Verification Data Table
```typescript
interface VerificationTableProps {
  verifications: VerificationResponse[];
  onCancel: (id: string) => void;
  onView: (id: string) => void;
}

const VerificationTable: React.FC<VerificationTableProps> = ({ 
  verifications, 
  onCancel, 
  onView 
}) => {
  const canCancel = (status: VerificationStatus) => 
    [VerificationStatus.PENDING, VerificationStatus.IN_PROGRESS].includes(status);

  return (
    <table className="table table-striped">
      <thead>
        <tr>
          <th>ID</th>
          <th>Type</th>
          <th>Status</th>
          <th>Provider</th>
          <th>Created</th>
          <th>Expires</th>
          <th>Account</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {verifications.map((verification) => (
          <tr key={verification.id}>
            <td>
              <code className="text-truncate" style={{ maxWidth: '100px' }}>
                {verification.id.substring(0, 8)}...
              </code>
            </td>
            <td>
              <span className="text-capitalize">
                {verification.verificationType.replace('_', ' ')}
              </span>
            </td>
            <td>
              <VerificationStatusBadge status={verification.status} />
            </td>
            <td>{verification.providerName}</td>
            <td>{formatDate(verification.createdAt)}</td>
            <td>
              {verification.expiresAt ? (
                <span className={isExpiringSoon(verification.expiresAt) ? 'text-warning' : ''}>
                  {formatDate(verification.expiresAt)}
                </span>
              ) : (
                '-'
              )}
            </td>
            <td>
              {verification.accountId ? (
                <a href={`/users/${verification.accountId}`} className="link">
                  View User
                </a>
              ) : (
                '-'
              )}
            </td>
            <td>
              <div className="btn-group">
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => onView(verification.id)}
                >
                  View
                </button>
                {canCancel(verification.status) && (
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onCancel(verification.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

## Security and Best Practices

### Token Storage
```typescript
// Recommended approach: In-memory storage with React Query
const useAuthStore = () => {
  const [tokens, setTokens] = useState<{
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }>({});

  // Store tokens in memory only (most secure)
  const setAuthTokens = (authData: any) => {
    setTokens({
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      expiresAt: Date.now() + (authData.expiresIn * 1000),
    });
  };

  // Fallback: sessionStorage for refresh token persistence
  const persistRefreshToken = (refreshToken: string) => {
    sessionStorage.setItem('kyc_refresh_token', refreshToken);
  };

  // NEVER use localStorage for admin JWT tokens
  // OK for tenant API keys in development only
  return { tokens, setAuthTokens, persistRefreshToken };
};
```

### File Handling
```typescript
// File upload constraints
const fileConstraints = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  preferredFormat: 'image/jpeg',
  maxDimensions: { width: 2048, height: 2048 },
  compression: { quality: 0.85 },
};

// Client-side image processing
const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      const { width, height } = calculateDimensions(img, fileConstraints.maxDimensions);
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with compression
      const base64 = canvas.toDataURL('image/jpeg', fileConstraints.compression.quality);
      resolve(base64);
    };
    
    img.src = URL.createObjectURL(file);
  });
};
```

### PII and Data Protection
```typescript
// Safe logging - never log sensitive data
const logVerificationEvent = (verification: VerificationResponse) => {
  console.log('Verification event:', {
    id: verification.id,
    status: verification.status,
    type: verification.verificationType,
    provider: verification.providerName,
    // DO NOT LOG: result, documentImages, extracted data
  });
};

// Mask sensitive data in UI
const maskId = (id: string, visibleChars = 8) => 
  `${id.substring(0, visibleChars)}...`;

const maskEmail = (email: string) => {
  const [user, domain] = email.split('@');
  return `${user.substring(0, 2)}***@${domain}`;
};
```

## Recommended Libraries and Architecture

### Core Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "@tanstack/react-query": "^4.28.0",
    "axios": "^1.3.0",
    "swr": "^2.1.0",
    "zod": "^3.21.0",
    "react-hook-form": "^7.43.0",
    "@hookform/resolvers": "^3.0.0",
    "date-fns": "^2.29.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.2.0"
  }
}
```

### UI Component Libraries (Choose One)
```typescript
// Option 1: Ant Design (Comprehensive)
import { Table, Button, Form, Upload, Badge, Card } from 'antd';

// Option 2: Material-UI (Google Design)
import { DataGrid, Button, TextField, Chip, Card } from '@mui/material';

// Option 3: Chakra UI (Simple & Fast)
import { Table, Button, FormControl, Badge, Box } from '@chakra-ui/react';

// Option 4: TailwindCSS + Headless UI (Custom)
import { Disclosure, Menu, Dialog } from '@headlessui/react';
```

### Shared Components Architecture
```typescript
// src/components/common/
export { AuthGuard } from './AuthGuard';
export { DataTable } from './DataTable';
export { FileUpload } from './FileUpload';
export { StatusBadge } from './StatusBadge';
export { ErrorBoundary } from './ErrorBoundary';
export { LoadingSpinner } from './LoadingSpinner';

// src/hooks/
export { useAuth } from './useAuth';
export { useVerifications } from './useVerifications';
export { useFileUpload } from './useFileUpload';
export { usePolling } from './usePolling';

// src/services/
export { apiClient } from './api';
export { authService } from './auth';
export { verificationService } from './verification';
```

## Error Handling and UX

### Global Error Handler
```typescript
const GlobalErrorHandler: React.FC = () => {
  const handleApiError = (error: any) => {
    const apiError = error.response?.data as ApiError;
    
    switch (error.response?.status) {
      case 401:
        // Redirect to login
        authService.logout();
        window.location.href = '/login';
        break;
        
      case 403:
        toast.error('Access denied. Insufficient permissions.');
        break;
        
      case 422:
        // Business logic errors
        if (apiError.message.includes('Provider not configured')) {
          toast.error('No verification provider configured. Contact administrator.');
        } else {
          toast.error(apiError.message);
        }
        break;
        
      case 429:
        toast.warning('Rate limit exceeded. Please wait before trying again.');
        break;
        
      default:
        toast.error(apiError?.message || 'An unexpected error occurred');
    }
  };

  return null; // This is just a service component
};
```

### Loading States and Feedback
```typescript
// Loading states for different scenarios
const LoadingStates = {
  // File upload
  uploading: 'Uploading and processing images...',
  
  // Verification processing
  processing: 'Running document verification...',
  
  // Provider communication
  provider: 'Communicating with verification provider...',
  
  // Data loading
  loading: 'Loading verification data...',
};

// Progress indicators
const VerificationProgress: React.FC<{ status: VerificationStatus }> = ({ status }) => {
  const steps = [
    { key: 'pending', label: 'Submitted', completed: true },
    { key: 'in_progress', label: 'Processing', completed: status !== 'pending' },
    { key: 'completed', label: 'Complete', completed: status === 'completed' },
  ];
  
  return (
    <div className="progress-steps">
      {steps.map((step, index) => (
        <div key={step.key} className={`step ${step.completed ? 'completed' : ''}`}>
          <div className="step-indicator">{index + 1}</div>
          <div className="step-label">{step.label}</div>
        </div>
      ))}
    </div>
  );
};
```

## Edge Cases and Error Scenarios

### Provider Configuration Issues
```typescript
// Handle "Provider not configured" error
const ProviderNotConfiguredAlert: React.FC<{ tenantId: string }> = ({ tenantId }) => (
  <div className="alert alert-warning">
    <h4>Verification Provider Not Configured</h4>
    <p>Your account doesn't have a KYC verification provider assigned.</p>
    <p>
      Contact your administrator or{' '}
      <a href={`/admin/tenants/${tenantId}/providers`}>configure providers</a>{' '}
      to enable identity verification.
    </p>
  </div>
);

// Handle provider errors gracefully
const handleProviderError = (error: any) => {
  if (error.message?.includes('Provider not available')) {
    return 'Verification service temporarily unavailable. Please try again later.';
  }
  if (error.message?.includes('Daily limit exceeded')) {
    return 'Daily verification limit reached. Please try again tomorrow.';
  }
  return 'Verification failed. Please check your documents and try again.';
};
```

### Auto-Account Creation Handling
```typescript
// Handle dynamic account linking
const useAccountLinking = (verificationId: string) => {
  const [accountLinked, setAccountLinked] = useState(false);
  
  useEffect(() => {
    // Listen for account creation from successful verification
    const checkAccountLinking = async () => {
      const verification = await getVerification(verificationId);
      if (verification.accountId && !accountLinked) {
        setAccountLinked(true);
        toast.success('User account created automatically from verification results!');
      }
    };
    
    // Check periodically for account linking
    const interval = setInterval(checkAccountLinking, 2000);
    return () => clearInterval(interval);
  }, [verificationId, accountLinked]);
  
  return accountLinked;
};
```

## Complete API Reference

### Admin Endpoints (JWT Required)
```typescript
// Authentication
POST   /auth/login                                // Admin login
POST   /auth/refresh                              // Refresh admin token
POST   /auth/logout                               // Admin logout

// Provider Management
GET    /admin/providers                           // List available providers
GET    /admin/providers/tenants/:tenantId         // List tenant's provider assignments
POST   /admin/providers/tenants/:tenantId/assign  // Assign provider to tenant
PUT    /admin/providers/configs/:configId         // Update provider configuration
DELETE /admin/providers/configs/:configId         // Remove provider assignment

// Tenant Management (Admin-only; base path is /tenants)
GET    /tenants                                   // List all tenants
POST   /tenants                                   // Create tenant
GET    /tenants/:tenantId                         // Get tenant details
PUT    /tenants/:tenantId                         // Update tenant
DELETE /tenants/:tenantId                         // Soft delete tenant
POST   /tenants/:tenantId/api-keys                // Create tenant API key
GET    /tenants/:tenantId/api-keys                // List tenant API keys (includes maskedKey)
// Copy/rotate removed by product decision; create a new key to obtain a copyable value
DELETE /tenants/:tenantId/api-keys/:apiKeyId      // Revoke tenant API key
PUT    /tenants/:tenantId/api-keys/:apiKeyId      // Update API key (name, expiresAt, status)
POST   /tenants/:tenantId/api-keys/:apiKeyId/rotate // Rotate API key (returns new key once)
GET    /tenants/:tenantId/stats                   // Tenant statistics

// NEW: Tenant Users (Admin views)
GET    /tenants/:tenantId/users                   // List users (accounts) in tenant (page, limit)
GET    /tenants/:tenantId/users/:accountId        // Get user details within tenant
GET    /tenants/:tenantId/users/:accountId/overview // Get user + their verifications + aggregated image URLs
```

#### Create Tenant (Admin)

Request:

```json
POST /tenants
{
  "name": "Acme Corp",
  "email": "admin@acme.test",
  "status": "active", // optional: active | inactive | suspended | pending
  "settings": {
    "webhookUrl": "https://api.acme.test/kyc/webhook"
  }
}
```

Response:

```json
{
  "id": "77815e4c-a3e8-41fb-90c5-ed3aeb79f859",
  "name": "Acme Corp",
  "email": "admin@acme.test",
  "status": "active",
  "settings": {
    "webhookUrl": "https://api.acme.test/kyc/webhook",
    "imgbbAlbumId": "abc123",      // present if backend has IMGBB_API_KEY configured
    "imgbbAlbumUrl": "https://ibb.co/..."
  },
  "createdAt": "2025-08-15T06:45:12.000Z",
  "updatedAt": "2025-08-15T06:45:12.000Z"
}
```

Notes:
- Requires Admin JWT in `Authorization: Bearer <ADMIN_JWT>`.
- If the backend is configured with `IMGBB_API_KEY`, images are uploaded to imgbb. Since imgbb album API is limited, we use a virtual album prefix saved in `settings.imgbbPrefix` (default: `tenant_<TENANT_ID>`). All uploaded image names are prefixed with this value. If you manually created a real album like `kyc-album`, you can set `settings.imgbbPrefix` to `kyc-album` on the tenant to group images consistently.

Axios example:

```typescript
const createTenant = async (payload: { name: string; email: string; status?: string; settings?: any }) => {
  return apiClient.post('/tenants', payload).then(r => r.data);
};
```

### Tenant Endpoints (JWT or API Key)
```typescript
// Authentication
POST   /tenant/auth/login                        // Tenant login
POST   /tenant/auth/refresh                      // Refresh tenant token
POST   /tenant/auth/logout                       // Single device logout
POST   /tenant/auth/logout-all                   // All devices logout

// Verification Management
POST   /verifications                            // Create verification (JSON)
POST   /verifications/upload                     // Create verification (multipart)
GET    /verifications/:verificationId           // Get verification details
GET    /verifications                           // List verifications (with filters)
DELETE /verifications/:verificationId          // Cancel verification

// User Management
GET    /verifications/users                     // List verified users
```

#### Render Document Images in Verification Detail

```tsx
// Example component that renders document images (if available)
const VerificationImages: React.FC<{ verification: VerificationResponse | null }> = ({ verification }) => {
  const urls = verification?.result?.metadata?.imageUrls as
    | { frontUrl?: string; backUrl?: string; selfieUrl?: string }
    | undefined;
  if (!urls) return null;

  return (
    <div className="doc-images">
      {urls.frontUrl && (
        <div>
          <div className="label">Front</div>
          <img src={urls.frontUrl} alt="Document Front" loading="lazy" style={{ maxWidth: 320 }} />
        </div>
      )}
      {urls.backUrl && (
        <div>
          <div className="label">Back</div>
          <img src={urls.backUrl} alt="Document Back" loading="lazy" style={{ maxWidth: 320 }} />
        </div>
      )}
      {urls.selfieUrl && (
        <div>
          <div className="label">Selfie</div>
          <img src={urls.selfieUrl} alt="Selfie" loading="lazy" style={{ maxWidth: 320 }} />
        </div>
      )}
    </div>
  );
};
```

### Admin acting as Tenant

- Admins can query tenant verifications by specifying the tenant to act as.
- Use either header or query:
  - Header: `X-Tenant-Id: <tenant-uuid>`
  - Query: `?tenantId=<tenant-uuid>` or `?tenant_id=<tenant-uuid>`
- Works with Admin JWT or Admin API key.

Examples:

```bash
# List tenant verifications as admin
curl -H "Authorization: Bearer <ADMIN_JWT>" \
     -H "X-Tenant-Id: <TENANT_ID>" \
     "http://localhost:3000/api/v1/verifications?page=1&limit=50"

# Or via query param
curl -H "Authorization: Bearer <ADMIN_JWT>" \
     "http://localhost:3000/api/v1/verifications?tenantId=<TENANT_ID>&page=1&limit=50"
```

Axios usage:

```typescript
// For admin pages where you select a tenant first
const listVerificationsAsAdmin = (tenantId: string, params: VerificationListQuery) => {
  return apiClient.get<VerificationListResponse>('/verifications', {
    params,
    headers: { 'X-Tenant-Id': tenantId },
  }).then(r => r.data);
};

// Admin: List tenant users
const listTenantUsers = (tenantId: string, page = 1, limit = 20) => {
  return apiClient.get(`/tenants/${tenantId}/users`, {
    params: { page, limit },
  }).then(r => r.data);
};

// Admin: Get tenant user details
const getTenantUser = (tenantId: string, accountId: string) => {
  return apiClient.get(`/tenants/${tenantId}/users/${accountId}`).then(r => r.data);
};

// Admin: Get tenant user overview (details + verifications + flat image list)
const getTenantUserOverview = (tenantId: string, accountId: string) => {
  return apiClient
    .get(`/tenants/${tenantId}/users/${accountId}/overview`)
    .then(r => r.data as {
      user: {
        id: string;
        name?: { first?: string; last?: string };
        birthdate?: string;
        referenceId?: string;
        createdAt: string;
      };
      verifications: Array<{
        id: string;
        status: VerificationStatus;
        providerName: string;
        createdAt: string;
        imageUrls?: { frontUrl?: string; backUrl?: string; selfieUrl?: string };
      }>;
      images: Array<{ type: 'front' | 'back' | 'selfie' | string; url: string; verificationId?: string }>;
      stats: { verificationCount: number; lastVerified?: string | null };
    });
};

// Admin: List tenant API keys
const listTenantApiKeys = (tenantId: string) => {
  return apiClient
    .get(`/tenants/${tenantId}/api-keys`)
    .then(r => r.data as Array<{
      id: string;
      tenantId: string;
      name: string;
      status: 'active' | 'inactive' | 'expired' | 'revoked';
      expiresAt?: string;
      lastUsedAt?: string;
      createdAt: string;
      updatedAt: string;
      isActive: boolean;
      isExpired: boolean;
      maskedKey: string; // for display purposes only
    }>);
};
// Admin: Create API key (returns the actual API key once; FE must display + allow copy at creation time)
const createTenantApiKey = (
  tenantId: string,
  payload: { name: string; expiresAt?: string },
) => {
  return apiClient.post(`/tenants/${tenantId}/api-keys`, payload).then(r => r.data as {
    id: string;
    tenantId: string;
    name: string;
    status: 'active' | 'inactive' | 'expired' | 'revoked';
    expiresAt?: string;
    lastUsedAt?: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    isExpired: boolean;
    apiKey: string; // IMPORTANT: only returned on creation; FE must copy/persist securely now
  });
};
// Copy/rotate flow removed; guide users to create a new key via createTenantApiKey and copy there

// UI wiring example (per-row action in API keys table):
// On each row you have key.id; pass that id into copy/rotate so the backend operates on the specific key
// This avoids any ambiguity about which key is being rotated/copied.
// Per-row action: offer Revoke, Update name/expiration, but not Copy (since raw values are never shown post-create)

// FE guidance:
// - Provide Copy button on create and rotate flows to capture the key.
// - After navigation, the key cannot be fetched again; only metadata is available via list/update.

// FE guidance:
// - On successful create, show a modal/toast with the key and a copy button.
// - Warn the user the key won’t be retrievable later; they must store it securely.

// Admin: Update API key (set name, change/remove expiration, or update status)
const updateTenantApiKey = (
  tenantId: string,
  apiKeyId: string,
  payload: { name?: string; expiresAt?: string | null; status?: 'active' | 'inactive' | 'expired' | 'revoked' },
) => {
  return apiClient.put(`/tenants/${tenantId}/api-keys/${apiKeyId}`, payload).then(r => r.data);
};

// Examples:
// - Set name: { name: 'New Name' }
// - Set expiration: { expiresAt: '2026-01-01T00:00:00.000Z' }
// - Remove expiration: { expiresAt: null }
// - Change status: { status: 'inactive' }

// Admin: Get tenant statistics (now includes totalVerifications and lastVerificationAt)
const getTenantStats = (tenantId: string) => {
  return apiClient.get(`/tenants/${tenantId}/stats`).then(r => r.data as {
    apiKeyCount: number;
    activeApiKeyCount: number;
    accountCount: number;
    inquiryCount: number;
    totalVerifications: number;
    lastVerificationAt: string | null;
  });
};
```

### Production Deployment Notes

1. **Environment Variables**
   ```env
   VITE_API_BASE_URL=https://api.yourapp.com/api/v1
   VITE_SWAGGER_URL=https://api.yourapp.com/api/docs
   VITE_APP_VERSION=1.0.0
   VITE_SENTRY_DSN=https://your-sentry-dsn
   ```

2. **Build Configuration**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     build: {
       sourcemap: false, // Disable in production
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             router: ['react-router-dom'],
             ui: ['antd'], // or your UI library
           },
         },
       },
     },
   });
   ```

3. **Security Headers**
   ```typescript
   // Add to your hosting platform
   const securityHeaders = {
     'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
     'X-Frame-Options': 'DENY',
     'X-Content-Type-Options': 'nosniff',
     'Referrer-Policy': 'strict-origin-when-cross-origin',
   };
   ```

This context provides everything needed to build production-ready admin and tenant dashboards with proper error handling, security, and UX considerations.
