"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./icon";

const themeEvent = "esapiens-theme-change";
function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === "esapiens-theme" || event.key === null) {
      document.documentElement.dataset.theme =
        event.newValue === "dark" ? "dark" : "light";
      onChange();
    }
  };
  window.addEventListener(themeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(themeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
const getSnapshot = () => document.documentElement.dataset.theme === "dark";
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const label = dark ? "Usar tema claro" : "Usar tema oscuro";
  function toggle() {
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("esapiens-theme", theme);
    } catch {
      /* El tema funciona aunque el navegador bloquee almacenamiento. */
    }
    window.dispatchEvent(new Event(themeEvent));
  }
  return (
    <button
      type="button"
      className="icon-button"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}
