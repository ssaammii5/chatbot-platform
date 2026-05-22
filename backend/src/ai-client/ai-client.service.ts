import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface RagStreamResult {
  fullResponse: string;
  requiresHandoff: boolean;
}

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      'http://localhost:8000';
  }

  async queryRagStream(
    tenantId: string,
    query: string,
    onChunk: (chunk: string) => void,
  ): Promise<RagStreamResult> {
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.baseUrl}/chat/stream`,
        { tenantId, query },
        { responseType: 'stream', timeout: 30000 },
      );

      return new Promise((resolve, reject) => {
        let fullResponse = '';
        let requiresHandoff = false;

        response.data.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8');

          // Check for handoff signal from FastAPI
          // The AI service may send a JSON line indicating handoff is needed
          if (text.includes('"requires_handoff":true') || text.includes('"requires_handoff": true')) {
            requiresHandoff = true;
            return; // Don't forward the JSON control signal to the client
          }

          fullResponse += text;
          onChunk(text);
        });

        response.data.on('end', () => {
          resolve({ fullResponse, requiresHandoff });
        });

        response.data.on('error', (err: any) => {
          reject(err);
        });
      });
    } catch (error) {
      this.logger.error('Failed to query FastAPI service stream', error);
      throw error;
    }
  }

  async processDocument(
    tenantId: string,
    knowledgeBaseId: string,
    filePath: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/documents/process`, {
          tenantId,
          knowledgeBaseId,
          filePath,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to send document to FastAPI service', error);
      throw error;
    }
  }
}
