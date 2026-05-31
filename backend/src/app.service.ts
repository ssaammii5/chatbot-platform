import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      status: 'ok',
      service: 'AI Chatbot Platform API',
      version: '1.0',
      timestamp: new Date().toISOString()
    };
  }
}
