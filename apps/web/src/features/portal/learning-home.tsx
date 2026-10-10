"use client";
import { useState } from "react";

const challenges = [
  {
    question:
      "Tienes una semana para preparar una evaluación. ¿Cómo aprovecharías mejor el tiempo?",
    answers: [
      "Distribuir sesiones cortas y recordar sin mirar los apuntes",
      "Releer todo únicamente la noche anterior",
      "Subrayar cada párrafo sin hacer pausas",
    ],
    correct: 0,
    why: "Espaciar las sesiones y recuperar lo aprendido te ayuda a identificar lo que todavía necesitas practicar.",
  },
  {
    question:
      "Encuentras dos fuentes que se contradicen. ¿Cuál es el siguiente paso?",
    answers: [
      "Elegir la que tiene más seguidores",
      "Comparar autoría, fecha, evidencia y contexto",
      "Copiar las dos sin revisarlas",
    ],
    correct: 1,
    why: "Contrastar las fuentes te permite sostener una conclusión con evidencia, en lugar de elegirla por popularidad.",
  },
  {
    question: "Una tarea parece demasiado grande. ¿Qué harías primero?",
    answers: [
      "Esperar a sentir motivación",
      "Empezar varias cosas al mismo tiempo",
      "Dividirla en pasos y definir la primera acción",
    ],
    correct: 2,
    why: "Una acción concreta hace más fácil comenzar. Define qué entregarás y cuánto tiempo dedicarás al primer paso.",
  },
  {
    question:
      "Recibes una corrección del docente. ¿Cómo la conviertes en aprendizaje?",
    answers: [
      "Identificar el error, corregirlo y explicar el cambio",
      "Mirar solamente la nota",
      "Borrar el trabajo anterior",
    ],
    correct: 0,
    why: "Entender por qué cambió tu respuesta te permite transferir lo aprendido a una situación nueva.",
  },
  {
    question:
      "No logras resolver un ejercicio. ¿Qué comentario ayudaría al docente?",
    answers: [
      "No entendí nada",
      "Explicar qué intentaste y en qué paso apareció la duda",
      "Enviar un mensaje sin contexto",
    ],
    correct: 1,
    why: "Mostrar tu razonamiento permite recibir una orientación más precisa. Puedes dejar ese comentario junto a tu tarea.",
  },
];
export function LearningChallenge() {
  const [index, setIndex] = useState(0),
    [answer, setAnswer] = useState<number | null>(null),
    [score, setScore] = useState(0),
    [finished, setFinished] = useState(false);
  const challenge = challenges[index];
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
      <section className="ui-card overflow-hidden">
        <div className="border-b border-line bg-brand-soft p-6 sm:p-8">
          <p className="eyebrow">Laboratorio de aprendizaje</p>
          <h2 className="mt-3 text-2xl font-semibold">Entrena cómo aprendes</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Cinco decisiones, unos minutos y una idea para aplicar hoy. Este
            reto es voluntario y no modifica tus notas.
          </p>
        </div>
        <div className="p-6 sm:p-8">
          {finished ? (
            <>
              <p className="text-4xl font-semibold text-brand">
                {score} / {challenges.length}
              </p>
              <h3 className="mt-4 text-xl font-semibold">
                Una pequeña práctica, un nuevo hábito
              </h3>
              <p className="mt-3 text-muted">
                Elige una estrategia del reto y aplícala en tu próxima materia.
                Puedes practicar de nuevo cuando quieras.
              </p>
              <button
                className="button button-primary mt-6"
                onClick={() => {
                  setIndex(0);
                  setAnswer(null);
                  setScore(0);
                  setFinished(false);
                }}
              >
                Volver a jugar
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                Reto {index + 1} de {challenges.length}
              </p>
              <h3 className="mt-4 text-xl font-semibold leading-8">
                {challenge.question}
              </h3>
              <div className="mt-5 space-y-3">
                {challenge.answers.map((text, i) => (
                  <button
                    key={text}
                    disabled={answer !== null}
                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm leading-6 ${answer === i ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-soft"}`}
                    onClick={() => {
                      setAnswer(i);
                      if (i === challenge.correct) setScore((s) => s + 1);
                    }}
                  >
                    <span className="font-semibold text-brand">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {text}
                  </button>
                ))}
              </div>
              {answer !== null && (
                <div
                  className="mt-5 rounded-xl bg-surface-soft p-5"
                  role="status"
                >
                  <p className="font-semibold">
                    {answer === challenge.correct
                      ? "¡Buena decisión!"
                      : "Probemos otra estrategia"}
                  </p>
                  <p className="mt-2 text-sm leading-7">{challenge.why}</p>
                  <button
                    className="button button-primary mt-4"
                    onClick={() => {
                      if (index === challenges.length - 1) setFinished(true);
                      else {
                        setIndex((i) => i + 1);
                        setAnswer(null);
                      }
                    }}
                  >
                    {index === challenges.length - 1
                      ? "Ver mi resultado"
                      : "Siguiente reto →"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-6">
        <p className="eyebrow">Tu sesión de hoy</p>
        <h2 className="mt-3 text-xl font-semibold">
          Dale un propósito a tu estudio
        </h2>
        <ol className="mt-5 space-y-5 text-sm leading-7">
          <li>
            <strong className="text-brand">1. Elige una meta pequeña.</strong>
            <p className="text-muted">
              Una lección, un problema o una explicación con tus propias
              palabras.
            </p>
          </li>
          <li>
            <strong className="text-brand">2. Practica sin mirar.</strong>
            <p className="text-muted">
              Recuerda lo esencial antes de volver a consultar el material.
            </p>
          </li>
          <li>
            <strong className="text-brand">3. Deja una pregunta.</strong>
            <p className="text-muted">
              Si algo no quedó claro, explica tu duda al entregar la tarea.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}

const teachingSteps = [
  {
    title: "Dar sentido",
    subtitle: "Antes de la clase",
    question: "¿Qué podrá hacer el estudiante al terminar?",
    actions: [
      "Definir un objetivo observable",
      "Relacionar el tema con una situación cercana",
      "Seleccionar un ejemplo y un recurso de apoyo",
    ],
    detail:
      "Una meta comprensible ayuda a que el estudiante sepa por qué vale la pena participar.",
  },
  {
    title: "Acompañar",
    subtitle: "Durante la clase",
    question: "¿Cómo sabrás si están comprendiendo?",
    actions: [
      "Proponer una pregunta abierta",
      "Dar tiempo para practicar y explicar",
      "Identificar dudas antes de continuar",
    ],
    detail:
      "Escuchar el razonamiento permite ajustar la explicación y dar espacio a distintos ritmos.",
  },
  {
    title: "Retroalimentar",
    subtitle: "Después de la clase",
    question: "¿Qué siguiente paso quedará claro?",
    actions: [
      "Explicar un logro concreto",
      "Señalar una mejora que se pueda realizar",
      "Relacionar la devolución con los criterios de la tarea",
    ],
    detail:
      "Una devolución útil permite actuar: indica qué mantener, qué mejorar y cómo intentarlo.",
  },
];
export function TeachingCompass() {
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  const data = teachingSteps[step];
  return (
    <section className="ui-card overflow-hidden">
      <div className="border-b border-line bg-brand-soft p-6 sm:p-8">
        <p className="eyebrow">Brújula docente</p>
        <h2 className="mt-3 text-2xl font-semibold">Una clase con propósito</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          Prepara una experiencia clara, participativa y útil. Explora cada
          momento y construye tu lista de preparación para esta sesión.
        </p>
      </div>
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3" aria-label="Momentos de la clase">
          {teachingSteps.map((s, i) => (
            <button
              key={s.title}
              aria-pressed={step === i}
              className={`w-full rounded-xl border p-5 text-left ${step === i ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-soft"}`}
              onClick={() => setStep(i)}
            >
              <span className="text-xs text-muted">
                0{i + 1} · {s.subtitle}
              </span>
              <strong className="mt-2 block text-lg">{s.title}</strong>
            </button>
          ))}
        </div>
        <div>
          <p className="eyebrow">{data.subtitle}</p>
          <h3 className="mt-3 text-2xl font-semibold leading-9">
            {data.question}
          </h3>
          <p className="mt-3 text-sm leading-7 text-muted">{data.detail}</p>
          <div className="mt-6 space-y-3">
            {data.actions.map((action) => (
              <label
                key={action}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 text-sm leading-6"
              >
                <input
                  className="mt-1 h-5 w-5 accent-brand"
                  type="checkbox"
                  checked={checked.includes(action)}
                  onChange={(e) =>
                    setChecked((old) =>
                      e.target.checked
                        ? [...old, action]
                        : old.filter((a) => a !== action),
                    )
                  }
                />
                {action}
              </label>
            ))}
          </div>
          <p role="status" className="mt-5 text-sm text-brand">
            {checked.length} de 9 ideas preparadas
          </p>
          <p className="mt-2 text-xs text-muted">
            Lista de trabajo de esta visita. No modifica el contenido publicado.
          </p>
          <button
            className="text-link mt-4 text-sm"
            onClick={() => setChecked([])}
          >
            Empezar una nueva preparación
          </button>
        </div>
      </div>
    </section>
  );
}
