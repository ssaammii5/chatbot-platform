import { Worker } from 'bullmq';
import * as dotenv from 'dotenv';
import { processDocumentJob } from './processors/document.processor';
import { redisConnection } from './config/redis.config';

dotenv.config();

async function bootstrap() {
  console.log('Worker is starting...');

  const documentWorker = new Worker(
    'document-processing',
    processDocumentJob,
    { 
      connection: redisConnection,
      concurrency: 5,
    }
  );

  documentWorker.on('completed', job => {
    console.log(`[Document Worker] Job ${job.id} has completed!`);
  });

  documentWorker.on('failed', (job, err) => {
    console.log(`[Document Worker] Job ${job?.id} has failed with ${err.message}`);
  });

  documentWorker.on('progress', (job, progress) => {
    console.log(`[Document Worker] Job ${job.id} is ${progress}% complete`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await documentWorker.close();
    process.exit(0);
  });
}

bootstrap();
