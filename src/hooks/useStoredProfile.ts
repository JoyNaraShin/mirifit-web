import {
  type StoredProfile,
  getProfileSnapshot,
  subscribeProfile,
} from "@/lib/storage";
import { useSyncExternalStore } from "react";

/**
 * localStorage 프로필을 구독한다.
 *
 * 쿼리로 감싸지 않는다 — 프로필은 서버 응답의 캐시가 아니라 클라이언트가 소유한
 * 원본이고, 다시 fetch 할 수 없는 값에 staleTime·GC 의미를 씌우면 모델이 어긋난다.
 * "외부 가변 저장소를 컴포넌트가 구독한다"는 문제의 React 표준 도구가 이것이다.
 * `useState(loadProfile)` 로 두면 마운트 시점 스냅샷이라 이후 저장·다른 탭 변경이
 * 반영되지 않는다.
 */
export function useStoredProfile(): StoredProfile | null {
  return useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    // 서버 렌더는 없지만(SPA) 시그니처상 필요 — 저장소가 없는 환경은 "없음"이다.
    () => null,
  );
}
