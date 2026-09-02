// /api/fit 요청·응답 계약 (플랜 §API 계약). 타입은 전부 엔진 것을 재사용해 조립만 한다.
// RecommendationMeta 는 표시 계층(display)에 정의돼 있지만 type-only import 라 번들에 남지 않는다.
import type {
  BackLengthResponse,
  BodyClass,
  BodyClassOrigin,
  BodyPart,
  DogProfile,
  FabricStretch,
  GarmentCategory,
  GarmentFitResponse,
  Measurement,
  SpecSource,
} from "@pet-fit/engine";
import type {
  DisplayFitMap,
  DisplayPartFit,
  RecommendationMeta,
} from "@pet-fit/engine/display";

/**
 * GET /api/garments 응답 항목. **치수(cm)는 없다** — 스펙 DB 가 자산이라
 * 목록에서 내보내지 않는다(§6). 클라이언트는 라벨·메타만 안다.
 */
export interface GarmentListItem {
  id: string;
  brand: string;
  product: string;
  category: GarmentCategory;
  /** 원단 미상 안내용. 치수는 포함하지 않는다. */
  fabricStretch: FabricStretch;
  sizeLabels: string[];
}

export interface GarmentListResponse {
  garments: GarmentListItem[];
}

/**
 * 겨드랑이 문항 응답 (D-07). **엔진 어휘가 아니라 UI 어휘다** — 엔진에는 이 개념이
 * 없고, `_lib/mappings.ts` 가 `chestFit` override 로 번역한 뒤 엔진에 넘긴다.
 */
export type ArmpitTwoFingers = "yes" | "no" | "unknown";

/**
 * 이전 옷 관측 1건. 엔진의 `PreviousGarmentObservation` 과 달리 `GarmentSpec` 전체가
 * 아니라 **id 만** 받는다 — 클라이언트는 치수를 모르고(§6, 스펙 DB가 자산),
 * 서버가 시드에서 조회해 붙인다.
 *
 * 생략된 필드 = "기억 안 나요" = 제약 미생성. 빈 문자열·null 이 아니라 부재로 표현한다.
 */
export interface EstimateObservationInput {
  garmentId: string;
  sizeLabel: string;
  chestFit?: GarmentFitResponse;
  armpitTwoFingers?: ArmpitTwoFingers;
  neckFit?: GarmentFitResponse;
  backLengthFit?: BackLengthResponse;
}

export interface EstimateRequest {
  observations: EstimateObservationInput[];
  /** 체급 프라이어의 근거 (D-09). 자기일관 해가 없을 때만 쓰인다. */
  prior?: { weightKg?: number };
}

/**
 * POST /api/estimate 응답.
 *
 * 플랜 §API 계약은 `estimate: EstimateResult` 를 그대로 싣는다고 적었으나 **좁혔다**.
 * 표시 계층이 실제로 읽는 것은 `RecommendationMeta` 4필드뿐이고(`format.ts` `formatMeta`),
 * `PartEstimate.interval` 을 읽는 표시 함수는 하나도 없다. `/api/fit` 의 `ease` 유출과
 * 같은 실패형이라 같은 처방을 쓴다 — 무엇을 뺄지가 아니라 무엇을 내보낼지를 명시한다.
 *
 * ⚠️ 한계를 정직하게: 이 투영이 정보 유출을 **없애지는 못한다**. `profile` 의
 * `value ± uncertainty` 가 곧 추정 구간이고, 추정치 노출은 제품 기능 자체다.
 * 얻는 것은 계약 표면 축소(부위별 `lowestSpecSource` 3개 → 최저 1개)와 이후 필드
 * 추가 시의 자동 유출 방지다. 사이즈·응답을 바꿔가며 대량 호출해 `EASE_MATRIX` 와
 * 사이즈표를 복원하는 프로빙 방어는 레이트리밋 몫이고, 데모 단계에서는 스코프 아웃이다(D-13).
 */
export interface EstimateResponse {
  /** localStorage 저장 + /api/fit 재전송 대상. 추정 부위는 tier "T2". */
  profile: DogProfile;
  bodyClass: BodyClass;
  bodyClassOrigin: BodyClassOrigin;
  conflicts: boolean;
  clampedParts: BodyPart[];
  /** 제약을 제공한 옷들 전체에서 가장 낮은 스펙 신뢰도 — 부위별이 아니라 하나로 병합. */
  lowestSpecSource: SpecSource;
}

export interface FitRequest {
  profile: {
    neck?: Measurement;
    /** 사이즈 판정 1순위 기준 — 필수 (§4.3). */
    chest: Measurement;
    back?: Measurement;
  };
  garmentId: string;
  /** T2 흐름: /api/estimate 가 확정한 체급을 override 로 전달 (§7-6 순환 해소 결과 재사용). */
  bodyClass?: BodyClass;
  meta?: RecommendationMeta;
}

/**
 * 응답용 부위 판정 = **표시 계층이 실제로 읽는 최소 형태**(`DisplayPartFit`).
 * `ease`(옷 치수 − 개 실측)가 빠져 있다.
 *
 * 클라이언트는 자기 개의 실측을 알고 있으므로 `옷 치수 = ease + 실측` 으로 스펙을
 * 정확히 역산할 수 있고, 응답에는 전 사이즈 후보가 담기므로(D-06) 요청 1회로
 * 사이즈표 하나가 통째로 빠져나간다 — 실측으로 확인된 유출 경로다.
 * 표시 계층과 같은 타입을 쓰므로 화면에 필요한 값이 빠질 수 없다.
 */
export type PublicPartFit = DisplayPartFit;
export type PublicFitMap = DisplayFitMap;

export interface PublicSizeFit {
  sizeLabel: string;
  fitMap: PublicFitMap;
}

export interface PublicRecommendation {
  recommended: string | null;
  winner?: PublicSizeFit;
  candidates: PublicSizeFit[];
}

export interface FitResponse {
  recommendation: PublicRecommendation;
  /** 요청 meta + 시드 specSource 병합 결과 — 클라이언트는 formatMeta 로 렌더. */
  meta: RecommendationMeta;
}

export type ApiErrorCode = "INVALID_INPUT" | "GARMENT_NOT_FOUND";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}
