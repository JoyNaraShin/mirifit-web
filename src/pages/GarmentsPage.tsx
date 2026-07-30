import { GarmentsList } from "@/components/GarmentsList";
import { useStoredProfile } from "@/hooks/useStoredProfile";
import { Navigate } from "react-router";

/** S4 — 옷 고르기. 와이어프레임 docs/wireframe-phase2.html S4. */
export function GarmentsPage() {
  const profile = useStoredProfile();
  // 판정할 대상이 없으면 렌더 시점에 되돌려 보낸다 — effect 로 미루면 빈 화면이 한 번 스친다.
  if (!profile) return <Navigate to="/" replace />;
  return <GarmentsList />;
}
