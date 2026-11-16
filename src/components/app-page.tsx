import type { PropsWithChildren } from "react";

export function AppPage({ children }: PropsWithChildren) {
  return <main className="page">{children}</main>;
}
