import 'dotenv/defineConfig';
import { defineConfig } from 'drizzle-kit';

const dbUser = process.env.DB_USER || 'acp_user';
const dbPassword = process.env.DB_PASSWORD || 'devpassword123';
const dbName = process.env.DB_NAME || 'chatbot_platform_db';

export default defineConfig({
    schema: './src/database/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || `postgresql://${dbUser}:${dbPassword}@localhost:5432/${dbName}`,
    },
    verbose: true,
    strict: true,
});