import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "plain" | "link";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  children: ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-1 font-semibold cursor-pointer";

const VARIANT: Record<Variant, string> = {
  primary:
    "min-h-12 px-4 rounded-xl border border-transparent bg-accent text-accent-ink text-sm",
  plain:
    "min-h-12 px-4 rounded-xl border border-line bg-surface text-ink text-sm",
  // 손으로 개를 붙잡은 채 조작하는 화면이라, 글자처럼 보이는 동작도 44px 타깃을 지킨다.
  link: "min-h-11 min-w-11 py-1 text-accent text-sm hover:underline",
};

const DISABLED =
  "disabled:cursor-not-allowed disabled:border-line disabled:bg-disabled-surface disabled:text-disabled-ink";

export function Button({
  variant = "plain",
  block = false,
  type = "button",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const disabledStyle = variant === "link" ? "disabled:opacity-50" : DISABLED;
  return (
    <button
      type={type}
      className={`${BASE} ${VARIANT[variant]} ${disabledStyle} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
