import { IsString, IsInt, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportUsageDto {
  @ApiProperty({ description: 'Tenant ID to charge the usage to' })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ description: 'Number of tokens consumed' })
  @IsInt()
  @IsNotEmpty()
  tokens: number;

  @ApiProperty({ description: 'LLM model used (e.g., gpt-4)' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ description: 'Action performed (e.g., rag_query)' })
  @IsString()
  @IsNotEmpty()
  action: string;
}
