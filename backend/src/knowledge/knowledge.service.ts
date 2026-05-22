import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { documents, knowledgeBases } from '../database/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// Allowed MIME types for knowledge base uploads
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class KnowledgeService {
  constructor(private readonly db: DatabaseService) {}

  async createKnowledgeBase(
    tenantId: string,
    name: string,
    description?: string,
  ) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [kb] = await tx
        .insert(knowledgeBases)
        .values({ tenantId, name, description: description || null })
        .returning();
      return kb;
    });
  }

  async listKnowledgeBases(tenantId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      return tx.select().from(knowledgeBases);
    });
  }

  async listDocuments(tenantId: string, knowledgeBaseId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      return tx
        .select()
        .from(documents)
        .where(eq(documents.knowledgeBaseId, knowledgeBaseId));
    });
  }

  async saveDocument(
    tenantId: string,
    knowledgeBaseId: string,
    file: Express.Multer.File,
  ) {
    // Validate file type against allow-list
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed. Accepted types: PDF, TXT, MD, DOCX`,
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }

    return this.db.withTenant(tenantId, async (tx) => {
      // Create uploads directory if it doesn't exist
      // Files are stored outside the web root — not directly accessible by URL
      const uploadDir = path.join(process.cwd(), 'uploads', tenantId);
      await fs.mkdir(uploadDir, { recursive: true });

      // Generate a unique, unpredictable filename using UUID (security: prevent path traversal)
      // Store the original filename only in the database
      const ext = path.extname(file.originalname) || '';
      const safeFilename = `${crypto.randomUUID()}${ext}`;
      const storagePath = path.join(uploadDir, safeFilename);

      // Verify the resolved path stays within our upload directory (prevent traversal)
      const resolvedPath = path.resolve(storagePath);
      const resolvedUploadDir = path.resolve(uploadDir) + path.sep;
      if (!resolvedPath.startsWith(resolvedUploadDir)) {
        throw new BadRequestException('Invalid file path');
      }

      await fs.writeFile(storagePath, file.buffer);

      // Insert record to DB with original filename for display, UUID path for storage
      const [document] = await tx
        .insert(documents)
        .values({
          tenantId,
          knowledgeBaseId,
          filename: path.basename(file.originalname), // Use basename to strip any path components
          fileType: file.mimetype,
          storagePath,
        })
        .returning();

      return document;
    });
  }
}
