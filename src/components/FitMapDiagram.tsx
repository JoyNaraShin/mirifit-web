import { DogSilhouette } from "@/components/DogSilhouette";
import type { PublicFitMap, PublicPartFit } from "@api/_lib/contracts";
import type { FitVerdict } from "@pet-fit/engine";
import { PART_SUBJECT, verdictLabel } from "@pet-fit/engine/display";
import { useId } from "react";

// 판정 → 색 토큰. VerdictRow 의 점 색과 같은 매핑 — 다이어그램과 텍스트 행이
// 다른 색을 말하면 어느 쪽이 정본인지 흔들린다.
const VERDICT_VAR: Record<FitVerdict, string> = {
  tight_fail: "var(--color-fit-fail)",
  tight: "var(--color-fit-caution)",
  good: "var(--color-fit-good)",
  loose: "var(--color-fit-warn)",
  loose_fail: "var(--color-fit-fail)",
};

/** "가슴이" → "가슴" — 다이어그램 라벨에는 조사가 붙지 않는다(VerdictRow 와 동일). */
const partName = (p: PublicPartFit) => PART_SUBJECT[p.part].slice(0, -1);

interface FitMapDiagramProps {
  fitMap: PublicFitMap;
}

/**
 * 핏 맵 실루엣 (플랜 E2, 와이어프레임 S5). 부위 존을 verdict 색으로 칠하고,
 * 판정 갈림(boundaryStraddle)은 빗금 패턴을 겹친다 — 색·패턴만으로 전달하지 않도록
 * 부위 텍스트 라벨을 병행하고, 정본인 텍스트 판정 행(VerdictRow)은 아래에 유지된다.
 * 다이어그램은 보조 표현이라 aria 로는 요약 한 줄만 말한다.
 */
export function FitMapDiagram({ fitMap }: FitMapDiagramProps) {
  // 패턴 id 는 인스턴스 고유로 — 같은 화면에 두 개 뜨면 id 충돌로 한쪽이 죽는다
  // (DogSilhouette 를 symbol 대신 컴포넌트로 만든 것과 같은 이유).
  const patternId = useId();
  const hatch = `url(#${patternId})`;

  const parts = [fitMap.chest, fitMap.neck, fitMap.back].filter(
    (p): p is PublicPartFit => p !== undefined,
  );
  const summary = parts
    .map((p) => `${partName(p)} ${verdictLabel(p.part, p.verdict)}`)
    .join(", ");

  const chest = fitMap.chest;
  const neck = fitMap.neck;
  const back = fitMap.back;

  return (
    <svg
      className="h-auto w-full max-w-[250px]"
      viewBox="0 0 260 165"
      role="img"
      aria-label={`부위별 핏 맵 — ${summary}`}
    >
      <defs>
        {/* 판정 갈림 빗금(와이어프레임 straddleP). 색과 독립적인 두 번째 신호. */}
        <pattern
          id={patternId}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect
            width="4"
            height="8"
            fill="var(--color-fit-caution)"
            opacity="0.45"
          />
        </pattern>
      </defs>

      <DogSilhouette />

      {/* 가슴 존 — 몸통. 존 색은 실루엣과 명도 대비가 3:1에 못 미치므로(실측 1.3~2.3)
          ink 경계선이 형태 인지를 맡는다 — 색은 보조 신호, 정본은 텍스트 행. */}
      <rect
        x="94"
        y="55"
        width="82"
        height="57"
        rx="24"
        fill={VERDICT_VAR[chest.verdict]}
        opacity="0.9"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
      />
      {chest.boundaryStraddle && (
        <rect x="94" y="55" width="82" height="57" rx="24" fill={hatch} />
      )}
      <text
        x="120"
        y="88"
        fontSize="11"
        fontWeight="700"
        fill="#fff"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth="2"
        paintOrder="stroke"
      >
        가슴
      </text>

      {/* 목 존 — 목 치수가 있는 상품에서만 판정이 존재한다. */}
      {neck && (
        <>
          <ellipse
            cx="172"
            cy="62"
            rx="13"
            ry="10"
            fill={VERDICT_VAR[neck.verdict]}
            transform="rotate(-14 172 62)"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />
          {neck.boundaryStraddle && (
            <ellipse
              cx="172"
              cy="62"
              rx="13"
              ry="10"
              fill={hatch}
              transform="rotate(-14 172 62)"
            />
          )}
          <text
            x="188"
            y="84"
            fontSize="10"
            fontWeight="700"
            fill="var(--color-ink)"
          >
            목
          </text>
        </>
      )}

      {/* 등길이 치수선 — 실측(profile.back)이 있어야 판정이 존재한다. */}
      {back && (
        <>
          {/* ink 언더레이 — verdict색 선 단독으로는 라이트 배경 대비 3:1 미달(warn 2.3). */}
          <path
            d="M94 34 L94 26 L176 26 L176 34"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M94 34 L94 26 L176 26 L176 34"
            fill="none"
            stroke={VERDICT_VAR[back.verdict]}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {back.boundaryStraddle && (
            <rect x="94" y="22" width="82" height="8" fill={hatch} />
          )}
          <text
            x="94"
            y="18"
            fontSize="10"
            fontWeight="700"
            fill="var(--color-ink)"
          >
            등길이 — {verdictLabel("back", back.verdict)}
          </text>
        </>
      )}
    </svg>
  );
}
