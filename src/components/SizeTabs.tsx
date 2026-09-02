import type { PublicSizeFit } from "@/lib/api";
import { useRef } from "react";

interface SizeTabsProps {
  candidates: PublicSizeFit[];
  recommended: string | null;
  selected: string;
  onSelect: (sizeLabel: string) => void;
}

/** WAI-ARIA 탭 규약: 그룹 전체가 탭 정지 1개, 좌우 화살표로 이동. */
export function SizeTabs({
  candidates,
  recommended,
  selected,
  onSelect,
}: SizeTabsProps) {
  const refs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const move = (event: React.KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next =
      candidates[(index + step + candidates.length) % candidates.length];
    if (!next) return;
    onSelect(next.sizeLabel);
    refs.current.get(next.sizeLabel)?.focus();
  };

  return (
    <div
      className="flex gap-1 overflow-x-auto pb-1"
      role="tablist"
      aria-label="사이즈"
    >
      {candidates.map((candidate, index) => {
        const isOn = candidate.sizeLabel === selected;
        return (
          <button
            key={candidate.sizeLabel}
            type="button"
            role="tab"
            aria-selected={isOn}
            tabIndex={isOn ? 0 : -1}
            ref={(node) => {
              if (node) refs.current.set(candidate.sizeLabel, node);
              else refs.current.delete(candidate.sizeLabel);
            }}
            className={`inline-flex min-h-11 min-w-11 flex-none cursor-pointer items-center justify-center gap-1 rounded-full border px-3 text-sm font-semibold tabular-nums ${
              isOn
                ? "border-accent bg-accent text-accent-ink"
                : "border-line bg-surface text-ink"
            }`}
            onClick={() => onSelect(candidate.sizeLabel)}
            onKeyDown={(event) => move(event, index)}
          >
            {candidate.sizeLabel}
            {candidate.sizeLabel === recommended && (
              <span className="text-xs font-bold">✓ 추천</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
