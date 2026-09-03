// 엔진 서버 경계 가드 (플랜 A2).
// 엔진 코어(여유분 매트릭스·판정 룰)는 보호 자산이라 클라이언트 번들에 실리면 안 된다.
//
//   node guard-engine-boundary.mjs src   → 소스에서 코어 import 를 잡는다 (@pet-fit/engine/display 만 허용)
//   node guard-engine-boundary.mjs dist  → 빌드 산출물에서 코어 캐너리 토큰을 잡는다
//
// dist 캐너리는 minify 에도 살아남는 "엔진 내부 전용 프로퍼티 키"를 쓴다 —
// 최상위 심볼명은 망글링되지만 객체 프로퍼티 키는 보존된다. display 계층과
// API 응답 데이터에는 절대 등장하지 않는 키만 고른다.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const mode = process.argv[2];
const root = new URL("..", import.meta.url).pathname;

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

/**
 * 주석 내용을 같은 길이의 공백으로 지운다(줄 번호·오프셋 보존).
 * 주석에 "import" 라는 단어가 들어 있으면 문장 스캐너가 거기서부터 매칭해
 * 바로 아래의 정상 `import type` 을 위반으로 오판한다 — 실제로 밟은 함정.
 */
function stripComments(text) {
  const blanked = (s) => s.replace(/[^\n]/g, " ");
  return (
    text
      .replace(/\/\*[\s\S]*?\*\//g, blanked)
      // `://` (URL) 은 주석이 아니다.
      .replace(
        /(^|[^:])\/\/[^\n]*/g,
        (m, lead) => lead + blanked(m.slice(lead.length)),
      )
  );
}

// 허용: (1) `@pet-fit/engine/display`(클라 표시 계층)의 모든 import, (2) 경로와
// 무관하게 **문장 전체가 타입인** `import type { ... }` — 타입은 컴파일 시 지워져
// 번들에 남지 않는다(플랜 §API 계약).
// 금지: 코어·미허용 서브패스의 값 import, 혼합형(`import { type A, b }` — 값 부분이
// 실린다), 재수출(`export ... from` — 번들에 남는다), 동적 import.
// `@api/*`(서버리스 함수·계약 파일)도 같은 규칙으로 본다 — 계약 타입은 단일 출처를
// 쓰되 핸들러·시드 값이 클라이언트 번들로 넘어오는 길은 막는다.
//
// 줄 단위가 아니라 **문장 단위**로 본다 — biome 이 긴 import 목록을 여러 줄로 쪼개면
// `from "..."` 이 있는 줄에는 `import type` 키워드가 없어 줄 단위 검사가 뚫린다.
// ⚠️ 앵커가 핵심이다. 앵커 없이 `[\s\S]*?` 로 두면 clause 가 문장 경계를 넘어
// **앞 문장의 import 부터** 삼켜, 판정이 "바로 앞에 어떤 import 가 있었나"에 좌우된다.
// 두 오판 모두 실측으로 재현됐다(아래 SELFTEST fn/fp 케이스). 그래서
// ① 줄머리 앵커(m 플래그) ② clause 에 `;` 금지.
const STATEMENT =
  /^[ \t]*(import|export)\s+((?:[^;'"]|"[^"]*"|'[^']*')*?)\bfrom\s*["']((?:@pet-fit\/engine|@api\/)[^"']*)["']/gm;
const DYNAMIC = /\bimport\s*\(\s*["']((?:@pet-fit\/engine|@api\/)[^"']*)["']/g;
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** 소스 한 편을 검사해 위반 목록을 돌려준다. 파일 스캔과 자체 테스트가 같은 코드를 쓴다. */
function scanSource(label, source) {
  const found = [];
  const text = stripComments(source);
  for (const m of text.matchAll(STATEMENT)) {
    const [, keyword, clause, specifier] = m;
    if (specifier === "@pet-fit/engine/display") continue;
    // 코어(또는 미허용 서브패스)는 순수 타입 import 만 통과.
    // `\b` 로 끝맺어야 `import type{A}`(공백 없는 형태)도 잡힌다.
    if (keyword === "import" && /^type\b/.test(clause.trimStart())) continue;
    found.push(
      `${label}:${lineOf(text, m.index)}  ${keyword} … from "${specifier}" — 값 import·재수출은 서버 전용 경계 위반`,
    );
  }
  for (const m of text.matchAll(DYNAMIC)) {
    found.push(
      `${label}:${lineOf(text, m.index)}  동적 import("${m[1]}") — 서버 전용 경계 위반`,
    );
  }
  return found;
}

/**
 * 자체 테스트. 가드는 "통과했다"는 신호로 신뢰를 얻는 도구인데, 스캐너가 조용히
 * 오판하면 그 신호가 거짓이 된다 — 실제로 그렇게 뚫린 적이 있어 픽스처로 못 박는다.
 */
const SELFTEST = [
  ["값 import 차단", 'import { recommendSize } from "@pet-fit/engine";', 1],
  [
    "앞줄이 타입 import 여도 값 import 차단(FN 회귀)",
    'import type { ReactNode } from "react";\nimport { recommendSize } from "@pet-fit/engine";',
    1,
  ],
  [
    "앞줄이 값 import 여도 타입 import 통과(FP 회귀)",
    'import { useState } from "react";\nimport type { Measurement } from "@pet-fit/engine";',
    0,
  ],
  [
    "여러 줄 타입 import 통과",
    'import type {\n  DogProfile,\n} from "@pet-fit/engine";',
    0,
  ],
  [
    "공백 없는 타입 import 통과",
    'import type{DogProfile} from "@pet-fit/engine";',
    0,
  ],
  [
    "혼합형 차단",
    'import { type DogProfile, recommendSize } from "@pet-fit/engine";',
    1,
  ],
  ["재수출 차단", 'export type { DogProfile } from "@pet-fit/engine";', 1],
  ["동적 import 차단", 'const m = await import("@pet-fit/engine");', 1],
  [
    "display 값 import 통과",
    'import { verdictLabel } from "@pet-fit/engine/display";',
    0,
  ],
  ["@api 값 import 차단", 'import { SEED_GARMENTS } from "@api/_lib/seed";', 1],
  [
    "@api 타입 import 통과",
    'import type { FitResponse } from "@api/_lib/contracts";',
    0,
  ],
  [
    "주석 속 import 단어 무시",
    '// from "@pet-fit/engine" 을 언급하는 주석\nimport type { DogProfile } from "@pet-fit/engine";',
    0,
  ],
];

const violations = [];

if (mode === "src") {
  const failures = SELFTEST.filter(
    ([, source, expected]) =>
      scanSource("selftest", source).length !== expected,
  ).map(([name]) => `자체 테스트 실패: ${name}`);
  if (failures.length > 0) {
    console.error("✗ 경계 가드 자체 테스트 실패 — 스캐너를 먼저 고쳐야 한다:");
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }

  for (const file of walk(join(root, "src"), [".ts", ".tsx"])) {
    violations.push(...scanSource(file, readFileSync(file, "utf8")));
  }
} else if (mode === "dist") {
  const CANARY_TOKENS = [
    "tightFailOffsetKnitCm",
    "smallMaxCm",
    "tooTightMinOffsetCm",
  ];
  // 양성 대조군 — display 계층이 번들에 반드시 싣는 문자열(T2 티어 라벨).
  // "위반 0" 은 스캐너가 진짜 번들을 읽었을 때만 의미가 있다. 잘못된 경로를
  // 훑거나 빈 산출물을 보고도 침묵 통과하는 실패형을 여기서 잡는다.
  const POSITIVE_CONTROL = "이전 옷 기준 추정";
  let controlSeen = false;
  for (const file of walk(join(root, "dist"), [".js"])) {
    const content = readFileSync(file, "utf8");
    if (content.includes(POSITIVE_CONTROL)) controlSeen = true;
    for (const token of CANARY_TOKENS) {
      if (content.includes(token)) {
        violations.push(
          `${file}  캐너리 "${token}" 검출 — 엔진 코어가 번들에 포함됨`,
        );
      }
    }
  }
  if (!controlSeen) {
    violations.push(
      `양성 대조군 "${POSITIVE_CONTROL}" 미검출 — 스캐너가 실제 번들을 읽지 못함(경로·빌드 확인)`,
    );
  }
} else {
  console.error("usage: guard-engine-boundary.mjs <src|dist>");
  process.exit(2);
}

if (violations.length > 0) {
  console.error("✗ 엔진 서버 경계 위반 — 코어는 서버(api/) 전용이다:");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log(`✓ engine boundary (${mode}) clean`);
