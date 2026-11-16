"use client";

import { useFormStatus } from "react-dom";
import type { PropsWithChildren } from "react";

export function SubmitButton({ children, pendingLabel, className, disabled = false, "aria-pressed": ariaPressed }: PropsWithChildren<{ pendingLabel: string; className: string; disabled?: boolean; "aria-pressed"?: boolean }>) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending || disabled} aria-pressed={ariaPressed}>{pending ? pendingLabel : children}</button>;
}
