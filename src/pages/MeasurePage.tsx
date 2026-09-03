import { DogDiagram } from "@/components/DogDiagram";
import { MeasureGuideSheet } from "@/components/MeasureGuideSheet";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useStoredProfile } from "@/hooks/useStoredProfile";
import {
  EMPTY_DRAFT,
  MEASURE_FIELDS,
  type MeasureDraft,
  type MeasureFieldKey,
  type MeasureFieldSpec,
  T1_UNCERTAINTY_CM,
  blockedReason,
  evaluateDraft,
  profileToDraft,
} from "@/lib/measureForm";
import { saveProfile } from "@/lib/storage";
import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

export function MeasurePage() {
  const navigate = useNavigate();
  // 히스토리 없이 직접 열린 화면인지 — 첫 엔트리의 key 는 "default".
  const isFreshEntry = useLocation().key === "default";
  const stored = useStoredProfile();
  // 실측으로 저장한 프로필만 되살린다 — T2 추정치를 실측란에 넣으면 근거가 섞인다.
  const [draft, setDraft] = useState<MeasureDraft>(() =>
    stored?.source === "T1" ? profileToDraft(stored.profile) : EMPTY_DRAFT,
  );
  // 필드를 떠났거나 제출을 시도한 뒤에만 오류를 보여준다 — 입력 중에 빨간 글씨를 들이밀지 않는다.
  const [touched, setTouched] = useState<
    Partial<Record<keyof MeasureDraft, boolean>>
  >({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [guideField, setGuideField] = useState<MeasureFieldSpec | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  // 모바일에서 더블탭은 기본 행동이라, 막지 않으면 히스토리에 항목이 2개 쌓여
  // 뒤로가기가 먹히지 않는다.
  const submitting = useRef(false);
  const fieldRefs = useRef<Map<MeasureFieldKey, HTMLInputElement>>(new Map());

  const state = evaluateDraft(draft);
  const reason = blockedReason(state);

  const update = (key: keyof MeasureDraft, value: string) =>
    // 로케일 소수점(1,5)을 그대로 두면 Number() 가 NaN 을 준다.
    setDraft((prev) => ({ ...prev, [key]: value.replace(",", ".") }));
  const markTouched = (key: keyof MeasureDraft) =>
    setTouched((prev) => ({ ...prev, [key]: true }));
  const shownError = (key: keyof MeasureDraft) =>
    touched[key] || submitAttempted ? state.errors[key] : undefined;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    setSubmitAttempted(true);
    if (state.kind !== "valid") {
      // 버튼을 비활성으로 막지 않고 제출이 이유를 드러낸다 — 비활성 버튼은 탭 순서에서
      // 사라져 키보드·스크린리더 사용자가 이유에 도달할 길이 없어진다.
      const firstBad =
        MEASURE_FIELDS.find((f) => state.errors[f.key])?.key ??
        (state.kind === "incomplete" ? state.missing[0] : undefined);
      if (firstBad) fieldRefs.current.get(firstBad)?.focus();
      return;
    }
    if (!saveProfile({ profile: state.profile, source: "T1" })) {
      setSaveFailed(true);
      return;
    }
    submitting.current = true;
    // 제출된 폼은 히스토리에서 소거 — 뒤로가기가 "완료된 입력"으로 돌아가지 않게.
    navigate("/garments", { replace: true });
  };

  return (
    <main className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-muted">
        <Button
          variant="link"
          onClick={() =>
            isFreshEntry ? navigate("/", { replace: true }) : navigate(-1)
          }
        >
          ← 뒤로
        </Button>
        <span className="tabular-nums">1 / 2</span>
      </div>

      <h1 className="text-xl leading-snug font-bold text-balance">
        세 군데만 재면 돼요
      </h1>
      <p className="-mt-2 text-xs text-muted">
        줄자로 잰 값을 넣어 주세요. ±{T1_UNCERTAINTY_CM}cm 오차를 기준으로
        판정해요.
      </p>

      <div className="flex justify-center rounded-xl border border-line bg-surface p-2">
        {/* 시트가 열리면 강조는 시트 안 도해가 맡는다 — 배경까지 같이 바뀌면
            같은 화면에 개가 두 마리 보인다. */}
        <DogDiagram />
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
        {/* aria-describedby 는 포커스가 그 필드에 있을 때만 읽힌다 — blur 시점에 생긴
            오류는 이 리전 없이는 스크린리더에 절대 전달되지 않는다. */}
        <div role="alert" aria-live="assertive" className="sr-only">
          {submitAttempted && reason ? reason : ""}
        </div>

        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="p-0 text-xs font-bold text-muted">
            꼭 필요한 치수
          </legend>
          {MEASURE_FIELDS.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              hint={field.hint}
              error={shownError(field.key)}
              unit="cm"
              align="right"
              inputRef={(node) => {
                if (node) fieldRefs.current.set(field.key, node);
                else fieldRefs.current.delete(field.key);
              }}
              action={
                <Button variant="link" onClick={() => setGuideField(field)}>
                  어떻게 재요?
                </Button>
              }
              // type="number" 는 쓰지 않는다 — 포커스된 채 페이지를 휠 스크롤하면 값이
              // 조용히 바뀐다(실측: 42 → 42.1). 숫자 키패드는 inputMode 가 준다.
              type="text"
              inputMode="decimal"
              autoComplete="off"
              required
              aria-required="true"
              value={draft[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
              onBlur={() => markTouched(field.key)}
            />
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-3 border-0 p-0">
          {/* 정직한 라벨: T1 판정은 가슴 실측으로 체급을 계산하고 견종은 아직
              BreedShape 매핑이 없다 — 이 두 값은 지금 추천을 바꾸지 못한다. */}
          <legend className="p-0 text-xs font-bold text-muted">
            우리 아이 정보 (선택 — 지금은 저장만 해요)
          </legend>
          <p className="text-xs text-muted">
            추천 계산에는 아직 쓰지 않아요. 다음 버전의 체형 보정에 쓸 값이에요.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="체중"
              unit="kg"
              align="right"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={draft.weightKg}
              onChange={(e) => update("weightKg", e.target.value)}
              onBlur={() => markTouched("weightKg")}
              error={shownError("weightKg")}
            />
            <TextField
              label="견종"
              type="text"
              placeholder="예: 말티즈"
              maxLength={30}
              value={draft.breed}
              onChange={(e) => update("breed", e.target.value)}
            />
          </div>
        </fieldset>

        {saveFailed && (
          <p
            className="text-xs font-semibold break-keep text-fit-fail"
            role="alert"
          >
            이 브라우저에 값을 저장할 수 없었어요. 시크릿 모드라면 일반 창에서
            다시 시도해 주세요.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button type="submit" variant="primary" block>
            다음 →
          </Button>
          {reason && <p className="text-center text-xs text-muted">{reason}</p>}
        </div>
      </form>

      <MeasureGuideSheet
        field={guideField}
        onClose={() => setGuideField(null)}
      />
    </main>
  );
}
