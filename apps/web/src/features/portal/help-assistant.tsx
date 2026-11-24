"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { WorkspaceRole } from "@esapiens/contracts";
import { Icon } from "@/shared/ui/icon";
import styles from "./help-assistant.module.css";

const Conversation = dynamic(
  () => import("./help-conversation").then((module) => module.HelpConversation),
  {
    loading: () => (
      <p role="status" className="p-5 text-sm">
        Cargando ayuda…
      </p>
    ),
  },
);

export function HelpAssistant({
  role,
  permissions,
}: {
  role: WorkspaceRole;
  permissions: readonly string[];
}) {
  const pathname = usePathname();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);
  const close = () => dialog.current?.close();
  return (
    <>
      <button
        ref={opener}
        type="button"
        className={styles.trigger}
        aria-label="Abrir Asistente E-SAPIENS"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setLoaded(true);
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <span aria-hidden="true" className={styles.question}>
          ?
        </span>
        <span>Ayuda</span>
      </button>
      <dialog
        ref={dialog}
        id={id}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className={styles.panel}
        onClose={() => {
          setOpen(false);
          if (opener.current?.getClientRects().length) opener.current.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className={styles.layout}>
          <header className={styles.header}>
            <div>
              <h2 id={`${id}-title`} className="text-lg font-semibold">
                Asistente E-SAPIENS
              </h2>
              <p id={`${id}-description`} className="mt-1 text-xs text-muted">
                Guía local de preguntas frecuentes. No realiza operaciones.
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Cerrar asistente"
              onClick={close}
            >
              <Icon name="close" />
            </button>
          </header>
          {loaded && (
            <Conversation
              key={`${role}:${pathname}`}
              role={role}
              permissions={permissions}
              pathname={pathname}
              onNavigate={close}
            />
          )}
        </div>
      </dialog>
    </>
  );
}
