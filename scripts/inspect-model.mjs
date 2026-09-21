/*
  inspect-model — RevaultAI
  Lists what's inside a .glb or .gltf file: animation clips, skeletons, meshes,
  and the texture and data files it pulls in, with their sizes. No dependencies.
    node scripts/inspect-model.mjs path/to/model.glb
*/
import { readFileSync, statSync, existsSync } from "fs";
import { dirname, join } from "path";

const file = process.argv[2];
if (!file) {
  console.log("Usage: node scripts/inspect-model.mjs path/to/model.glb");
  process.exit(1);
}

let json;
let selfSize = 0;
try {
  const buf = readFileSync(file);
  selfSize = buf.length;
  if (file.toLowerCase().endsWith(".gltf")) {
    json = JSON.parse(buf.toString("utf8"));
  } else {
    if (buf.toString("ascii", 0, 4) !== "glTF") throw new Error("not a glTF binary");
    const jsonLength = buf.readUInt32LE(12);
    json = JSON.parse(buf.toString("utf8", 20, 20 + jsonLength));
  }
} catch (e) {
  console.log("Could not read " + file + ": " + e.message);
  process.exit(1);
}

const mb = (n) => (n / 1048576).toFixed(1) + " MB";
const dir = dirname(file);
const anims = (json.animations ?? []).map((a) => a.name || "(unnamed)");
const skins = json.skins ?? [];
const bones = skins[0]?.joints?.map((j) => json.nodes[j]?.name).filter(Boolean) ?? [];

console.log("File:       " + file.split("/").pop() + "  (" + mb(selfSize) + ")");
console.log("Meshes:     " + (json.meshes ?? []).length);
console.log("Skeletons:  " + skins.length + (bones.length ? "  (" + bones.length + " bones)" : ""));

let total = selfSize;
const refs = [
  ...(json.buffers ?? []).map((b) => b.uri).filter((u) => u && !u.startsWith("data:")),
  ...(json.images ?? []).map((i) => i.uri).filter((u) => u && !u.startsWith("data:")),
];
const embedded = (json.images ?? []).filter((i) => !i.uri).length;
if (refs.length) {
  console.log("Uses files:");
  for (const r of refs) {
    const p = join(dir, decodeURIComponent(r));
    const size = existsSync(p) ? statSync(p).size : 0;
    total += size;
    console.log("  - " + r + (size ? "  (" + mb(size) + ")" : "  (MISSING)"));
  }
}
if (embedded) console.log("Embedded images: " + embedded);
console.log("Total weight: " + mb(total));

console.log("Animations: " + anims.length);
for (const a of anims) console.log("  - " + a);
if (bones.length) console.log("First bones: " + bones.slice(0, 5).join(", ") + (bones.length > 5 ? ", ..." : ""));