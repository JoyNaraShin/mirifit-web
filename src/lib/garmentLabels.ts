import type { ProfileSource } from "@/lib/storage";
// 상품 메타의 한국어 라벨. 판정 문구는 엔진 display 계층이 만들고, 여기는 목록 표시용.
import type { GarmentCategory } from "@pet-fit/engine";

export const CATEGORY_LABEL: Record<GarmentCategory, string> = {
  vest: "조끼형",
  sleeveless: "민소매",
  tee: "티셔츠형",
};

/**
 * 원단 신축성 미표기 안내. 표본조사에서 신축성 표기율이 0% 였고, 미표기 상품은
 * 니트·우븐 어느 쪽인지에 따라 판정이 갈릴 수 있어 목록에서 미리 알린다(§7-9).
 */
export const FABRIC_UNKNOWN_NOTE = "원단 미표기";

// 부위별 계층(display 의 TIER_LABEL)과 달리 "이 프로필 전체가 어디서 왔는지"다 —
// 저장소 개념이라 화면 계층에 둔다.
export const PROFILE_SOURCE_LABEL: Record<ProfileSource, string> = {
  T1: "줄자로 직접 실측",
  T2: "전에 산 옷으로 추정",
  sample: "샘플 강아지",
};
