// API 호출 계층. 응답 타입은 서버 계약 파일(@/contracts/api)을 타입 전용으로
// 가져와 단일 출처로 유지한다 — 값 import 는 경계 가드가 막는다.
import type {
  ApiErrorBody,
  EstimateObservationInput,
  EstimateRequest,
  EstimateResponse,
  FitRequest,
  FitResponse,
  GarmentListItem,
  GarmentListResponse,
  PublicSizeFit,
} from "@/contracts/api";

export type {
  EstimateObservationInput,
  EstimateResponse,
  GarmentListItem,
  FitResponse,
  PublicSizeFit,
};

/** 화면이 사용자에게 보여줄 수 있는 실패. 원인 문구는 서버 메시지를 그대로 쓰지 않는다. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      signal,
      headers: { accept: "application/json", ...init.headers },
    });
  } catch (cause) {
    // AbortError 는 호출자가 구분해야 하므로 그대로 던진다(디바운스 취소 = 오류 아님).
    if (cause instanceof DOMException && cause.name === "AbortError")
      throw cause;
    throw new ApiError("네트워크에 연결할 수 없어요.", 0);
  }
  if (!res.ok) {
    // 서버가 계약대로 오류 본문을 주면 코드만 쓰고, 문구는 화면 쪽에서 만든다.
    let code: string | undefined;
    try {
      code = ((await res.json()) as ApiErrorBody).error?.code;
    } catch {
      /* 본문 없음 — 상태 코드만으로 처리 */
    }
    throw new ApiError(
      code === "GARMENT_NOT_FOUND"
        ? "그 상품을 찾을 수 없어요."
        : "잠시 문제가 생겼어요. 다시 시도해 주세요.",
      res.status,
    );
  }
  return (await res.json()) as T;
}

/** 상품 목록. `q` 가 있으면 브랜드·상품명 부분 일치로 걸러진 결과. */
export async function fetchGarments(
  q: string,
  signal?: AbortSignal,
): Promise<GarmentListItem[]> {
  const query = q.trim() === "" ? "" : `?q=${encodeURIComponent(q.trim())}`;
  const body = await requestJson<GarmentListResponse>(
    `/api/garments${query}`,
    { method: "GET" },
    signal,
  );
  return body.garments;
}

/**
 * 판정·사이즈 추천. **한 번만 부른다** — 응답에 전 사이즈 후보가 담겨 있어
 * 사이즈 탭 전환은 클라이언트에서 처리한다(D-06).
 */
export async function fetchFit(
  request: FitRequest,
  signal?: AbortSignal,
): Promise<FitResponse> {
  return requestJson<FitResponse>(
    "/api/fit",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    },
    signal,
  );
}

/** 이전 옷 역추정 — S2 "다음" 1회 호출(D-06: 추정은 동선당 1회, 판정은 옷마다). */
export async function fetchEstimate(
  request: EstimateRequest,
  signal?: AbortSignal,
): Promise<EstimateResponse> {
  return requestJson<EstimateResponse>(
    "/api/estimate",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    },
    signal,
  );
}
