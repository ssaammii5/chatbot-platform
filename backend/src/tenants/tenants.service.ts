import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { tenants } from '../database/schema';
import { eq } from 'drizzle-orm';
import { UpdateTenantDto } from './dto/tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly db: DatabaseService) {}

  async getTenant(tenantId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [tenant] = await tx.select().from(tenants).where(eq(tenants.id, tenantId));
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }
      return tenant;
    });
  }

  async updateTenant(tenantId: string, dto: UpdateTenantDto) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [tenant] = await tx
        .update(tenants)
        .set(dto)
        .where(eq(tenants.id, tenantId))
        .returning();

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }
      return tenant;
    });
  }
}
