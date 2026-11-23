import type { DataCenterSummary } from '@esapiens/contracts';
import {
  csvCell,
  percentage,
  recommendations,
  DataCenterService,
} from './data-center.service';
import { DataCenterQuery } from './data-center.dto';
import { DatabaseService } from '../../infrastructure/database/database.service';

describe('Centro de Datos calculations and safe exports', () => {
  it('uses explicit denominators and null without data', () => {
    expect(percentage(0, 0)).toBeNull();
    expect(percentage(0, 3)).toBe(0);
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(3, 3)).toBe(100);
  });
  it.each([
    '=1+1',
    '+cmd',
    '-1+2',
    '@SUM(A1)',
    ' \t=HYPERLINK("evil")',
    '\r=1',
    '\n@cmd',
    '\tname',
  ])('neutralizes spreadsheet formulas %p', (value) => {
    expect(csvCell(value)).toMatch(/^"'/);
  });
  it('escapes commas quotes line breaks and Unicode without losing content', () => {
    expect(csvCell('Álgebra, "A"\nB')).toBe('"Álgebra, ""A""\nB"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(33.3)).toBe('"33.3"');
  });
  it('produces transparent recommendations only for observed priorities', () => {
    const summary = {
      pendingSubmissions: 2,
      inactiveStudents: 3,
      unassignedCourses: 1,
      withoutCoverage: 4,
      pendingRequests: 0,
      activeParticipants: 4,
      previousParticipants: 8,
    } as DataCenterSummary;
    const result = recommendations(summary);
    expect(result).toHaveLength(5);
    expect(
      result.find(
        (r) => r.indicator === 'activeParticipants / previousParticipants',
      )?.value,
    ).toBe(50);
    expect(result.every((r) => r.indicator && r.detail)).toBe(true);
    expect(
      recommendations({
        ...summary,
        pendingSubmissions: 0,
        inactiveStudents: 0,
        unassignedCourses: 0,
        withoutCoverage: 0,
        activeParticipants: 8,
      }),
    ).toEqual([]);
  });
  it('exports an allowlist and discloses the cap while preserving filters and ordering', async () => {
    const db = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            summary: {},
            total: 5001,
            items: [
              {
                id: 'internal',
                label: '=SUM(1)',
                courseId: null,
                courses: [],
                values: {
                  course: 'Materia',
                  state: 'activa',
                  progress: null,
                  password_hash: 'PRIVATE_HASH',
                  visitor_hash: 'PRIVATE_VISITOR',
                  session: 'PRIVATE_SESSION',
                },
              },
            ],
          },
        ],
      }),
    };
    const service = new DataCenterService(db as unknown as DatabaseService);
    const query = Object.assign(new DataCenterQuery(), {
      courseId: '4fd08c8c-5538-4fb2-a91a-70983ba4ab92',
      days: '7',
      state: 'activa',
      sort: 'progress',
      direction: 'desc',
      page: 2,
    });
    const result = await service.export(query);
    expect(result.truncated).toBe(true);
    expect(result.total).toBe(5001);
    expect(result.rows).toBe(1);
    expect(result.csv).toContain('"\'=SUM(1)"');
    expect(result.csv).not.toMatch(
      /PRIVATE_|password_hash|visitor_hash|session/,
    );
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('ORDER BY progress DESC NULLS LAST,id');
    expect(params[2]).toBe(query.courseId);
    expect(params[4]).toBe('activa');
    expect(params[13]).toBe(5000);
    expect(params[14]).toBe(0);
  });
});
