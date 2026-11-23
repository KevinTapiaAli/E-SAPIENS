"use client";

import { useId, useState, type FormEvent } from "react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
function isField(target: EventTarget): target is Field {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}
function validationMessage(field: Field) {
  if (field.validity.valueMissing) return "Completa este campo.";
  if (field.validity.tooShort)
    return `Escribe al menos ${(field as HTMLInputElement).minLength} caracteres.`;
  if (field.validity.rangeUnderflow)
    return `El valor mínimo es ${(field as HTMLInputElement).min}.`;
  if (field.validity.rangeOverflow)
    return `El valor máximo es ${(field as HTMLInputElement).max}.`;
  if (field.validity.badInput || field.validity.stepMismatch)
    return "Introduce un número válido para este campo.";
  return field.validationMessage;
}

export function useFormErrors() {
  const id = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  function onInvalid(event: FormEvent<HTMLFormElement>) {
    if (!isField(event.target) || !event.target.name) return;
    const field = event.target;
    setErrors((current) => ({
      ...current,
      [field.name]: validationMessage(field),
    }));
  }
  function onInput(event: FormEvent<HTMLFormElement>) {
    if (!isField(event.target)) return;
    const name = event.target.name;
    if (errors[name])
      setErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
  }
  return {
    onInvalid,
    onInput,
    clear: () => setErrors({}),
    setError(name: string, message: string) {
      setErrors((current) => ({ ...current, [name]: message }));
    },
    field(name: string) {
      return {
        "aria-invalid": errors[name] ? (true as const) : undefined,
        "aria-describedby": errors[name] ? `${id}-${name}` : undefined,
      };
    },
    message(name: string) {
      return errors[name] ? (
        <span
          id={`${id}-${name}`}
          className="mt-2 block text-sm font-normal text-danger"
        >
          {errors[name]}
        </span>
      ) : null;
    },
  };
}
