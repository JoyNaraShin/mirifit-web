import { FitResult } from "@/components/FitResult";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { useStoredProfile } from "@/hooks/useStoredProfile";
import { Navigate, useNavigate, useParams } from "react-router";

/** S5 — 판정 결과 (T1 종단). 핏 맵 SVG 는 E2 슬라이스. */
export function ResultPage() {
  const navigate = useNavigate();
  const { garmentId } = useParams<{ garmentId: string }>();
  const stored = useStoredProfile();

  // 게이트: 프로필·상품·가슴둘레가 있어야 판정이 성립한다. 렌더 시점에 갈라
  // 조회 컴포넌트가 서스펜드하기 전에 결론을 낸다.
  if (!stored || !garmentId) return <Navigate to="/" replace />;

  const chest = stored.profile.chest;
  if (!chest) {
    return (
      <main className="flex flex-col gap-3 pt-4">
        <Notice
          variant="error"
          role="alert"
          text="가슴둘레가 없어 판정할 수 없어요. 치수를 다시 넣어 주세요."
        >
          <Button onClick={() => navigate("/measure")}>치수 넣기</Button>
        </Notice>
      </main>
    );
  }

  return <FitResult garmentId={garmentId} stored={stored} chest={chest} />;
}
