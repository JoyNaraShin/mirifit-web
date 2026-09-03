import { DogMark } from "@/components/DogSilhouette";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { useStoredProfile } from "@/hooks/useStoredProfile";
import { APP_NAME } from "@/lib/appName";
import {
  SAMPLE_DOG_NAME,
  SAMPLE_GARMENT_ID,
  SAMPLE_PROFILE,
} from "@/lib/sampleDog";
import { clearStored, saveProfile } from "@/lib/storage";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";

/** S1 — 시작·분기 (플랜 E1, 와이어프레임 S1). T2(이전 옷)가 주 CTA — D-01. */
export function StartPage() {
  const navigate = useNavigate();
  const stored = useStoredProfile();
  // 공유 직링크에서 넘어온 경우 — 정보 입력 후 그 결과로 되돌아간다(ResultPage 게이트).
  const pendingGarmentId = (
    useLocation().state as { pendingGarmentId?: string } | null
  )?.pendingGarmentId;
  // 삭제는 3분짜리 실측을 되돌릴 수 없이 지운다 — 확인 한 겹을 세운다(리뷰 F6).
  const [confirmingReset, setConfirmingReset] = useState(false);

  const startSample = () => {
    // 저장 실패(프라이빗 모드)여도 막지 않는다 — 결과 화면 게이트가 스토리지를 읽으므로
    // 실패 시 되돌아오지만, 그건 스토리지가 죽은 환경의 일관된 동작이다.
    saveProfile(SAMPLE_PROFILE);
    navigate(`/fit/${SAMPLE_GARMENT_ID}`);
  };

  return (
    <main className="flex flex-col gap-3 pt-4">
      <h1 className="text-2xl leading-snug font-bold text-balance">
        사고 나서 후회 말고,
        <br />
        입혀보고 사세요
      </h1>
      <p className="text-sm break-keep text-muted">
        우리 아이 치수로 옷의 부위별 핏을 미리 확인해요 — 무료
      </p>

      {pendingGarmentId && (
        <Notice text="공유받은 판정 결과를 보려면 우리 아이 정보가 먼저 필요해요. 아래에서 입력하면 바로 그 결과로 이동해요." />
      )}

      <h2 className="mt-3 text-sm font-bold">
        우리 아이 정보, 어떻게 알려주실래요?
      </h2>

      {/* 주 CTA = T2 이전 옷 (D-01: "실측 안 하는 보호자가 진짜 니즈"). */}
      <Button
        variant="primary"
        block
        onClick={() => navigate("/estimate", { state: { pendingGarmentId } })}
      >
        <span className="flex flex-col py-1">
          <span>전에 산 옷으로 알려줄게요 →</span>
          <span className="text-xs font-normal opacity-80">
            줄자 없어도 돼요 · 1분
          </span>
        </span>
      </Button>

      <Button
        block
        onClick={() => navigate("/measure", { state: { pendingGarmentId } })}
      >
        <span className="flex flex-col py-1">
          <span>줄자로 직접 잴게요 →</span>
          <span className="text-xs font-normal text-muted">
            가장 정확해요 · 3분
          </span>
        </span>
      </Button>

      {stored && (
        <Notice text="저장된 우리 아이 정보가 있어요.">
          {/* 누구의 정보인지 보여준다 — "있어요"만으로는 지울지 이어갈지 판단할 근거가 없다. */}
          {(stored.profile.breed !== undefined ||
            stored.profile.weightKg !== undefined) && (
            <p className="text-xs text-muted">
              {[
                stored.profile.breed,
                stored.profile.weightKg !== undefined
                  ? `${stored.profile.weightKg}kg`
                  : undefined,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <Button onClick={() => navigate("/garments")}>
            이어서 하기 (저장된 우리 아이 정보)
          </Button>
          <Button variant="link" onClick={() => setConfirmingReset(true)}>
            처음부터 다시 하기 — 저장 정보 지우기
          </Button>
        </Notice>
      )}

      <BottomSheet
        open={confirmingReset}
        label="저장 정보 삭제"
        onClose={() => setConfirmingReset(false)}
      >
        <p className="text-sm break-keep text-muted">
          잰 치수와 답한 옷 기록이 지워져요. 되돌릴 수 없어요.
        </p>
        <Button
          variant="primary"
          block
          onClick={() => {
            clearStored();
            setConfirmingReset(false);
          }}
        >
          지우기
        </Button>
        <Button block onClick={() => setConfirmingReset(false)}>
          취소
        </Button>
      </BottomSheet>

      <Button variant="link" className="break-keep" onClick={startSample}>
        <DogMark height={16} /> 예시로 먼저 구경하기 — 샘플 강아지{" "}
        {SAMPLE_DOG_NAME}
      </Button>
    </main>
  );
}
