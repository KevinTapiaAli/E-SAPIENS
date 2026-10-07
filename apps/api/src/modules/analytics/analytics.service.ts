import { Injectable } from '@nestjs/common';
import type { ExecutiveDashboard } from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { trafficSql, learningSql } from './dashboard.queries';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async visit(visitor: string, resource: string): Promise<void> {
    // Shared limits across API replicas; missing Redis disables optional telemetry.
    try {
      const total = await this.redis.consume('analytics:visits:minute', 60);
      if (total > 5000) return;
      if ((await this.redis.consume(`analytics:visitor:${visitor}`, 60)) > 30)
        return;
    } catch {
      return;
    }
    const slug = resource.startsWith('/cursos/') ? resource.slice(8) : null;
    await this.db.query(
      `INSERT INTO lms.web_visits_daily(day,visitor_hash,resource,course_id)
       SELECT (now() AT TIME ZONE 'UTC')::date,$1,$2,c.id
       FROM (SELECT 1) seed LEFT JOIN lms.cursos c ON c.slug=$3 AND c.estado='publicado'
       WHERE $3::text IS NULL OR c.id IS NOT NULL
       ON CONFLICT(day,visitor_hash,resource) DO NOTHING`,
      [visitor, resource, slug],
    );
  }

  async dashboard(days: number): Promise<ExecutiveDashboard> {
    const generatedAt = new Date().toISOString();
    // Complete UTC days give both comparison windows exactly the same duration.
    const end = new Date(`${generatedAt.slice(0, 10)}T00:00:00.000Z`);
    const from = new Date(end.getTime() - days * 86400000);
    const previousFrom = new Date(from.getTime() - days * 86400000);
    const [traffic, learning, config] = await Promise.all([
      this.db.query<ExecutiveDashboard['traffic']>(trafficSql, [
        from.toISOString(),
        end.toISOString(),
        previousFrom.toISOString(),
      ]),
      this.db.query<ExecutiveDashboard['learning']>(learningSql, [generatedAt]),
      this.db.query<{ enabled_at: Date }>(
        'SELECT enabled_at FROM lms.web_analytics_config WHERE singleton',
      ),
    ]);
    return {
      generatedAt,
      period: {
        days,
        from: from.toISOString(),
        to: end.toISOString(),
        previousFrom: previousFrom.toISOString(),
      },
      trackingSince: config.rows[0].enabled_at.toISOString(),
      traffic: traffic.rows[0],
      learning: learning.rows[0],
    };
  }
}
