import { useId } from "react";

export interface ChipOption<V extends string> {
  value: V;
  label: string;
}

interface FitQuestionChipsProps<V extends string> {
  /** 질문 문구 — 그룹의 legend 로 쓰인다. */
  question: string;
  options: ChipOption<V>[];
  /** undefined = "기억 안 나요" — 제약 미생성이므로 요청 payload 에서 필드가 빠진다. */
  value: V | undefined;
  onChange: (next: V | undefined) => void;
  /** "기억 안 나요" 칩의 문구. */
  skipLabel?: string;
  /** false 면 "기억 안 나요" 칩을 빼고 필수 선택 그룹이 된다(예: 사이즈). */
  allowSkip?: boolean;
}

/**
 * S2 핏 질문 칩 그룹 (플랜 D3). 네이티브 라디오로 그룹 규약(탭 정지 1개·화살표
 * 이동·단일 선택)을 브라우저에 맡긴다 — role="radiogroup" 수동 구현 금지.
 *
 * "기억 안 나요"는 별도 상태값이 아니라 **미선택(undefined)** 이다 — 계약상
 * "기억 안 나요"류 = 필드 생략(제약 미생성)이고, UI 가 그걸 별도 값으로 들면
 * 저장·전송 계층마다 그 값을 다시 걸러내야 한다. 그룹의 기본 선택 칩으로 노출한다.
 */
export function FitQuestionChips<V extends string>({
  question,
  options,
  value,
  onChange,
  skipLabel = "기억 안 나요",
  allowSkip = true,
}: FitQuestionChipsProps<V>) {
  const groupName = useId();

  const chip = (checked: boolean) =>
    `inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
      checked
        ? "border-accent bg-accent-soft font-semibold"
        : "border-line bg-surface"
    }`;

  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="text-sm font-semibold">{question}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={chip(value === option.value)}>
            <input
              className="sr-only"
              type="radio"
              name={groupName}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
        {allowSkip && (
          <label className={chip(value === undefined)}>
            <input
              className="sr-only"
              type="radio"
              name={groupName}
              value=""
              checked={value === undefined}
              onChange={() => onChange(undefined)}
            />
            {skipLabel}
          </label>
        )}
      </div>
    </fieldset>
  );
}
