import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: 'The name of the tenant' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The custom domain of the tenant', required: false })
  @IsString()
  @IsOptional()
  domain?: string;
}
