"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { WorkspaceRole } from "@esapiens/contracts";
import { Icon } from "@/shared/ui/icon";
import styles from "./agenda-drawer.module.css";

const Calendar = dynamic(
  () => import("./portal-agenda").then((module) => module.PortalAgenda),
  {
    loading: () => (
      <p role="status" className="p-6 text-sm text-muted">
        Cargando calendario…
      </p>
    ),
  },
);

export function AgendaDrawer({
  role,
  timeZone,
}: {
  role: WorkspaceRole;
  timeZone: string;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className={styles.trigger}
        aria-label="Abrir mi calendario"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        <Icon name="calendar" />
        <span>Calendario</span>
      </button>
      <dialog
        ref={dialog}
        id={id}
        className={styles.drawer}
        aria-labelledby={`${id}-heading`}
        onClose={() => {
          setOpen(false);
          button.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className={styles.content}>
          <div className={styles.header}>
            <div>
              <p className="eyebrow">Organiza tu semana</p>
              <h2 id={`${id}-heading`} className="mt-1 text-xl font-semibold">
                Mi calendario
              </h2>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Cerrar calendario"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" />
            </button>
          </div>
          {open && (
            <Calendar key={role} role={role} timeZone={timeZone} compact />
          )}
        </div>
      </dialog>
    </>
  );
}
