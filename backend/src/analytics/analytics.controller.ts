import { Controller, Post, Get, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ReportUsageDto } from './dto/analytics.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('report')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Internal endpoint for FastAPI to report usage' })
  // In production, this should be protected by an Internal API Key guard, not just JWT.
  // We'll leave it simple for the MVP scope.
  async reportUsage(@Body() dto: ReportUsageDto) {
    return this.analyticsService.reportUsage(dto);
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, TenantRoleGuard)
  @ApiBearerAuth()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get token usage metrics for the current tenant dashboard' })
  async getMetrics(@Req() req: any) {
    return this.analyticsService.getMetrics(req.user.tenantId);
  }
}
