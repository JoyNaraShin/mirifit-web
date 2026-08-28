// S2 이전 옷 입력 폼의 상태 모델 (플랜 D3). 화면(EstimatePage)에서 분리해
// "무엇이 제출 가능한 관측인가" 판정을 렌더 트리 밖에서 테스트 가능하게 둔다.
import type { GarmentListItem } from "@/lib/api";
import type {
  ArmpitTwoFingers,
  EstimateObservationInput,
} from "@api/_lib/contracts";
import type { BackLengthResponse, GarmentFitResponse } from "@pet-fit/engine";

export interface ObservationDraft {
  /** 행 식별용 로컬 키 — 서버로 가지 않는다. */
  id: string;
  garment: GarmentListItem | null;
  sizeLabel: string | null;
  /** undefined = "기억 안 나요" = 요청에서 필드 생략(제약 미생성). */
  chestFit?: GarmentFitResponse;
  armpitTwoFingers?: Exclude<ArmpitTwoFingers, "unknown">;
  neckFit?: GarmentFitResponse;
  backLengthFit?: BackLengthResponse;
}

let seq = 0;
export function emptyDraft(): ObservationDraft {
  // Date.now 류 대신 카운터 — 같은 밀리초에 두 행이 생겨도 키가 겹치지 않는다.
  seq += 1;
  return { id: `draft-${seq}`, garment: null, sizeLabel: null };
}

/**
 * 이 관측이 엔진 제약을 하나라도 만드는가 — 서버 `producesConstraint` 와 같은 규칙.
 * 겨드랑이 "네"는 제약을 못 만든다(끼지 않았다는 사실만으로는 구간이 안 나온다 —
 * api/_lib/mappings.ts `resolveChestFit` 참조). "아니요"만 가슴 제약(too_tight)이 된다.
 */
export function draftAnswersConstraint(draft: ObservationDraft): boolean {
  return (
    draft.chestFit !== undefined ||
    draft.armpitTwoFingers === "no" ||
    draft.neckFit !== undefined ||
    draft.backLengthFit !== undefined
  );
}

/**
 * 제출 payload — `/api/estimate` 요청의 observations 원본(localStorage 저장 대상).
 * 상품·사이즈가 확정되고 제약을 만드는 답이 하나라도 있는 행만 담는다.
 * "기억 안 나요"(undefined) 필드는 스프레드 조건으로 아예 빠진다 — 계약의
 * "생략 = 제약 미생성"을 JSON 직렬화 단계가 아니라 조립 단계에서 보장한다.
 */
export function buildObservationPayload(
  drafts: ObservationDraft[],
): EstimateObservationInput[] {
  const payload: EstimateObservationInput[] = [];
  for (const draft of drafts) {
    if (draft.garment === null || draft.sizeLabel === null) continue;
    if (!draftAnswersConstraint(draft)) continue;
    payload.push({
      garmentId: draft.garment.id,
      sizeLabel: draft.sizeLabel,
      ...(draft.chestFit ? { chestFit: draft.chestFit } : {}),
      // "네"도 답이므로 실어 보낸다 — 제약은 못 만들지만 사용자 응답 원본이고,
      // 정확도 루프 재진입 시 프리필이 이 저장본에서 복원된다(D4).
      ...(draft.armpitTwoFingers
        ? { armpitTwoFingers: draft.armpitTwoFingers }
        : {}),
      ...(draft.neckFit ? { neckFit: draft.neckFit } : {}),
      ...(draft.backLengthFit ? { backLengthFit: draft.backLengthFit } : {}),
    });
  }
  return payload;
}

/**
 * 저장된 관측(정확도 루프 재진입)을 폼 draft 로 복원한다. 저장소에는 요청 원본만
 * 있으므로(표시 정보 없음 — storage.ts) 상품 목록에서 id 로 되찾아 붙인다.
 * 목록에서 사라진 상품·사이즈의 관측은 조용히 버리지 않고 복원 가능한 것만 돌려준다 —
 * 하나도 없으면 null(호출자가 빈 폼으로 시작).
 */
export function draftsFromSaved(
  saved: EstimateObservationInput[],
  items: GarmentListItem[],
): ObservationDraft[] | null {
  const drafts: ObservationDraft[] = [];
  for (const obs of saved) {
    const garment = items.find((g) => g.id === obs.garmentId);
    if (!garment || !garment.sizeLabels.includes(obs.sizeLabel)) continue;
    drafts.push({
      ...emptyDraft(),
      garment,
      sizeLabel: obs.sizeLabel,
      ...(obs.chestFit ? { chestFit: obs.chestFit } : {}),
      // 계약의 "unknown" 은 폼에서 미선택과 같다 — draft 는 undefined 로 든다.
      ...(obs.armpitTwoFingers && obs.armpitTwoFingers !== "unknown"
        ? { armpitTwoFingers: obs.armpitTwoFingers }
        : {}),
      ...(obs.neckFit ? { neckFit: obs.neckFit } : {}),
      ...(obs.backLengthFit ? { backLengthFit: obs.backLengthFit } : {}),
    });
  }
  return drafts.length > 0 ? drafts : null;
}
