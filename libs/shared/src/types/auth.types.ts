// ============================================================
// Shared Types — Auth
// ============================================================

export type UserRole = 'super_admin' | 'tenant_admin' | 'agent' | 'end_user';

export interface JwtPayload {
  sub: string;        // User ID
  tenantId: string;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}
