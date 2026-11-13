"use client";
import { useState, type FormEvent } from "react";
import {
  useAcademicAction,
  ActionFeedback,
} from "@/features/classroom/academic-action";
import { isAttempt, type Attempt } from "./data";
export function EvaluationEditor({
  courseId,
  modules,
}: {
  courseId: string;
  modules: { id: string; title: string; published: boolean }[];
}) {
  const action = useAcademicAction(`evaluations/${courseId}`);
  const [questions, setQuestions] = useState([{ key: 0 }]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    void action.submit({
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
  }
  return (
    <form onSubmit={submit} className="ui-card mt-8 space-y-4 p-5">
      <h2 className="text-xl font-semibold">Publicar evaluación</h2>
      <label className="form-label">
        Título
        <input
          name="title"
          required
          minLength={5}
          maxLength={150}
          className="form-input"
        />
      </label>
      <label className="form-label">
        Módulo
        <select name="moduleId" required className="form-input">
          <option value="">Selecciona un módulo</option>
          {modules
            .filter((m) => m.published)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="form-label">
          Minutos
          <input
            type="number"
            name="minutes"
            defaultValue={30}
            min={1}
            max={180}
            required
            className="form-input"
          />
        </label>
        <label className="form-label">
          Intentos máximos
          <input
            type="number"
            name="attempts"
            defaultValue={3}
            min={1}
            max={10}
            required
            className="form-input"
          />
        </label>
        <label className="form-label">
          Nota mínima / 100
          <input
            type="number"
            name="score"
            defaultValue={60}
            min={1}
            max={100}
            required
            className="form-input"
          />
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
              required
              minLength={5}
              maxLength={1000}
              className="form-input"
            />
          </label>
          {["a", "b", "c"].map((letter, i) => (
            <label key={letter} className="form-label">
              Opción {i + 1}
              {i === 2 ? " (opcional)" : ""}
              <input
                name={`${letter}-${q.key}`}
                required={i < 2}
                maxLength={300}
                className="form-input"
              />
            </label>
          ))}
          <label className="form-label">
            Respuesta correcta
            <select name={`correct-${q.key}`} className="form-input">
              <option value={0}>Opción 1</option>
              <option value={1}>Opción 2</option>
              <option value={2}>Opción 3 (debe estar completada)</option>
            </select>
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
        <input type="checkbox" required />
        Revisé las respuestas. Al publicar, el contenido queda fijado para
        conservar la integridad de los intentos.
      </label>
      <button disabled={action.pending} className="button button-primary">
        Publicar evaluación
      </button>
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}
export function TakeEvaluation({
  courseId,
  id,
}: {
  courseId: string;
  id: string;
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
            disabled={begin.pending}
            onClick={() => void start()}
            className="button button-primary"
          >
            Comenzar / recuperar intento
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p>
            Entrega antes de{" "}
            {new Date(attempt.expiresAt).toLocaleString("es-BO")}. Las preguntas
            sin respuesta valen cero.
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
            Entregar y calificar
          </button>
        </form>
      )}
      <ActionFeedback feedback={begin.feedback} />
      <ActionFeedback feedback={finish.feedback} />
    </div>
  );
}
