// S3 — 직접 실측 (T1). 와이어프레임 docs/wireframe-phase2.html S3.
import { useId, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { DogDiagram } from "../components/DogDiagram";
import { MeasureGuideSheet } from "../components/MeasureGuideSheet";
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
} from "../lib/measureForm";
import { loadProfile, saveProfile } from "../lib/storage";

/** 재진입 프리필 — 실측으로 저장한 프로필만 되살린다(T2 추정치를 실측란에 넣지 않는다). */
function initialDraft(): MeasureDraft {
  const stored = loadProfile();
  if (!stored || stored.source !== "T1") return EMPTY_DRAFT;
  return profileToDraft(stored.profile);
}

export function MeasurePage() {
  const navigate = useNavigate();
  // 히스토리 없이 직접 열린 화면인지 — react-router 는 첫 엔트리에 key "default" 를 준다.
  const isFreshEntry = useLocation().key === "default";
  const formId = useId();
  const [draft, setDraft] = useState<MeasureDraft>(initialDraft);
  // 필드를 떠났거나 제출을 시도한 뒤에만 오류를 보여준다 — 입력 중에 빨간 글씨를 들이밀지 않는다.
  const [touched, setTouched] = useState<
    Partial<Record<keyof MeasureDraft, boolean>>
  >({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [guideField, setGuideField] = useState<MeasureFieldSpec | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  // 라우팅 전환 중 두 번째 제출을 삼킨다 — 모바일에서 더블탭은 기본 행동이고,
  // 그대로 두면 히스토리에 항목이 2개 쌓여 뒤로가기가 먹히지 않는다.
  const submitting = useRef(false);
  const fieldRefs = useRef<Map<MeasureFieldKey, HTMLInputElement>>(new Map());

  const state = evaluateDraft(draft);
  const fieldId = (key: string) => `${formId}-${key}`;
  const errorId = (key: string) => `${formId}-${key}-error`;
  const hintId = (key: string) => `${formId}-${key}-hint`;

  const update = (key: keyof MeasureDraft, value: string) =>
    // 로케일 소수점(1,5)을 그대로 두면 Number() 가 NaN 을 준다.
    setDraft((prev) => ({ ...prev, [key]: value.replace(",", ".") }));
  const markTouched = (key: keyof MeasureDraft) =>
    setTouched((prev) => ({ ...prev, [key]: true }));
  const shownError = (key: keyof MeasureDraft) =>
    touched[key] || submitAttempted ? state.errors[key] : undefined;

  const goBack = () =>
    isFreshEntry ? navigate("/", { replace: true }) : navigate(-1);

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
    navigate("/garments");
  };

  const reason = blockedReason(state);

  return (
    <main className="screen">
      <div className="topbar">
        <button type="button" className="link-btn" onClick={goBack}>
          ← 뒤로
        </button>
        <span className="step">1 / 2</span>
      </div>

      <h1 className="title">세 군데만 재면 돼요</h1>
      <p className="subtitle">
        줄자로 잰 값을 넣어 주세요. ±{T1_UNCERTAINTY_CM}cm 오차를 기준으로
        판정해요.
      </p>

      <div className="figure-box">
        {/* 시트가 열리면 강조는 시트 안 도해가 담당한다 — 배경까지 같이 바뀌면
            같은 화면에 개가 두 마리 보인다. */}
        <DogDiagram />
      </div>

      <form className="measure-form" onSubmit={handleSubmit} noValidate>
        {/* 제출 실패 이유를 1회 발화. aria-describedby 는 포커스가 그 필드에 있을 때만
            읽히므로, blur 시점에 생긴 오류는 이 리전 없이는 절대 전달되지 않는다. */}
        <div role="alert" aria-live="assertive" className="visually-hidden">
          {submitAttempted && reason ? reason : ""}
        </div>

        <fieldset className="fieldset">
          <legend className="legend">꼭 필요한 치수</legend>
          {MEASURE_FIELDS.map((field) => {
            const error = shownError(field.key);
            return (
              <div className="field" key={field.key}>
                <div className="field-head">
                  <label className="field-label" htmlFor={fieldId(field.key)}>
                    {field.label}
                  </label>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setGuideField(field)}
                  >
                    어떻게 재요?
                  </button>
                </div>
                <div className="field-input">
                  {/* type="number" 는 쓰지 않는다 — 포커스된 채 페이지를 휠 스크롤하면
                      값이 조용히 바뀐다(실측: 42 → 42.1). 판정을 좌우하는 치수에
                      그런 오염 경로를 둘 수 없다. 숫자 키패드는 inputMode 가 준다. */}
                  <input
                    id={fieldId(field.key)}
                    ref={(node) => {
                      if (node) fieldRefs.current.set(field.key, node);
                      else fieldRefs.current.delete(field.key);
                    }}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    required
                    aria-required="true"
                    value={draft[field.key]}
                    onChange={(e) => update(field.key, e.target.value)}
                    onBlur={() => markTouched(field.key)}
                    aria-describedby={`${hintId(field.key)}${error ? ` ${errorId(field.key)}` : ""}`}
                    aria-invalid={error ? true : undefined}
                  />
                  <span className="unit">cm</span>
                </div>
                <p className="field-hint" id={hintId(field.key)}>
                  {field.hint}
                </p>
                {error && (
                  <p className="field-error" id={errorId(field.key)}>
                    {error}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>

        <fieldset className="fieldset">
          {/* 정직한 라벨: T1 판정은 가슴 실측으로 체급을 계산하고, 견종은 아직
              BreedShape 매핑이 없다 — 이 두 값은 지금 추천을 바꾸지 못한다. */}
          <legend className="legend">
            우리 아이 정보 (선택 — 지금은 저장만 해요)
          </legend>
          <p className="field-hint">
            추천 계산에는 아직 쓰지 않아요. 다음 버전의 체형 보정에 쓸 값이에요.
          </p>
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor={fieldId("weightKg")}>
                체중
              </label>
              <div className="field-input">
                <input
                  id={fieldId("weightKg")}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={draft.weightKg}
                  onChange={(e) => update("weightKg", e.target.value)}
                  onBlur={() => markTouched("weightKg")}
                  aria-describedby={
                    shownError("weightKg") ? errorId("weightKg") : undefined
                  }
                  aria-invalid={shownError("weightKg") ? true : undefined}
                />
                <span className="unit">kg</span>
              </div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor={fieldId("breed")}>
                견종
              </label>
              <div className="field-input">
                <input
                  id={fieldId("breed")}
                  type="text"
                  value={draft.breed}
                  onChange={(e) => update("breed", e.target.value)}
                  placeholder="예: 말티즈"
                  maxLength={30}
                />
              </div>
            </div>
          </div>
          {/* 반폭 컬럼 밖으로 빼서 어절 중간 줄바꿈을 피한다. */}
          {shownError("weightKg") && (
            <p className="field-error" id={errorId("weightKg")}>
              체중은 {shownError("weightKg")}
            </p>
          )}
        </fieldset>

        {saveFailed && (
          <p className="field-error" role="alert">
            이 브라우저에 값을 저장할 수 없었어요. 시크릿 모드라면 일반 창에서
            다시 시도해 주세요.
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block">
          다음 →
        </button>
        {reason && <p className="form-note">{reason}</p>}
      </form>

      <MeasureGuideSheet
        field={guideField}
        onClose={() => setGuideField(null)}
      />
    </main>
  );
}
