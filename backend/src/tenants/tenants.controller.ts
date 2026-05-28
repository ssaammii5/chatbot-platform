import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/tenant.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantRoleGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current tenant details' })
  async getTenant(@Req() req: any) {
    // tenantId is securely extracted from the validated JWT
    return this.tenantsService.getTenant(req.user.tenantId);
  }

  @Put('me')
  @Roles('admin') // Only admins of this tenant can update it
  @ApiOperation({ summary: 'Update current tenant details and branding' })
  async updateTenant(@Req() req: any, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.updateTenant(req.user.tenantId, dto);
  }
}
