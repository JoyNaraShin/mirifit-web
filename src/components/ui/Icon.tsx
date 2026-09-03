import type { SVGProps } from "react";

// 크롬(장식) 아이콘 세트 — 이모지 대체 (리뷰 craft:F5).
// 이모지는 플랫폼마다 형태·톤이 달라 UI 의 일부로 통제되지 않는다. 선 아이콘은
// currentColor 를 따라 버튼·배지의 텍스트 색과 자동으로 맞는다.
// path 는 24×24 그리드에 stroke 기준으로 직접 그린 것 — 외부 아이콘 패키지 없음.
const PATHS = {
  ruler: [
    "M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z",
    "m14.5 12.5 2-2",
    "m11.5 9.5 2-2",
    "m8.5 6.5 2-2",
    "m17.5 15.5 2-2",
  ],
  shirt: [
    "M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z",
  ],
  "thumb-up": [
    "M7 10v12",
    "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",
  ],
  "thumb-down": [
    "M17 14V2",
    "M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z",
  ],
};

export type IconName = keyof typeof PATHS;

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  /** px. 본문 텍스트(14px) 옆 기본 16 — 이모지가 차지하던 시각 무게와 비슷하다. */
  size?: number;
}

/** 장식 전용(aria-hidden 고정) — 의미는 항상 곁의 텍스트가 진다. */
export function Icon({ name, size = 16, ...rest }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
