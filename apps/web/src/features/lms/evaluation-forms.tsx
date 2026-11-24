"use client";
import { useState, type FormEvent } from "react";
import {
  useAcademicAction,
  ActionFeedback,
} from "@/features/classroom/academic-action";
import { isAttempt, type Attempt } from "./data";
import { formatAccountDate } from "@/features/auth/format-date";
import { useFormErrors } from "@/shared/ui/use-form-errors";
export function EvaluationEditor({
  courseId,
  modules,
}: {
  courseId: string;
  modules: { id: string; title: string; published: boolean }[];
}) {
  const action = useAcademicAction(`evaluations/${courseId}`);
  const [questions, setQuestions] = useState([{ key: 0 }]);
  const validation = useFormErrors();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const d = new FormData(form);
    const invalid = questions.find(
      (q) =>
        Number(d.get(`correct-${q.key}`)) === 2 &&
        !String(d.get(`c-${q.key}`) ?? "").trim(),
    );
    if (invalid) {
      validation.setError(
        `correct-${invalid.key}`,
        "Completa la opción 3 antes de marcarla como respuesta correcta.",
      );
      (
        form.elements.namedItem(`correct-${invalid.key}`) as HTMLSelectElement
      )?.focus();
      return;
    }
    validation.clear();
    const result = await action.submit({
      moduleId: d.get("moduleId"),
      title: d.get("title"),
      minutes: Number(d.get("minutes")),
      attempts: Number(d.get("attempts")),
      passingScore: Number(d.get("score")),
      questions: questions.map((q) => ({
        text: d.get(`question-${q.key}`),
        options: [
          d.get(`a-${q.key}`),
          d.get(`b-${q.key}`),
          d.get(`c-${q.key}`),
        ].filter((v) => typeof v === "string" && v.trim() !== ""),
        correctIndex: Number(d.get(`correct-${q.key}`)),
      })),
    });
    if (result?.ok) {
      form.reset();
      setQuestions([{ key: 0 }]);
    }
  }
  return (
    <form
      onSubmit={submit}
      onInvalidCapture={validation.onInvalid}
      onInputCapture={validation.onInput}
      className="ui-card mt-8 space-y-4 p-5"
      aria-busy={action.pending}
    >
      <h2 className="text-xl font-semibold">Publicar evaluación</h2>
      <p className="text-sm text-muted">
        Completa los campos y revisa cada respuesta correcta. La evaluación se
        publicará al confirmar el guardado.
      </p>
      <fieldset disabled={action.pending} className="space-y-4">
        <label className="form-label">
          Título
          <input
            name="title"
            {...validation.field("title")}
            required
            minLength={5}
            maxLength={150}
            className="form-input"
          />
          {validation.message("title")}
        </label>
        <label className="form-label">
          Módulo
          <select
            name="moduleId"
            required
            className="form-input"
            {...validation.field("moduleId")}
          >
            <option value="">Selecciona un módulo</option>
            {modules
              .filter((m) => m.published)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
          </select>
          {validation.message("moduleId")}
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="form-label">
            Minutos
            <input
              type="number"
              name="minutes"
              {...validation.field("minutes")}
              defaultValue={30}
              min={1}
              max={180}
              required
              className="form-input"
            />
            {validation.message("minutes")}
          </label>
          <label className="form-label">
            Intentos máximos
            <input
              type="number"
              name="attempts"
              {...validation.field("attempts")}
              defaultValue={3}
              min={1}
              max={10}
              required
              className="form-input"
            />
            {validation.message("attempts")}
          </label>
          <label className="form-label">
            Nota mínima / 100
            <input
              type="number"
              name="score"
              {...validation.field("score")}
              defaultValue={60}
              min={1}
              max={100}
              required
              className="form-input"
            />
            {validation.message("score")}
          </label>
        </div>
        {questions.map((q, index) => (
          <fieldset
            key={q.key}
            className="space-y-3 rounded-xl border border-line p-4"
          >
            <legend>Pregunta {index + 1}</legend>
            <label className="form-label">
              Enunciado
              <textarea
                name={`question-${q.key}`}
                {...validation.field(`question-${q.key}`)}
                required
                minLength={5}
                maxLength={1000}
                className="form-input"
              />
              {validation.message(`question-${q.key}`)}
            </label>
            {["a", "b", "c"].map((letter, i) => (
              <label key={letter} className="form-label">
                Opción {i + 1}
                {i === 2 ? " (opcional)" : ""}
                <input
                  name={`${letter}-${q.key}`}
                  {...validation.field(`${letter}-${q.key}`)}
                  required={i < 2}
                  maxLength={300}
                  className="form-input"
                />
                {validation.message(`${letter}-${q.key}`)}
              </label>
            ))}
            <label className="form-label">
              Respuesta correcta
              <select
                name={`correct-${q.key}`}
                className="form-input"
                {...validation.field(`correct-${q.key}`)}
              >
                <option value={0}>Opción 1</option>
                <option value={1}>Opción 2</option>
                <option value={2}>Opción 3 (debe estar completada)</option>
              </select>
              {validation.message(`correct-${q.key}`)}
            </label>
          </fieldset>
        ))}
        <button
          type="button"
          className="button button-secondary"
          disabled={questions.length >= 30}
          onClick={() => setQuestions((q) => [...q, { key: q.length }])}
        >
          Añadir pregunta
        </button>
        <label className="flex gap-2">
          <input
            type="checkbox"
            name="confirmed"
            required
            {...validation.field("confirmed")}
          />
          Revisé las respuestas. Al publicar, el contenido queda fijado para
          conservar la integridad de los intentos.
        </label>
        {validation.message("confirmed")}
        <button disabled={action.pending} className="button button-primary">
          {action.pending ? "Publicando…" : "Publicar evaluación"}
        </button>
      </fieldset>
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}
export function TakeEvaluation({
  courseId,
  id,
  timeZone,
  exhausted,
}: {
  courseId: string;
  id: string;
  timeZone: string;
  exhausted: boolean;
}) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const begin = useAcademicAction(`evaluations/${courseId}/${id}/start`, false);
  const finish = useAcademicAction(
    `evaluations/${courseId}/${id}/attempts/${attempt?.id ?? ""}`,
  );
  async function start() {
    const r = await begin.submit({});
    if (r?.ok && isAttempt(r.data)) {
      setAttempt(r.data);
      setScore(null);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attempt) return;
    const d = new FormData(event.currentTarget);
    const r = await finish.submit({
      answers: attempt.questions
        .filter((q) => d.get(q.id))
        .map((q) => ({ questionId: q.id, optionId: d.get(q.id) })),
    });
    if (
      r?.ok &&
      typeof r.data === "object" &&
      r.data !== null &&
      "score" in r.data &&
      typeof r.data.score === "number"
    ) {
      setScore(r.data.score);
      setAttempt(null);
    }
  }
  return (
    <div className="mt-4">
      {score !== null && (
        <p role="status" className="mb-3 font-semibold">
          Nota: {score.toFixed(2)} / 100
        </p>
      )}
      {!attempt ? (
        <>
          <p className="mb-3 text-sm text-muted">
            Al comenzar se consume un intento y corre el tiempo. Si recargas,
            puedes recuperar el intento vigente; las respuestas sin enviar no se
            guardan.
          </p>
          <button
            disabled={begin.pending || exhausted}
            onClick={() => void start()}
            className="button button-primary"
          >
            {begin.pending
              ? "Preparando intento…"
              : exhausted
                ? "Intentos agotados"
                : "Comenzar / recuperar intento"}
          </button>
        </>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-4"
          aria-busy={finish.pending}
        >
          <p>
            Entrega antes de {formatAccountDate(attempt.expiresAt, timeZone)}.
            Las preguntas sin respuesta valen cero.
          </p>
          {attempt.questions.map((q, index) => (
            <fieldset
              key={q.id}
              className="space-y-2 rounded-xl border border-line p-4"
            >
              <legend>
                {index + 1}. {q.text}
              </legend>
              {q.options.map((o) => (
                <label key={o.id} className="flex min-h-11 items-center gap-3">
                  <input type="radio" name={q.id} value={o.id} />
                  {o.text}
                </label>
              ))}
            </fieldset>
          ))}
          <button disabled={finish.pending} className="button button-primary">
            {finish.pending ? "Enviando respuestas…" : "Entregar y calificar"}
          </button>
        </form>
      )}
      <ActionFeedback feedback={begin.feedback} />
      <ActionFeedback feedback={finish.feedback} />
    </div>
  );
}
