import { IsString, IsOptional, IsEnum, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
}

export class UpdateAgentStatusDto {
  @ApiProperty({ enum: AgentStatus, example: AgentStatus.ONLINE })
  @IsEnum(AgentStatus)
  status: AgentStatus;
}

export class CreateCannedResponseDto {
  @ApiProperty({ example: 'greeting', description: 'Short identifier for the canned response' })
  @IsString()
  @MaxLength(100)
  shortcut: string;

  @ApiProperty({ example: 'Hello! How can I help you today?', description: 'Full text of the canned response' })
  @IsString()
  @MaxLength(2000)
  content: string;
}

export class InternalNoteDto {
  @ApiProperty({ example: 'User is a VIP — escalate immediately if unresolved.' })
  @IsString()
  @MaxLength(5000)
  note: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  conversationId: string;
}

export class AssignAgentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  agentId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  conversationId: string;
}
