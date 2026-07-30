// API 호출 계층. 응답 타입은 서버 계약 파일(@api/_lib/contracts)을 타입 전용으로
// 가져와 단일 출처로 유지한다 — 값 import 는 경계 가드가 막는다.
import type {
  ApiErrorBody,
  GarmentListItem,
  GarmentListResponse,
} from "@api/_lib/contracts";

export type { GarmentListItem };

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

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      signal,
      headers: { accept: "application/json" },
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
  const body = await getJson<GarmentListResponse>(
    `/api/garments${query}`,
    signal,
  );
  return body.garments;
}
