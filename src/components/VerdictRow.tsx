import type { FitVerdict } from "@pet-fit/engine";
import {
  type DisplayPartFit,
  PART_SUBJECT,
  formatStraddle,
  formatUncertainty,
  partAdvice,
  verdictLabel,
} from "@pet-fit/engine/display";

// 색은 문구가 아니라 표시 강조라서 화면 계층이 정한다.
// 실패(낌·헐렁)는 경고색, 한쪽으로 치우침은 주의색, 적정은 초록.
const VERDICT_COLOR: Record<FitVerdict, string> = {
  tight_fail: "bg-fit-fail",
  tight: "bg-fit-caution",
  good: "bg-fit-good",
  loose: "bg-fit-warn",
  loose_fail: "bg-fit-fail",
};

interface VerdictRowProps {
  part: DisplayPartFit;
}

export function VerdictRow({ part }: VerdictRowProps) {
  const straddle = formatStraddle(part);
  const advice = partAdvice(part);
  // "가슴이" → "가슴" — 행 제목에는 조사가 붙지 않는다.
  const name = PART_SUBJECT[part.part].slice(0, -1);

  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-xl border border-line bg-surface p-3">
      {/* 색만으로 판정을 전달하지 않는다 — 점 옆의 텍스트 라벨이 정본이다. */}
      <span
        className={`mt-1.5 size-3 rounded-full ${VERDICT_COLOR[part.verdict]}`}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm">
          <strong>
            {name} · {verdictLabel(part.part, part.verdict)}
          </strong>
          <span className="text-xs font-normal text-muted">
            {formatUncertainty(part)}
          </span>
        </p>
        {straddle && (
          <p className="text-xs font-semibold text-fit-caution">{straddle}</p>
        )}
        {advice && <p className="text-xs break-keep text-muted">{advice}</p>}
      </div>
    </div>
  );
}
