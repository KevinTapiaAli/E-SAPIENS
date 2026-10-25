import { Injectable } from '@nestjs/common';
import type {
  ExecutiveDashboard,
  PublicCourse,
  PublicCourseDetail,
  PublicLibraryDetail,
  PublicLibraryItem,
  PublicPage,
} from '@esapiens/contracts';
import { PublicListQueryDto } from '../../common/http/dto/public-list-query.dto';
import { ServiceClient } from './service-client';

function queryString(query: PublicListQueryDto): string {
  const params = new URLSearchParams({ limit: String(query.limit) });
  if (query.q) params.set('q', query.q);
  if (query.cursor) params.set('cursor', query.cursor);
  return params.toString();
}

@Injectable()
export class RemoteCatalogService {
  constructor(private readonly client: ServiceClient) {}
  list(query: PublicListQueryDto) {
    return this.client.request<PublicPage<PublicCourse>>(
      'content',
      `courses?${queryString(query)}`,
    );
  }
  detail(slug: string) {
    return this.client.request<PublicCourseDetail>(
      'content',
      `courses/${encodeURIComponent(slug)}`,
    );
  }
}

@Injectable()
export class RemoteLibraryService {
  constructor(private readonly client: ServiceClient) {}
  list(query: PublicListQueryDto) {
    return this.client.request<PublicPage<PublicLibraryItem>>(
      'content',
      `library?${queryString(query)}`,
    );
  }
  detail(id: string) {
    return this.client.request<PublicLibraryDetail>(
      'content',
      `library/${encodeURIComponent(id)}`,
    );
  }
}

@Injectable()
export class RemoteAnalyticsService {
  constructor(private readonly client: ServiceClient) {}
  dashboard(days: number) {
    return this.client.request<ExecutiveDashboard>(
      'analytics',
      `analytics/dashboard?days=${days}`,
    );
  }
  visit(visitor: string, resource: string) {
    return this.client.request<void>('analytics', 'analytics/visit', {
      visitor,
      path: resource,
    });
  }
}
