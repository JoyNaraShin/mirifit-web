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

const violations = [];

if (mode === "src") {
  // 허용: (1) `@pet-fit/engine/display`(클라 표시 계층)의 모든 import, (2) 경로와
  // 무관하게 **문장 전체가 타입인** `import type { ... }` — 타입은 컴파일 시 지워져
  // 번들에 남지 않는다(플랜 §API 계약).
  // 금지: 코어·미허용 서브패스의 값 import, 혼합형(`import { type A, b }` — 값 부분이
  // 실린다), 재수출(`export ... from` — 번들에 남는다), 동적 import.
  //
  // 줄 단위가 아니라 **문장 단위**로 본다 — biome 이 긴 import 목록을 여러 줄로 쪼개면
  // `from "..."` 이 있는 줄에는 `import type` 키워드가 없어 줄 단위 검사가 뚫린다.
  const STATEMENT =
    /\b(import|export)\s+([\s\S]*?)\bfrom\s*["'](@pet-fit\/engine[^"']*)["']/g;
  const DYNAMIC = /\bimport\s*\(\s*["'](@pet-fit\/engine[^"']*)["']/g;
  const lineOf = (text, index) => text.slice(0, index).split("\n").length;

  for (const file of walk(join(root, "src"), [".ts", ".tsx"])) {
    const text = stripComments(readFileSync(file, "utf8"));
    for (const m of text.matchAll(STATEMENT)) {
      const [, keyword, clause, specifier] = m;
      if (specifier === "@pet-fit/engine/display") continue;
      // 코어(또는 미허용 서브패스)는 순수 타입 import 만 통과.
      const typeOnly =
        keyword === "import" && /^type\s/.test(clause.trimStart());
      if (typeOnly) continue;
      violations.push(
        `${file}:${lineOf(text, m.index)}  ${keyword} … from "${specifier}" — 값 import·재수출은 서버 전용 경계 위반`,
      );
    }
    for (const m of text.matchAll(DYNAMIC)) {
      violations.push(
        `${file}:${lineOf(text, m.index)}  동적 import("${m[1]}") — 서버 전용 경계 위반`,
      );
    }
  }
} else if (mode === "dist") {
  const CANARY_TOKENS = [
    "tightFailOffsetKnitCm",
    "smallMaxCm",
    "tooTightMinOffsetCm",
  ];
  for (const file of walk(join(root, "dist"), [".js"])) {
    const content = readFileSync(file, "utf8");
    for (const token of CANARY_TOKENS) {
      if (content.includes(token)) {
        violations.push(
          `${file}  캐너리 "${token}" 검출 — 엔진 코어가 번들에 포함됨`,
        );
      }
    }
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
