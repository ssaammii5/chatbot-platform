import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { AiClientModule } from '../ai-client/ai-client.module';
import { ChatbotsModule } from '../chatbots/chatbots.module';

@Module({
  imports: [AiClientModule, ChatbotsModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
