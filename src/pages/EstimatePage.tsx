import { FitQuestionChips } from "@/components/FitQuestionChips";
import { GarmentSearchPicker } from "@/components/GarmentSearchPicker";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ApiError, fetchEstimate, fetchGarments } from "@/lib/api";
import type { GarmentListItem } from "@/lib/api";
import {
  type ObservationDraft,
  buildObservationPayload,
  draftAnswersConstraint,
  draftsFromSaved,
  emptyDraft,
} from "@/lib/estimateForm";
import { loadObservations, saveObservations, saveProfile } from "@/lib/storage";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";

/**
 * S2 — 이전 옷으로 추정 (T2 주 동선, 플랜 D3·D4). 와이어프레임 S2.
 * "다음"은 POST /api/estimate 로 프로필을 추정해 저장하고 S4 로 넘어간다.
 * 재진입(정확도 루프 "옷 하나 더")은 저장된 관측을 프리필해 이어쓴다.
 */
export function EstimatePage() {
  const navigate = useNavigate();
  const isFreshEntry = useLocation().key === "default";
  // 프리필 복원용 전체 목록 — 검색 픽커의 초기 조회(q="")와 같은 키라 캐시를 공유한다.
  const { data: allGarments } = useSuspenseQuery({
    queryKey: ["garments", ""],
    queryFn: ({ signal }) => fetchGarments("", signal),
  });
  const [drafts, setDrafts] = useState<ObservationDraft[]>(
    () => draftsFromSaved(loadObservations(), allGarments) ?? [emptyDraft()],
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const estimate = useMutation({
    // fetchEstimate 의 2번째 인자(AbortSignal)가 mutation 컨텍스트와 겹치지 않게 감싼다.
    mutationFn: (request: Parameters<typeof fetchEstimate>[0]) =>
      fetchEstimate(request),
    onSuccess: (result, request) => {
      // 관측 원본을 먼저 남긴다 — 루프 재진입 프리필의 원천. 실패해도 동선은 진행한다.
      saveObservations(request.observations);
      const ok = saveProfile({
        profile: result.profile,
        source: "T2",
        bodyClass: result.bodyClass,
        bodyClassOrigin: result.bodyClassOrigin,
        conflicts: result.conflicts,
        clampedParts: result.clampedParts,
        lowestSpecSource: result.lowestSpecSource,
      });
      if (!ok) {
        // 프로필이 안 남으면 S4 게이트가 되돌려 보낸다 — 여기서 멈추고 알린다.
        setSaveFailed(true);
        return;
      }
      // 제출된 폼은 히스토리에서 소거 — 뒤로가기가 "완료된 입력"으로 돌아가지 않게.
      navigate("/garments", { replace: true });
    },
  });

  const update = (id: string, patch: Partial<ObservationDraft>) =>
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );

  const setGarment = (id: string, garment: GarmentListItem | null) =>
    // 상품이 바뀌면 사이즈·응답도 초기화한다 — 다른 옷의 기억이 새 옷에 붙으면 오염이다.
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...emptyDraft(), id: d.id, garment } : d,
      ),
    );

  const removeDraft = (id: string) =>
    setDrafts((prev) => prev.filter((d) => d.id !== id));

  const payload = buildObservationPayload(drafts);
  // 제출을 막는 사유 — 버튼 비활성 대신 제출이 이유를 드러낸다(비활성 버튼은 탭 순서에서
  // 사라져 키보드·스크린리더 사용자가 이유에 도달할 길이 없다 — MeasurePage 와 동일 원칙).
  const blockedReason =
    payload.length === 0
      ? drafts.some((d) => d.garment !== null)
        ? '입혀본 기억을 하나 이상 답해 주세요 — 전부 "기억 안 나요"면 추정할 근거가 없어요.'
        : "전에 산 옷을 하나 골라 주세요."
      : drafts.some((d) => d.garment !== null && d.sizeLabel === null)
        ? "사이즈를 고르지 않은 옷이 있어요."
        : null;

  const handleSubmit = () => {
    if (estimate.isPending) return;
    setSubmitAttempted(true);
    setSaveFailed(false);
    if (blockedReason !== null) return;
    estimate.mutate({ observations: payload });
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
        전에 산 옷을 알려주세요
      </h1>
      <p className="text-sm break-keep text-muted">
        옷 한 벌로도 충분해요. 여러 벌 답할수록 더 정확해져요.
      </p>

      {drafts.map((draft, index) => (
        <section
          key={draft.id}
          aria-label={`이전 옷 ${index + 1}`}
          className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3"
        >
          {drafts.length > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">
                옷 {index + 1}
              </span>
              <Button variant="link" onClick={() => removeDraft(draft.id)}>
                삭제
              </Button>
            </div>
          )}

          {draft.garment === null ? (
            <GarmentSearchPicker
              legend={`이전 옷 ${index + 1} 상품 선택`}
              selectedId={null}
              onChange={(garment) => setGarment(draft.id, garment)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {draft.garment.brand} {draft.garment.product}
                  </span>
                </div>
                <Button
                  variant="link"
                  onClick={() => setGarment(draft.id, null)}
                >
                  바꾸기
                </Button>
              </div>

              <FitQuestionChips
                question="무슨 사이즈였나요?"
                options={draft.garment.sizeLabels.map((label) => ({
                  value: label,
                  label,
                }))}
                value={draft.sizeLabel ?? undefined}
                onChange={(next) =>
                  update(draft.id, { sizeLabel: next ?? null })
                }
                allowSkip={false}
              />

              {draft.sizeLabel !== null && (
                <>
                  <h2 className="text-sm font-bold">
                    그 옷, 입혀보니 어땠나요?
                  </h2>
                  <FitQuestionChips
                    question="가슴(몸통) 쪽은?"
                    options={[
                      { value: "too_tight", label: "꽉 꼈어요" },
                      { value: "fits_well", label: "딱 맞았어요" },
                      { value: "loose", label: "여유 있었어요" },
                      { value: "too_loose", label: "헐렁했어요" },
                    ]}
                    value={draft.chestFit}
                    onChange={(next) => update(draft.id, { chestFit: next })}
                  />
                  <FitQuestionChips
                    question="겨드랑이에 손가락 두 개가 들어갔나요?"
                    options={[
                      { value: "no", label: "아니요" },
                      { value: "yes", label: "네" },
                    ]}
                    value={draft.armpitTwoFingers}
                    onChange={(next) =>
                      update(draft.id, { armpitTwoFingers: next })
                    }
                  />
                  <FitQuestionChips
                    question="기장은 어디까지 왔나요?"
                    options={[
                      { value: "above_waist", label: "허리 위" },
                      { value: "near_hip", label: "엉덩이 근처" },
                      { value: "to_tail", label: "꼬리까지" },
                    ]}
                    value={draft.backLengthFit}
                    onChange={(next) =>
                      update(draft.id, { backLengthFit: next })
                    }
                  />
                  {/* 목 문항은 우선 3문항 뒤로 접는다(플랜 D3 — 문항 수 최소화). */}
                  <details className="group">
                    <summary className="min-h-11 cursor-pointer list-none py-2 text-sm text-accent hover:underline">
                      <span className="group-open:hidden">
                        + 목 핏도 답하기
                      </span>
                      <span className="hidden group-open:inline">
                        − 목 핏 접기
                      </span>
                    </summary>
                    <FitQuestionChips
                      question="목 쪽은?"
                      options={[
                        { value: "too_tight", label: "꽉 꼈어요" },
                        { value: "fits_well", label: "딱 맞았어요" },
                        { value: "loose", label: "여유 있었어요" },
                        { value: "too_loose", label: "헐렁했어요" },
                      ]}
                      value={draft.neckFit}
                      onChange={(next) => update(draft.id, { neckFit: next })}
                    />
                  </details>
                  {!draftAnswersConstraint(draft) && (
                    <p className="text-xs break-keep text-muted">
                      아직 답한 기억이 없어요 — 하나만 답해도 추정할 수 있어요.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </section>
      ))}

      <Button
        onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
        // 앞 옷을 아직 채우는 중이면 새 행 추가는 혼란만 더한다.
        disabled={drafts.some((d) => d.garment === null)}
      >
        + 옷 더 추가
      </Button>

      {submitAttempted && blockedReason !== null && (
        <Notice variant="error" role="alert" text={blockedReason} />
      )}
      {estimate.isError && (
        <Notice
          variant="error"
          role="alert"
          text={
            estimate.error instanceof ApiError
              ? estimate.error.message
              : "잠시 문제가 생겼어요. 다시 시도해 주세요."
          }
        />
      )}
      {saveFailed && (
        <Notice
          variant="error"
          role="alert"
          text="추정 결과를 저장하지 못했어요. 브라우저 저장 공간을 확인하고 다시 시도해 주세요."
        />
      )}

      <Button variant="primary" block onClick={handleSubmit}>
        {estimate.isPending ? "추정하는 중…" : "다음 →"}
      </Button>
    </main>
  );
}
