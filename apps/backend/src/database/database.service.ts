import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg";
import * as authSchema from '../auth/auth.schema'

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    public db: NodePgDatabase<typeof authSchema>;
    private pool: Pool;

    constructor(private configService: ConfigService) {
        const connectionString = this.configService.get<string>('DATABASE_URL');

        this.pool = new Pool({ connectionString });
        this.db = drizzle(this.pool, { schema: authSchema });
    }

    async onModuleInit() {
        await this.pool.query('SELECT 1');
    }

    async onModuleDestroy() {
        await this.pool.end();
    }

}