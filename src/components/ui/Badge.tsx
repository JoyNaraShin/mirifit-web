import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-line px-1 text-xs font-bold text-ink">
      {children}
    </span>
  );
}
