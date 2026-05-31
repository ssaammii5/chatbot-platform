import { Module } from '@nestjs/common';
import { ChatbotsController } from './chatbots.controller';
import { ChatbotsService } from './chatbots.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ChatbotsController],
  providers: [ChatbotsService],
  exports: [ChatbotsService], // exported so ChatModule can use resolveKnowledgeBaseId
})
export class ChatbotsModule {}
