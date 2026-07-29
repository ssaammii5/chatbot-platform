import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisterSchema = z.object({
    email: z.email('Invalid email format.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    fullName: z.string().min(2, 'Full name is required.'),
});

export const LoginSchema = z.object({
    email: z.email('Invalid email format.'),
    password: z.string().min(1, 'Password is required.'),
});

export class RegisterDto extends createZodDto(RegisterSchema) { }
export class LoginDto extends createZodDto(LoginSchema) { }