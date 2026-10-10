"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const loading = () => (
  <p role="status" className="p-5 text-sm text-muted">
    Cargando actividad…
  </p>
);
const Challenge = dynamic(
  () => import("./learning-home").then((module) => module.LearningChallenge),
  { loading },
);
const Compass = dynamic(
  () => import("./learning-home").then((module) => module.TeachingCompass),
  { loading },
);

export function LearningExtras({ role }: { role: "docente" | "estudiante" }) {
  const [activated, setActivated] = useState(false);
  return (
    <details
      className="ui-card p-5 sm:p-6"
      onToggle={(event) => {
        if (event.currentTarget.open) setActivated(true);
      }}
    >
      <summary className="min-h-11 cursor-pointer text-lg font-semibold">
        {role === "docente"
          ? "Ideas para preparar tu clase"
          : "Practica tus estrategias de aprendizaje"}
      </summary>
      {activated && (
        <div className="mt-5">
          {role === "docente" ? <Compass /> : <Challenge />}
        </div>
      )}
    </details>
  );
}
