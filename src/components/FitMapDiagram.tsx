import { DogSilhouette } from "@/components/DogSilhouette";
import type { PublicFitMap, PublicPartFit } from "@/contracts/api";
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
  const uid = useId();
  const patternId = `${uid}-hatch`;
  const bodyClipId = `${uid}-body`;
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
        {/* 실루엣 몸 도형과 동일 좌표의 클립 — 존 색이 실루엣 안쪽만 칠하게 한다.
            검은 테두리 패치를 몸 위에 얹는 대신 "몸이 그 색의 옷을 입은" 형태가 된다
            (리뷰 craft:F7). 도형이 DogSilhouette 와 어긋나면 색이 새거나 빈다. */}
        <clipPath id={bodyClipId}>
          <ellipse cx="68" cy="92" rx="30" ry="27" />
          <ellipse cx="112" cy="84" rx="56" ry="31" />
          <circle cx="152" cy="90" r="25" />
        </clipPath>
      </defs>

      <DogSilhouette />

      {/* 가슴 존 — 몸통을 조끼처럼 부분칠. 라벨은 존 안 흰 글자 대신 그림 밖
          ink 텍스트 + 리더 라인(DogDiagram 문법) — 색 대비와 무관하게 읽힌다. */}
      <g clipPath={`url(#${bodyClipId})`}>
        <rect
          x="94"
          y="42"
          width="82"
          height="90"
          fill={VERDICT_VAR[chest.verdict]}
          opacity="0.9"
        />
        {chest.boundaryStraddle && (
          <rect x="94" y="42" width="82" height="90" fill={hatch} />
        )}
      </g>
      <line
        x1="130"
        y1="112"
        x2="120"
        y2="142"
        stroke="var(--color-ink)"
        strokeWidth="1"
      />
      <text
        x="100"
        y="152"
        fontSize="10"
        fontWeight="700"
        fill="var(--color-ink)"
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
            opacity="0.9"
            transform="rotate(-14 172 62)"
          />
          {/* 판정 갈림 — 존이 작아 빗금이 안 읽히므로 이중 윤곽으로 알린다.
              (색과 독립적인 두 번째 신호라는 역할은 가슴의 빗금과 같다.) */}
          {neck.boundaryStraddle && (
            <>
              <ellipse
                cx="172"
                cy="62"
                rx="13"
                ry="10"
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="1.5"
                transform="rotate(-14 172 62)"
              />
              <ellipse
                cx="172"
                cy="62"
                rx="16.5"
                ry="13.5"
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="1"
                strokeDasharray="3 2.5"
                transform="rotate(-14 172 62)"
              />
            </>
          )}
          <line
            x1="180"
            y1="70"
            x2="196"
            y2="86"
            stroke="var(--color-ink)"
            strokeWidth="1"
          />
          <text
            x="194"
            y="98"
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
