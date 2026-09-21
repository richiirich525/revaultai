import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  toWorld, dirFromBearing, yawFromBearing, lensMm, verticalFov,
  POSE_LEG_SCALE, poseDrop, EYE_HEIGHT, HEAD_HEIGHT, LEG_HEIGHT, ASPECTS,
} from "./lib/stage3d.js";

/*
  CameraView — RevaultAI (Rehearsal Studio, tier 2)
  What the active camera actually sees. Grey-box previz: mannequins placed and
  turned exactly as on the overhead plan, framed through the lens the geometry
  engine chose. The point is decisions, not realism — you can see the envelope
  is out of his eyeline before spending a credit.
*/

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
  // A small marker on the face, so which way someone is turned reads instantly.
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.09), face);
  nose.position.set(0, HEAD_HEIGHT + 0.01, -0.13);
  upper.add(torso, head, nose);

  g.add(legs, upper);
  g.userData = { legs, upper, color };
  return g;
}

export default function CameraView({ state, lens, subject, aspect = "16:9", title }) {
  const box = useRef(null);
  const three = useRef(null);
  const [failed, setFailed] = useState(false);

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
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0e0f14, 14, 32);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1c1a26, 0.85));
    const key = new THREE.DirectionalLight(0xfff4e6, 1.15);
    key.position.set(4, 9, 3);
    scene.add(key);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x14151c, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const grid = new THREE.GridHelper(20, 20, 0x3b3550, 0x24222e);
    grid.position.y = 0.002;
    scene.add(grid);

    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 60);
    three.current = { renderer, scene, camera, actors: new Map() };

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
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
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

    const seen = new Set();
    for (const a of state.actors ?? []) {
      let m = actors.get(a.id);
      if (!m || m.userData.color !== (a.color || "#7B3FE4")) {
        if (m) scene.remove(m);
        m = makeMannequin(a.color || "#7B3FE4");
        scene.add(m);
        actors.set(a.id, m);
      }
      seen.add(a.id);
      const w = toWorld(a.x, a.y);
      m.position.set(w.x, 0, w.z);
      m.rotation.y = yawFromBearing(a.facing ?? 0);
      const s = POSE_LEG_SCALE[a.pose] ?? 1;
      m.userData.legs.scale.y = s;
      m.userData.legs.position.y = (LEG_HEIGHT * s) / 2;
      m.userData.upper.position.y = -poseDrop(a.pose);
    }
    for (const [id, m] of actors) {
      if (!seen.has(id)) { scene.remove(m); actors.delete(id); }
    }

    const c = toWorld(state.camera.x, state.camera.y);
    camera.position.set(c.x, EYE_HEIGHT, c.z);
    const d = dirFromBearing(state.camera.rotation ?? 0);

    // Aim at the subject's head at the subject's distance, so a close-up on
    // someone sitting tilts down the way a real camera would.
    let dist = 6, targetY = 1.45;
    const subj = (state.actors ?? []).find((a) => a.name === subject);
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
        <div style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.6)", pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
          {lensMm(lens)}mm · {aspect}
        </div>
      </div>
    </div>
  );
}