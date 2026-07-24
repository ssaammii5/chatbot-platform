import { z } from 'zod';

export const EnvSchema = z.object({
    // DATABASE_URL: z.url(),
    // PORT: z.coerce.number().default(8080),
    // FRONTEND_URL: z.url(),
    // JWT_SECRET: z.string().min(32),
    // JWT_EXPIRES_IN: z.string().default('7d'),
    // GOOGLE_CLIENT_ID: z.string(),
    // GOOGLE_CLIENT_SECRET: z.string(),    
    // GOOGLE_CALLBACK_URL: z.url(),
    // COOKIE_SECRET: z.string().min(32),
});

export const validateEnv = (config: Record<string, unknown>) => {
    const result = EnvSchema.safeParse(config);

    if (!result.success) {
        console.error('Environment Validation Failed:');

        const errorDetails = result.error.issues.reduce((acc, issue) => {
            const field = issue.path.join('.');
            acc[field] = issue.message;
            return acc;
        }, {} as Record<string, string>);

        console.error(JSON.stringify(errorDetails, null, 2));

        throw new Error('Invalid environment configuration');
    }

    return result.data;
};

