# KYC Adapter Frontend Development Context

**🎯 Purpose:** This document provides complete context for developing a frontend demo application for our KYC (Know Your Customer) adapter system.

**📅 Created:** January 28, 2025  
**🔗 Backend Location:** `C:\Users\Datafied\Desktop\chris\KYC\KYC_ADAPTER`  
**🚀 Next Step:** Create frontend demo in separate directory

---

## 📋 **Project Overview**

We have built a **comprehensive NestJS KYC adapter** that integrates with Regula document verification. The system is **enterprise-ready** with multi-tenant architecture, automatic user management, and production-grade APIs.

### **Current System Capabilities**
- ✅ **Document Verification** with Regula integration (mock + real ready)
- ✅ **Multi-tenant Architecture** with role-based access
- ✅ **Automatic User Management** (creates accounts from successful verifications)
- ✅ **Verification Expiration** (configurable 5min-24hrs)
- ✅ **File Upload Support** (base64 JSON + multipart uploads)
- ✅ **Production-Ready APIs** with comprehensive validation
- ✅ **Complete Documentation** and testing scripts

---

## 🔗 **API Endpoints (Running on localhost:3000)**

### **Authentication**
```bash
# Tenant Login
POST http://localhost:3000/api/v1/tenant/auth/login
Content-Type: application/json

{
  "email": "test@kyc-adapter.dev",
  "password": "tenant123"
}

# Returns: { "accessToken": "eyJhbGciOiJIUzI1NiIs...", ... }
```

### **Document Verification (Primary Endpoints)**
```bash
# 1. Create Verification (JSON with base64 images)
POST http://localhost:3000/api/v1/verifications
Authorization: Bearer {accessToken}
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
  "expiresIn": 3600,
  "requireLiveness": true,
  "minimumConfidence": 85,
  "callbackUrl": "https://yourapp.com/webhook",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.100",
    "sessionId": "demo-session-123"
  }
}

# 2. Create Verification (Multipart File Upload)
POST http://localhost:3000/api/v1/verifications/upload
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

# Form fields:
# - front: [File] Document front image
# - back: [File] Document back image (optional)
# - selfie: [File] Selfie photo (optional)
# - verificationType: "document"
# - callbackUrl: "https://yourapp.com/webhook"
# - metadata: '{"sessionId": "demo-123"}'

# 3. Get Verification Status
GET http://localhost:3000/api/v1/verifications/{verificationId}
Authorization: Bearer {accessToken}

# 4. List Verifications
GET http://localhost:3000/api/v1/verifications?page=1&limit=20
Authorization: Bearer {accessToken}

# 5. Get Verified Users
GET http://localhost:3000/api/v1/verifications/users?page=1&limit=20
Authorization: Bearer {accessToken}
```

### **API Response Format**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "verificationType": "document",
  "processingMethod": "direct",
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
        "documentNumber": "123456789",
        "expiryDate": "2030-01-01"
      },
      "checks": {
        "authenticity": "passed",
        "validity": "passed", 
        "dataConsistency": "passed"
      },
      "confidence": 94
    },
    "regula": {
      "documentType": "US_PASSPORT",
      "mrz": {
        "validity": "valid",
        "checkDigits": "passed"
      },
      "securityFeatures": {
        "hologram": true,
        "uvFeatures": true,
        "irFeatures": true
      },
      "lightSourceChecks": {
        "white": "passed",
        "uv": "passed",
        "ir": "passed"
      }
    },
    "biometric": {
      "livenessCheck": "passed",
      "faceMatch": "passed",
      "confidence": 92
    },
    "metadata": {
      "provider": "regula",
      "processingTime": 2340,
      "sdk_version": "8.2.0"
    }
  },
  "expiresAt": "2025-01-28T11:30:00.000Z",
  "createdAt": "2025-01-28T10:30:00.000Z",
  "updatedAt": "2025-01-28T10:30:02.340Z"
}
```

---

## 🎨 **Frontend Requirements**

### **Primary Goals**
1. **Document Capture Interface** - Camera + file upload for documents
2. **Real-time Verification Flow** - Show processing status and results
3. **Results Visualization** - Display extracted data and security checks
4. **Demo Playground** - Sample documents and test scenarios
5. **Professional UI** - Clean, modern interface for stakeholder demos

### **Core Components Needed**
```typescript
// 1. Document Capture Component
<DocumentCapture
  onCapture={(files) => handleVerification(files)}
  modes={["camera", "upload", "drag-drop"]}
  supportedTypes={["passport", "drivers_license", "id_card"]}
  preview={true}
/>

// 2. Verification Status Component  
<VerificationStatus
  verificationId={id}
  onStatusChange={(status) => handleStatusUpdate(status)}
  pollInterval={2000}
/>

// 3. Results Display Component
<VerificationResults
  result={verificationData}
  showRegulAnalysis={true}
  showExtractedData={true}
  showSecurityChecks={true}
/>

// 4. Demo Playground Component
<DemoPlayground
  sampleDocuments={sampleDocs}
  testScenarios={scenarios}
  onDemoSelect={(demo) => runDemo(demo)}
/>
```

### **Recommended Tech Stack** ⭐
- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS + Headless UI components
- **File Handling:** react-dropzone + react-webcam
- **HTTP Client:** Axios with interceptors
- **State Management:** Zustand (lightweight for demos)
- **Forms:** React Hook Form + Zod validation
- **Charts:** Chart.js or Recharts (for confidence scores)
- **Build Tool:** Vite (faster development & building)

### **Why React + Vite for This Demo?**
```bash
✅ Lightning fast development (HMR in ~50ms)
✅ Lighter bundle size for mobile browsers
✅ Simple architecture - perfect for demos
✅ No SSR overhead (not needed for demo)
✅ Easy deployment to any static host
✅ Faster builds and iteration cycles
✅ Perfect for camera/file upload functionality
```

### **Key Features to Implement**
```bash
# Phase 1: Core Verification Flow (Day 1-2)
- [ ] Document capture (camera + upload)
- [ ] Authentication flow  
- [ ] Verification creation
- [ ] Status polling
- [ ] Results display

# Phase 2: Enhanced UX (Day 3-4)
- [ ] Drag & drop file upload
- [ ] Real-time progress indicators
- [ ] Error handling and validation
- [ ] Mobile-responsive design

# Phase 3: Demo Features (Day 5-7)
- [ ] Sample document library
- [ ] Test scenarios (valid/invalid/expired docs)
- [ ] Admin dashboard
- [ ] API explorer
```

---

## 🧪 **Sample Test Data**

### **Test Credentials**
```json
{
  "email": "test@kyc-adapter.dev",
  "password": "tenant123"
}
```

### **Sample Base64 Images** (1x1 pixel for testing)
```javascript
const sampleImages = {
  front: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA9/9k=",
  back: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA9/9k=",
  selfie: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA9/9k="
};
```

### **Sample Verification Request**
```javascript
const sampleVerificationRequest = {
  verificationType: "document",
  documentImages: sampleImages,
  allowedDocumentTypes: ["passport", "drivers_license", "id_card"],
  expectedCountries: ["US", "CA", "GB"],
  expiresIn: 3600,
  requireLiveness: true,
  minimumConfidence: 85,
  callbackUrl: "https://demo.app/webhook",
  metadata: {
    userAgent: navigator.userAgent,
    ipAddress: "192.168.1.100",
    sessionId: `demo-${Date.now()}`,
    location: {
      country: "US",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    appVersion: "1.0.0"
  }
};
```

---

## 🔧 **API Client Setup**

### **Axios Configuration**
```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### **API Functions**
```typescript
// lib/kyc-api.ts
export const kycApi = {
  // Authentication
  login: (email: string, password: string) =>
    api.post('/tenant/auth/login', { email, password }),

  // Verification
  createVerification: (data: CreateVerificationRequest) =>
    api.post('/verifications', data),
    
  uploadVerification: (formData: FormData) =>
    api.post('/verifications/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    
  getVerification: (id: string) =>
    api.get(`/verifications/${id}`),
    
  listVerifications: (params?: { page?: number; limit?: number }) =>
    api.get('/verifications', { params }),
    
  getVerifiedUsers: (params?: { page?: number; limit?: number }) =>
    api.get('/verifications/users', { params }),
};
```

---

## 🎪 **Demo Scenarios to Implement**

### **1. Happy Path Demo**
- Upload passport image → Show processing → Display extracted data
- Confidence score visualization
- Security checks breakdown

### **2. Error Scenarios**
- Invalid file format
- Expired document
- Low confidence score
- Network errors

### **3. Feature Showcase**
- Multiple document types (passport, license, ID)
- Different verification statuses
- User account creation flow
- Verification expiration demo

---

## 🚀 **Getting Started Commands**

```bash
# 1. Start the backend (in current directory)
cd C:\Users\Datafied\Desktop\chris\KYC\KYC_ADAPTER
npm run start:dev  # Backend runs on http://localhost:3000

# 2. In new chat/directory, create frontend:
npm create vite@latest kyc-frontend -- --template react-ts
cd kyc-frontend

# 3. Install dependencies:
npm install
npm install axios react-dropzone react-webcam
npm install @headlessui/react @heroicons/react
npm install tailwindcss postcss autoprefixer -D
npx tailwindcss init -p
npm install react-hook-form @hookform/resolvers zod zustand

# 4. Start development:
npm run dev  # Frontend runs on http://localhost:5173
```

---

## 📚 **Reference Files**

**In the backend directory (`C:\Users\Datafied\Desktop\chris\KYC\KYC_ADAPTER`):**
- `README.md` - Complete system overview
- `API_DOCUMENTATION.md` - Detailed API reference  
- `KYC_DIAGRAMS.md` - System architecture diagrams
- `CHANGELOG.md` - Recent changes and features
- `src/verifications/dto/` - DTO definitions for TypeScript types
- `test-kyc-flow.ps1` - Working test script example

---

## 🎯 **Success Criteria**

**The frontend demo should:**
1. ✅ **Authenticate** with our KYC API
2. ✅ **Capture documents** via camera or file upload
3. ✅ **Create verifications** using our API
4. ✅ **Display real-time status** during processing
5. ✅ **Show comprehensive results** (extracted data, security checks, confidence)
6. ✅ **Handle errors gracefully** with good UX
7. ✅ **Work on mobile** for document capture
8. ✅ **Include demo playground** with sample documents

**Bonus features:**
- User management interface
- Admin dashboard
- API explorer/playground
- Verification history
- Export functionality

---

## 💡 **Notes for Frontend Developer**

1. **Backend is fully functional** - All APIs work and return real data
2. **Mock Regula responses** - Currently using realistic mock data (easy to swap for real Regula later)
3. **Authentication required** - All verification endpoints need Bearer token
4. **File size limits** - 10MB per file, supports JPEG/PNG/PDF
5. **Real-time polling** - Verification status can be polled every 2-3 seconds
6. **Mobile-first design** - Document capture should work well on phones
7. **Error handling** - API returns comprehensive error messages in standard format

**This system is production-ready on the backend - your frontend will be the cherry on top! 🍒**

---

*This document contains everything needed to build a professional KYC frontend demo. Share this with the frontend developer for complete context.*
