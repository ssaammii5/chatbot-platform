import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { tokenUsage } from '../database/schema';
import { ReportUsageDto } from './dto/analytics.dto';
import { eq, sum } from 'drizzle-orm';

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  async reportUsage(dto: ReportUsageDto) {
    // We enforce tenant scoping strictly
    return this.db.withTenant(dto.tenantId, async (tx) => {
      await tx.insert(tokenUsage).values({
        tenantId: dto.tenantId,
        conversationId: dto.conversationId,
        tokens: dto.tokens,
        model: dto.model,
        action: dto.action,
      });
    });
  }

  async getMetrics(tenantId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      const result = await tx
        .select({ totalTokens: sum(tokenUsage.tokens) })
        .from(tokenUsage)
        .where(eq(tokenUsage.tenantId, tenantId));
      
      return { totalTokens: result[0]?.totalTokens || 0 };
    });
  }
}
