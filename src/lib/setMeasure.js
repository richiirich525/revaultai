import * as THREE from "three";

/*
  setMeasure — RevaultAI
  Measures a generated set from the inside. A box drawn around everything
  Marble built also takes in whatever it invented beyond the walls, so the
  room is traced instead: rays go out from the point the world was captured
  from, and where they land is where the room's surfaces are.
*/

const ray = new THREE.Raycaster();
const from = new THREE.Vector3();
const dir = new THREE.Vector3();
const size = new THREE.Vector3();

function triangles(object) {
  let n = 0;
  object.traverse((o) => {
    const g = o.isMesh ? o.geometry : null;
    if (g) n += (g.index ? g.index.count : g.attributes?.position?.count ?? 0) / 3;
  });
  return n;
}

// A ring of points around the capture point: in each direction, how far the
// room runs before it meets a surface (metres, or null where nothing is hit).
// Two heights are tried and the farther one kept, so a wall counts and a
// sofa in front of it doesn't. Expects the collider at 1:1 with its world
// matrix up to date; `metric` turns its units into metres.
export function traceRoom(collider, box, metric) {
  const eye = Math.max(0, -box.min.y);              // the floor sits this far below the capture point
  const heights = eye > 0 ? [0, eye * 0.35] : [0];
  const far = box.getSize(size).length() + 1;
  const step = triangles(collider) > 150000 ? 10 : 5; // degrees; coarser for a very heavy mesh
  const ring = [];
  for (let deg = 0; deg < 360; deg += step) {
    const t = (deg * Math.PI) / 180;
    const dx = Math.sin(t), dz = -Math.cos(t);
    let r = null;
    for (const y of heights) {
      ray.set(from.set(0, y, 0), dir.set(dx, 0, dz));
      ray.near = 0;
      ray.far = far;
      const hit = ray.intersectObject(collider, true)[0];
      if (hit && (r == null || hit.distance > r)) r = hit.distance;
    }
    ring.push({ dx, dz, r: r == null ? null : r * metric });
  }
  return ring;
}

// The room's four sides. Each is the middle value of the rays pointing that
// way, so a doorway or window a few rays escape through doesn't stretch the
// room. Where most rays escape, the box around everything is used instead.
export function roomExtent(ring, box, metric) {
  const cone = Math.cos((22.5 * Math.PI) / 180);
  const side = (ax, az, fallback) => {
    const reaches = [];
    for (const p of ring) {
      const along = p.dx * ax + p.dz * az;
      if (along >= cone) reaches.push(p.r == null ? fallback : p.r * along);
    }
    if (reaches.length < 3) return fallback;
    reaches.sort((a, b) => a - b);
    const mid = reaches[Math.floor(reaches.length / 2)];
    return mid > 0.5 && mid < fallback ? mid : fallback;
  };
  const maxX = side(1, 0, box.max.x * metric);
  const minX = -side(-1, 0, -box.min.x * metric);
  const maxZ = side(0, 1, box.max.z * metric);
  const minZ = -side(0, -1, -box.min.z * metric);
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

function toSegment(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az;
  const len2 = vx * vx + vz * vz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / len2)) : 0;
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

// How close a point on the floor plan stands to the nearest traced surface,
// in metres. `scale` is the creator's own set-size adjustment.
export function nearestSurface(ring, x, z, scale = 1) {
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    if (a.r == null) continue;
    const ax = a.dx * a.r * scale, az = a.dz * a.r * scale;
    // Neighbours at very different distances are two different surfaces (the
    // edge of a doorway, say) — there's nothing running between them.
    const joined = b.r != null && Math.abs(a.r - b.r) < 0.3 + 0.25 * Math.max(a.r, b.r);
    const d = joined
      ? toSegment(x, z, ax, az, b.dx * b.r * scale, b.dz * b.r * scale)
      : Math.hypot(x - ax, z - az);
    if (d < best) best = d;
  }
  return best;
}
