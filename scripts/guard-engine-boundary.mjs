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

const violations = [];

if (mode === "src") {
  // "@pet-fit/engine" 및 "/display 이외 서브패스" import 금지.
  const corePattern = /from\s+["']@pet-fit\/engine(?!\/display["'])[^"']*["']/;
  for (const file of walk(join(root, "src"), [".ts", ".tsx"])) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (corePattern.test(line)) {
        violations.push(`${file}:${i + 1}  ${line.trim()}`);
      }
    });
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
