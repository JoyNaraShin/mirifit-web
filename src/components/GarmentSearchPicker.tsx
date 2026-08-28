import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { TextField } from "@/components/ui/TextField";
import { type GarmentListItem, fetchGarments } from "@/lib/api";
import { CATEGORY_LABEL, FABRIC_UNKNOWN_NOTE } from "@/lib/garmentLabels";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";

const SEARCH_DEBOUNCE_MS = 300;

interface GarmentSearchPickerProps {
  /** 라디오 그룹 제목(sr 전용). 한 화면에 여러 인스턴스가 떠도 구분되게 호출자가 준다. */
  legend: string;
  selectedId: string | null;
  /** 선택·해제 콜백. 검색 결과에서 선택 상품이 사라지면 null 로 알린다(유령 선택 방지). */
  onChange: (garment: GarmentListItem | null) => void;
}

/**
 * 상품 검색 + 카드 라디오 목록 (C2 에서 추출한 공용 컴포넌트 — S4 옷 고르기와
 * S2 이전 옷 입력이 같은 검색·선택 UI 를 쓴다. 플랜 D3).
 * `useSuspenseQuery` 를 쓰므로 호출자는 Suspense 경계(ScreenBoundary) 아래에 둔다.
 */
export function GarmentSearchPicker({
  legend,
  selectedId,
  onChange,
}: GarmentSearchPickerProps) {
  const groupName = useId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  // 첫 조회는 즉시, 타이핑 중에는 디바운스.
  useEffect(() => {
    if (query === "") {
      setDebounced("");
      return;
    }
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: items } = useSuspenseQuery({
    queryKey: ["garments", debounced],
    queryFn: ({ signal }) => fetchGarments(debounced, signal),
  });

  // 목록이 바뀌어 선택한 상품이 사라지면 선택도 비운다 — 유령 선택 방지.
  useEffect(() => {
    if (selectedId !== null && !items.some((g) => g.id === selectedId)) {
      onChange(null);
    }
  }, [items, selectedId, onChange]);

  return (
    <div className="flex flex-col gap-3">
      <TextField
        label="브랜드·상품 검색"
        type="search"
        placeholder="예: 히트"
        maxLength={60}
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {items.length === 0 && (
        <p
          className="py-3 text-center text-sm break-keep text-muted"
          aria-live="polite"
        >
          {query.trim() === ""
            ? "아직 등록된 상품이 없어요."
            : `"${query.trim()}"에 맞는 상품이 없어요. 다른 이름으로 찾아보세요.`}
        </p>
      )}

      {items.length > 0 && (
        // 네이티브 라디오 그룹 — 탭 정지 1개·화살표 이동·단일 선택을 브라우저가 처리한다.
        // 시각적으로는 카드지만 조작 규약을 손으로 만들지 않는다.
        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="sr-only">{legend}</legend>
          {items.map((garment) => (
            <label
              key={garment.id}
              className={`flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                selectedId === garment.id
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name={groupName}
                value={garment.id}
                checked={selectedId === garment.id}
                onChange={() => onChange(garment)}
              />
              <span className="text-sm font-semibold">
                {garment.brand} {garment.product}
              </span>
              <span className="text-xs text-muted">
                {CATEGORY_LABEL[garment.category]}
                {garment.fabricStretch === "unknown" &&
                  ` · ${FABRIC_UNKNOWN_NOTE}`}
              </span>
              <span className="text-xs text-muted tabular-nums">
                {garment.sizeLabels.join(" · ")}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <Notice text="찾는 옷이 없나요? 사이즈표 스크린샷을 올리면 바로 판정할 수 있게 준비하고 있어요.">
        <Button disabled>
          사이즈표 스크린샷 올리기
          <Badge>준비중</Badge>
        </Button>
      </Notice>
    </div>
  );
}
