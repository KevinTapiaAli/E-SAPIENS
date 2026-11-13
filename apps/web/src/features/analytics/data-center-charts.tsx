import type { ExecutiveDashboard } from "@esapiens/contracts";

const colors = ["var(--brand)", "#b45309", "#6552b4", "#087f72"];
export function DataBars({
  title,
  points,
  unit = "matrículas",
  note = "resultados de la página actual",
  maximum,
}: {
  title: string;
  points: { label: string; value: number | null }[];
  unit?: string;
  note?: string;
  maximum?: number;
}) {
  const max = maximum ?? Math.max(1, ...points.map((p) => p.value ?? 0));
  return (
    <section className="ui-card min-w-0 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-xs text-muted">
        {unit} · {note}
        {maximum ? ` · escala 0–${maximum}` : ""}
      </p>
      {points.length ? (
        <ul className="mt-5 space-y-4">
          {points.map((p, i) => (
            <li key={i}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="break-words">{p.label}</span>
                <strong className="tabular-nums">{p.value ?? "—"}</strong>
              </div>
              <div
                aria-hidden
                className="mt-2 h-3 overflow-hidden rounded-full bg-surface-soft"
              >
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(100 * (p.value ?? 0)) / max}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-muted">Sin datos para esta consulta.</p>
      )}
    </section>
  );
}

export function DataDonut({
  title,
  points,
}: {
  title: string;
  points: { label: string; value: number }[];
}) {
  const total = points.reduce((n, p) => n + p.value, 0);
  let cumulative = 0;
  const segments = points.map((p, i) => {
    const start = cumulative;
    cumulative += total ? (p.value * 100) / total : 0;
    return `${colors[i % colors.length]} ${start}% ${cumulative}%`;
  });
  return (
    <section className="ui-card p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div
        role="img"
        aria-label={points.map((p) => `${p.label}: ${p.value}`).join(", ")}
        className="mx-auto my-6 flex h-40 w-40 items-center justify-center rounded-full"
        style={{
          background: total
            ? `conic-gradient(${segments.join(",")})`
            : "var(--line)",
        }}
      >
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-surface">
          <strong className="text-2xl tabular-nums">{total}</strong>
          <span className="text-xs text-muted">total</span>
        </div>
      </div>
      <ul className="space-y-3 text-sm">
        {points.map((p, i) => (
          <li key={p.label} className="flex gap-3">
            <span
              aria-hidden
              className="mt-1 h-3 w-3 rounded-full"
              style={{ background: colors[i % colors.length] }}
            />
            <span className="flex-1">{p.label}</span>
            <strong>{p.value}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DataTrend({
  points,
}: {
  points: ExecutiveDashboard["traffic"]["trend"];
}) {
  const max = Math.max(1, ...points.map((p) => p.visitors ?? 0));
  const x = (i: number) => 25 + (i * 590) / Math.max(1, points.length - 1);
  const y = (v: number) => 155 - (v * 130) / max;
  // Missing measurements split the line; they are never plotted as zero.
  const segments: string[][] = [[]];
  points.forEach((p, i) => {
    if (p.visitors === null) {
      if (segments.at(-1)!.length) segments.push([]);
    } else segments.at(-1)!.push(`${x(i)},${y(p.visitors)}`);
  });
  return (
    <section className="ui-card min-w-0 p-5">
      <h2 className="text-lg font-semibold">Evolución de visitantes</h2>
      <p className="mt-2 text-xs text-muted">
        Visitantes únicos estimados por día UTC · máximo{" "}
        {max === 1 && !points.some((p) => p.visitors) ? 0 : max}. No sumar días
        para obtener visitantes únicos del período.
      </p>
      <svg
        viewBox="0 0 640 185"
        className="mt-5 w-full text-brand"
        role="img"
        aria-label="Evolución temporal. Los valores y días sin medición están disponibles en la tabla desplegable."
      >
        <path d="M25 15V155H620" fill="none" stroke="var(--line)" />
        {segments.map((segment, i) => (
          <polyline
            key={i}
            points={segment.join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        ))}
        {points.map((p, i) =>
          p.visitors === null ? null : (
            <circle
              key={p.day}
              cx={x(i)}
              cy={y(p.visitors)}
              r="2"
              fill="currentColor"
            >
              <title>
                {p.day}: {p.visitors} visitantes
              </title>
            </circle>
          ),
        )}
      </svg>
      <div className="flex justify-between gap-3 text-xs text-muted">
        <span>{points[0]?.day}</span>
        <span>{points.at(-1)?.day}</span>
      </div>
      <details className="mt-4">
        <summary className="text-link min-h-11 cursor-pointer py-2 text-sm">
          Consultar datos diarios accesibles
        </summary>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Visitantes por día UTC</caption>
            <thead>
              <tr>
                <th scope="col" className="py-2">
                  Día UTC
                </th>
                <th scope="col">Visitantes estimados</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.day} className="border-t border-line">
                  <th scope="row" className="py-2 font-normal">
                    {p.day}
                  </th>
                  <td>{p.visitors ?? "Sin medición"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
