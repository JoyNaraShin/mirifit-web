import { Notice } from "@/components/ui/Notice";
import { type RecommendationMeta, formatMeta } from "@pet-fit/engine/display";

interface MetaNotesProps {
  meta: RecommendationMeta;
}

/** 근거가 약한 판정을 확정처럼 보이지 않게 한다(§4.3·§6). 문구는 display 계층이 만든다. */
export function MetaNotes({ meta }: MetaNotesProps) {
  const notes = formatMeta(meta);
  if (notes.length === 0) return null;
  return (
    <Notice>
      <p className="text-xs font-bold text-muted">이 판정에서 감안할 점</p>
      <ul className="list-disc pl-4 text-sm break-keep">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </Notice>
  );
}
