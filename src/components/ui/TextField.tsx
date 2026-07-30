import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { useId } from "react";

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  /** 제출 실패 시 첫 오류 필드로 포커스를 옮기기 위해 호출자가 참조를 잡는다. */
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  /** 라벨 오른쪽 보조 동작(예: "어떻게 재요?"). */
  action?: ReactNode;
  hint?: string;
  error?: string;
  /** 값 오른쪽에 붙는 단위. 값과 250px 떨어지면 서로 무관한 요소로 읽힌다. */
  unit?: string;
  /** 숫자 입력은 우측 정렬해 단위 바로 왼쪽에 오게 한다. */
  align?: "left" | "right";
}

export function TextField({
  inputRef,
  label,
  action,
  hint,
  error,
  unit,
  align = "left",
  className = "",
  ...input
}: TextFieldProps) {
  const base = useId();
  const inputId = `${base}-input`;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold" htmlFor={inputId}>
          {label}
        </label>
        {action}
      </div>
      <div
        className={`grid grid-cols-[1fr_auto] items-center rounded-lg border bg-surface px-3 focus-within:ring-3 focus-within:ring-accent-soft ${
          // 오류는 문구만이 아니라 입력 자체가 드러내야 한다 — 스캔하는 사람이
          // 12px 빨간 글씨를 읽어야만 어디가 문제인지 아는 건 실패다.
          error
            ? "border-fit-fail ring-3 ring-fit-fail/12"
            : "border-line focus-within:border-accent"
        }`}
      >
        <input
          id={inputId}
          ref={inputRef}
          className={`min-w-0 border-0 bg-transparent py-3 tabular-nums outline-none placeholder:text-muted/75 ${
            align === "right" ? "text-right" : ""
          }`}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          {...input}
        />
        {unit && <span className="pl-1 text-sm text-muted">{unit}</span>}
      </div>
      {hint && (
        <p className="text-xs text-muted" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p
          className="text-xs font-semibold break-keep text-fit-fail"
          id={errorId}
        >
          {error}
        </p>
      )}
    </div>
  );
}
