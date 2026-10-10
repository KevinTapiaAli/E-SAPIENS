"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { actionFeedback } from "@/features/auth/action-feedback";

export function ProfileAvatar({
  initials,
  large = false,
}: {
  initials: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const refresh = () => {
      setFailed(false);
      setVersion(Date.now());
    };
    window.addEventListener("profile-photo-changed", refresh);
    return () => window.removeEventListener("profile-photo-changed", refresh);
  }, []);
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft font-semibold text-brand ${large ? "h-24 w-24 text-2xl" : "h-10 w-10 text-sm"}`}
    >
      {failed ? (
        initials
      ) : (
        <Image
          src={`/api/identity/avatar?v=${version}`}
          alt="Tu fotografía de perfil"
          fill
          sizes={large ? "96px" : "40px"}
          className="object-cover"
          unoptimized
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
export function ProfilePhotoEditor({ initials }: { initials: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  async function prepare(file?: File) {
    setImage(null);
    setMessage("");
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage("Elige una fotografía JPG, PNG o WebP de hasta 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error();
        const side = Math.min(bitmap.width, bitmap.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 128, 128);
        ctx.drawImage(
          bitmap,
          (bitmap.width - side) / 2,
          (bitmap.height - side) / 2,
          side,
          side,
          0,
          0,
          128,
          128,
        );
        setImage(canvas.toDataURL("image/jpeg", 0.85));
      } finally {
        bitmap.close();
      }
    } catch {
      setMessage("No se pudo abrir la imagen. Prueba con otra fotografía.");
    } finally {
      setBusy(false);
    }
  }
  async function save(data: string | null) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/identity/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const body: unknown = await r.json();
      setMessage(actionFeedback(body).message);
      if (r.ok) {
        setImage(null);
        if (fileInput.current) fileInput.current.value = "";
        window.dispatchEvent(new Event("profile-photo-changed"));
      }
    } catch {
      setMessage("No se pudo guardar tu fotografía. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="mb-7 rounded-xl border border-line p-5"
      aria-busy={busy}
    >
      <h3 className="font-semibold">Mi fotografía</h3>
      <div className="mt-4 flex flex-wrap items-center gap-5">
        {image ? (
          <Image
            src={image}
            alt="Vista previa de tu fotografía"
            width={96}
            height={96}
            className="rounded-full"
            unoptimized
          />
        ) : (
          <ProfileAvatar initials={initials} large />
        )}
        <div className="min-w-0 flex-1">
          <label className="form-label">
            Elegir fotografía
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              className="mt-2 block w-full text-sm"
              onChange={(e) => void prepare(e.target.files?.[0])}
            />
          </label>
          <p className="mt-2 text-xs text-muted">
            JPG, PNG o WebP · hasta 5 MB. Se recorta al centro y se guarda en
            tamaño de perfil.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="button button-primary"
          disabled={busy || !image}
          onClick={() => void save(image)}
        >
          Guardar fotografía
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={busy}
          onClick={() => void save(null)}
        >
          Quitar fotografía
        </button>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
