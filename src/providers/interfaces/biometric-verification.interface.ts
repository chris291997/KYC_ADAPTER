import { RiskLevel, QualityLevel } from './common.interface';

/**
 * Biometric verification request interface
 */
export interface BiometricVerificationRequest {
  // Primary selfie image
  selfieFile: Express.Multer.File;

  // Reference image (from document or previous verification)
  referenceFile?: Express.Multer.File;
  referenceImageData?: string; // Base64 encoded

  // Client and request metadata
  clientId: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;

  // Verification options
  options?: BiometricVerificationOptions;

  // Provider-specific configuration
  providerConfig?: Record<string, any>;
}

/**
 * Biometric verification response interface (standardized)
 */
export interface BiometricVerificationResponse {
  // Basic verification result
  isMatch: boolean;
  confidenceScore: number; // 0.0 to 1.0
  matchScore: number; // Similarity score

  // Liveness detection
  livenessCheck: LivenessCheckResult;

  // Face analysis
  faceAnalysis: FaceAnalysisResult;

  // Quality assessment
  imageQuality: BiometricImageQuality;

  // Metadata
  verificationId: string;
  processingTime: number;
  timestamp: Date;

  // Raw provider response
  providerResponse: any;

  // Errors and warnings
  errors?: string[];
  warnings?: string[];
}

/**
 * Biometric verification options
 */
export interface BiometricVerificationOptions {
  // What to verify
  performLivenessCheck?: boolean;
  performFaceMatch?: boolean;
  performAgeEstimation?: boolean;
  performGenderDetection?: boolean;

  // Sensitivity settings
  matchThreshold?: number;
  livenessThreshold?: number;
  strictMode?: boolean;

  // Quality requirements
  minimumQualityScore?: number;
  requireHighResolution?: boolean;

  // Output preferences
  includeFaceRegions?: boolean;
  includeLandmarks?: boolean;
  includeQualityDetails?: boolean;
}

/**
 * Liveness detection result
 */
export interface LivenessCheckResult {
  isLive: boolean;
  confidenceScore: number;
  livenessScore: number;

  // Detection methods used
  methods: LivenessMethod[];

  // Specific checks
  blinkDetection?: boolean;
  motionDetection?: boolean;
  textureAnalysis?: boolean;
  depthAnalysis?: boolean;

  // Spoofing detection
  spoofingIndicators?: SpoofingIndicator[];
  riskLevel: RiskLevel;
}

/**
 * Face analysis results
 */
export interface FaceAnalysisResult {
  // Face detection
  facesDetected: number;
  faceRegions?: FaceRegion[];

  // Demographics (if enabled)
  estimatedAge?: number;
  estimatedGender?: string;

  // Facial features
  facialLandmarks?: FacialLandmark[];
  faceAttributes?: FaceAttributes;

  // Pose and orientation
  headPose?: HeadPose;
  eyeDirection?: EyeDirection;
}

/**
 * Biometric image quality assessment
 */
export interface BiometricImageQuality {
  overall: QualityLevel;

  // Technical quality
  resolution: QualityLevel;
  brightness: QualityLevel;
  contrast: QualityLevel;
  sharpness: QualityLevel;

  // Face-specific quality
  faceSize: QualityLevel;
  facePosition: QualityLevel;
  eyeOpenness: QualityLevel;
  mouthClosure: QualityLevel;

  // Environmental factors
  lighting: QualityLevel;
  background: QualityLevel;
  glare: QualityLevel;
  shadows: QualityLevel;

  // Recommendations
  qualityScore: number;
  recommendations?: string[];
}

/**
 * Face region coordinates
 */
export interface FaceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

/**
 * Facial landmark points
 */
export interface FacialLandmark {
  type: LandmarkType;
  x: number;
  y: number;
  confidence: number;
}

/**
 * Face attributes
 */
export interface FaceAttributes {
  eyesOpen?: boolean;
  mouthOpen?: boolean;
  smiling?: boolean;
  wearingGlasses?: boolean;
  wearingMask?: boolean;
  facialHair?: string;
  makeup?: boolean;
  emotions?: EmotionScores;
}

/**
 * Head pose estimation
 */
export interface HeadPose {
  pitch: number; // Up/down rotation
  yaw: number; // Left/right rotation
  roll: number; // Tilt rotation
}

/**
 * Eye direction/gaze
 */
export interface EyeDirection {
  leftEye: GazeDirection;
  rightEye: GazeDirection;
}

/**
 * Gaze direction
 */
export interface GazeDirection {
  x: number;
  y: number;
  confidence: number;
}

/**
 * Emotion detection scores
 */
export interface EmotionScores {
  happiness: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
  neutral: number;
}

/**
 * Liveness detection methods
 */
export enum LivenessMethod {
  PASSIVE = 'passive',
  ACTIVE_BLINK = 'active_blink',
  ACTIVE_MOTION = 'active_motion',
  CHALLENGE_RESPONSE = 'challenge_response',
  DEPTH_ANALYSIS = 'depth_analysis',
}

/**
 * Spoofing attack indicators
 */
export enum SpoofingIndicator {
  PRINT_ATTACK = 'print_attack',
  REPLAY_ATTACK = 'replay_attack',
  MASK_ATTACK = 'mask_attack',
  DEEPFAKE = 'deepfake',
  SCREEN_CAPTURE = 'screen_capture',
  LOW_QUALITY_IMAGE = 'low_quality_image',
}

/**
 * Facial landmark types
 */
export enum LandmarkType {
  LEFT_EYE = 'left_eye',
  RIGHT_EYE = 'right_eye',
  NOSE_TIP = 'nose_tip',
  LEFT_MOUTH_CORNER = 'left_mouth_corner',
  RIGHT_MOUTH_CORNER = 'right_mouth_corner',
  CHIN = 'chin',
  LEFT_EYEBROW = 'left_eyebrow',
  RIGHT_EYEBROW = 'right_eyebrow',
}

// Re-export for external consumers
export { RiskLevel, QualityLevel } from './common.interface';
