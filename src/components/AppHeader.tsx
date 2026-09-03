import { APP_NAME } from "@/lib/appName";
import { Link } from "react-router";

/**
 * 전 화면 공통 헤더. 로고 = 홈 링크 — 뒤로가기 히스토리와 무관하게 언제든
 * 시작 화면으로 나가는 고정 탈출구다(순환 동선에서 뒤로가기만으로는 홈이
 * 멀어질 수 있다 — 히스토리 규칙과 별개의 안전장치).
 */
export function AppHeader() {
  return (
    <header className="pb-2">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center text-sm font-bold text-accent"
      >
        🐕 {APP_NAME}
      </Link>
    </header>
  );
}
