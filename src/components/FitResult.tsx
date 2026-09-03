import { FeedbackButtons } from "@/components/FeedbackButtons";
import { FitMapDiagram } from "@/components/FitMapDiagram";
import { MetaNotes } from "@/components/MetaNotes";
import { SizeTabs } from "@/components/SizeTabs";
import { VerdictRow } from "@/components/VerdictRow";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { fetchFit } from "@/lib/api";
import type { PublicSizeFit } from "@/lib/api";
import { PROFILE_SOURCE_LABEL } from "@/lib/garmentLabels";
import type { StoredProfile } from "@/lib/storage";
import type { Measurement } from "@pet-fit/engine";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useLocation, useNavigate } from "react-router";

/** 확인한 전 부위가 확정 good(경계 걸침 없음)인가 — 과신 표시 방지 조건 포함. */
function allPartsGood(fitMap: PublicSizeFit["fitMap"]): boolean {
  const parts = [fitMap.chest, fitMap.neck, fitMap.back].filter(
    (p) => p !== undefined,
  );
  return parts.every((p) => p.verdict === "good" && !p.boundaryStraddle);
}

interface FitResultProps {
  garmentId: string;
  stored: StoredProfile;
  /** 판정 1순위 기준. 존재 확인은 페이지 게이트가 하고, 여기는 타입으로 보장받는다. */
  chest: Measurement;
}

export function FitResult({ garmentId, stored, chest }: FitResultProps) {
  const navigate = useNavigate();
  // 옷 목록에서 왔으면 "다른 옷 보기"는 push 가 아니라 뒤로가기 — 목록↔결과
  // 왕복이 히스토리를 무한 적재해 뒤로가기가 홈에 못 닿는 회귀의 주범이었다.
  const fromGarments =
    (useLocation().state as { from?: string } | null)?.from === "garments";
  const [selected, setSelected] = useState<string | null>(null);
  const { neck, back } = stored.profile;

  const { data } = useSuspenseQuery({
    // 프로필과 상품이 같으면 같은 판정이라 캐시가 그대로 유효하다.
    queryKey: ["fit", garmentId, stored.savedAt],
    queryFn: ({ signal }) =>
      fetchFit(
        {
          profile: {
            chest,
            ...(neck ? { neck } : {}),
            ...(back ? { back } : {}),
          },
          garmentId,
          // T2 흐름에서 확정한 체급·신뢰도 정보를 그대로 넘긴다(T1 이면 비어 있다).
          ...(stored.bodyClass ? { bodyClass: stored.bodyClass } : {}),
          meta: {
            ...(stored.bodyClassOrigin
              ? { bodyClassOrigin: stored.bodyClassOrigin }
              : {}),
            ...(stored.conflicts !== undefined
              ? { conflicts: stored.conflicts }
              : {}),
            ...(stored.clampedParts
              ? { clampedParts: stored.clampedParts }
              : {}),
            // T2 근거 옷들의 최저 신뢰도 — 서버가 판정 대상 상품의 출처와 병합한다.
            ...(stored.lowestSpecSource
              ? { lowestSpecSource: stored.lowestSpecSource }
              : {}),
          },
        },
        signal,
      ),
  });

  const tabsId = useId();
  const { recommendation } = data;
  const current =
    recommendation.candidates.find((c) => c.sizeLabel === selected) ??
    recommendation.winner;

  return (
    <main className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-muted">
        <Button
          variant="link"
          onClick={() => (fromGarments ? navigate(-1) : navigate("/garments"))}
        >
          ← 다른 옷 보기
        </Button>
        {/* 공유 버튼 자리 — 결과 카드 이미지 생성은 스코프 아웃(Phase 3+), 여기 붙는다. */}
      </div>

      <h1 className="text-xl leading-snug font-bold text-balance">
        우리 아이에게 입히면
      </h1>
      <p className="-mt-2 text-xs text-muted">
        치수 근거: {PROFILE_SOURCE_LABEL[stored.source]}
      </p>

      {current ? (
        <>
          <SizeTabs
            idBase={tabsId}
            candidates={recommendation.candidates}
            recommended={recommendation.recommended}
            selected={current.sizeLabel}
            onSelect={setSelected}
          />

          {/* 탭이 갈아끼우는 내용 — 규약상 탭과 패널을 id 로 잇는다(craft:F8). */}
          <div
            role="tabpanel"
            id={`${tabsId}-panel`}
            aria-labelledby={`${tabsId}-tab-${current.sizeLabel}`}
            className="flex flex-col gap-3"
          >
            {/* 전 부위 good(경계 걸침 없음)일 때만 요약 배지 — 좋은 소식만 크게(와이어프레임 S6). */}
            {allPartsGood(current.fitMap) && (
              <p className="rounded-xl bg-fit-good/12 p-3 text-sm font-semibold break-keep">
                <Icon
                  name="thumb-up"
                  className="mr-1 inline-block align-[-3px]"
                />
                {current.sizeLabel} — 확인한 부위가 모두 잘 맞아요
              </p>
            )}

            {/* 다이어그램은 보조 표현 — 정본은 아래 텍스트 판정 행(접근성, 플랜 E2). */}
            <div className="flex justify-center rounded-xl border border-line bg-surface px-2 pt-3 pb-1">
              <FitMapDiagram fitMap={current.fitMap} />
            </div>

            {/* 부위 순서 = 판정 우선순위(가슴 > 목 > 등길이, §3). */}
            <div className="flex flex-col gap-2">
              <VerdictRow part={current.fitMap.chest} />
              {current.fitMap.neck && <VerdictRow part={current.fitMap.neck} />}
              {current.fitMap.back && <VerdictRow part={current.fitMap.back} />}
            </div>
          </div>

          <MetaNotes meta={data.meta} />

          <FeedbackButtons
            key={`${garmentId}-${current.sizeLabel}`}
            garmentId={garmentId}
            sizeLabel={current.sizeLabel}
          />

          {stored.source === "T2" ? (
            // T2 정확도 루프(와이어프레임 S5 하단): 실측 전환 또는 관측 추가 — 어느 쪽이든 범위가 좁아진다.
            <Notice text="더 정확하게 보려면">
              <Button onClick={() => navigate("/measure")}>
                <Icon name="ruler" /> 줄자로 직접 재기 — 오차 ±1cm까지 줄어요
              </Button>
              <Button onClick={() => navigate("/estimate")}>
                <Icon name="shirt" /> 옷 하나 더 답하기 — 추정 범위가 좁아져요
              </Button>
            </Notice>
          ) : (
            <Notice text="더 정확하게 보려면 치수를 다시 재거나, 전에 산 옷 정보를 더할 수 있어요.">
              <Button onClick={() => navigate("/measure")}>
                <Icon name="ruler" /> 치수 다시 재기
              </Button>
            </Notice>
          )}
        </>
      ) : (
        <p className="py-3 text-center text-sm text-muted">
          이 상품에는 등록된 사이즈가 없어요.
        </p>
      )}
    </main>
  );
}
