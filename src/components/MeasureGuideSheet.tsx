import { DogDiagram } from "@/components/DogDiagram";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import type { MeasureFieldSpec } from "@/lib/measureForm";

interface MeasureGuideSheetProps {
  /** null 이면 닫힘. */
  field: MeasureFieldSpec | null;
  onClose: () => void;
}

const TITLE_ID = "measure-guide-title";

export function MeasureGuideSheet({ field, onClose }: MeasureGuideSheetProps) {
  return (
    <BottomSheet
      open={field !== null}
      label="측정 가이드"
      titleId={TITLE_ID}
      onClose={onClose}
    >
      {field && (
        <>
          <h2 id={TITLE_ID} className="text-base font-semibold">
            {field.label} 어떻게 재요?
          </h2>
          <div className="flex justify-center">
            <DogDiagram highlight={field.key} />
          </div>
          <ul className="flex list-disc flex-col gap-2 pl-4 text-sm break-keep">
            {field.guide.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            {field.minCm}~{field.maxCm}cm 범위로 입력할 수 있어요.
          </p>
          <Button variant="primary" block onClick={onClose}>
            알겠어요
          </Button>
        </>
      )}
    </BottomSheet>
  );
}
