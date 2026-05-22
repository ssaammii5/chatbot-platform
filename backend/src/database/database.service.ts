// backend/src/database/database.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class DatabaseService {
  constructor(@Inject('DRIZZLE_ORM') public readonly db: Db) {}

  /**
   * Executes a database query enforcing Row-Level Security for the specific tenant.
   * Uses SET LOCAL inside a transaction to prevent connection-pool data leaks.
   */
  async withTenant<T>(
    tenantId: string,
    callback: (tx: Db) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      // Set the Postgres configuration variable for THIS transaction only
      await tx.execute(
        sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`,
      );

      // Execute the user's queries securely
      return callback(tx);
    });
  }

  /**
   * For system-level or super-admin queries that need to bypass RLS.
   */
  async withSuperAdmin<T>(callback: (tx: Db) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.is_super_admin', 'true', true)`,
      );
      return callback(tx);
    });
  }
}
