import type { PropsWithChildren } from "react";

export function AppPage({ children }: PropsWithChildren) {
  return <main className="page" id="main-content">{children}</main>;
}
