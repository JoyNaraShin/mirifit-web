import { MetaNotes } from "@/components/MetaNotes";
import { SizeTabs } from "@/components/SizeTabs";
import { VerdictRow } from "@/components/VerdictRow";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { fetchFit } from "@/lib/api";
import { PROFILE_SOURCE_LABEL } from "@/lib/garmentLabels";
import { loadProfile } from "@/lib/storage";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

export function ResultPage() {
  const navigate = useNavigate();
  const { garmentId } = useParams<{ garmentId: string }>();
  const [stored] = useState(loadProfile);
  const [selected, setSelected] = useState<string | null>(null);

  // 판정할 대상이 없으면 되돌려 보낸다(직링크·저장 초기화).
  useEffect(() => {
    if (!stored) navigate("/", { replace: true });
  }, [stored, navigate]);

  const chest = stored?.profile.chest;
  const fit = useQuery({
    // 프로필과 상품이 같으면 같은 판정이라 캐시가 그대로 유효하다.
    queryKey: ["fit", garmentId, stored?.savedAt],
    enabled: Boolean(garmentId && chest),
    queryFn: ({ signal }) => {
      if (!garmentId || !chest || !stored)
        throw new Error("판정 입력이 없어요.");
      const { neck, back } = stored.profile;
      return fetchFit(
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
      );
    },
  });

  const recommendation = fit.data?.recommendation;
  const current =
    recommendation?.candidates.find((c) => c.sizeLabel === selected) ??
    recommendation?.winner;

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
      {stored && (
        <p className="-mt-2 text-xs text-muted">
          치수 근거: {PROFILE_SOURCE_LABEL[stored.source]}
        </p>
      )}

      {!chest && stored && (
        <Notice
          variant="error"
          role="alert"
          text="가슴둘레가 없어 판정할 수 없어요. 치수를 다시 넣어 주세요."
        >
          <Button onClick={() => navigate("/measure")}>치수 넣기</Button>
        </Notice>
      )}

      {fit.isPending && chest && (
        <p className="py-3 text-center text-sm text-muted" aria-live="polite">
          판정하고 있어요…
        </p>
      )}

      {fit.isError && (
        <Notice variant="error" role="alert">
          <p className="text-sm break-keep text-muted">
            {fit.error instanceof Error
              ? fit.error.message
              : "잠시 문제가 생겼어요. 다시 시도해 주세요."}
          </p>
          <Button onClick={() => fit.refetch()}>다시 시도</Button>
        </Notice>
      )}

      {recommendation && current && (
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

          {fit.data && <MetaNotes meta={fit.data.meta} />}

          <Notice text="더 정확하게 보려면 치수를 다시 재거나, 전에 산 옷 정보를 더할 수 있어요.">
            <Button onClick={() => navigate("/measure")}>
              📏 치수 다시 재기
            </Button>
          </Notice>
        </>
      )}

      {recommendation && !current && (
        <p className="py-3 text-center text-sm text-muted">
          이 상품에는 등록된 사이즈가 없어요.
        </p>
      )}
    </main>
  );
}
