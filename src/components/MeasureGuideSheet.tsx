// 부위별 측정 가이드 바텀시트 (와이어프레임 S3 주석 — 실측 오차 ±1cm 가정의 방어선).
// 네이티브 <dialog>: Esc 닫기·포커스 트랩·배경 비활성을 브라우저가 처리한다.
import { useEffect, useRef } from "react";
import type { MeasureFieldSpec } from "../lib/measureForm";
import { DogDiagram } from "./DogDiagram";

interface MeasureGuideSheetProps {
  /** null 이면 닫힘. */
  field: MeasureFieldSpec | null;
  onClose: () => void;
}

export function MeasureGuideSheet({ field, onClose }: MeasureGuideSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (field && !dialog.open) dialog.showModal();
    if (!field && dialog.open) dialog.close();
  }, [field]);

  return (
    // 배경 탭으로 닫기(아래 onClick)는 모바일 시트의 기본 기대다. 키보드 경로는
    // Esc(네이티브 dialog)와 "알겠어요" 버튼이 이미 담당하므로 마우스 전용 동작이 아니다.
    // biome-ignore lint/a11y/useKeyWithClickEvents: 키보드 동등 경로가 Esc·닫기 버튼으로 존재
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="guide-title"
      // Esc 로 브라우저가 닫을 때도 부모 상태를 맞춘다.
      onClose={onClose}
      onClick={(event) => {
        // 배경(dialog 자체)을 눌렀을 때만 닫는다 — 내용 클릭은 통과.
        if (event.target === ref.current) onClose();
      }}
    >
      {field && (
        <div className="sheet-body">
          <h2 id="guide-title" className="sheet-title">
            {field.label} 어떻게 재요?
          </h2>
          <div className="sheet-figure">
            <DogDiagram highlight={field.key} />
          </div>
          <ul className="sheet-steps">
            {field.guide.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="sheet-note">
            {field.minCm}~{field.maxCm}cm 범위로 입력할 수 있어요.
          </p>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            알겠어요
          </button>
        </div>
      )}
    </dialog>
  );
}
