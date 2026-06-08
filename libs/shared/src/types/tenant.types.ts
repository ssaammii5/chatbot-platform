// ============================================================
// Shared Types — Tenant
// ============================================================

export interface BrandingConfig {
  primaryColor: string;
  logoUrl?: string;
  chatTitle?: string;
  welcomeMessage?: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  branding: BrandingConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
