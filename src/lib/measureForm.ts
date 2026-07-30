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

const measurement = (value: number): Measurement => ({
  value,
  uncertainty: T1_UNCERTAINTY_CM,
  tier: "T1",
});

const WEIGHT_MAX_KG = 100;

/**
 * 폼의 상태. **boolean 하나로 접지 않는다** — "아직 안 썼다"와 "잘못 썼다"를 한 비트에
 * 넣으면 화면이 두 상황을 구분할 수 없어 반드시 어딘가에서 거짓말을 한다
 * (실측 사고: 범위 밖 값 3개를 넣었는데 "세 치수를 모두 넣으면…"이라고 안내했다).
 * 그래서 "화면이 사용자에게 무슨 말을 해야 하나"를 타입에 새긴다.
 */
export type MeasureFormState =
  | { kind: "incomplete"; missing: MeasureFieldKey[]; errors: MeasureErrors }
  | { kind: "invalid"; errors: MeasureErrors }
  | { kind: "valid"; errors: MeasureErrors; profile: DogProfile };

/** 초안을 1회 파싱해 상태·오류·프로필을 함께 만든다(검증이 여러 경로로 흩어지지 않게). */
export function evaluateDraft(draft: MeasureDraft): MeasureFormState {
  const errors: MeasureErrors = {};
  const missing: MeasureFieldKey[] = [];
  const values = {} as Record<MeasureFieldKey, number>;

  for (const field of MEASURE_FIELDS) {
    const raw = draft[field.key];
    if (raw.trim() === "") {
      missing.push(field.key);
      continue;
    }
    const value = parseCm(raw);
    if (value === null || value <= 0) {
      errors[field.key] = "숫자로 입력해 주세요";
      continue;
    }
    if (value < field.minCm || value > field.maxCm) {
      errors[field.key] = `${field.minCm}~${field.maxCm}cm 사이로 넣어 주세요`;
      continue;
    }
    values[field.key] = value;
  }

  const weightRaw = draft.weightKg.trim();
  const weight = parseCm(draft.weightKg);
  if (
    weightRaw !== "" &&
    (weight === null || weight <= 0 || weight > WEIGHT_MAX_KG)
  ) {
    errors.weightKg = `0~${WEIGHT_MAX_KG} 사이로 넣어 주세요`;
  }

  const hasError = Object.keys(errors).length > 0;
  // 오류가 있으면 미입력보다 오류를 먼저 알린다 — 고칠 것이 눈앞에 있는 쪽이 우선.
  if (hasError) return { kind: "invalid", errors };
  if (missing.length > 0) return { kind: "incomplete", missing, errors };

  const breed = draft.breed.trim();
  return {
    kind: "valid",
    errors,
    profile: {
      neck: measurement(values.neck),
      chest: measurement(values.chest),
      back: measurement(values.back),
      ...(weight !== null && weight > 0 ? { weightKg: weight } : {}),
      ...(breed !== "" ? { breed } : {}),
    },
  };
}

/** 왜 넘어갈 수 없는지 — 뷰가 추측하지 않고 상태가 문구를 고른다. */
export function blockedReason(state: MeasureFormState): string | null {
  if (state.kind === "valid") return null;
  if (state.kind === "invalid") return "빨간 글씨로 표시한 값을 고쳐 주세요.";
  if (state.missing.length === MEASURE_FIELDS.length) {
    return "세 치수를 모두 넣으면 다음으로 넘어갈 수 있어요.";
  }
  const labels = MEASURE_FIELDS.filter((f) =>
    state.missing.includes(f.key),
  ).map((f) => f.label);
  return `${labels.join("·")}가 아직 비어 있어요.`;
}

/** 저장된 프로필을 폼 초안으로 되돌린다(재진입 프리필). */
export function profileToDraft(profile: DogProfile): MeasureDraft {
  // 손상된 레코드(값이 없는 Measurement)가 "undefined" 라는 문자열로 새어 들어와
  // 빈 것처럼 보이는 칸에 오류가 뜨는 일이 있어, 유한수만 되살린다.
  const cm = (m: Measurement | undefined) =>
    m && Number.isFinite(m.value) ? String(m.value) : "";
  return {
    neck: cm(profile.neck),
    chest: cm(profile.chest),
    back: cm(profile.back),
    weightKg: Number.isFinite(profile.weightKg as number)
      ? String(profile.weightKg)
      : "",
    breed: typeof profile.breed === "string" ? profile.breed : "",
  };
}
