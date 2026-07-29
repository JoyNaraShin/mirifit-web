// S3 실측 폼의 필드 정의·검증. 화면(JSX)에서 분리해 규칙을 한곳에 모은다.
import type { DogProfile, Measurement } from "@pet-fit/engine";

/**
 * 사람이 줄자로 잰 값의 오차 가정 ±1cm (룰 문서 §2.1 의 T1 전제).
 * 엔진 상수가 아니라 **입력 측 가정**이라 클라이언트가 들고 있는다 —
 * 판정 밴드 같은 보호 자산은 서버에만 있다.
 */
export const T1_UNCERTAINTY_CM = 1;

export type MeasureFieldKey = "neck" | "chest" | "back";

export interface MeasureFieldSpec {
  key: MeasureFieldKey;
  label: string;
  /** 라벨 옆 짧은 부연 — 어디를 재는지. */
  hint: string;
  minCm: number;
  maxCm: number;
  /** 가이드 바텀시트 본문 (v0 텍스트 — 일러스트는 E2 에서 실루엣 재사용). */
  guide: string[];
}

/** 범위는 개 신체 물리 범위의 넉넉한 상한 — 오타(3cm·300cm)를 걸러내는 용도. */
export const MEASURE_FIELDS: readonly MeasureFieldSpec[] = [
  {
    key: "neck",
    label: "목둘레",
    hint: "목걸이 채우는 자리",
    minCm: 10,
    maxCm: 90,
    guide: [
      "목걸이를 채우는 자리, 목의 가장 아래쪽을 한 바퀴 둘러 재요.",
      "줄자와 목 사이에 손가락 하나가 들어갈 만큼 여유를 두고 재면 딱 맞습니다.",
      "털이 긴 아이는 털을 눌러 몸에 닿게 재세요.",
    ],
  },
  {
    key: "chest",
    label: "가슴둘레",
    hint: "앞다리 뒤 가장 두꺼운 곳",
    minCm: 10,
    maxCm: 90,
    guide: [
      "앞다리 바로 뒤, 몸통이 가장 두꺼운 곳을 한 바퀴 둘러 재요.",
      "숨을 들이쉰 상태에서 조금 넉넉하게 — 이 값이 사이즈를 가르는 가장 중요한 치수입니다.",
      "서 있는 자세로 재세요. 앉으면 값이 달라집니다.",
    ],
  },
  {
    key: "back",
    label: "등길이",
    hint: "목뒤부터 꼬리 시작까지",
    minCm: 10,
    maxCm: 80,
    guide: [
      "목뒤(목걸이 자리 뒤)부터 꼬리가 시작되는 지점까지 등을 따라 재요.",
      "꼬리까지 포함하지 않습니다 — 꼬리 시작점에서 멈추세요.",
      "고개를 숙이거나 앉으면 짧게 나옵니다. 똑바로 선 자세로 재세요.",
    ],
  },
];

/** 화면이 들고 있는 원본 입력값(문자열). 비어 있을 수 있다. */
export type MeasureDraft = Record<MeasureFieldKey, string> & {
  weightKg: string;
  breed: string;
};

export const EMPTY_DRAFT: MeasureDraft = {
  neck: "",
  chest: "",
  back: "",
  weightKg: "",
  breed: "",
};

/** 필드별 오류 문구. 값이 없으면 그 필드는 통과. */
export type MeasureErrors = Partial<Record<keyof MeasureDraft, string>>;

const parseCm = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

/**
 * 필수 3치수를 검증한다. 선택 입력(체중)은 값이 있을 때만 본다.
 * "아직 안 쓴 필드"와 "잘못 쓴 필드"를 구분해, 입력 중인 사람에게 빨간 글씨를
 * 미리 들이밀지 않는다 — 미입력은 오류가 아니라 미완성이다.
 */
export function validateDraft(draft: MeasureDraft): {
  errors: MeasureErrors;
  complete: boolean;
} {
  const errors: MeasureErrors = {};
  let complete = true;

  for (const field of MEASURE_FIELDS) {
    const raw = draft[field.key];
    if (raw.trim() === "") {
      complete = false;
      continue;
    }
    const value = parseCm(raw);
    if (value === null || value <= 0) {
      errors[field.key] = "숫자로 입력해 주세요";
      complete = false;
      continue;
    }
    if (value < field.minCm || value > field.maxCm) {
      errors[field.key] = `${field.minCm}~${field.maxCm}cm 사이 값이어야 해요`;
      complete = false;
    }
  }

  const weight = parseCm(draft.weightKg);
  if (
    draft.weightKg.trim() !== "" &&
    (weight === null || weight <= 0 || weight > 100)
  ) {
    errors.weightKg = "0~100kg 사이 숫자로 입력해 주세요";
    complete = false;
  }

  return { errors, complete };
}

const measurement = (value: number): Measurement => ({
  value,
  uncertainty: T1_UNCERTAINTY_CM,
  tier: "T1",
});

/**
 * 검증을 통과한 초안을 엔진 프로필로 변환한다.
 * `validateDraft(...).complete === true` 일 때만 호출한다 — 아니면 null.
 */
export function draftToProfile(draft: MeasureDraft): DogProfile | null {
  const { complete } = validateDraft(draft);
  if (!complete) return null;

  const neck = parseCm(draft.neck);
  const chest = parseCm(draft.chest);
  const back = parseCm(draft.back);
  if (neck === null || chest === null || back === null) return null;

  const weightKg = parseCm(draft.weightKg);
  const breed = draft.breed.trim();

  return {
    neck: measurement(neck),
    chest: measurement(chest),
    back: measurement(back),
    ...(weightKg !== null && weightKg > 0 ? { weightKg } : {}),
    ...(breed !== "" ? { breed } : {}),
  };
}

/** 저장된 프로필을 폼 초안으로 되돌린다(재진입 프리필). */
export function profileToDraft(profile: DogProfile): MeasureDraft {
  const cm = (m: Measurement | undefined) => (m ? String(m.value) : "");
  return {
    neck: cm(profile.neck),
    chest: cm(profile.chest),
    back: cm(profile.back),
    weightKg: profile.weightKg === undefined ? "" : String(profile.weightKg),
    breed: profile.breed ?? "",
  };
}
