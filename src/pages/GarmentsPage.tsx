// S4 — 옷 고르기. 와이어프레임 docs/wireframe-phase2.html S4.
import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router";
import { type GarmentListItem, fetchGarments } from "../lib/api";
import { CATEGORY_LABEL, FABRIC_UNKNOWN_NOTE } from "../lib/garmentLabels";
import { loadProfile } from "../lib/storage";

const SEARCH_DEBOUNCE_MS = 300;

type ListState =
  | { status: "loading" }
  | { status: "ready"; items: GarmentListItem[] }
  | { status: "error"; message: string };

export function GarmentsPage() {
  const navigate = useNavigate();
  const searchId = useId();
  const groupName = useId();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [selected, setSelected] = useState<string | null>(null);
  // 재조회 트리거 — 같은 검색어로 다시 부를 때도 effect 가 돌게 한다.
  const [retryTick, setRetryTick] = useState(0);

  // 프로필 없이 직접 들어온 경우(직링크·저장 초기화) 되돌려 보낸다 — 판정할 대상이 없다.
  const hasProfile = loadProfile() !== null;
  useEffect(() => {
    if (!hasProfile) navigate("/", { replace: true });
  }, [hasProfile, navigate]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryTick 은 "다시 시도"용 트리거 — 본문에서 읽지 않는 것이 정상
  useEffect(() => {
    if (!hasProfile) return;
    const controller = new AbortController();
    // 첫 조회는 즉시, 타이핑 중에는 디바운스.
    const delay = query === "" ? 0 : SEARCH_DEBOUNCE_MS;
    const timer = setTimeout(() => {
      setState({ status: "loading" });
      fetchGarments(query, controller.signal)
        .then((items) => setState({ status: "ready", items }))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError")
            return;
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "잠시 문제가 생겼어요. 다시 시도해 주세요.",
          });
        });
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, hasProfile, retryTick]);

  const items = state.status === "ready" ? state.items : [];

  // 목록이 바뀌어 선택한 상품이 사라지면 선택도 비운다 — 유령 선택 방지.
  useEffect(() => {
    if (
      selected !== null &&
      state.status === "ready" &&
      !state.items.some((g) => g.id === selected)
    ) {
      setSelected(null);
    }
  }, [state, selected]);

  return (
    <main className="screen">
      <div className="topbar">
        <button type="button" className="link-btn" onClick={() => navigate(-1)}>
          ← 뒤로
        </button>
        <span className="step">2 / 2</span>
      </div>

      <h1 className="title">어떤 옷을 볼까요?</h1>

      <div className="field">
        <label className="field-label" htmlFor={searchId}>
          브랜드·상품 검색
        </label>
        <div className="field-input">
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 히트"
            maxLength={60}
            autoComplete="off"
          />
        </div>
      </div>

      {state.status === "loading" && (
        <p className="list-note" aria-live="polite">
          불러오는 중…
        </p>
      )}

      {state.status === "error" && (
        <div className="notice notice-error" role="alert">
          <p className="notice-text">{state.message}</p>
          <button
            type="button"
            className="btn"
            onClick={() => setRetryTick((tick) => tick + 1)}
          >
            다시 시도
          </button>
        </div>
      )}

      {state.status === "ready" && items.length === 0 && (
        <p className="list-note" aria-live="polite">
          {query.trim() === ""
            ? "아직 등록된 상품이 없어요."
            : `"${query.trim()}"에 맞는 상품이 없어요. 다른 이름으로 찾아보세요.`}
        </p>
      )}

      {items.length > 0 && (
        // 네이티브 라디오 그룹 — 탭 정지 1개·화살표 이동·단일 선택을 브라우저가 처리한다.
        // 시각적으로는 카드지만 조작 규약은 손으로 만들지 않는다.
        <fieldset className="card-list">
          <legend className="visually-hidden">상품 목록</legend>
          {items.map((garment) => (
            <label
              key={garment.id}
              className={`card${selected === garment.id ? " card-on" : ""}`}
            >
              <input
                className="visually-hidden"
                type="radio"
                name={groupName}
                value={garment.id}
                checked={selected === garment.id}
                onChange={() => setSelected(garment.id)}
              />
              <span className="card-title">
                {garment.brand} {garment.product}
              </span>
              <span className="card-meta">
                {CATEGORY_LABEL[garment.category]}
                {garment.fabricStretch === "unknown" &&
                  ` · ${FABRIC_UNKNOWN_NOTE}`}
              </span>
              <span className="card-sizes">
                {garment.sizeLabels.join(" · ")}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="notice">
        <p className="notice-text">
          찾는 옷이 없나요? 사이즈표 스크린샷을 올리면 바로 판정할 수 있게
          준비하고 있어요.
        </p>
        <button type="button" className="btn" disabled>
          사이즈표 스크린샷 올리기
          <span className="badge">준비중</span>
        </button>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={selected === null}
        onClick={() => {
          if (selected !== null) navigate(`/fit/${selected}`);
        }}
      >
        핏 확인하기 →
      </button>
    </main>
  );
}
