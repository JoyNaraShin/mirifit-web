import type { ReactNode } from "react";

interface NoticeProps {
  /** error 는 실선·경고색 — 정보 안내와 시각적으로 구분된다. */
  variant?: "info" | "error";
  role?: "alert";
  /** 본문 한 줄. 여러 요소가 필요하면 children 을 쓴다. */
  text?: string;
  children?: ReactNode;
}

export function Notice({
  variant = "info",
  role,
  text,
  children,
}: NoticeProps) {
  const border =
    variant === "error"
      ? "border-solid border-fit-fail"
      : "border-dashed border-line";
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 ${border}`}
      role={role}
    >
      {text && <p className="text-sm break-keep text-muted">{text}</p>}
      {children}
    </div>
  );
}
