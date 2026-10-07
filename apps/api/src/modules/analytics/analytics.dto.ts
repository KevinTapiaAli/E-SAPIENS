import { IsIn, Matches } from 'class-validator';

export class DashboardQuery {
  @IsIn(['7', '30', '90'])
  days = '30';
}

export class VisitDto {
  @Matches(
    /^\/(?:cursos(?:\/[a-z0-9-]{1,200})?|biblioteca(?:\/[a-f0-9-]{36})?|registro|login|oferta)?$/,
  )
  path: string;
}
