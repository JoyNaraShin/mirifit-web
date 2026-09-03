import { Button } from "@/components/ui/Button";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Notice } from "@/components/ui/Notice";
import { ApiError } from "@/lib/api";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { type ReactNode, Suspense } from "react";
import { useLocation } from "react-router";

/**
 * 화면 단위 로딩·오류 경계. 페이지에서 isPending/isError 분기를 걷어내는 대가로
 * 이 한 곳이 두 상태를 모두 책임진다.
 * 오류 초기화는 쿼리 캐시 리셋과 함께 해야 한다 — 경계만 되살리면 실패한 쿼리가
 * 그대로 남아 즉시 다시 throw 한다.
 */
export function ScreenBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          resetKey={pathname}
          onReset={reset}
          fallback={(error, retry) => (
            <main className="flex flex-col gap-3 pt-4">
              <Notice variant="error" role="alert">
                <p className="text-sm break-keep text-muted">
                  {/* 사용자 문구는 ApiError(서버가 한국어로 만든 것)만 신뢰 —
                      렌더 버그·파싱 오류의 영문 원문을 반려인에게 읽히지 않는다. */}
                  {error instanceof ApiError && error.message
                    ? error.message
                    : "잠시 문제가 생겼어요. 다시 시도해 주세요."}
                </p>
                <Button onClick={retry}>다시 시도</Button>
              </Notice>
            </main>
          )}
        >
          <Suspense
            fallback={
              <p
                className="py-10 text-center text-sm text-muted"
                aria-live="polite"
              >
                불러오는 중…
              </p>
            }
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
