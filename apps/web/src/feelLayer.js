const HERO_LENS = {
  lantern_seeker: 'You read the small signs first: scratches, glints, and quiet marks that other travelers might step past.',
  porch_warden: 'You notice thresholds, weight, and whether a place feels safe enough to cross.',
  hill_scout: 'You read the ground for route sense: mud, root, weather, and the safest way forward.',
  memory_bard: 'You hear the story-shape underneath the place, where clues gather like old songs.'
};

const SCENE_MOOD = {
  porch_threshold: {
    mood: 'Rain on old boards, lantern glow under the rail.',
    mystery: 'The first mark was hidden where a traveler would only see it by slowing down.',
    objective: 'Find what the porch is trying to point toward.'
  },
  left_trail: {
    mood: 'Wet roots, soft mud, and a trail that feels recently remembered.',
    mystery: 'The path bends as if someone made it safer after dark.',
    objective: 'Follow the trail without losing the thread.'
  },
  name_gate: {
    mood: 'A narrow gate breathing cold air through its letters.',
    mystery: 'Names matter here, but not every name tells the truth.',
    objective: 'Learn what the gate wants before you offer it anything.'
  },
  rain_library: {
    mood: 'Paper, rainwater, and shelves that remember being trees.',
    mystery: 'The archive files what the hill refuses to forget.',
    objective: 'Find the record that belongs to your route.'
  },
  candle_market: {
    mood: 'Small flames, low voices, and trade done in careful kindness.',
    mystery: 'Every candle here seems to know who last carried it.',
    objective: 'Leave with a useful light and an honest receipt.'
  },
  lantern_window: {
    mood: 'Warm glass, dim reflection, and a square of light watching back.',
    mystery: 'The window remembers more arrivals than departures.',
    objective: 'Read the reflection without mistaking it for the road.'
  }
};

function humanScene(scene) {
  return scene?.title || scene?.id || 'the scene';
}

function heroLens(hero) {
  return HERO_LENS[hero?.id] || 'You steady yourself and look for the kindest truthful sign.';
}

export function sceneAtmosphere(scene, hero) {
  const mood = SCENE_MOOD[scene?.id] || {
    mood: scene?.text || 'The route waits in low lantern light.',
    mystery: 'Something in this place is asking to be noticed carefully.',
    objective: 'Notice what changes, then choose the next honest step.'
  };
  return {
    ...mood,
    lens: heroLens(hero)
  };
}

export function sceneIntro(scene, hero) {
  const mood = sceneAtmosphere(scene, hero);
  return `${mood.mood} ${mood.lens}`;
}

export function rollNarration({ scene, hero, roll, total, dc, success }) {
  const title = humanScene(scene);
  if (success && roll >= 18) {
    return `${title} opens warmly for ${hero?.name || 'you'}: the sign becomes clear, and the lantern-light catches the clue before the rain can hide it.`;
  }
  if (success) {
    return `${hero?.name || 'You'} catches enough of ${title} to move with confidence. The clue does not shout; it simply stays visible when you breathe and look again.`;
  }
  if (roll <= 5) {
    return `${title} resists you for a moment. The mark blurs, the hill feels watchful, and you leave with only a partial truth to carry forward.`;
  }
  return `${hero?.name || 'You'} finds a thread of meaning in ${title}, but not the whole pattern. The route gives a partial clue and asks for patience.`;
}

export function helperNarration(npc, scene) {
  if (!npc) return `No helper steps forward at ${humanScene(scene)}, but the porch creaks once, almost like advice: keep going gently.`;
  const name = npc.title || 'The helper';
  const clue = npc.clue || 'The safest route is usually the one that leaves the least harm behind.';
  return `${name} lowers their voice: "${clue}"`;
}

export function rewardNarration(reward) {
  if (!reward) return 'No reward is ready, but you notice your own hands steady. Sometimes that is the gift the turn offers.';
  const title = reward.title || 'Reward';
  const text = reward.text || 'A small useful thing finds its way into your keeping.';
  return `${title} is found rather than handed over. ${text}`;
}

export function transitionNarration(edge, currentScene, nextScene, hero) {
  const from = humanScene(currentScene);
  const to = humanScene(nextScene) || edge?.to || 'the next place';
  const label = edge?.label || 'the next route';
  if (edge?.condition === 'safe route') {
    return `${hero?.name || 'You'} chooses a safe continuation from ${from}. It is not a perfect map, but ${label} gives the turn somewhere honest to go: ${to}.`;
  }
  return `${hero?.name || 'You'} leaves ${from} by choosing to ${label}. The route carries the lantern toward ${to}.`;
}

export function endingNarration(hero, scene, run) {
  const title = humanScene(scene);
  const count = (run?.visited || []).length;
  return `${hero?.name || 'The traveler'} closes the session at ${title}. ${count} place${count === 1 ? '' : 's'} now live in the receipt, and the porch keeps the rest for next time.`;
}
