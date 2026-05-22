// backend/src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [
    {
      provide: 'DB_POOL',
      useFactory: () => {
        return new Pool({
          connectionString: process.env.DATABASE_URL,
          // Optimization for Drizzle + Postgres
          max: 20,
          idleTimeoutMillis: 30000,
        });
      },
    },
    {
      provide: 'DRIZZLE_ORM',
      inject: ['DB_POOL'],
      useFactory: (pool: Pool) => {
        return drizzle(pool, { schema });
      },
    },
    DatabaseService,
  ],
  exports: ['DRIZZLE_ORM', DatabaseService],
})
export class DatabaseModule {}
