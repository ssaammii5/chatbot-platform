import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { AiClientModule } from '../ai-client/ai-client.module';

import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    AiClientModule,
    BullModule.registerQueue({
      name: 'document-processing',
    }),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
