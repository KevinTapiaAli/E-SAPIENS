"use client";

import { useId, useRef, type ReactNode } from "react";
import styles from "./agenda-calendar.module.css";

export function AgendaCalendar({
  month,
  heading,
  previousMonth,
  nextMonth,
  compact,
  pending,
  onMonthChange,
  children,
}: {
  month: string;
  heading: string;
  previousMonth: string | null;
  nextMonth: string | null;
  compact: boolean;
  pending: boolean;
  onMonthChange: (month: string) => void;
  children: ReactNode;
}) {
  const hintId = useId();
  const gesture = useRef<{
    pointerId: number;
    x: number;
    y: number;
    dragging: boolean;
  } | null>(null);
  const suppressClickUntil = useRef(0);

  function navigate(target: string | null) {
    if (!target || pending) return;
    onMonthChange(target);
  }

  return (
    <div aria-busy={pending}>
      <div className="my-5 flex items-center justify-between gap-2">
        {previousMonth ? (
          <button
            type="button"
            disabled={pending}
            aria-label="Mes anterior"
            onClick={() => navigate(previousMonth)}
            className="button button-secondary"
          >
            <span aria-hidden="true">←</span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-label="Mes anterior"
            className="button button-secondary opacity-40"
          >
            <span aria-hidden="true">←</span>
          </button>
        )}
        <h2
          aria-live="polite"
          aria-atomic="true"
          className={`text-center font-semibold capitalize ${compact ? "text-base" : "text-xl"}`}
        >
          {heading}
        </h2>
        {nextMonth ? (
          <button
            type="button"
            disabled={pending}
            aria-label="Mes siguiente"
            onClick={() => navigate(nextMonth)}
            className="button button-secondary"
          >
            <span aria-hidden="true">→</span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-label="Mes siguiente"
            className="button button-secondary opacity-40"
          >
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
      <div
        className={styles.viewport}
        data-pending={pending || undefined}
        role="group"
        aria-label={`Días de ${heading}`}
        aria-describedby={hintId}
        tabIndex={0}
        onKeyDown={(event) => {
          if (
            event.target !== event.currentTarget ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey
          )
            return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            navigate(event.key === "ArrowLeft" ? previousMonth : nextMonth);
          }
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || pending) {
            gesture.current = null;
            return;
          }
          gesture.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            dragging: false,
          };
        }}
        onPointerMove={(event) => {
          const current = gesture.current;
          if (!current || current.pointerId !== event.pointerId) return;
          const horizontal = Math.abs(event.clientX - current.x);
          const vertical = Math.abs(event.clientY - current.y);
          if (!current.dragging && vertical > 14 && vertical >= horizontal) {
            gesture.current = null;
            return;
          }
          if (
            !current.dragging &&
            horizontal > 14 &&
            horizontal > vertical * 1.4
          ) {
            current.dragging = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerUp={(event) => {
          const current = gesture.current;
          gesture.current = null;
          if (!current || current.pointerId !== event.pointerId) return;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          if (!current.dragging) return;
          suppressClickUntil.current = Date.now() + 500;
          const horizontal = event.clientX - current.x;
          const vertical = Math.abs(event.clientY - current.y);
          if (
            Math.abs(horizontal) >= 56 &&
            Math.abs(horizontal) > vertical * 1.4
          ) {
            navigate(horizontal > 0 ? previousMonth : nextMonth);
          }
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onLostPointerCapture={(event) => {
          // Touch may transfer its implicit capture from a day link to the viewport.
          if (event.target === event.currentTarget) gesture.current = null;
        }}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (Date.now() < suppressClickUntil.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <div key={month} className={styles.month}>
          {children}
        </div>
      </div>
      <p id={hintId} className="mt-3 text-xs leading-5 text-muted">
        Desliza a los lados o usa las flechas para cambiar de mes.
      </p>
      <span role="status" className="sr-only">
        {pending ? "Cargando calendario…" : ""}
      </span>
    </div>
  );
}
