"use client";

import { useState } from "react";

export function PasswordField({
  id,
  name = "password",
  label = "Password",
  autoComplete = "current-password",
  minLength = 8,
  required = true,
}: {
  id: string;
  name?: string;
  label?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} required={required} />
        <button type="button" className="password-toggle" aria-pressed={visible} onClick={() => setVisible((current) => !current)}>{visible ? "Hide" : "Show"}</button>
      </div>
    </div>
  );
}
