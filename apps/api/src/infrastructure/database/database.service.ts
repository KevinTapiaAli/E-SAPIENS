import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }

    this.pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
      query_timeout: 6000,
    });
  }

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async ping() {
    const result = await this.pool.query<{
      database: string;
    }>('SELECT current_database() AS database');

    const database = result.rows[0];
    if (!database) throw new Error('Database health query returned no result');
    return database;
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
