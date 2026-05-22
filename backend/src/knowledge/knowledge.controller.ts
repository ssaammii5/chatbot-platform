import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeService } from './knowledge.service';
import {
  CreateKnowledgeBaseDto,
  UploadDocumentDto,
} from './dto/knowledge.dto';

@ApiTags('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantRoleGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(
    @InjectQueue('document-processing')
    private readonly documentQueue: Queue,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  @Post('bases')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create a new knowledge base' })
  async createKnowledgeBase(
    @Req() req: any,
    @Body() dto: CreateKnowledgeBaseDto,
  ) {
    return this.knowledgeService.createKnowledgeBase(
      req.user.tenantId,
      dto.name,
      dto.description,
    );
  }

  @Get('bases')
  @Roles('admin', 'super_admin', 'agent')
  @ApiOperation({ summary: 'List all knowledge bases for the tenant' })
  async listKnowledgeBases(@Req() req: any) {
    return this.knowledgeService.listKnowledgeBases(req.user.tenantId);
  }

  @Get('bases/:id/documents')
  @Roles('admin', 'super_admin', 'agent')
  @ApiOperation({ summary: 'List all documents in a knowledge base' })
  async listDocuments(@Req() req: any, @Param('id') knowledgeBaseId: string) {
    return this.knowledgeService.listDocuments(
      req.user.tenantId,
      knowledgeBaseId,
    );
  }

  @Post('upload')
  @Roles('admin', 'super_admin')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload a document to the Knowledge Base (dispatched to Worker for AI processing)',
  })
  async uploadDocument(
    @Req() req: any,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const document = await this.knowledgeService.saveDocument(
      req.user.tenantId,
      dto.knowledgeBaseId,
      file,
    );

    // Dispatch to BullMQ for async processing by the worker service
    const job = await this.documentQueue.add('process', {
      tenantId: req.user.tenantId,
      knowledgeBaseId: dto.knowledgeBaseId,
      filePath: document.storagePath,
    });

    return { status: 'queued', documentId: document.id, jobId: job.id };
  }
}
