// 계약 사본 정합 검증 (리뷰 structure:F1). 빌드 최앞단에서 돈다.
// 이 저장소의 계약 사본 3개가 비공개 정본(pet-fit-engine)에서 생성된
// contracts.manifest.json 의 sha256 과 다르면 빌드를 죽인다 — 두 저장소가
// 조용히 어긋난 채 배포되는 것을 막는 장치다.
// 어긋났을 때: pet-fit-engine 에서 node scripts/emit-contract-manifest.mjs 후
// 사본 3개 + 매니페스트를 다시 복사해 온다(정본이 이긴다).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 매니페스트의 중립 키 → 이 저장소의 사본 경로
const COPIES = {
  "engine/types.ts": "engine-display/src/types.ts",
  "engine/format.ts": "engine-display/src/format.ts",
  "api/contracts.ts": "src/contracts/api.ts",
};

const manifest = JSON.parse(
  readFileSync(join(root, "contracts.manifest.json"), "utf8"),
);

let failed = false;
for (const [key, expected] of Object.entries(manifest.files)) {
  const rel = COPIES[key];
  if (!rel) {
    console.error(`✗ 매니페스트 키 "${key}" 의 사본 경로 매핑이 없음`);
    failed = true;
    continue;
  }
  const actual = createHash("sha256")
    .update(readFileSync(join(root, rel)))
    .digest("hex");
  if (actual !== expected) {
    console.error(`✗ ${rel}: 정본과 불일치 (pet-fit-engine 에서 재복사 필요)`);
    failed = true;
  }
}
for (const key of Object.keys(COPIES)) {
  if (!(key in manifest.files)) {
    console.error(`✗ 매니페스트에 "${key}" 항목이 없음`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("✓ contract copies match manifest");
