import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

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
      idle_in_transaction_session_timeout: 10000,
    });
    // pg emits errors for idle connections outside the request promise chain.
    this.pool.on('error', () => {
      this.logger.error(
        'DATABASE_CONNECTION_LOST: se descartó una conexión inactiva con PostgreSQL.',
      );
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

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let discardClient = false;
    const onConnectionError = () => {
      discardClient = true;
    };
    // A checked-out client is not covered by the pool's idle error listener.
    client.on('error', onConnectionError);
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original failure and never reuse an uncertain transaction.
        discardClient = true;
      }
      throw error;
    } finally {
      client.release(discardClient);
      client.removeListener('error', onConnectionError);
    }
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
