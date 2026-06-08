import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import { QUEUE_NAMES } from '@chatbot-platform/shared';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
};

async function bootstrap() {
  console.log('🚀 BullMQ Worker starting...');

  // Document processing worker
  const documentWorker = new Worker(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    async (job) => {
      console.log(`[${QUEUE_NAMES.DOCUMENT_PROCESSING}] Processing job ${job.id}:`, job.name);
      // TODO: Implement document processing logic
      // Delegate heavy processing to ai-service via HTTP
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.BULLMQ_CONCURRENCY || '5', 10),
    },
  );

  documentWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  documentWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down worker gracefully...');
    await documentWorker.close();
    process.exit(0);
  });

  console.log(`✅ Worker listening on queue: ${QUEUE_NAMES.DOCUMENT_PROCESSING}`);
}

bootstrap().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
