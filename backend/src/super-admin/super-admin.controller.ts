import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { CreateTenantDto } from './dto/super-admin.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard';

@ApiTags('super-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantRoleGuard)
@Roles('super_admin') // Restrict all endpoints in this controller to super_admin
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get platform health status' })
  async getHealth() {
    return this.superAdminService.getHealth();
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get global token usage and tenant counts' })
  async getGlobalUsage() {
    return this.superAdminService.getGlobalUsage();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants across the platform' })
  async listTenants() {
    return this.superAdminService.listAllTenants();
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Provision a new tenant' })
  async createTenant(@Body() dto: CreateTenantDto) {
    return this.superAdminService.createTenant(dto);
  }

  @Delete('tenants/:id')
  @ApiOperation({ summary: 'Delete a tenant and cascade delete all their data' })
  async deleteTenant(@Param('id') id: string) {
    return this.superAdminService.deleteTenant(id);
  }
}
