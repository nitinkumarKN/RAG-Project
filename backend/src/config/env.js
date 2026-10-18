import dotenv from 'dotenv';

dotenv.config();

function normalizeServiceUrl(value) {
  return value.replace(/\/+$/, '').replace(/\/api$/, '');
}

function getClientUrls() {
  const configuredUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  configuredUrls.push('https://rag-project-az0l.onrender.com');

  return [...new Set(configuredUrls)];
}

// Centralized environment access keeps startup code easy to read and test.
export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  clientUrls: getClientUrls(),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  aiServiceUrl: normalizeServiceUrl(process.env.AI_SERVICE_URL || 'http://localhost:8000'),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 20),
  allowedUploadMimeTypes: ['application/pdf'],
};
