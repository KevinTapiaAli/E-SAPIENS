import { isRecord, isPublicPage } from "@/shared/api/public-api";
import type { PublicPage } from "@esapiens/contracts";
export type Plan = {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  days: number;
};
export type Plans = PublicPage<Plan> & { instructions: string | null };
export type Order = {
  id: string;
  number: string;
  status: string;
  expiresAt: string;
  currency: string;
  total: string;
  description: string;
  paymentStatus: string | null;
  reviewReason: string | null;
};
export type Payment = {
  id: string;
  orderId: string;
  number: string;
  email: string;
  reference: string;
  method: string;
  amount: string;
  currency: string;
  reportedAt: string;
  expiresAt: string;
};
export type Evaluation = {
  id: string;
  title: string;
  module: string;
  minutes: number;
  attempts: number;
  passingScore: number;
  usedAttempts: number;
  bestScore: number | null;
};
export type Attempt = {
  id: string;
  expiresAt: string;
  questions: {
    id: string;
    text: string;
    options: { id: string; text: string }[];
  }[];
};
export type EvaluationResult = {
  id: string;
  student: string;
  number: number;
  status: string;
  score: number | null;
  submittedAt: string | null;
};
export const isEvaluationResults = (
  v: unknown,
): v is PublicPage<EvaluationResult> =>
  isPublicPage(
    v,
    (i: unknown): i is EvaluationResult =>
      isRecord(i) &&
      strings(i, ["id", "student", "status"]) &&
      typeof i.number === "number" &&
      (i.score === null || typeof i.score === "number") &&
      (i.submittedAt === null || typeof i.submittedAt === "string"),
  );
const strings = (v: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => typeof v[k] === "string");
export const isPlans = (v: unknown): v is Plans =>
  isRecord(v) &&
  (v.instructions === null || typeof v.instructions === "string") &&
  isPublicPage(
    v,
    (p: unknown): p is Plan =>
      isRecord(p) &&
      strings(p, ["id", "name", "description", "price", "currency"]) &&
      typeof p.days === "number",
  );
export const isOrders = (v: unknown): v is PublicPage<Order> =>
  isPublicPage(
    v,
    (p: unknown): p is Order =>
      isRecord(p) &&
      strings(p, [
        "id",
        "number",
        "status",
        "expiresAt",
        "currency",
        "total",
        "description",
      ]) &&
      [p.paymentStatus, p.reviewReason].every(
        (x) => x === null || typeof x === "string",
      ),
  );
export const isPayments = (v: unknown): v is PublicPage<Payment> =>
  isPublicPage(
    v,
    (p: unknown): p is Payment =>
      isRecord(p) &&
      strings(p, [
        "id",
        "orderId",
        "number",
        "email",
        "reference",
        "method",
        "amount",
        "currency",
        "reportedAt",
        "expiresAt",
      ]),
  );
export const isEvaluations = (v: unknown): v is PublicPage<Evaluation> =>
  isPublicPage(
    v,
    (e: unknown): e is Evaluation =>
      isRecord(e) &&
      strings(e, ["id", "title", "module"]) &&
      ["minutes", "attempts", "passingScore", "usedAttempts"].every(
        (k) => typeof e[k] === "number",
      ) &&
      (e.bestScore === null || typeof e.bestScore === "number"),
  );
export const isAttempt = (v: unknown): v is Attempt =>
  isRecord(v) &&
  strings(v, ["id", "expiresAt"]) &&
  Array.isArray(v.questions) &&
  v.questions.every(
    (q: unknown) =>
      isRecord(q) &&
      strings(q, ["id", "text"]) &&
      Array.isArray(q.options) &&
      q.options.every(
        (o: unknown) => isRecord(o) && strings(o, ["id", "text"]),
      ),
  );
