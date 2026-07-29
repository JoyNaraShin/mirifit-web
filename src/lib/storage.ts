// 클라이언트 저장소 (플랜 §localStorage 스키마). 서버에 프로필을 보관하지 않는 데모 전제.
// 엔진 타입은 타입 전용 import — 컴파일 시 지워지므로 번들에 코어가 실리지 않는다(경계 가드가 검사).
import type {
  BodyClass,
  BodyClassOrigin,
  BodyPart,
  DogProfile,
} from "@pet-fit/engine";

const PROFILE_KEY = "petfit.profile.v1";

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
  savedAt: string;
}

/**
 * 저장된 프로필을 읽는다. 파싱 실패·형태 불일치는 "없음"으로 취급한다 —
 * 이전 버전 잔여물이나 손댄 값 때문에 화면이 죽는 쪽이 더 나쁘다.
 */
export function loadProfile(): StoredProfile | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(PROFILE_KEY);
  } catch {
    return null; // 프라이빗 모드 등에서 접근 자체가 막히는 경우
  }
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
    /* 아래에서 null */
  }
  return null;
}

/** 프로필을 저장한다. 저장 실패(용량·프라이빗 모드)는 화면을 막지 않고 false 로 알린다. */
export function saveProfile(value: Omit<StoredProfile, "savedAt">): boolean {
  try {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ ...value, savedAt: new Date().toISOString() }),
    );
    return true;
  } catch {
    return false;
  }
}
