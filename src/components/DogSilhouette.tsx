// 개 실루엣 도형만 (와이어프레임의 #dogBase 심볼과 동일 좌표계 viewBox="0 0 260 165").
//
// SVG <symbol id> + <use> 대신 컴포넌트로 재사용한다 — 같은 화면에 실루엣이 둘 이상
// 뜨는 순간(폼 + 가이드 시트) id 가 중복돼 문서가 깨지기 때문이다. E2 핏 맵도 이걸 쓴다.
export function DogSilhouette() {
  return (
    // 부모 <svg> 가 role="img" + aria-label 로 대체 텍스트를 제공하므로 내부는 이미 무시된다.
    <g>
      <g fill="var(--color-dog)">
        <path d="M36 78 Q14 68 20 44 Q23 33 33 35 Q29 52 46 63 Z" />
        <ellipse cx="68" cy="92" rx="30" ry="27" />
        <ellipse cx="112" cy="84" rx="56" ry="31" />
        <circle cx="152" cy="90" r="25" />
        <circle cx="188" cy="50" r="23" />
        <ellipse cx="209" cy="59" rx="13" ry="9" />
        <ellipse
          cx="171"
          cy="45"
          rx="8"
          ry="15"
          transform="rotate(18 171 45)"
        />
        <rect x="141" y="102" width="11" height="42" rx="5" />
        <rect x="159" y="106" width="11" height="38" rx="5" />
        <rect x="52" y="106" width="11" height="38" rx="5" />
        <rect x="74" y="108" width="11" height="36" rx="5" />
      </g>
      {/* 눈·코. --dog-ink 는 테마별로 항상 몸(--dog)보다 어둡게 정의된다. */}
      <circle cx="194" cy="45" r="2.6" fill="var(--color-dog-ink)" />
      <circle cx="220" cy="57" r="3.4" fill="var(--color-dog-ink)" />
    </g>
  );
}
