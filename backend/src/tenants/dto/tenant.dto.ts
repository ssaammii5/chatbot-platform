import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiProperty({ description: 'The name of the tenant', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'The custom domain of the tenant', required: false })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiProperty({ description: 'JSON configuration for widget branding', required: false })
  @IsObject()
  @IsOptional()
  brandingConfig?: Record<string, any>;
}
