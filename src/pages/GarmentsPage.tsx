import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { TextField } from "@/components/ui/TextField";
import { fetchGarments } from "@/lib/api";
import { CATEGORY_LABEL, FABRIC_UNKNOWN_NOTE } from "@/lib/garmentLabels";
import { loadProfile } from "@/lib/storage";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router";

const SEARCH_DEBOUNCE_MS = 300;

export function GarmentsPage() {
  const navigate = useNavigate();
  const groupName = useId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  // 판정할 대상이 없으면 되돌려 보낸다(직링크·저장 초기화).
  const hasProfile = loadProfile() !== null;
  useEffect(() => {
    if (!hasProfile) navigate("/", { replace: true });
  }, [hasProfile, navigate]);

  // 첫 조회는 즉시, 타이핑 중에는 디바운스.
  useEffect(() => {
    if (query === "") {
      setDebounced("");
      return;
    }
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const garments = useQuery({
    queryKey: ["garments", debounced],
    queryFn: ({ signal }) => fetchGarments(debounced, signal),
    enabled: hasProfile,
  });

  const items = garments.data ?? [];

  // 목록이 바뀌어 선택한 상품이 사라지면 선택도 비운다 — 유령 선택 방지.
  useEffect(() => {
    if (selected !== null && !items.some((g) => g.id === selected)) {
      setSelected(null);
    }
  }, [items, selected]);

  return (
    <main className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-muted">
        <Button variant="link" onClick={() => navigate(-1)}>
          ← 뒤로
        </Button>
        <span className="tabular-nums">2 / 2</span>
      </div>

      <h1 className="text-xl leading-snug font-bold text-balance">
        어떤 옷을 볼까요?
      </h1>

      <TextField
        label="브랜드·상품 검색"
        type="search"
        placeholder="예: 히트"
        maxLength={60}
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {garments.isPending && (
        <p className="py-3 text-center text-sm text-muted" aria-live="polite">
          불러오는 중…
        </p>
      )}

      {garments.isError && (
        <Notice variant="error" role="alert">
          <p className="text-sm break-keep text-muted">
            {garments.error instanceof Error
              ? garments.error.message
              : "잠시 문제가 생겼어요. 다시 시도해 주세요."}
          </p>
          <Button onClick={() => garments.refetch()}>다시 시도</Button>
        </Notice>
      )}

      {garments.isSuccess && items.length === 0 && (
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
          <legend className="sr-only">상품 목록</legend>
          {items.map((garment) => (
            <label
              key={garment.id}
              className={`flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                selected === garment.id
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name={groupName}
                value={garment.id}
                checked={selected === garment.id}
                onChange={() => setSelected(garment.id)}
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

      <Button
        variant="primary"
        block
        disabled={selected === null}
        onClick={() => {
          if (selected !== null) navigate(`/fit/${selected}`);
        }}
      >
        핏 확인하기 →
      </Button>
    </main>
  );
}
