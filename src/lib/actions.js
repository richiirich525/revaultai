/*
  actions — RevaultAI (Rehearsal Studio)
  What a performer is actually doing at a mark, as opposed to where they are
  standing. Blocking answers "where"; this answers "what". Each entry names a
  clip from the shared animation library and the words that reach the prompt,
  so a direction given on the stage survives all the way into the generation.

  Two entries can share a clip and still be different directions: someone
  listening and someone waiting stand equally still, but the shot is not the
  same shot, and the model should not be told it is.
*/

// loop defaults to true. travel:true means the clip replaces the walk cycle
// while the performer is moving, rather than playing where they stand.
// pose, where given, is applied with the action so the body matches it.
export const ACTIONS = [
  // --- Stillness -----------------------------------------------------------
  { id: "still",         label: "Stands still",    clip: "Idle_Loop",            cat: "Stillness",  phrase: "stands still",                                  keys: "neutral default nothing" },
  { id: "listening",     label: "Listening",       clip: "Idle_Loop",            cat: "Stillness",  phrase: "listens, still",                                keys: "reaction reverse attention hears" },
  { id: "waiting",       label: "Waiting",         clip: "Idle_Loop",            cat: "Stillness",  phrase: "waits",                                         keys: "hold pause beat" },
  { id: "seated_still",  label: "Sitting quietly", clip: "Sitting_Idle_Loop",    cat: "Stillness",  phrase: "sits quietly",            pose: "sit",          keys: "seated chair still" },
  { id: "crouched",      label: "Crouched",        clip: "Crouch_Idle_Loop",     cat: "Stillness",  phrase: "stays low in a crouch",   pose: "crouch",       keys: "hiding low duck" },
  { id: "hold_light",    label: "Holding a light", clip: "Idle_Torch_Loop",      cat: "Stillness",  phrase: "holds a light up ahead of them",                keys: "torch lamp lantern flashlight dark" },

  // --- Dialogue ------------------------------------------------------------
  { id: "talking",        label: "Talking",           clip: "Idle_Talking_Loop",    cat: "Dialogue", phrase: "talks",                      keys: "speech speaking dialogue says line" },
  { id: "talking_seated", label: "Talking, seated",   clip: "Sitting_Talking_Loop", cat: "Dialogue", phrase: "talks, seated", pose: "sit", keys: "speech speaking dialogue chair conversation" },

  // --- Sitting & standing --------------------------------------------------
  { id: "sit_down",  label: "Sits down",   clip: "Sitting_Enter", cat: "Sitting & standing", phrase: "lowers themselves into a seat", pose: "sit",   loop: false, keys: "chair take a seat" },
  { id: "stand_up",  label: "Stands up",   clip: "Sitting_Exit",  cat: "Sitting & standing", phrase: "rises from the seat",           pose: "stand", loop: false, keys: "get up leaves rises" },

  // --- Business ------------------------------------------------------------
  { id: "reach",      label: "Reaches for something", clip: "Interact",        cat: "Business", phrase: "reaches out to touch something",                              loop: false, keys: "touch handle door switch button" },
  { id: "pick_up",    label: "Picks something up",    clip: "PickUp_Table",    cat: "Business", phrase: "picks something up from a surface",                           loop: false, keys: "lift take object table grab" },
  { id: "kneel_work", label: "Kneeling, working",     clip: "Fixing_Kneeling", cat: "Business", phrase: "kneels, working on something with their hands", pose: "crouch",            keys: "repair fixing mechanic tools examine" },
  { id: "push",       label: "Pushing something",     clip: "Push_Loop",       cat: "Business", phrase: "pushes something heavy",                                                   keys: "shove heave move weight door" },
  { id: "drive",      label: "Driving",               clip: "Driving_Loop",    cat: "Business", phrase: "sits at the controls, driving", pose: "sit",                               keys: "car vehicle wheel steering cockpit" },

  // --- Gait (replaces the walk cycle while they travel) ---------------------
  { id: "walk_formal", label: "Formal walk", clip: "Walk_Formal_Loop", cat: "Gait", phrase: "walks in a measured, deliberate way", travel: true, keys: "slow composed stately procession" },
  { id: "sprint",      label: "Sprinting",   clip: "Sprint_Loop",      cat: "Gait", phrase: "sprints",                             travel: true, keys: "run fast flee chase escape" },

  // --- Physical ------------------------------------------------------------
  { id: "jump",  label: "Jumping", clip: "Jump_Loop", cat: "Physical", phrase: "jumps",                   loop: false, keys: "leap hop vault" },
  { id: "roll",  label: "Rolling", clip: "Roll",      cat: "Physical", phrase: "rolls across the ground",  loop: false, keys: "dive tumble dodge evade" },
  { id: "dance", label: "Dancing", clip: "Dance_Loop", cat: "Physical", phrase: "dances",                               keys: "party music celebrate" },

  // --- Violence ------------------------------------------------------------
  { id: "punch_jab",      label: "Throws a jab",   clip: "Punch_Jab",   cat: "Violence", phrase: "throws a jab",                loop: false, keys: "fight punch strike hit boxing" },
  { id: "punch_cross",    label: "Throws a cross", clip: "Punch_Cross", cat: "Violence", phrase: "throws a cross",              loop: false, keys: "fight punch strike hit boxing" },
  { id: "take_hit_body",  label: "Takes a body blow", clip: "Hit_Chest", cat: "Violence", phrase: "takes a hit to the chest and reels", loop: false, keys: "hurt struck impact wounded" },
  { id: "take_hit_head",  label: "Takes a head blow", clip: "Hit_Head",  cat: "Violence", phrase: "takes a hit to the head and reels",  loop: false, keys: "hurt struck impact wounded" },
  { id: "collapse",       label: "Collapses",      clip: "Death01",     cat: "Violence", phrase: "collapses to the ground",     loop: false, keys: "fall die death down killed" },

  // --- Firearm -------------------------------------------------------------
  { id: "pistol_hold",     label: "Pistol at their side", clip: "Pistol_Idle_Loop",  cat: "Firearm", phrase: "holds a pistol down at their side",            keys: "gun weapon armed handgun" },
  { id: "pistol_aim",      label: "Aiming a pistol",      clip: "Pistol_Aim_Neutral", cat: "Firearm", phrase: "aims a pistol straight ahead",                keys: "gun weapon armed handgun target" },
  { id: "pistol_aim_up",   label: "Aiming upward",        clip: "Pistol_Aim_Up",     cat: "Firearm", phrase: "aims a pistol upward",                         keys: "gun weapon high above" },
  { id: "pistol_aim_down", label: "Aiming downward",      clip: "Pistol_Aim_Down",   cat: "Firearm", phrase: "aims a pistol downward",                       keys: "gun weapon low ground" },
  { id: "pistol_fire",     label: "Fires",                clip: "Pistol_Shoot",      cat: "Firearm", phrase: "fires the pistol",             loop: false,    keys: "gun shoot shot gunshot" },
  { id: "pistol_reload",   label: "Reloads",              clip: "Pistol_Reload",     cat: "Firearm", phrase: "reloads the pistol",           loop: false,    keys: "gun magazine clip ammo" },

  // --- Blade & magic -------------------------------------------------------
  { id: "sword_ready",  label: "Sword ready",   clip: "Sword_Idle",              cat: "Blade & magic", phrase: "stands ready with a sword",                              keys: "blade weapon fantasy guard" },
  { id: "sword_attack", label: "Sword strike",  clip: "Sword_Attack",            cat: "Blade & magic", phrase: "swings the sword",              loop: false,             keys: "blade weapon fantasy slash attack" },
  { id: "cast_ready",   label: "Gathering a charge", clip: "Spell_Simple_Idle_Loop", cat: "Blade & magic", phrase: "holds a gathering charge in one hand",               keys: "magic spell power glow fantasy" },
  { id: "cast",         label: "Casting",       clip: "Spell_Simple_Shoot",      cat: "Blade & magic", phrase: "releases it forward in a burst", loop: false,            keys: "magic spell power blast fantasy" },

  // --- Water ---------------------------------------------------------------
  { id: "swim",        label: "Swimming",     clip: "Swim_Fwd_Loop",  cat: "Water", phrase: "swims forward", travel: true, keys: "water sea pool river" },
  { id: "tread_water", label: "Treading water", clip: "Swim_Idle_Loop", cat: "Water", phrase: "treads water",              keys: "water sea pool float" },
];

export const ACTION_CATEGORIES = [
  "Stillness", "Dialogue", "Sitting & standing", "Business",
  "Gait", "Physical", "Violence", "Firearm", "Blade & magic", "Water",
];

const BY_ID = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

export function getAction(id) { return id ? BY_ID[id] ?? null : null; }
export function actionClip(id) { return getAction(id)?.clip ?? null; }
export function actionPhrase(id) { return getAction(id)?.phrase ?? null; }
export function actionLabel(id) { return getAction(id)?.label ?? null; }
export function actionPose(id) { return getAction(id)?.pose ?? null; }
export function actionLoops(id) { const a = getAction(id); return a ? a.loop !== false : true; }
export function actionTravels(id) { return !!getAction(id)?.travel; }

// Label, category and keywords all match, so "gun", "dialogue" and "chair"
// each find something without the director knowing the clip names.
export function searchActions(query, category) {
  const q = (query ?? "").trim().toLowerCase();
  return ACTIONS.filter((a) => {
    if (category && a.cat !== category) return false;
    if (!q) return true;
    return `${a.label} ${a.cat} ${a.phrase} ${a.keys ?? ""}`.toLowerCase().includes(q);
  });
}
