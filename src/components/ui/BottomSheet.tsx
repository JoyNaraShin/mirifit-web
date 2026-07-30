import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  /** 닫힘 상태에서는 제목이 렌더되지 않으므로 이름을 항상 갖고 있어야 한다. */
  label: string;
  titleId?: string;
  onClose: () => void;
  children: ReactNode;
}

/** 네이티브 <dialog> — Esc·포커스 트랩·배경 비활성을 브라우저가 처리한다. */
export function BottomSheet({
  open,
  label,
  titleId,
  onClose,
  children,
}: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // 초기 포커스를 본문에 둔다 — 닫기 버튼에 떨어지면 내용을 건너뛴다.
      bodyRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // 배경 탭으로 닫기는 모바일 시트의 기본 기대다. 키보드 경로는 Esc(네이티브)와
    // 시트 안 닫기 버튼이 담당하므로 마우스 전용 동작이 아니다.
    // biome-ignore lint/a11y/useKeyWithClickEvents: 키보드 동등 경로가 Esc·닫기 버튼으로 존재
    <dialog
      ref={ref}
      aria-label={label}
      aria-labelledby={open ? titleId : undefined}
      className="m-auto mb-0 w-full max-w-[430px] overscroll-contain rounded-t-2xl bg-surface text-ink backdrop:bg-black/62 sm:m-auto sm:rounded-2xl"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div
          ref={bodyRef}
          className="flex flex-col gap-3 p-4 pb-6 outline-none"
          tabIndex={-1}
        >
          {children}
        </div>
      )}
    </dialog>
  );
}
