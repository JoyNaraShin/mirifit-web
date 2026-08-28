// 클라이언트 저장소 (플랜 §localStorage 스키마). 서버에 프로필을 보관하지 않는 데모 전제.
// 엔진 타입은 타입 전용 import — 컴파일 시 지워지므로 번들에 코어가 실리지 않는다(경계 가드가 검사).
import type { EstimateObservationInput } from "@api/_lib/contracts";
import type {
  BodyClass,
  BodyClassOrigin,
  BodyPart,
  DogProfile,
  SpecSource,
} from "@pet-fit/engine";

const PROFILE_KEY = "petfit.profile.v1";
// 같은 탭의 setItem 은 storage 이벤트를 발생시키지 않는다 — 직접 알린다.
const LOCAL_CHANGE_EVENT = "petfit:profile-changed";

/** 프로필의 출처. T1 실측 / T2 이전 옷 역추정 / 샘플 강아지(콩이) 미리보기. */
export type ProfileSource = "T1" | "T2" | "sample";

export interface StoredProfile {
  profile: DogProfile;
  source: ProfileSource;
  /** T2 역추정이 확정한 체급 — /api/fit 에 override 로 넘긴다. T1 은 비운다(가슴 실측으로 재계산). */
  bodyClass?: BodyClass;
  bodyClassOrigin?: BodyClassOrigin;
  conflicts?: boolean;
  clampedParts?: BodyPart[];
  /** T2 근거 옷들의 최저 스펙 신뢰도 — /api/fit meta 로 넘겨 결과 배지에 반영한다. */
  lowestSpecSource?: SpecSource;
  savedAt: string;
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(PROFILE_KEY);
  } catch {
    return null; // 프라이빗 모드 등에서 접근 자체가 막히는 경우
  }
}

function parse(raw: string | null): StoredProfile | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "profile" in parsed &&
      typeof (parsed as StoredProfile).profile === "object" &&
      (parsed as StoredProfile).profile !== null
    ) {
      return parsed as StoredProfile;
    }
  } catch {
    /* 손상된 값은 "없음"으로 — 이전 버전 잔여물 때문에 화면이 죽는 쪽이 더 나쁘다 */
  }
  return null;
}

// useSyncExternalStore 는 스냅샷의 **참조가 같을 것**을 요구한다. 매번 새로 파싱하면
// 렌더마다 다른 객체가 나와 무한 루프가 된다 — 원문 문자열로 캐시한다.
let cache: { raw: string | null; value: StoredProfile | null } = {
  raw: null,
  value: null,
};
let cachePrimed = false;

export function getProfileSnapshot(): StoredProfile | null {
  const raw = readRaw();
  if (cachePrimed && raw === cache.raw) return cache.value;
  cache = { raw, value: parse(raw) };
  cachePrimed = true;
  return cache.value;
}

/** 다른 탭(storage)과 같은 탭(커스텀 이벤트) 양쪽 변경을 구독한다. */
export function subscribeProfile(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener(LOCAL_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(LOCAL_CHANGE_EVENT, handler);
  };
}

/** 저장 실패(용량·프라이빗 모드)는 화면을 막지 않고 false 로 알린다. */
export function saveProfile(value: Omit<StoredProfile, "savedAt">): boolean {
  try {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ ...value, savedAt: new Date().toISOString() }),
    );
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
  return true;
}

// --- 이전 옷 관측 (S2, 플랜 §localStorage 스키마 petfit.observations.v1) ---
// /api/estimate 요청 원본을 저장한다 — 정확도 루프("옷 하나 더")가 재진입할 때
// 이어쓰기 위한 것이지 화면 상태 백업이 아니다. 표시용 정보(브랜드명 등)는 넣지 않는다.

const OBSERVATIONS_KEY = "petfit.observations.v1";

export function loadObservations(): EstimateObservationInput[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(OBSERVATIONS_KEY) ?? "null",
    );
    // 최소 형태 검증 — 손상된 값은 "없음"으로. 필드 상세는 서버 검증이 최종 관문이다.
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (o: unknown) =>
          typeof o === "object" &&
          o !== null &&
          typeof (o as EstimateObservationInput).garmentId === "string" &&
          typeof (o as EstimateObservationInput).sizeLabel === "string",
      )
    ) {
      return parsed as EstimateObservationInput[];
    }
  } catch {
    /* 접근 불가·손상 — 빈 목록으로 */
  }
  return [];
}

/** 저장 실패(용량·프라이빗 모드)는 화면을 막지 않고 false 로 알린다. */
export function saveObservations(value: EstimateObservationInput[]): boolean {
  try {
    localStorage.setItem(OBSERVATIONS_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
