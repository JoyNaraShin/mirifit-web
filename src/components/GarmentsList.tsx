import { GarmentSearchPicker } from "@/components/GarmentSearchPicker";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";

/**
 * S4 옷 고르기 본체. 검색·카드 선택은 GarmentSearchPicker(S2 와 공용) 가 맡고,
 * 여기는 화면 골격(헤더·진행 표시·CTA)만 가진다.
 *
 * 페이지에서 분리한 이유: `useSuspenseQuery` 가 프로필 확인보다 먼저
 * 서스펜드하면 프로필 없는 사용자에게 "불러오는 중"을 보인 뒤 리다이렉트하게 된다.
 * 훅은 조건부로 호출할 수 없으니 게이트(페이지)와 조회(여기)를 컴포넌트로 나눈다.
 */
export function GarmentsList() {
  const navigate = useNavigate();
  const isFreshEntry = useLocation().key === "default";
  const [selected, setSelected] = useState<string | null>(null);

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
        <span className="tabular-nums">2 / 2</span>
      </div>

      <h1 className="text-xl leading-snug font-bold text-balance">
        어떤 옷을 볼까요?
      </h1>

      <GarmentSearchPicker
        legend="상품 목록"
        selectedId={selected}
        onChange={(garment) => setSelected(garment?.id ?? null)}
      />

      <Button
        variant="primary"
        block
        disabled={selected === null}
        onClick={() => {
          if (selected !== null)
            // 출처 표식 — 결과 화면의 "다른 옷 보기"가 push 대신 뒤로가기로 돌아가게 한다.
            navigate(`/fit/${selected}`, { state: { from: "garments" } });
        }}
      >
        핏 확인하기 →
      </Button>
    </main>
  );
}
