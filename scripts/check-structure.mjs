// Guards the folder rules that keep features independent. Run: npm run check:structure
//   1. A section never imports another section.
//   2. core imports nothing from data, features or sections.
//   3. data imports nothing from features or sections.
//   4. features import nothing from sections.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC = join(import.meta.dirname, "..", "src");

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

function imports(file) {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(/^\s*import[^"']*["']([^"']+)["']/gm)].map((m) => m[1]);
}

const problems = [];
for (const file of files(SRC)) {
  const rel = relative(SRC, file).split(sep).join("/");
  const [area, sub] = rel.split("/");
  for (const spec of imports(file)) {
    if (area === "sections" && /^s\d\d_/.test(sub ?? "")) {
      const other = spec.match(/(?:@\/sections\/|\.\.\/)(s\d\d_[a-z_]+)/);
      if (other && other[1] !== sub) problems.push(`${rel} imports another section: ${spec}`);
    }
    if (area === "core" && /^@\/(data|features|sections)/.test(spec)) problems.push(`${rel} (core) imports ${spec}`);
    if (area === "data" && /^@\/(features|sections)/.test(spec)) problems.push(`${rel} (data) imports ${spec}`);
    if (area === "features" && /^@\/sections/.test(spec)) problems.push(`${rel} (features) imports ${spec}`);
  }
}

if (problems.length) {
  console.error("Structure rules broken:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("Structure rules hold: sections are independent, and core, data and features stay below them.");
