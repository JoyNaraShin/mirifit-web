// 샘플 강아지 "콩이" 프리셋 (플랜 E1). 입력 0으로 결과 화면까지 가는 지름길 —
// SNS 유입 이탈 방지용. source:"sample" 로 저장돼 결과 헤더에 "샘플 강아지"가
// 표기된다(정직한 프레이밍 — PROFILE_SOURCE_LABEL).
import { T1_UNCERTAINTY_CM } from "@/lib/measureForm";
import type { StoredProfile } from "@/lib/storage";

export const SAMPLE_DOG_NAME = "콩이";
export const SAMPLE_DOG_DESC = "4.2kg 말티즈";

/** 샘플 직행 대상 상품 — 시드의 실측 참조 상품(데모 히트 조끼). */
export const SAMPLE_GARMENT_ID = "demo-heat-vest";

/** 콩이의 프리셋 실측(목24·가슴38·등28 — 플랜 E1, 4kg대 말티즈 평균 체형 근사). */
export const SAMPLE_PROFILE: Omit<StoredProfile, "savedAt"> = {
  source: "sample",
  profile: {
    neck: { value: 24, uncertainty: T1_UNCERTAINTY_CM, tier: "T1" },
    chest: { value: 38, uncertainty: T1_UNCERTAINTY_CM, tier: "T1" },
    back: { value: 28, uncertainty: T1_UNCERTAINTY_CM, tier: "T1" },
    weightKg: 4.2,
    breed: "말티즈",
  },
};
