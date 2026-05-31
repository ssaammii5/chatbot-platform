import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { tenants, tokenUsage } from '../database/schema';
import { CreateTenantDto } from './dto/super-admin.dto';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class SuperAdminService {
  constructor(private readonly db: DatabaseService) {}

  async listAllTenants() {
    // 🚨 Bypassing RLS for super-admin platform-wide operation
    return this.db.withSuperAdmin(async (tx) => {
      return tx.select().from(tenants);
    });
  }

  async createTenant(dto: CreateTenantDto) {
    return this.db.withSuperAdmin(async (tx) => {
      const [newTenant] = await tx
        .insert(tenants)
        .values({
          name: dto.name,
          domain: dto.domain,
        })
        .returning();
      return newTenant;
    });
  }

  async deleteTenant(tenantId: string) {
    return this.db.withSuperAdmin(async (tx) => {
      const [deleted] = await tx
        .delete(tenants)
        .where(eq(tenants.id, tenantId))
        .returning();

      if (!deleted) {
        throw new NotFoundException('Tenant not found');
      }
      return deleted;
    });
  }

  async getHealth() {
    return this.db.withSuperAdmin(async (tx) => {
      await tx.execute(sql`SELECT 1`);
      return { status: 'healthy', database: 'connected', timestamp: new Date().toISOString() };
    });
  }

  async getGlobalUsage() {
    return this.db.withSuperAdmin(async (tx) => {
      const usages = await tx.select().from(tokenUsage);
      const totalTokens = usages.reduce((acc, curr) => acc + curr.tokens, 0);
      const tenantCount = await tx.select({ count: sql`count(*)` }).from(tenants);
      return { 
        totalTokens, 
        totalTenants: Number(tenantCount[0]?.count || 0) 
      };
    });
  }
}
