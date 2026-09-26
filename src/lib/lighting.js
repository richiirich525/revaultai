/*
  lighting — RevaultAI
  Time of day and a key light you can walk around the set. It changes what the
  camera view looks like, and — because the plate is what reaches the model —
  what the generated shot looks like too. The prompt says where the light comes
  from relative to the camera, which is how a DP would describe it.

  Bearings match the stage: 0 is up the plan, 90 is to its right.
*/

export const LIGHT_PRESETS = [
  {
    id: "day", label: "Midday", note: "Hard sun, short shadows",
    sky: "#9fb6cc", ground: "#4a4438", key: "#fff4e0", keyPower: 3.2, fill: 0.55, height: 62,
    words: "hard midday sun, short shadows, high contrast",
  },
  {
    id: "overcast", label: "Overcast", note: "Soft, shadowless, even",
    sky: "#b9c2ca", ground: "#55565a", key: "#dfe6ec", keyPower: 1.1, fill: 1.15, height: 70,
    words: "flat overcast daylight, soft shadowless light, low contrast",
  },
  {
    id: "golden", label: "Golden hour", note: "Low warm sun, long shadows",
    sky: "#e0a86a", ground: "#4a3a2a", key: "#ffb765", keyPower: 3.0, fill: 0.5, height: 12,
    words: "low golden-hour sun, long raking shadows, warm highlights against cool shadow",
  },
  {
    id: "dusk", label: "Dusk", note: "Blue hour, practicals coming on",
    sky: "#40506e", ground: "#22252e", key: "#7f93c4", keyPower: 0.9, fill: 0.45, height: 6,
    words: "blue-hour dusk, the last cold daylight with warm practical lights coming on",
  },
  {
    id: "night", label: "Night", note: "Practicals only, deep shadow",
    sky: "#141821", ground: "#0d0f14", key: "#9db4e0", keyPower: 0.35, fill: 0.18, height: 48,
    words: "night, lit only by practical lights, deep shadow, pools of warm light",
  },
  {
    id: "interior-day", label: "Window light", note: "Daylight through one window",
    sky: "#8e9aa8", ground: "#3a3832", key: "#ffeccd", keyPower: 2.4, fill: 0.6, height: 26,
    words: "daylight falling through a single window, soft on one side and falling off to shadow",
  },
  {
    id: "interior-night", label: "Lamplight", note: "Warm lamps, pooled light",
    sky: "#221d1a", ground: "#141110", key: "#ffc98c", keyPower: 1.5, fill: 0.3, height: 34,
    words: "warm lamplight indoors, pooled light and deep surrounding shadow",
  },
  {
    id: "practical", label: "Single source", note: "One hard source, chiaroscuro",
    sky: "#13141a", ground: "#0b0c10", key: "#ffe3b0", keyPower: 2.8, fill: 0.08, height: 30,
    words: "one hard light source, chiaroscuro, most of the frame in darkness",
  },
];

export const getPreset = (id) => LIGHT_PRESETS.find((p) => p.id === id) ?? LIGHT_PRESETS[0];

export const defaultLight = () => ({ preset: "interior-day", bearing: 300, warmth: 0 });

// Where the key sits relative to where the camera is pointing — the only way
// a lighting note is useful to anyone reading the shot.
export function keyRelativeToCamera(lightBearing, cameraRotation) {
  const d = ((((lightBearing - cameraRotation) % 360) + 540) % 360) - 180;
  const a = Math.abs(d);
  if (a < 22) return "behind the camera, flat on the subject";
  if (a > 158) return "behind the subject, backlit into the lens";
  if (a > 112) return d > 0 ? "three-quarters behind from camera right, rimming the subject" : "three-quarters behind from camera left, rimming the subject";
  if (a > 60) return d > 0 ? "from camera right, side-lit" : "from camera left, side-lit";
  return d > 0 ? "three-quarters from camera right" : "three-quarters from camera left";
}

// The line that goes into the prompt and the Shot Spec.
export function describeLight(light, cameraRotation) {
  const p = getPreset(light?.preset);
  const where = keyRelativeToCamera(light?.bearing ?? 300, cameraRotation ?? 0);
  const high = p.height > 55 ? "high" : p.height < 18 ? "low" : "at head height";
  return `Lit by ${p.words}. The key comes ${where}, ${high}.`;
}

// For the Shot Spec's lighting block, which the Debugger checks against.
export function lightSpec(light, cameraRotation) {
  const p = getPreset(light?.preset);
  return {
    keyDirection: keyRelativeToCamera(light?.bearing ?? 300, cameraRotation ?? 0),
    quality: /soft|overcast|flat/.test(p.words) ? "soft" : "hard",
    contrast: p.fill > 0.8 ? "low" : p.fill < 0.3 ? "high" : "medium",
    practicals: /practical|lamp/.test(p.words) ? "practical lights in shot" : "",
  };
}