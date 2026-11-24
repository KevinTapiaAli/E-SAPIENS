"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { WorkspaceRole } from "@esapiens/contracts";
import {
  helpEntries,
  searchHelp,
  suggestedHelp,
  type HelpEntry,
} from "./help-assistant-data";
import styles from "./help-assistant.module.css";

type Exchange = { question: string; answer: HelpEntry | null };

export function HelpConversation({
  role,
  permissions,
  pathname,
  onNavigate,
}: {
  role: WorkspaceRole;
  permissions: readonly string[];
  pathname: string;
  onNavigate: () => void;
}) {
  const entries = helpEntries(role, permissions, pathname);
  const suggestions = suggestedHelp(entries, pathname);
  const id = useId();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (history.length) end.current?.scrollIntoView({ block: "nearest" });
  }, [history]);
  function ask(question: string, answer?: HelpEntry) {
    const value = question.trim().slice(0, 240);
    if (!value) return;
    setHistory((previous) => [
      ...previous.slice(-19),
      { question: value, answer: answer ?? searchHelp(value, entries) },
    ]);
    setQuery("");
    input.current?.focus();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(query);
  }
  return (
    <>
      <div className={styles.messages}>
        <p className={styles.response}>
          Hola. Soy el Asistente E-SAPIENS. Puedo orientarte sobre las funciones
          de tu perfil. Elige una pregunta o escribe tu consulta.
        </p>
        <p className="mt-3 text-xs leading-5 text-muted">
          Las respuestas provienen de una guía local, sin inteligencia
          generativa. La conversación permanece solo en esta página; no escribas
          contraseñas ni datos personales.
        </p>
        <div
          role="log"
          aria-label="Conversación de ayuda"
          aria-live="polite"
          aria-relevant="additions"
          className="mt-4 space-y-4"
        >
          {history.map((exchange, index) => (
            <div key={index} className="space-y-2">
              <p className={styles.questionMessage}>
                <span className="sr-only">Tu consulta: </span>
                {exchange.question}
              </p>
              <div className={styles.response}>
                <p>
                  <span className="sr-only">Respuesta del asistente: </span>
                  {exchange.answer?.answer ??
                    "No encontré una respuesta clara en la guía. Prueba con una pregunta más concreta, como las sugerencias de abajo. Para gestiones que requieran revisión, consulta a la administración de tu institución."}
                </p>
                {exchange.answer && (
                  <Link
                    href={exchange.answer.href}
                    prefetch={false}
                    className="text-link mt-3 inline-flex min-h-11 items-center text-sm font-semibold"
                    onClick={onNavigate}
                  >
                    {exchange.answer.actionLabel} →
                  </Link>
                )}
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">
          Ayuda para esta sección
        </h3>
        <ul className="mt-2 space-y-2">
          {suggestions.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={styles.suggestion}
                onClick={() => ask(entry.question, entry)}
              >
                {entry.question}
              </button>
            </li>
          ))}
        </ul>
        {!entries.length && (
          <p className="mt-3 text-sm text-muted">
            Tu perfil no tiene secciones de ayuda habilitadas.
          </p>
        )}
      </div>
      <form onSubmit={submit} className={styles.composer}>
        <label htmlFor={id} className="text-sm font-semibold">
          Escribe tu consulta
        </label>
        <div className="mt-2 flex items-end gap-2">
          <input
            ref={input}
            id={id}
            name="help-query"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={240}
            autoComplete="off"
            placeholder="Ej.: ¿cómo veo mis materias?"
            className="form-input min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="button button-primary shrink-0"
          >
            Enviar
          </button>
        </div>
        <button
          type="button"
          disabled={!history.length && !query}
          className="text-link mt-2 inline-flex min-h-11 items-center text-xs"
          onClick={() => {
            setHistory([]);
            setQuery("");
            input.current?.focus();
          }}
        >
          Reiniciar conversación
        </button>
      </form>
    </>
  );
}
