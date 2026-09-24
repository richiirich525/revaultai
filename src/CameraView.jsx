import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  toWorld, dirFromBearing, yawFromBearing, lensMm, verticalFov,
  POSE_LEG_SCALE, poseDrop, EYE_HEIGHT, HEAD_HEIGHT, LEG_HEIGHT, ASPECTS,
} from "./lib/stage3d.js";
import { chooseClip, clipTimeFor, MOVING } from "./lib/performers.js";
import { getSet, SCALE, MODEL_PATH, filesFor } from "./lib/setCatalog.js";

/*
  CameraView — RevaultAI (Rehearsal Studio, tiers 2 and 3)
  What the active camera sees. Performers are animated characters that idle,
  sit, crouch and walk between their marks. Until the characters have loaded
  — or if they can't — grey mannequins stand in, so the view always works.
*/

const PERFORMER_HEIGHT = 1.75; // metres

// ---- Characters load once per visit and are shared by every view ----
let assetsPromise = null;

function prepareBody(scene) {
  scene.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const h = box.max.y - box.min.y || 1;
  // Which way does the model face? Toes sit in front of ankles.
  let yawFix = Math.PI;
  const foot = scene.getObjectByName("foot_l");
  const ball = scene.getObjectByName("ball_l");
  if (foot && ball) {
    const a = foot.getWorldPosition(new THREE.Vector3());
    const b = ball.getWorldPosition(new THREE.Vector3());
    yawFix = b.z - a.z > 0 ? Math.PI : 0;
  }
  // The body is the biggest mesh; hair and eyes are separate, smaller ones.
  let bodyGeometry = null, most = 0;
  scene.traverse((o) => {
    const n = o.isMesh ? o.geometry?.attributes?.position?.count ?? 0 : 0;
    if (n > most) { most = n; bodyGeometry = o.geometry; }
  });
  let neckY = 1e9;
  if (bodyGeometry) {
    bodyGeometry.computeBoundingBox();
    const bb = bodyGeometry.boundingBox;
    const ext = { x: bb.max.x - bb.min.x, y: bb.max.y - bb.min.y, z: bb.max.z - bb.min.z };
    // Upright in its resting pose: suit up to the collar. Otherwise, suit it all.
    if (ext.y >= 0.8 * ext.x && ext.y >= 2 * ext.z) neckY = bb.min.y + 0.845 * ext.y;
  }
  return { scene, scale: PERFORMER_HEIGHT / h, minY: box.min.y, yawFix, bodyGeometry, neckY };
}

function loadAssets() {
  if (assetsPromise) return assetsPromise;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  assetsPromise = Promise.all([
    loader.loadAsync("/models/performer-female.glb"),
    loader.loadAsync("/models/performer-male.glb"),
    loader.loadAsync("/models/animations.glb"),
  ]).then(([female, male, lib]) => {
    const clips = {};
    for (const clip of lib.animations) {
      // The blocking decides where people stand, not the animation.
      clip.tracks = clip.tracks.filter((tr) => tr.name !== "root.position");
      clips[clip.name] = clip;
    }
    return {
      clips,
      bodies: {
        female: { ...prepareBody(female.scene), suit: true },
        male: { ...prepareBody(male.scene), suit: true },
        mannequin: prepareBody(lib.scene),
      },
    };
  }).catch((err) => {
    assetsPromise = null;
    throw err;
  });
  return assetsPromise;
}

// A fitted stand-in suit: below the collar the body takes the performer's
// colour, calmed toward charcoal so it reads as fabric, not paint. Face,
// skin tone, hair and eyes stay exactly as modelled.
function makeSuit(orig, color, neckY) {
  const m = orig.clone();
  const suit = { value: new THREE.Color(color).lerp(new THREE.Color(0x2b2b34), 0.45) };
  const neck = { value: neckY };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSuit = suit;
    shader.uniforms.uNeckY = neck;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vBindY;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBindY = position.y;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vBindY;\nuniform vec3 uSuit;\nuniform float uNeckY;")
      .replace("#include <map_fragment>", "#include <map_fragment>\nif (vBindY < uNeckY) { diffuseColor.rgb = uSuit; }");
  };
  m.customProgramCacheKey = () => "revault-suit";
  return m;
}

// Kenney's kit is modelled at half size, so every piece is doubled. Loaded
// pieces are cached and shared between rooms — each is a few dozen kilobytes.
const pieceCache = new Map();
async function loadPiece(loader, name) {
  if (!pieceCache.has(name)) {
    pieceCache.set(name, loader.loadAsync(MODEL_PATH + name + ".glb").then((g) => g.scene).catch(() => null));
  }
  return pieceCache.get(name);
}

async function buildSetFromModels(set, loader) {
  const group = new THREE.Group();
  await Promise.all(filesFor(set).map((n) => loadPiece(loader, n)));
  const place = async (p) => {
    const src = await loadPiece(loader, p.piece);
    if (!src) return;
    const o = src.clone(true);
    o.scale.setScalar(SCALE);
    o.position.set(p.x, p.y ?? 0, p.z);
    o.rotation.y = (-(p.rot ?? 0) * Math.PI) / 180;
    o.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });
    group.add(o);
  };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(set.floor.w, set.floor.d),
    new THREE.MeshStandardMaterial({ color: "#2a2b33", roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.004;
  group.add(floor);
  for (const w of set.walls ?? []) await place(w);
  for (const p of set.props ?? []) await place(p);
  return group;
}

function unusedGreyBoxSet(set) {
  const g = new THREE.Group();
  const surface = (color, roughness = 0.95) => new THREE.MeshStandardMaterial({ color, roughness });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(set.floor.w, set.floor.d), surface("#23242c"));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.004;
  g.add(floor);

  for (const w of set.walls) {
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, w.h, 0.12), surface("#31323c"));
    wall.position.set((w.x1 + w.x2) / 2, w.h / 2, (w.z1 + w.z2) / 2);
    wall.rotation.y = -Math.atan2(w.z2 - w.z1, w.x2 - w.x1);
    g.add(wall);
  }

  for (const p of set.props) {
    const mesh = p.shape === "cyl"
      ? new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, p.h, 16), surface(p.color))
      : new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), surface(p.color, p.kind === "window" ? 0.25 : 0.95));
    mesh.position.set(p.x, p.y != null ? p.y : p.h / 2, p.z);
    g.add(mesh);
  }
  return g;
}

function makeRing(color) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.34, 0.4, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  return ring;
}

function makePerformer(body, clips, color) {
  const inner = SkeletonUtils.clone(body.scene);
  // Stand-in suit on the human bodies; the mannequin keeps its own look.
  if (body.suit && body.bodyGeometry) {
    inner.traverse((o) => {
      if (o.isMesh && o.geometry === body.bodyGeometry && !Array.isArray(o.material)) {
        o.material = makeSuit(o.material, color, body.neckY);
      }
    });
  }
  inner.scale.setScalar(body.scale);
  inner.position.y = -body.minY * body.scale;
  const facingFix = new THREE.Group();
  facingFix.rotation.y = body.yawFix;
  facingFix.add(inner);
  const g = new THREE.Group();
  g.add(facingFix, makeRing(color));
  g.userData = { kind: "performer", mixer: new THREE.AnimationMixer(inner), clips, actions: {}, weights: {}, yaw: null };
  return g;
}

function makeMannequin(color) {
  const skin = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
  const face = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.4 });
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, LEG_HEIGHT, 14), skin);
  legs.position.y = LEG_HEIGHT / 2;
  const upper = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.65, 16), skin);
  torso.position.y = 1.175;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), skin);
  head.position.y = HEAD_HEIGHT;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.09), face);
  nose.position.set(0, HEAD_HEIGHT + 0.01, -0.13);
  upper.add(torso, head, nose);
  g.add(legs, upper);
  g.userData = { kind: "box", legs, upper };
  return g;
}

// Turn toward a bearing the short way round.
function approachAngle(from, to, k) {
  const d = ((((to - from) % 360) + 540) % 360) - 180;
  return (from + d * k + 360) % 360;
}

function drivePerformer(m, a, t, realDt) {
  const u = m.userData;
  const wanted = chooseClip(a.pose, a.speed ?? 0);
  const target = u.clips[wanted] ? wanted : u.clips.Idle_Loop ? "Idle_Loop" : null;
  if (!target) return;

  if (!u.actions[target]) {
    const act = u.mixer.clipAction(u.clips[target]);
    act.play();
    act.setEffectiveTimeScale(0); // time is set by hand, from the rehearsal
    act.setEffectiveWeight(0);
    u.actions[target] = act;
    // First clip ever: start fully in it, rather than blending up from a T-pose.
    if (Object.keys(u.actions).length === 1) u.weights[target] = 1;
  }

  // Blend toward the new clip over about an eighth of a second.
  const k = Math.min(1, realDt * 8);
  for (const [name, act] of Object.entries(u.actions)) {
    const w0 = u.weights[name] ?? 0;
    const w = name === target ? w0 + (1 - w0) * k : w0 * (1 - k);
    u.weights[name] = w;
    act.setEffectiveWeight(w);
    act.time = clipTimeFor(name, act.getClip().duration, t, a.travel ?? 0);
  }
  u.mixer.update(0);

  // Walking faces the way they're going; stopped, they face their mark.
  const aim = (a.speed ?? 0) >= MOVING && a.heading != null ? a.heading : a.facing ?? 0;
  u.yaw = u.yaw == null ? aim : approachAngle(u.yaw, aim, Math.min(1, realDt * 10));
  m.rotation.y = yawFromBearing(u.yaw);
}

export default function CameraView({ state, lens, subject, aspect = "16:9", title, setId, genSet, setScale, setGround, onSetError, onSetFit }) {
  const box = useRef(null);
  const three = useRef(null);
  const lastFrame = useRef(0);
  const [failed, setFailed] = useState(false);
  const [outsideSet, setOutsideSet] = useState(false);
  const [wildWall, setWildWall] = useState(false);
  const outsideRef = useRef(false);
  const [assets, setAssets] = useState(null);
  const [loadNote, setLoadNote] = useState("Loading performers…");

  useEffect(() => {
    let alive = true;
    loadAssets()
      .then((a) => { if (alive) { setAssets(a); setLoadNote(""); } })
      .catch(() => { if (alive) setLoadNote("Performers couldn't load — showing mannequins."); });
    return () => { alive = false; };
  }, []);

  // Build the scene once.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x0e0f14);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0e0f14, 14, 32);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1c1a26, 1.1));
    const key = new THREE.DirectionalLight(0xfff4e6, 1.6);
    key.position.set(4, 9, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb9a6ff, 0.6);
    rim.position.set(-5, 6, -6);
    scene.add(rim);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x14151c, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const grid = new THREE.GridHelper(20, 20, 0x3b3550, 0x24222e);
    grid.position.y = 0.002;
    scene.add(grid);

    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 60);
    three.current = { renderer, scene, camera, actors: new Map(), floor, grid, set: null, setId: null };

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    return () => {
      ro.disconnect();
      for (const m of three.current?.actors.values() ?? []) m.userData.mixer?.stopAllAction();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      three.current = null;
    };
  }, []);

  // Update performers and camera on every change — including during playback.
  useEffect(() => {
    const T = three.current;
    if (!T || !state) return;
    const { scene, camera, renderer, actors } = T;

    // Swap the room when the creator picks a different set.
    if (T.setId !== (setId ?? null)) {
      if (T.set) { scene.remove(T.set); T.set.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); T.set = null; }
      const chosen = setId ? getSet(setId) : null;
      if (chosen) {
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);
        buildSetFromModels(chosen, loader).then((g) => {
          if (three.current && three.current.setId === chosen.id) { three.current.set = g; scene.add(g); }
        });
      }
      T.setId = setId ?? null;
    }

    // A generated set: photoreal Gaussian splats from Marble. Its files are
    // large, so Spark loads only when one is actually used.
        const genId = genSet?.id ?? null;
    if (T.genId !== genId) {
      if (T.genOuter) { scene.remove(T.genOuter); T.genOuter = null; T.genWorld = null; T.genSet = null; }
      T.genId = genId;
      T.genFit = null;
      T.genBase = null;
      const a = genSet?.assets;
      if (a?.splat500k || a?.splat100k) {
        // Phones get the light tier, tablets the middle, computers the sharpest.
        const w = window.innerWidth;
        const url = (w < 760 ? a.splat100k : w < 1100 ? a.splat500k : a.splatFull || a.splat500k)
          || a.splat500k || a.splat100k;
        const outer = new THREE.Group();   // height only
        const world = new THREE.Group();   // Marble's frame: turned and scaled
        world.rotation.x = Math.PI;        // Marble is Y-down; three.js is Y-up
        outer.add(world);
        scene.add(outer);
        T.genOuter = outer;
        T.genWorld = world;

        // The collider gives the floor height, the true size and the extent of
        // what was reconstructed. Measured at 1:1, then scaled.
        if (a.collider) {
          const gl = new GLTFLoader();
          gl.setMeshoptDecoder(MeshoptDecoder);
          gl.loadAsync(a.collider).then((g) => {
            if (!three.current || three.current.genId !== genId) return;
            const collider = g.scene;
            collider.traverse((o) => {
              if (o.isMesh) { o.material = new THREE.MeshStandardMaterial({ color: 0x14151c, roughness: 1 }); o.frustumCulled = false; }
            });
            world.scale.setScalar(1);
            outer.position.set(0, 0, 0);
            world.add(collider);
            outer.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(collider);
            const h = box.max.y - box.min.y;
            const metric = Number(a.scale) || (h > 0.01 ? 2.6 / h : 1);
            T.genBase = { scale: metric, minY: box.min.y };
            T.genFit = {
              minX: box.min.x * metric, maxX: box.max.x * metric,
              minZ: box.min.z * metric, maxZ: box.max.z * metric,
              width: (box.max.x - box.min.x) * metric,
              depth: (box.max.z - box.min.z) * metric,
              metric: !!Number(a.scale),
            };
            onSetFit?.(T.genFit);
          }).catch(() => {});
        }

        fetch(url, { headers: { Range: "bytes=0-1" } })
          .then((r) => {
            if (!r.ok && r.status !== 206) throw new Error("the set file came back " + r.status);
            return import("@sparkjsdev/spark");
          })
          .then(({ SplatMesh, SparkRenderer }) => {
            if (!T.spark) { T.spark = new SparkRenderer({ renderer }); scene.add(T.spark); }
            const mesh = new SplatMesh({ url });
            if (three.current && three.current.genId === genId) { three.current.genSet = mesh; world.add(mesh); }
          })
          .catch((e) => onSetError?.(e.message || "the set wouldn't load"));
      }
    }

    // The world keeps its own origin — that's the point it was captured from,
    // where the room surrounds you rather than sitting in front of you. Only
    // the floor height is corrected, and the sliders fine-tune from there.
    if (T.genOuter && T.genBase) {
      const s = T.genBase.scale * (Number(setScale) || 1);
      T.genWorld.scale.setScalar(s);
      T.genOuter.position.set(0, -T.genBase.minY * s + (Number(setGround) || 0), 0);
    }
    if (T.genFit) {
      const c = toWorld(state.camera.x, state.camera.y);
      const f = T.genFit, pad = 0.4;
      const outX = Math.max(f.minX - c.x, c.x - f.maxX, 0);
      const outZ = Math.max(f.minZ - c.z, c.z - f.maxZ, 0);
      const out = Math.hypot(outX, outZ);
      // A wild wall: standing back from the room, the wall between camera and
      // room is cut away, the way a set wall is pulled for a wide shot.
      camera.near = out > pad ? Math.max(0.05, out + 0.25) : 0.05;
      camera.updateProjectionMatrix();
      // Only complain when far enough out to be seeing past the reconstruction.
      const tooFar = out > 3.5;
      if (tooFar !== outsideRef.current) { outsideRef.current = tooFar; setOutsideSet(tooFar); }
      if (T.wild !== (out > pad)) { T.wild = out > pad; setWildWall(out > pad); }
    } else if (outsideRef.current || T.wild) {
      outsideRef.current = false; setOutsideSet(false); T.wild = false; setWildWall(false);
      camera.near = 0.05; camera.updateProjectionMatrix();
    }

    // The empty void's floor and grid step aside for any set.
    T.floor.visible = !(setId || genId);
    T.grid.visible = !(setId || genId);

    const nowMs = performance.now();
    const realDt = lastFrame.current ? Math.min(1, (nowMs - lastFrame.current) / 1000) : 1;
    lastFrame.current = nowMs;

    const seen = new Set();
    for (const a of state.actors ?? []) {
      const color = a.color || "#7B3FE4";
      const body = assets?.bodies[a.body] ?? null;
      const sig = body ? `p:${a.body}:${color}` : `b:${color}`;
      let m = actors.get(a.id);
      if (!m || m.userData.sig !== sig) {
        if (m) { m.userData.mixer?.stopAllAction(); scene.remove(m); }
        m = body ? makePerformer(body, assets.clips, color) : makeMannequin(color);
        m.userData.sig = sig;
        scene.add(m);
        actors.set(a.id, m);
      }
      seen.add(a.id);

      const w = toWorld(a.x, a.y);
      m.position.set(w.x, 0, w.z);
      if (m.userData.kind === "performer") {
        drivePerformer(m, a, state.t ?? 0, realDt);
      } else {
        m.rotation.y = yawFromBearing(a.facing ?? 0);
        const s = POSE_LEG_SCALE[a.pose] ?? 1;
        m.userData.legs.scale.y = s;
        m.userData.legs.position.y = (LEG_HEIGHT * s) / 2;
        m.userData.upper.position.y = -poseDrop(a.pose);
      }
    }
    for (const [id, m] of actors) {
      if (!seen.has(id)) { m.userData.mixer?.stopAllAction(); scene.remove(m); actors.delete(id); }
    }

    const c = toWorld(state.camera.x, state.camera.y);
    camera.position.set(c.x, EYE_HEIGHT, c.z);
    const d = dirFromBearing(state.camera.rotation ?? 0);
    // Aim at the subject's head at the subject's distance, so a close-up on
    // someone sitting tilts down the way a real camera would.
    let dist = 6, targetY = 1.45;
    const subj = (state.actors ?? []).find((x) => x.name === subject);
    if (subj) {
      const sw = toWorld(subj.x, subj.y);
      dist = Math.max(0.6, Math.hypot(sw.x - c.x, sw.z - c.z));
      targetY = HEAD_HEIGHT - poseDrop(subj.pose) - 0.05;
    }
    camera.lookAt(c.x + d.x * dist, targetY, c.z + d.z * dist);
    camera.fov = verticalFov(lensMm(lens), camera.aspect || 16 / 9);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  });

  const ratio = ASPECTS[aspect] ?? ASPECTS["16:9"];

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, background: "var(--bg)" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: ratio.css, maxHeight: "70vh", margin: "0 auto", overflow: "hidden", borderRadius: 4, background: "#0e0f14" }}>
        <div ref={box} style={{ position: "absolute", inset: 0 }} />
        {failed && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", padding: 20, textAlign: "center" }}>
            This browser can't draw 3D. The overhead plan still works.
          </div>
        )}
        <div style={{ position: "absolute", top: 8, left: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)", pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
          {title}
        </div>
        {(outsideSet || wildWall) && (
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", borderRadius: 3, padding: "3px 10px",
            color: outsideSet ? "#0e0f14" : "rgba(255,255,255,0.75)",
            background: outsideSet ? "#E5B769" : "rgba(0,0,0,0.45)" }}>
            {outsideSet ? "Too far back — you're seeing past the set" : "Shooting through the wild wall"}
          </div>
        )}
        {loadNote && !failed && (
          <div style={{ position: "absolute", top: 8, right: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.08em", color: "rgba(255,255,255,0.55)", pointerEvents: "none" }}>
            {loadNote}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.6)", pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
          {lensMm(lens)}mm · {aspect}
        </div>
      </div>
    </div>
  );
}