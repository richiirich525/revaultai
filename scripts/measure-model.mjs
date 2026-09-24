import { readFileSync } from "fs";

function json(file) {
  const buf = readFileSync(file);
  if (file.toLowerCase().endsWith(".gltf")) return JSON.parse(buf.toString("utf8"));
  if (buf.toString("ascii", 0, 4) !== "glTF") throw new Error("not a glTF binary");
  return JSON.parse(buf.toString("utf8", 20, 20 + buf.readUInt32LE(12)));
}

function scaleFor(j) {
  const byMesh = new Map();
  for (const n of j.nodes ?? []) {
    if (n.mesh == null) continue;
    let s = n.scale ? [...n.scale] : [1, 1, 1];
    if (n.matrix) s = [Math.hypot(n.matrix[0], n.matrix[1], n.matrix[2]),
                       Math.hypot(n.matrix[4], n.matrix[5], n.matrix[6]),
                       Math.hypot(n.matrix[8], n.matrix[9], n.matrix[10])];
    byMesh.set(n.mesh, s);
  }
  return byMesh;
}

for (const file of process.argv.slice(2)) {
  try {
    const j = json(file);
    const scales = scaleFor(j);
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    (j.meshes ?? []).forEach((mesh, mi) => {
      const s = scales.get(mi) ?? [1, 1, 1];
      for (const prim of mesh.primitives ?? []) {
        const acc = j.accessors?.[prim.attributes?.POSITION];
        if (!acc?.min || !acc?.max) continue;
        for (let i = 0; i < 3; i++) {
          lo[i] = Math.min(lo[i], acc.min[i] * s[i]);
          hi[i] = Math.max(hi[i], acc.max[i] * s[i]);
        }
      }
    });
    if (!isFinite(lo[0])) { console.log(`${file.split("/").pop()}: no recorded bounds`); continue; }
    const size = hi.map((v, i) => v - lo[i]);
    const f = (n) => n.toFixed(2).padStart(5);
    console.log(`${file.split("/").pop().padEnd(28)} w ${f(size[0])}  h ${f(size[1])}  d ${f(size[2])}   (floor at y ${lo[1].toFixed(2)})`);
  } catch (e) {
    console.log(`${file.split("/").pop()}: ${e.message}`);
  }
}
