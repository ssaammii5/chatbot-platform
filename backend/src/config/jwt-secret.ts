// backend/src/config/jwt-secret.ts
// Tiered JWT secret resolution per security guidelines:
// 1. Environment variable (production)
// 2. Local file (development)
// 3. Ephemeral random generation + warning (testing only)

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

let cachedSecret: string | null = null;

export function getJwtSecret(): string {
  if (cachedSecret) {
    return cachedSecret;
  }

  // Tier 1: Environment variable
  const envSecret = process.env.JWT_SECRET_KEY;
  if (envSecret && envSecret.length >= 32) {
    cachedSecret = envSecret;
    return cachedSecret;
  }

  // Tier 2: Local file
  const secretFilePath = path.resolve(process.cwd(), 'jwt_secret.txt');
  try {
    if (fs.existsSync(secretFilePath)) {
      const fileSecret = fs.readFileSync(secretFilePath, 'utf-8').trim();
      if (fileSecret.length >= 32) {
        cachedSecret = fileSecret;
        return cachedSecret;
      }
    }
  } catch {
    // File not readable, fall through
  }

  // Tier 3: Production must have a real secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: JWT_SECRET_KEY environment variable is required in production. ' +
      'Generate one with: openssl rand -hex 32',
    );
  }

  // Tier 3 (dev/test only): Generate ephemeral secret with severe warning
  console.warn(
    '⚠️  WARNING: Generating ephemeral JWT secret. ' +
    'This instance is isolated — JWTs will NOT be valid across restarts or multiple instances. ' +
    'Set JWT_SECRET_KEY environment variable for persistent sessions.',
  );
  cachedSecret = crypto.randomBytes(32).toString('hex');
  return cachedSecret;
}
