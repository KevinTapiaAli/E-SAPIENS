"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Icon, type IconName } from "@/shared/ui/icon";
import styles from "./institutional-carousel.module.css";

const slides: {
  label: string;
  title: string;
  description: string;
  detail: string;
  icon: IconName;
}[] = [
  {
    label: "Nuestra misión",
    title: "Acercar el conocimiento. Acompañar cada paso.",
    description:
      "Crear un espacio de formación claro y accesible, donde estudiantes y docentes encuentren recursos para aprender, compartir y aplicar lo que saben.",
    detail: "Aprendizaje con propósito",
    icon: "book",
  },
  {
    label: "Nuestra visión",
    title: "Una comunidad que aprende y construye su futuro.",
    description:
      "Impulsar una educación que conecte la curiosidad con nuevas oportunidades, respete distintos ritmos y convierta el aprendizaje en un hábito para toda la vida.",
    detail: "Conocimiento que abre caminos",
    icon: "users",
  },
  {
    label: "Nuestro compromiso",
    title: "Claridad para avanzar. Herramientas para crecer.",
    description:
      "Reunir cursos, recursos y acompañamiento en un mismo lugar, con objetivos comprensibles, organización y una experiencia centrada en las personas.",
    detail: "Personas, educación y tecnología",
    icon: "monitor",
  },
];

const rotationInterval = 5_000;
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeMotionPreference(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function subscribePageVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getPageVisibility() {
  return document.visibilityState === "visible";
}

function getServerSnapshot() {
  return false;
}

export function InstitutionalCarousel() {
  const id = useId();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeMotionPreference,
    getReducedMotion,
    getServerSnapshot,
  );
  const pageVisible = useSyncExternalStore(
    subscribePageVisibility,
    getPageVisibility,
    getServerSnapshot,
  );
  const rotating =
    !paused && !hovered && !focused && !reducedMotion && pageVisible;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, rotationInterval);
    return () => window.clearInterval(timer);
  }, [rotating]);

  function selectSlide(next: number) {
    setPaused(true);
    setIndex((next + slides.length) % slides.length);
  }

  return (
    <section
      className={styles.carousel}
      aria-label="Conoce E-SAPIENS"
      aria-roledescription="carrusel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className={styles.header}>
        <p className="eyebrow">Conoce E-SAPIENS</p>
        {reducedMotion ? (
          <span className={styles.rotationLabel}>Avance manual</span>
        ) : (
          <button
            type="button"
            className={styles.rotationButton}
            onClick={() => setPaused((current) => !current)}
            aria-label={
              paused
                ? "Reanudar presentación automática"
                : "Pausar presentación automática"
            }
          >
            <svg
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              {paused ? (
                <path d="m6 3 11 7-11 7Z" />
              ) : (
                <path d="M5 3h3v14H5zm7 0h3v14h-3z" />
              )}
            </svg>
            {paused ? "Reanudar" : "Pausar"}
          </button>
        )}
      </div>

      <div
        className={styles.slides}
        aria-live={rotating ? "off" : "polite"}
        aria-atomic="true"
      >
        {slides.map((slide, position) => (
          <div
            key={slide.label}
            id={`${id}-slide-${position}`}
            className={`${styles.slide} ${position === index ? styles.active : ""}`}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${position + 1} de ${slides.length}: ${slide.label}`}
            aria-hidden={position !== index}
          >
            <div className={styles.copy}>
              <p className={styles.label}>{slide.label}</p>
              <h2 className={styles.title}>{slide.title}</h2>
              <p className={styles.description}>{slide.description}</p>
              <p className={styles.detail}>
                <Icon name="check" className="h-4 w-4" />
                {slide.detail}
              </p>
            </div>
            <div className={styles.illustration} aria-hidden="true">
              <span className={styles.symbol}>
                <Icon name={slide.icon} className="h-16 w-16" />
              </span>
              <span className={styles.wordmark}>E-SAPIENS</span>
              <span className={styles.caption}>Un espacio para crecer</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.indicators} aria-label="Elegir contenido">
          {slides.map((slide, position) => (
            <button
              key={slide.label}
              type="button"
              className={styles.indicator}
              aria-label={`Mostrar ${slide.label.toLowerCase()}`}
              aria-pressed={position === index}
              aria-controls={`${id}-slide-${position}`}
              onClick={() => selectSlide(position)}
            >
              <span />
            </button>
          ))}
        </div>
        <div className={styles.navigation}>
          <span className={styles.counter} aria-hidden="true">
            {index + 1} / {slides.length}
          </span>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Contenido anterior"
            onClick={() => selectSlide(index - 1)}
          >
            <Icon name="arrow" className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Contenido siguiente"
            onClick={() => selectSlide(index + 1)}
          >
            <Icon name="arrow" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
