import { QueryClient } from "@tanstack/react-query";

// 판정 결과는 같은 입력이면 같은 값이라 재요청할 이유가 없다 — 창을 다시 포커스했다고
// 다시 부르지 않는다. 시드 상품 목록도 데모 단계에서는 변하지 않는다.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
