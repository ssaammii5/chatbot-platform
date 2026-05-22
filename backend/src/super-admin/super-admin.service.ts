import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { tenants } from '../database/schema';
import { CreateTenantDto } from './dto/super-admin.dto';
import { eq } from 'drizzle-orm';

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
}
