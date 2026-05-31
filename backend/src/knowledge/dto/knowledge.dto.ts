import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateKnowledgeBaseDto {
  @ApiProperty({ description: 'Name of the knowledge base' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Optional description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UploadDocumentDto {
  @ApiProperty({ description: 'ID of the knowledge base to attach the document to' })
  @IsUUID()
  @IsNotEmpty()
  knowledgeBaseId: string;
}
