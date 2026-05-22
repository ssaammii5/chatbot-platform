import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';
import { RedisIoAdapter } from './redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  // Set up Redis adapter for WebSockets (for horizontal scaling)
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI needs inline styles
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"], // Clickjacking protection
        },
      },
      xFrameOptions: { action: 'deny' },
      xContentTypeOptions: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: { maxAge: 31536000, includeSubDomains: true },
    }),
  );

  // Global validation pipe — strips unknown properties and transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter — generic errors to users, detailed logs internally
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger (OpenAPI) Setup
  const config = new DocumentBuilder()
    .setTitle('AI Chatbot Platform API')
    .setDescription(
      'The API description for the multi-tenant chatbot platform.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // CORS — restrict to known frontend origins
  // In production, these should be loaded from a tenant domain registry.
  const allowedOrigins = [
    'http://localhost:3001', // Next.js admin frontend
    'http://localhost:3002', // Svelte widget dev server
    'http://localhost:5173', // Vite dev server (widget local)
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., server-to-server, mobile apps, Postman)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow all origins but log a warning
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`CORS: allowing unregistered origin in dev mode: ${origin}`);
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });

  // Bind to localhost for development security.
  // In production behind a reverse proxy, bind to 0.0.0.0.
  const host =
    process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0'; // Docker requires 0.0.0.0
  await app.listen(port, host);
  console.log(`Application is running on: http://${host}:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
