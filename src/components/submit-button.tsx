"use client";

import { useFormStatus } from "react-dom";
import type { PropsWithChildren } from "react";

export function SubmitButton({ children, pendingLabel, className }: PropsWithChildren<{ pendingLabel: string; className: string }>) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending}>{pending ? pendingLabel : children}</button>;
}
