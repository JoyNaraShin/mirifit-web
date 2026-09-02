// 도메인 타입. docs/fit-rules-v0.md §2 참조.

export type Tier = "T1" | "T2" | "T3";

/** 개 실측/추정치 하나. 항상 불확실성을 동반한다 (§2.1). */
export interface Measurement {
  value: number; // cm
  uncertainty: number; // ± cm (반경)
  tier: Tier;
}

/** 견종 → 체형 카테고리 (§2.1). 표준형/장동형(닥스훈트)/단두흉폭형(프렌치불독·퍼그)/장동장각형. */
export type BreedShape =
  | "standard"
  | "long_body"
  | "brachy_wide_chest"
  | "long_body_long_leg";

/** 체급 (§3). 가슴둘레 실측 기준 소/중/대. */
export type BodyClass = "small" | "medium" | "large";

export interface DogProfile {
  weightKg?: number;
  breed?: string;
  breedShape?: BreedShape;
  /** 목둘레. T1 직접입력 또는 T2 역추정 결과. */
  neck?: Measurement;
  /** 가슴둘레. 사이즈 판정의 1순위 기준이므로 대부분의 흐름에서 필수. */
  chest?: Measurement;
  /** 등길이. */
  back?: Measurement;
}

/** 원단 신축성 (§2.2). 상품 텍스트에서 표기율 0% — 기본값 unknown. */
export type FabricStretch = "knit" | "woven" | "unknown";

/** 신축성이 확정된 원단. 여유분 매트릭스 조회 키 — unknown은 양쪽을 조회해 합성한다. */
export type StretchFabric = Exclude<FabricStretch, "unknown">;

/** 부위별 권장 여유 구간 (§3). lo/hi 모두 포함(닫힌 구간). */
export interface EaseRange {
  lo: number;
  hi: number;
}

export interface GarmentSize {
  label: string;
  neckCm?: number;
  chestCm: number;
  backCm: number;
  sleeveCm?: number;
  weightHintKg?: number;
}

/** MVP 판정 범위 (§1). 표준 3치수로 판정 가능한 카테고리만 — 올인원·아우터 제외. */
export type GarmentCategory = "vest" | "sleeveless" | "tee";

/**
 * 스펙 출처 신뢰도 (§6). 사이즈표의 87.5%가 이미지라 비전 추출·사용자 업로드에
 * 의존하는데, 미검수 스펙 1건이 역추정 전체를 오염시킬 수 있어 계층을 구분한다.
 */
export type SpecSource = "seller" | "vision_verified" | "vision_unverified";

export interface GarmentSpec {
  /** 상품 단위 안정 식별자. 브랜드 단위 일반화 금지(§6) — 같은 브랜드도 상품마다 표가 다르다. */
  id: string;
  brand: string;
  product: string;
  category: GarmentCategory;
  fabricStretch: FabricStretch;
  specSource: SpecSource;
  sizes: GarmentSize[];
}

/** 부위별 판정 (§4.1, §4.2). 길이 부위(등길이)는 짧음/적정/김을
 * tight/good/loose 세 값에 대응시켜 재사용한다 — tight_fail/loose_fail은
 * 등길이에 대해서는 나오지 않는다(문서에 이중 임계값 정의 없음). */
export type FitVerdict =
  | "tight_fail"
  | "tight"
  | "good"
  | "loose"
  | "loose_fail";

export type BodyPart = "neck" | "chest" | "back";

/** 둘레 부위 (§4.1 밴드 적용 대상). 길이 부위(back)는 §4.2 별도 룰. */
export type CircumferencePart = Extract<BodyPart, "neck" | "chest">;

export interface PartFit {
  part: BodyPart;
  verdict: FitVerdict;
  /** 이 판정이 어느 입력 계층에서 나왔는지. T1 이 아니면 표시에 불확실성 병기 의무(§4.3). */
  tier: Tier;
  /** ease = 옷 치수 − 개 실측 (cm). 길이 부위도 동일 부호로 참고용 병기. */
  ease: number;
  uncertainty: number;
  /** 개 실측 불확실성 범위가 판정 밴드 경계를 걸치는 경우 true. */
  boundaryStraddle: boolean;
  /** 불확실성 범위 양끝에서 나온 판정들(중복 제거). 경계를 걸칠 때만 채워진다. */
  straddleVerdicts?: FitVerdict[];
}

export interface FitMap {
  chest: PartFit;
  neck?: PartFit;
  back?: PartFit;
}

// --- 역추정 (§5) ---

/** "그 옷 어땠나요" 핏 응답. §5 표의 네 응답. */
export type GarmentFitResponse =
  | "too_tight"
  | "fits_well"
  | "loose"
  | "too_loose";

/**
 * "그 옷 기장이 어디까지 왔나요" 응답 (§4.2 역적용, 플랜 D-08).
 * 둘레와 달리 4단계가 아니라 3단계다 — §4.2 룰에 이중 임계값(너무 짧음/너무 김)이
 * 정의돼 있지 않아 "짧음/적정/김"에 정확히 대응한다.
 */
export type BackLengthResponse = "above_waist" | "near_hip" | "to_tail";

export interface PreviousGarmentObservation {
  garment: GarmentSpec;
  sizeLabel: string;
  chestFit?: GarmentFitResponse;
  neckFit?: GarmentFitResponse;
  backLengthFit?: BackLengthResponse;
}

/** 구간 제약. lo/hi는 ±Infinity를 가질 수 있다(한쪽만 닫힌 응답: 꽉 꼈다/헐렁했다). */
export interface Interval {
  lo: number;
  hi: number;
}

export interface PartEstimate {
  interval: Interval;
  /** 교집합이 공집합이 되어 가장 넓은 제약(합집합)으로 완화한 경우 true. */
  conflicts: boolean;
  /** 이 부위에 제약을 제공한 관측 개수. */
  garmentCount: number;
  /** 제약을 제공한 옷들 중 가장 낮은 스펙 신뢰도. 표시 계층이 병기한다(§6). */
  lowestSpecSource: SpecSource;
}

export interface EstimateResult {
  chest?: PartEstimate;
  neck?: PartEstimate;
  /** 등길이. 둘레와 달리 체급에 의존하지 않는다(§4.2 상수 고정) — 순환 없음. */
  back?: PartEstimate;
}

/** 체급 결정 방식. 역추정은 체급을 알아야 하는데 체급은 가슴에서 나오는 순환(§7-6)이 있다. */
export type BodyClassOrigin =
  | "self_consistent" // 후보 체급으로 추정한 결과가 그 체급과 정합 — 순환 해소
  | "prior" // 자기일관 해가 없거나 여럿이라 호출자 프라이어를 채택
  | "ambiguous" // 자기일관 해가 여럿 — prior 로 결정했으나 신뢰 낮음
  | "boundary"; // 체급 경계대라 자기일관 해가 없음 — 물리 범위 인접 후보들의 원시 구간 합집합 채택

export interface ProfileEstimateResult {
  /** 판정에 바로 넣을 수 있는 프로필. 추정된 부위는 tier "T2". */
  profile: DogProfile;
  /** 부위별 원시 구간(클램프 후). 표시 계층이 폭을 병기하는 데 쓴다. */
  estimate: EstimateResult;
  bodyClass: BodyClass;
  bodyClassOrigin: BodyClassOrigin;
  /** 모순된 핏 응답이 있어 제약을 완화한 부위가 있으면 true. */
  conflicts: boolean;
  /** 물리 범위로 개구간을 닫은 부위 — 추정 폭이 실제보다 좁아 보일 수 있다. */
  clampedParts: BodyPart[];
}

// --- 사이즈 추천 (§4.3) ---

export interface SizeFitResult {
  sizeLabel: string;
  fitMap: FitMap;
}

export interface RecommendationResult {
  /** 추천 사이즈. 후보가 하나도 없을 때만 null(옷에 사이즈 자체가 없는 경우). */
  recommended: string | null;
  /** 추천된 후보. recommended가 null이면 undefined. 표시 문구는 format.ts가 만든다. */
  winner?: SizeFitResult;
  /** 점수순 정렬된 전체 후보. */
  candidates: SizeFitResult[];
}
