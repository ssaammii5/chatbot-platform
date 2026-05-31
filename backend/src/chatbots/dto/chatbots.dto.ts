import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChatbotDto {
  @ApiProperty({ example: 'Support Bot', description: 'Display name of the chatbot' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'shop.example.com', description: 'Website domain this chatbot is embedded on' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Knowledge base ID to use for RAG' })
  @IsUUID()
  @IsOptional()
  knowledgeBaseId?: string;

  @ApiPropertyOptional({ example: { primaryColor: '#6366f1' }, description: 'Branding overrides for this chatbot' })
  @IsObject()
  @IsOptional()
  brandingConfig?: Record<string, any>;
}

export class UpdateChatbotDto {
  @ApiPropertyOptional({ example: 'Support Bot v2' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'shop.example.com' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsOptional()
  knowledgeBaseId?: string | null;

  @ApiPropertyOptional({ example: { primaryColor: '#6366f1' } })
  @IsObject()
  @IsOptional()
  brandingConfig?: Record<string, any>;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AssignAgentToChatbotDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Agent ID to assign' })
  @IsUUID()
  agentId: string;
}
