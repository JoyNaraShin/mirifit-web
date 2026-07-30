import { MetaNotes } from "@/components/MetaNotes";
import { SizeTabs } from "@/components/SizeTabs";
import { VerdictRow } from "@/components/VerdictRow";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { fetchFit } from "@/lib/api";
import { PROFILE_SOURCE_LABEL } from "@/lib/garmentLabels";
import type { StoredProfile } from "@/lib/storage";
import type { Measurement } from "@pet-fit/engine";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";

interface FitResultProps {
  garmentId: string;
  stored: StoredProfile;
  /** 판정 1순위 기준. 존재 확인은 페이지 게이트가 하고, 여기는 타입으로 보장받는다. */
  chest: Measurement;
}

export function FitResult({ garmentId, stored, chest }: FitResultProps) {
  const navigate = useNavigate();
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
          },
        },
        signal,
      ),
  });

  const { recommendation } = data;
  const current =
    recommendation.candidates.find((c) => c.sizeLabel === selected) ??
    recommendation.winner;

  return (
    <main className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-muted">
        <Button variant="link" onClick={() => navigate("/garments")}>
          ← 다른 옷 보기
        </Button>
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
            candidates={recommendation.candidates}
            recommended={recommendation.recommended}
            selected={current.sizeLabel}
            onSelect={setSelected}
          />

          {/* 부위 순서 = 판정 우선순위(가슴 > 목 > 등길이, §3). */}
          <div className="flex flex-col gap-2">
            <VerdictRow part={current.fitMap.chest} />
            {current.fitMap.neck && <VerdictRow part={current.fitMap.neck} />}
            {current.fitMap.back && <VerdictRow part={current.fitMap.back} />}
          </div>

          <MetaNotes meta={data.meta} />

          <Notice text="더 정확하게 보려면 치수를 다시 재거나, 전에 산 옷 정보를 더할 수 있어요.">
            <Button onClick={() => navigate("/measure")}>
              📏 치수 다시 재기
            </Button>
          </Notice>
        </>
      ) : (
        <p className="py-3 text-center text-sm text-muted">
          이 상품에는 등록된 사이즈가 없어요.
        </p>
      )}
    </main>
  );
}
