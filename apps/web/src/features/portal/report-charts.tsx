"use client";
import { useState } from "react";
import type { AcademicReport } from "@esapiens/contracts";

const colors = ["#64748b", "#b45309", "#6552b4", "#087f72"];
export function ReportCharts({
  data,
  topic,
}: {
  data: AcademicReport;
  topic: string;
}) {
  const [selection, setSelection] = useState<string | null>(null);
  const sum = data.distribution.reduce((n, v) => n + v.value, 0);
  let cumulative = 0;
  const segments = data.distribution.map((d, i) => {
    const start = cumulative;
    cumulative += sum ? (100 * d.value) / sum : 0;
    return `${colors[i]} ${start}% ${cumulative}%`;
  });
  const max = Math.max(1, ...data.timeline.map((d) => d.value));
  const points = data.timeline
    .map((d, i) => `${30 + i * 55},${150 - (d.value / max) * 120}`)
    .join(" ");
  const activity =
    {
      avance: "Lecciones completadas",
      tareas: "Intentos calificados",
      asistencia: "Asistencias confirmadas",
      acceso: "Matrículas registradas",
    }[topic] ?? "Actividad registrada";
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-3">
      <section className="ui-card min-w-0 p-5">
        <p className="eyebrow">01 · Comparación</p>
        <h2 className="mt-2 text-lg font-semibold">Por materia</h2>
        <p className="mt-2 text-xs text-muted">
          Promedio del indicador · primeras 10 materias en orden alfabético
        </p>
        <div className="mt-5 space-y-4">
          {data.bars.map((d, i) => (
            <button
              key={i}
              className="block w-full rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
              onClick={() =>
                setSelection(
                  `${d.label}: ${d.value ?? "sin registro"}${d.value === null ? "" : " / 100"}`,
                )
              }
            >
              <span className="flex justify-between gap-3 text-xs">
                <span>{d.label}</span>
                <strong>{d.value ?? "—"}</strong>
              </span>
              <span className="mt-2 block h-3 overflow-hidden rounded-full bg-surface-soft">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{
                    width: `${Math.max(0, Math.min(100, d.value ?? 0))}%`,
                  }}
                />
              </span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted" role="status">
          {selection ?? "Selecciona una barra para consultar su valor."}
        </p>
      </section>
      <section className="ui-card p-5">
        <p className="eyebrow">02 · Distribución</p>
        <h2 className="mt-2 text-lg font-semibold">Matrículas por rango</h2>
        <p className="mt-2 text-xs text-muted">
          Rangos descriptivos; no definen aprobación.
        </p>
        <div
          role="img"
          aria-label={`Distribución: ${data.distribution.map((d) => `${d.label}: ${d.value}`).join(", ")}`}
          className="relative mx-auto my-6 flex h-40 w-40 items-center justify-center rounded-full"
          style={{
            background: sum
              ? `conic-gradient(${segments.join(",")})`
              : colors[0],
          }}
        >
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-surface">
            <strong className="text-2xl">{sum}</strong>
            <span className="text-xs text-muted">matrículas</span>
          </div>
        </div>
        <ul className="space-y-2 text-sm">
          {data.distribution.map((d, i) => (
            <li key={d.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: colors[i] }}
              />
              <span className="flex-1">{d.label}</span>
              <strong>{d.value}</strong>
            </li>
          ))}
        </ul>
      </section>
      <section className="ui-card min-w-0 p-5">
        <p className="eyebrow">03 · Evolución</p>
        <h2 className="mt-2 text-lg font-semibold">Actividad de seis meses</h2>
        <p className="mt-2 text-xs text-muted">
          {activity}; mes actual parcial. Corresponde a las matrículas
          consultadas.
        </p>
        <svg
          viewBox="0 0 340 190"
          role="img"
          aria-label={`${activity}: ${data.timeline.map((d) => `${d.label}: ${d.value}`).join(", ")}`}
          className="mt-5 w-full text-brand"
        >
          <path
            d="M30 25V150H310"
            fill="none"
            stroke="currentColor"
            opacity="0.3"
          />
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          {data.timeline.map((d, i) => (
            <g key={d.label}>
              <circle
                cx={30 + i * 55}
                cy={150 - (d.value / max) * 120}
                r="5"
                fill="currentColor"
              >
                <title>
                  {d.label}: {d.value}
                </title>
              </circle>
              <text
                x={30 + i * 55}
                y="175"
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
              >
                {d.label.slice(5)}
              </text>
            </g>
          ))}
        </svg>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-brand">
            Consultar valores por mes
          </summary>
          <ul className="mt-3 space-y-2">
            {data.timeline.map((d) => (
              <li className="flex justify-between" key={d.label}>
                <span>{d.label}</span>
                <strong>{d.value}</strong>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
