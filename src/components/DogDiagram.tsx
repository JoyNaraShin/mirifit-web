import { DogSilhouette } from "@/components/DogSilhouette";
// 측정 부위 안내 그림 (와이어프레임 S3). 실루엣 위에 3부위 치수선을 얹는다.
import type { MeasureFieldKey } from "@/lib/measureForm";

interface DogDiagramProps {
  /** 강조할 부위. 가이드 시트를 열면 그 부위만 진하게 — 어디를 재는지 눈으로 잇는다. */
  highlight?: MeasureFieldKey | null;
}

// 비강조는 "물러남"이지 "소멸"이 아니다 — --line(1.37:1)으로 내리면 화면에서 사라져
// 라벨만 허공에 떠 있게 된다(실측). 3:1 을 유지하는 토큰을 쓴다.
const DIM = "var(--color-line-strong)";
const ON = "var(--color-accent)";

export function DogDiagram({ highlight = null }: DogDiagramProps) {
  // 강조가 없으면 3부위 모두 기본 색. 있으면 나머지는 물러난다.
  const stroke = (part: MeasureFieldKey) =>
    highlight === null || highlight === part ? ON : DIM;
  const label = (part: MeasureFieldKey) =>
    highlight === null || highlight === part ? ON : "var(--color-muted)";

  return (
    <svg
      className="h-auto w-full max-w-[230px]"
      viewBox="0 0 260 165"
      role="img"
      aria-label="개 실루엣에 목둘레·가슴둘레·등길이를 재는 위치를 표시한 그림"
    >
      <DogSilhouette />

      {/* 가슴둘레 — 앞다리 뒤 가장 두꺼운 곳 */}
      <ellipse
        cx="138"
        cy="84"
        rx="11"
        ry="33"
        fill="none"
        stroke={stroke("chest")}
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <line
        x1="136"
        y1="120"
        x2="126"
        y2="142"
        stroke={stroke("chest")}
        strokeWidth="1"
      />
      <text
        x="104"
        y="152"
        fontSize="10"
        fontWeight="700"
        fill={label("chest")}
      >
        가슴둘레
      </text>

      {/* 목둘레 */}
      <ellipse
        cx="173"
        cy="60"
        rx="8"
        ry="14"
        fill="none"
        stroke={stroke("neck")}
        strokeWidth="2"
        strokeDasharray="4 3"
        transform="rotate(-14 173 60)"
      />
      <line
        x1="180"
        y1="68"
        x2="198"
        y2="87"
        stroke={stroke("neck")}
        strokeWidth="1"
      />
      <text x="196" y="98" fontSize="10" fontWeight="700" fill={label("neck")}>
        목둘레
      </text>

      {/* 등길이 — 목뒤에서 꼬리 시작까지 */}
      <path
        d="M46 36 L46 26 L165 26 L165 36"
        fill="none"
        stroke={stroke("back")}
        strokeWidth="1.6"
      />
      <text x="86" y="19" fontSize="10" fontWeight="700" fill={label("back")}>
        등길이
      </text>
    </svg>
  );
}
