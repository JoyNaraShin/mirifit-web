// S3 — 직접 실측 (T1). 와이어프레임 docs/wireframe-phase2.html S3.
import { useId, useState } from "react";
import { useNavigate } from "react-router";
import { DogDiagram } from "../components/DogDiagram";
import { MeasureGuideSheet } from "../components/MeasureGuideSheet";
import {
  EMPTY_DRAFT,
  MEASURE_FIELDS,
  type MeasureDraft,
  type MeasureFieldSpec,
  T1_UNCERTAINTY_CM,
  draftToProfile,
  profileToDraft,
  validateDraft,
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
  const formId = useId();
  const [draft, setDraft] = useState<MeasureDraft>(initialDraft);
  // 필드를 떠났거나 제출을 시도한 뒤에만 오류를 보여준다 — 입력 중에 빨간 글씨를 들이밀지 않는다.
  const [touched, setTouched] = useState<
    Partial<Record<keyof MeasureDraft, boolean>>
  >({});
  const [guideField, setGuideField] = useState<MeasureFieldSpec | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const { errors, complete } = validateDraft(draft);
  const fieldId = (key: string) => `${formId}-${key}`;
  const errorId = (key: string) => `${formId}-${key}-error`;
  const hintId = (key: string) => `${formId}-${key}-hint`;

  const update = (key: keyof MeasureDraft, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const markTouched = (key: keyof MeasureDraft) =>
    setTouched((prev) => ({ ...prev, [key]: true }));
  const shownError = (key: keyof MeasureDraft) =>
    touched[key] ? errors[key] : undefined;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const profile = draftToProfile(draft);
    if (!profile) {
      // 브라우저 검증을 못 믿는 경로(자동완성 등)에서도 오류를 드러낸다.
      setTouched({ neck: true, chest: true, back: true, weightKg: true });
      return;
    }
    if (!saveProfile({ profile, source: "T1" })) {
      setSaveFailed(true);
      return;
    }
    navigate("/garments");
  };

  return (
    <main className="screen">
      <div className="topbar">
        <button type="button" className="link-btn" onClick={() => navigate(-1)}>
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
        <DogDiagram highlight={guideField?.key ?? null} />
      </div>

      <form className="measure-form" onSubmit={handleSubmit} noValidate>
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
                  <input
                    id={fieldId(field.key)}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={field.minCm}
                    max={field.maxCm}
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
          <legend className="legend">더 정확한 추천을 원하면 (선택)</legend>
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor={fieldId("weightKg")}>
                체중
              </label>
              <div className="field-input">
                <input
                  id={fieldId("weightKg")}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  max="100"
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
              {shownError("weightKg") && (
                <p className="field-error" id={errorId("weightKg")}>
                  {shownError("weightKg")}
                </p>
              )}
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
        </fieldset>

        {saveFailed && (
          <p className="field-error" role="alert">
            이 브라우저에 값을 저장할 수 없었어요. 시크릿 모드라면 일반 창에서
            다시 시도해 주세요.
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={!complete}
        >
          다음 →
        </button>
        {/* 버튼이 왜 안 눌리는지 말해 준다 — 비활성 버튼은 이유를 스스로 설명하지 못한다. */}
        {!complete && (
          <p className="form-note">
            세 치수를 모두 넣으면 다음으로 넘어갈 수 있어요.
          </p>
        )}
      </form>

      <MeasureGuideSheet
        field={guideField}
        onClose={() => setGuideField(null)}
      />
    </main>
  );
}
