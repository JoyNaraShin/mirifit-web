// 표시 계층. 판정 결과 → 한국어 문구.
// 엔진 코어(fit/estimate/recommend/profile)는 문자열을 만들지 않는다 — 여기서만 만든다.
// 다국어·카피 수정이 판정 로직을 건드리지 않게 하기 위한 분리.

import type {
  BodyClassOrigin,
  BodyPart,
  FitVerdict,
  PartFit,
  SpecSource,
  Tier,
} from "./types.js";

/**
 * 표시에 필요한 최소 형태 — 표시 계층은 `ease`(옷 치수 − 개 실측)를 읽지 않는다.
 * API 는 그 값을 응답에서 빼고 내보내므로(스펙 역산 방지), 투영본을 그대로
 * 이 함수들에 넘길 수 있어야 한다. 엔진 내부의 `PartFit` 은 이 형태의 상위집합이다.
 */
export type DisplayPartFit = Omit<PartFit, "ease">;

export interface DisplayFitMap {
  chest: DisplayPartFit;
  neck?: DisplayPartFit;
  back?: DisplayPartFit;
}

/** 둘레 부위(목·가슴) 어휘. */
export const VERDICT_LABEL: Record<FitVerdict, string> = {
  tight_fail: "낌",
  tight: "타이트",
  good: "적정",
  loose: "여유",
  loose_fail: "헐렁",
};

/**
 * 길이 부위(등길이) 어휘. §4.2는 짧음/적정/김으로 정의한다 —
 * 둘레 어휘를 그대로 쓰면 "등길이가 타이트/여유"라는 뜻이 어긋난 문구가 나온다.
 */
export const LENGTH_VERDICT_LABEL: Record<FitVerdict, string> = {
  tight_fail: "많이 짧음",
  tight: "짧음(크롭)",
  good: "적정",
  loose: "김",
  loose_fail: "많이 김",
};

/** 부위명 + 주격조사. 받침 유무가 달라 조사를 함께 갖는다. */
export const PART_SUBJECT: Record<BodyPart, string> = {
  chest: "가슴이",
  neck: "목이",
  back: "등길이가",
};

/** 부위명 + 보조사(은/는). formatMeta 의 클램프 안내용. */
export const PART_TOPIC: Record<BodyPart, string> = {
  chest: "가슴은",
  neck: "목은",
  back: "등길이는",
};

/** 입력 계층 설명. 사용자에게 "T2" 같은 내부 코드를 보이지 않기 위한 매핑. */
export const TIER_LABEL: Record<Tier, string> = {
  T1: "실측",
  T2: "이전 옷 기준 추정",
  T3: "체중·견종 추정",
};

export const BODY_CLASS_ORIGIN_LABEL: Record<BodyClassOrigin, string> = {
  self_consistent: "",
  prior: "체급 근거 약함(기본값 사용)",
  ambiguous: "체급 후보가 여럿이라 신뢰 낮음",
  boundary: "체급 경계라 범위가 넓음",
};

export const SPEC_SOURCE_LABEL: Record<SpecSource, string> = {
  seller: "판매자 제공 치수",
  vision_verified: "검수된 치수",
  vision_unverified: "미검수 치수",
};

export function verdictLabel(part: BodyPart, verdict: FitVerdict): string {
  return part === "back"
    ? LENGTH_VERDICT_LABEL[verdict]
    : VERDICT_LABEL[verdict];
}

/**
 * 불확실성 꼬리표. 병기 여부는 **계층**으로 판단한다(§4.3 "모든 T2·T3 판정에").
 * 폭이 우연히 0으로 좁혀진 추정을 확정 표현으로 보이지 않게 하기 위함.
 */
export function formatUncertainty(part: DisplayPartFit): string {
  if (part.tier === "T1" && part.uncertainty === 0) return "";
  const width = part.uncertainty.toFixed(1).replace(/\.0$/, "");
  return ` (±${width}cm — ${TIER_LABEL[part.tier]})`;
}

export function formatStraddle(part: DisplayPartFit): string | undefined {
  if (!part.boundaryStraddle || !part.straddleVerdicts) return undefined;
  const labels = part.straddleVerdicts
    .map((v) => verdictLabel(part.part, v))
    .join("/");
  return `판정 갈림: ${labels}`;
}

/**
 * "가슴 기준 M: 적정 (±2cm — 이전 옷 기준 추정) [판정 갈림: 적정/낌], 단 목이 타이트" (§4.3).
 * 판정이 갈리는 부위는 **반드시** 갈림을 병기한다 — 엔진이 아는 불확실성을
 * 표시에서 떨어뜨리면 과신 표시가 되고, 원단 미상의 위험이 은폐된다.
 */
export function formatFitMap(fitMap: DisplayFitMap, sizeLabel: string): string {
  const describe = (p: DisplayPartFit) => {
    const straddle = formatStraddle(p);
    return `${verdictLabel(p.part, p.verdict)}${formatUncertainty(p)}${straddle ? ` [${straddle}]` : ""}`;
  };

  const parts = [`가슴 기준 ${sizeLabel}: ${describe(fitMap.chest)}`];
  for (const p of [fitMap.neck, fitMap.back]) {
    if (!p || (p.verdict === "good" && !p.boundaryStraddle)) continue;
    parts.push(`단 ${PART_SUBJECT[p.part]} ${describe(p)}`);
  }
  return parts.join(", ");
}

/**
 * 부위·판정별 한 줄 안내 [가설 — 카피]. 판정에서 파생되는 문구는 전부 이 계층에 둔다 —
 * 화면에 흩어지면 룰이 바뀔 때 같이 못 바뀌고, 판정과 안내가 어긋난다.
 * (와이어프레임 S5 의 보조 문구를 표로 정리한 것)
 */
const PART_ADVICE: Record<BodyPart, Partial<Record<FitVerdict, string>>> = {
  chest: {
    tight_fail: "몸통이 끼어요 — 한 사이즈 올리는 게 좋아요",
    tight: "신축 원단이면 입힐 수 있지만 오래 입히긴 답답할 수 있어요",
    good: "몸통이 제일 중요해요 — 잘 맞아요",
    loose: "조금 넉넉해요 — 활동복으로는 괜찮아요",
    loose_fail: "많이 헐렁해요 — 앞다리가 빠질 수 있어요",
  },
  neck: {
    tight_fail: "목이 조여요 — 입히기 어려울 수 있어요",
    tight: "머리가 들어가는지 확인하세요",
    loose: "목이 헐렁해 벗겨질 수 있어요",
    loose_fail: "목이 많이 헐렁해요 — 어깨가 빠질 수 있어요",
  },
  back: {
    tight_fail: "등을 많이 덮지 못해요",
    tight: "짧게 입는 크롭 기장이에요",
    loose: "배를 덮어요 — 뒷다리에 걸리지 않는지 확인하세요",
    loose_fail: "많이 길어요 — 배변 때 걸릴 수 있어요",
  },
};

/** 판정에 딸린 한 줄 안내. 해당 조합에 할 말이 없으면 undefined. */
export function partAdvice(part: DisplayPartFit): string | undefined {
  return PART_ADVICE[part.part][part.verdict];
}

/** 판정의 신뢰도에 영향을 주는 부가 정보. profile·estimate 결과에서 넘긴다. */
export interface RecommendationMeta {
  lowestSpecSource?: SpecSource;
  bodyClassOrigin?: BodyClassOrigin;
  conflicts?: boolean;
  clampedParts?: BodyPart[];
}

/** 신뢰도 꼬리표. 근거가 약한 추정을 확정처럼 보이지 않게 한다(§4.3·§6). */
export function formatMeta(meta: RecommendationMeta): string[] {
  const notes: string[] = [];
  if (meta.lowestSpecSource && meta.lowestSpecSource !== "seller") {
    notes.push(SPEC_SOURCE_LABEL[meta.lowestSpecSource]);
  }
  if (meta.bodyClassOrigin && meta.bodyClassOrigin !== "self_consistent") {
    notes.push(BODY_CLASS_ORIGIN_LABEL[meta.bodyClassOrigin]);
  }
  if (meta.conflicts) notes.push("이전 옷 응답이 서로 모순돼 범위를 넓힘");
  if (meta.clampedParts?.length) {
    notes.push(
      `${meta.clampedParts.map((p) => PART_TOPIC[p]).join("·")} 한쪽만 아는 응답이라 범위로 추정`,
    );
  }
  return notes;
}

export function formatRecommendation(
  /** 엔진 결과·API 투영본 모두 받는다(구조적으로 같은 최소 형태). */
  result: { winner?: { sizeLabel: string; fitMap: DisplayFitMap } },
  meta: RecommendationMeta = {},
): string {
  if (!result.winner) return "옷 스펙에 사이즈가 없습니다.";
  const base = formatFitMap(result.winner.fitMap, result.winner.sizeLabel);
  const notes = formatMeta(meta);
  return notes.length ? `${base} — ${notes.join(", ")}` : base;
}
