// backend/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Helper to load and parse .env manually to avoid 'dotenv' package dependency issues
function loadEnv() {
    const potentialPaths = [
        // relative to __dirname (works if __dirname is available)
        typeof __dirname !== 'undefined' ? resolve(__dirname, '../.env') : null,
        // relative to process.cwd()
        resolve(process.cwd(), '../.env'),
        resolve(process.cwd(), '.env'),
    ].filter(Boolean) as string[];

    for (const envPath of potentialPaths) {
        try {
            const envContent = readFileSync(envPath, 'utf8');
            for (const line of envContent.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                
                const index = trimmed.indexOf('=');
                if (index > 0) {
                    const key = trimmed.substring(0, index).trim();
                    let val = trimmed.substring(index + 1).trim();
                    
                    // Strip surrounding quotes
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            }
            break; // Stop at the first successfully loaded .env file
        } catch {
            // Keep trying next path
        }
    }
}

loadEnv();

const dbUser = process.env.DB_USER || 'acp_user';
const dbPassword = process.env.DB_PASSWORD || 'devpassword123';
const dbName = process.env.DB_NAME || 'chatbot_platform_db';

export default defineConfig({
    schema: './src/database/schema.ts',
    out: './drizzle', // Directory for generated migrations
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || `postgresql://${dbUser}:${dbPassword}@localhost:5432/${dbName}`,
    },
    verbose: true,
    strict: true,
});