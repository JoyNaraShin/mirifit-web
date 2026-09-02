import { Button } from "@/components/ui/Button";
import { findFeedback, saveFeedback } from "@/lib/storage";
import { useState } from "react";

interface FeedbackButtonsProps {
  garmentId: string;
  /** 지금 보고 있는 사이즈 — 탭 전환 시 그 사이즈에 대한 답으로 기록된다. */
  sizeLabel: string;
}

/**
 * S6 하단 "이 결과가 맞았나요?" (플랜 E3, D-14). 답은 기기(localStorage)에만
 * 남는다 — 서버 수집은 검수 큐 없이는 데이터 오염이라 Phase 3+. 그 사실을
 * 버튼 옆에 그대로 표기한다(정직한 프레이밍).
 *
 * 같은 옷·사이즈에 이미 답했으면 재질문하지 않는다 — 초기 상태를 저장소에서
 * 읽어 온다. 사이즈가 바뀌면 key 로 리마운트되어 그 사이즈의 기록을 다시 본다.
 */
export function FeedbackButtons({
  garmentId,
  sizeLabel,
}: FeedbackButtonsProps) {
  const [answered, setAnswered] = useState<boolean>(
    () => findFeedback(garmentId, sizeLabel) !== undefined,
  );

  const answer = (verdictAgreed: boolean) => {
    // 저장 실패(프라이빗 모드)여도 감사 인사는 보여준다 — 재방문 재질문만 감수.
    saveFeedback({ garmentId, sizeLabel, verdictAgreed });
    setAnswered(true);
  };

  return (
    // 상태 전환(질문 → 감사)을 스크린리더에도 알린다.
    <div aria-live="polite" className="flex flex-col gap-2">
      {answered ? (
        <p className="py-2 text-center text-sm break-keep text-muted">
          고마워요! 실제 착용 후기가 판정을 더 정확하게 만들어요 🙏
        </p>
      ) : (
        <>
          <p className="text-sm font-semibold">
            이 결과가 맞았나요?{" "}
            <span className="text-xs font-normal text-muted">
              (데모: 기기에만 저장)
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => answer(true)}>👍 잘 맞았어요</Button>
            <Button onClick={() => answer(false)}>👎 달랐어요</Button>
          </div>
        </>
      )}
    </div>
  );
}
