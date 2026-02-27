import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ───
const GAME_W = 480;
const GAME_H = 270;
const LANE_COUNT = 3;
const LANE_H = 40;
const LANE_GAP = 2;
const ROAD_BOTTOM = 230;
const SCROLL_SPEED = 1.6;
const GRAVITY = 0.18;
const TOTAL_QUESTIONS = 10;
const FLIP_SPEED = 0.2;
const SPIN_SPEED = 0.15;
const MAX_SPEED_MULTIPLIER = 1.3;
const WHEELIE_SPEED = 0.015;
const WHEELIE_MAX = 0.55;
const WHEELIE_CRASH = 0.85;
const LAND_PERFECT = 0.25;
const LAND_OK = 0.8;

function getDynamicSpeed(questionIndex, totalQuestions, baseSpeed, maxMultiplier) {
  const t = totalQuestions <= 1 ? 0 : questionIndex / (totalQuestions - 1);
  return baseSpeed * (1 + (maxMultiplier - 1) * t);
}

function laneCenter(lane) {
  return ROAD_BOTTOM - lane * (LANE_H + LANE_GAP) - LANE_H / 2;
}
function laneTop(lane) {
  return ROAD_BOTTOM - lane * (LANE_H + LANE_GAP) - LANE_H;
}

// ─── COLOR PALETTE ───
const PAL = {
  sky: "#6888ff", skyLight: "#88a8ff",
  ground: "#c84c0c", groundDark: "#a03000",
  road: "#c0a060", roadAlt: "#b89858", roadLine: "#f8d878", roadBorder: "#806030",
  bike: "#e40058", bikeDark: "#a00030",
  wheel: "#222", wheelSpoke: "#888",
  rider: "#fcfcfc", riderDark: "#b0b0b0",
  helmet: "#2038ec", helmetVisor: "#00e8d8",
  ramp: "#f8a800", rampDark: "#c87800",
  rampCorrect: "#00a800", rampWrong: "#e40058",
  jumpRamp: "#f8d800", jumpRampDark: "#c8a800",
  text: "#fcfcfc", textShadow: "#222",
  hud: "#222", hudBorder: "#fcfcfc",
  star: "#f8d800", dust: "#d8b068", explosion: "#f87858",
  laneHighlight: "rgba(255,255,255,0.12)",
  answerBox: "#2850a8", answerBoxBorder: "#4878d8",
  cone: "#f85800", coneDark: "#c04000", coneStripe: "#fcfcfc",
  barrel: "#4878a8", barrelDark: "#305878", barrelBand: "#88b8e8",
  bump: "#d8a850", bumpDark: "#b08838",
  perfect: "#00ff88", ok: "#f8d800",
  progressBg: "#333", progressFill: "#00c8d8", progressBorder: "#fcfcfc",
  spelling: "#f8a800",
  vocab: "#00c8d8",
};

// ─── WORD BANK ───
// 30 words per grade, arranged easiest→hardest.
// Tiers: index 0–9 = early, 10–19 = mid, 20–29 = late.
// Each entry: { word, definition (≤25 chars), spellingPrompt }
const WORD_BANK = {
  1: [
    // ── Early ──
    { word: "cat",   definition: "a pet that meows",       spellingPrompt: "Spell: furry pet, meows" },
    { word: "dog",   definition: "a pet that barks",       spellingPrompt: "Spell: loyal pet, barks" },
    { word: "sun",   definition: "bright star in the sky", spellingPrompt: "Spell: shines by day" },
    { word: "hat",   definition: "worn on your head",      spellingPrompt: "Spell: sits on your head" },
    { word: "run",   definition: "move fast on foot",      spellingPrompt: "Spell: fast movement on foot" },
    { word: "big",   definition: "large in size",          spellingPrompt: "Spell: the opposite of small" },
    { word: "sit",   definition: "rest on a seat",         spellingPrompt: "Spell: rest on a chair" },
    { word: "cup",   definition: "you drink from it",      spellingPrompt: "Spell: used for drinking" },
    { word: "bed",   definition: "you sleep in it",        spellingPrompt: "Spell: where you sleep" },
    { word: "hop",   definition: "jump on one foot",       spellingPrompt: "Spell: jump on one leg" },
    // ── Mid ──
    { word: "jump",  definition: "leap into the air",      spellingPrompt: "Spell: leap up high" },
    { word: "frog",  definition: "green animal that hops", spellingPrompt: "Spell: green, hops, croaks" },
    { word: "swim",  definition: "move through water",     spellingPrompt: "Spell: move in water" },
    { word: "clap",  definition: "hit hands together",     spellingPrompt: "Spell: hands clap together" },
    { word: "drip",  definition: "a slow drop of water",   spellingPrompt: "Spell: water falls slowly" },
    { word: "grin",  definition: "a big smile",            spellingPrompt: "Spell: a big happy smile" },
    { word: "plan",  definition: "an idea for action",     spellingPrompt: "Spell: a list of ideas" },
    { word: "star",  definition: "twinkles in night sky",  spellingPrompt: "Spell: twinkles at night" },
    { word: "trip",  definition: "a journey somewhere",    spellingPrompt: "Spell: a short journey" },
    { word: "slip",  definition: "slide and nearly fall",  spellingPrompt: "Spell: nearly fall over" },
    // ── Late ──
    { word: "plant", definition: "a living thing that grows", spellingPrompt: "Spell: grows in soil" },
    { word: "seven", definition: "the number 7",           spellingPrompt: "Spell: the number 7" },
    { word: "three", definition: "the number 3",           spellingPrompt: "Spell: the number 3" },
    { word: "black", definition: "a very dark colour",     spellingPrompt: "Spell: darkest colour" },
    { word: "green", definition: "colour of grass",        spellingPrompt: "Spell: colour of grass" },
    { word: "cloud", definition: "white puffs in the sky", spellingPrompt: "Spell: fluffy, in the sky" },
    { word: "bring", definition: "carry something here",   spellingPrompt: "Spell: carry to here" },
    { word: "drink", definition: "swallow a liquid",       spellingPrompt: "Spell: swallow a liquid" },
    { word: "floor", definition: "the ground indoors",     spellingPrompt: "Spell: you walk on it inside" },
    { word: "grass", definition: "green ground cover",     spellingPrompt: "Spell: green on lawns" },
  ],
  2: [
    // ── Early ──
    { word: "ship",  definition: "a large sea vessel",     spellingPrompt: "Spell: a large boat" },
    { word: "chin",  definition: "below your mouth",       spellingPrompt: "Spell: below your mouth" },
    { word: "thin",  definition: "not thick or fat",       spellingPrompt: "Spell: not thick or fat" },
    { word: "wish",  definition: "hope for something",     spellingPrompt: "Spell: hope for something" },
    { word: "fish",  definition: "an animal that swims",   spellingPrompt: "Spell: swims in the sea" },
    { word: "dish",  definition: "a plate or bowl",        spellingPrompt: "Spell: holds your food" },
    { word: "with",  definition: "together or using",      spellingPrompt: "Spell: together alongside" },
    { word: "that",  definition: "points to something",    spellingPrompt: "Spell: points at something" },
    { word: "then",  definition: "next, after that",       spellingPrompt: "Spell: what happens after" },
    { word: "when",  definition: "at what time",           spellingPrompt: "Spell: at what time?" },
    // ── Mid ──
    { word: "brush", definition: "tool to clean or paint", spellingPrompt: "Spell: paints or cleans" },
    { word: "crash", definition: "a loud smash",           spellingPrompt: "Spell: a big smash sound" },
    { word: "frost", definition: "thin ice on cold days",  spellingPrompt: "Spell: thin ice outside" },
    { word: "trust", definition: "believe in someone",     spellingPrompt: "Spell: believe in someone" },
    { word: "blend", definition: "mix together smoothly",  spellingPrompt: "Spell: mix together" },
    { word: "gleam", definition: "shine brightly",         spellingPrompt: "Spell: shines brightly" },
    { word: "groan", definition: "a deep unhappy sound",   spellingPrompt: "Spell: unhappy deep sound" },
    { word: "sleek", definition: "smooth and shiny",       spellingPrompt: "Spell: smooth and shiny" },
    { word: "snack", definition: "a small meal",           spellingPrompt: "Spell: a small bite to eat" },
    { word: "clamp", definition: "a grip to hold tight",   spellingPrompt: "Spell: holds things tight" },
    // ── Late ──
    { word: "steam", definition: "hot water as a gas",     spellingPrompt: "Spell: hot water vapour" },
    { word: "stone", definition: "a hard piece of rock",   spellingPrompt: "Spell: a hard rock piece" },
    { word: "swing", definition: "move back and forth",    spellingPrompt: "Spell: moves back and forth" },
    { word: "train", definition: "rides on train tracks",  spellingPrompt: "Spell: rides on tracks" },
    { word: "trail", definition: "a path through nature",  spellingPrompt: "Spell: a path in nature" },
    { word: "twist", definition: "turn around and around", spellingPrompt: "Spell: turn around a lot" },
    { word: "visit", definition: "go to see someone",      spellingPrompt: "Spell: go see someone" },
    { word: "voice", definition: "the sound of speech",    spellingPrompt: "Spell: your speaking sound" },
    { word: "wheat", definition: "grain used for bread",   spellingPrompt: "Spell: grain for bread" },
    { word: "white", definition: "the colour of snow",     spellingPrompt: "Spell: colour of snow" },
  ],
  3: [
    // ── Early ──
    { word: "basket", definition: "woven container with handle", spellingPrompt: "Spell: woven carry container" },
    { word: "carpet", definition: "soft indoor floor cover", spellingPrompt: "Spell: soft floor covering" },
    { word: "garden", definition: "where plants are grown", spellingPrompt: "Spell: outdoor growing space" },
    { word: "jacket", definition: "a short outdoor coat",  spellingPrompt: "Spell: a short coat" },
    { word: "market", definition: "a place to buy food",   spellingPrompt: "Spell: buy and sell here" },
    { word: "napkin", definition: "cloth for wiping mouth", spellingPrompt: "Spell: wipe mouth at dinner" },
    { word: "picnic", definition: "eating a meal outside", spellingPrompt: "Spell: lunch outside" },
    { word: "rabbit", definition: "small furry hopping animal", spellingPrompt: "Spell: hops, long ears" },
    { word: "saddle", definition: "seat on a horse",       spellingPrompt: "Spell: horse rider's seat" },
    { word: "button", definition: "fastens clothes together", spellingPrompt: "Spell: closes a shirt" },
    // ── Mid ──
    { word: "castle", definition: "a large stone fortress", spellingPrompt: "Spell: a stone fortress" },
    { word: "cattle", definition: "farm cows and bulls",   spellingPrompt: "Spell: cows on a farm" },
    { word: "circle", definition: "a perfectly round shape", spellingPrompt: "Spell: perfectly round" },
    { word: "danger", definition: "risk of being hurt",    spellingPrompt: "Spell: risk of getting hurt" },
    { word: "family", definition: "parents and children",  spellingPrompt: "Spell: parents and children" },
    { word: "finger", definition: "one of five on a hand", spellingPrompt: "Spell: on your hand, five of" },
    { word: "flower", definition: "colourful plant bloom", spellingPrompt: "Spell: bloom on a plant" },
    { word: "future", definition: "time that hasn't happened", spellingPrompt: "Spell: time ahead of us" },
    { word: "jungle", definition: "a thick tropical forest", spellingPrompt: "Spell: dense tropical forest" },
    { word: "kitten", definition: "a baby cat",            spellingPrompt: "Spell: a baby cat" },
    // ── Late ──
    { word: "meadow", definition: "a grassy open field",   spellingPrompt: "Spell: grassy open field" },
    { word: "middle", definition: "the centre of something", spellingPrompt: "Spell: the centre point" },
    { word: "muscle", definition: "makes your body move",  spellingPrompt: "Spell: powers your body" },
    { word: "normal", definition: "usual or ordinary",     spellingPrompt: "Spell: usual and ordinary" },
    { word: "number", definition: "used for counting",     spellingPrompt: "Spell: used in maths" },
    { word: "simple", definition: "easy to understand",    spellingPrompt: "Spell: easy, not complex" },
    { word: "temple", definition: "a place of worship",    spellingPrompt: "Spell: place for worship" },
    { word: "battle", definition: "a fight between armies", spellingPrompt: "Spell: armies fighting" },
    { word: "needle", definition: "used for sewing",       spellingPrompt: "Spell: sews with thread" },
    { word: "puddle", definition: "a small pool of water", spellingPrompt: "Spell: small water on road" },
  ],
  4: [
    // ── Early ──
    { word: "captain",  definition: "leader of a team",     spellingPrompt: "Spell: leads a team" },
    { word: "charity",  definition: "helping those in need", spellingPrompt: "Spell: giving help to others" },
    { word: "climate",  definition: "usual weather of a region", spellingPrompt: "Spell: a region's weather" },
    { word: "compete",  definition: "take part in a contest", spellingPrompt: "Spell: contest to win" },
    { word: "conduct",  definition: "behave in a certain way", spellingPrompt: "Spell: how you behave" },
    { word: "contact",  definition: "get in touch with someone", spellingPrompt: "Spell: reach out to someone" },
    { word: "control",  definition: "power over something", spellingPrompt: "Spell: power over something" },
    { word: "courage",  definition: "bravery in hard times", spellingPrompt: "Spell: bravery in danger" },
    { word: "culture",  definition: "customs of a group",   spellingPrompt: "Spell: customs of a people" },
    { word: "defense",  definition: "protection from attack", spellingPrompt: "Spell: guard from attack" },
    // ── Mid ──
    { word: "deliver",  definition: "bring to someone",      spellingPrompt: "Spell: bring to your door" },
    { word: "display",  definition: "show to others",        spellingPrompt: "Spell: show for others to see" },
    { word: "emotion",  definition: "a feeling like joy",    spellingPrompt: "Spell: a feeling or mood" },
    { word: "examine",  definition: "look at very carefully", spellingPrompt: "Spell: look at carefully" },
    { word: "explore",  definition: "travel to discover",    spellingPrompt: "Spell: go and discover" },
    { word: "failure",  definition: "not succeeding",        spellingPrompt: "Spell: not succeeding" },
    { word: "feature",  definition: "an important part",     spellingPrompt: "Spell: important part of it" },
    { word: "fiction",  definition: "made-up stories",       spellingPrompt: "Spell: made-up stories" },
    { word: "freedom",  definition: "ability to choose",     spellingPrompt: "Spell: free to choose" },
    { word: "harvest",  definition: "gather farm crops",     spellingPrompt: "Spell: collect farm crops" },
    // ── Late ──
    { word: "imagine",  definition: "picture in your mind",  spellingPrompt: "Spell: picture in your mind" },
    { word: "improve",  definition: "make something better", spellingPrompt: "Spell: make better" },
    { word: "justice",  definition: "fair treatment for all", spellingPrompt: "Spell: fair and equal" },
    { word: "journey",  definition: "a long trip",           spellingPrompt: "Spell: a long travel trip" },
    { word: "leisure",  definition: "free time to enjoy",    spellingPrompt: "Spell: free and fun time" },
    { word: "liberty",  definition: "freedom to live freely", spellingPrompt: "Spell: freedom to be free" },
    { word: "loyalty",  definition: "being faithful",        spellingPrompt: "Spell: faithful to friends" },
    { word: "minimum",  definition: "the smallest amount",   spellingPrompt: "Spell: the least amount" },
    { word: "opinion",  definition: "what you personally think", spellingPrompt: "Spell: what you think" },
    { word: "passion",  definition: "a very strong feeling", spellingPrompt: "Spell: very strong feeling" },
  ],
  5: [
    // ── Early ──
    { word: "absolute",  definition: "complete, with no limits", spellingPrompt: "Spell: total and complete" },
    { word: "adequate",  definition: "just enough",           spellingPrompt: "Spell: just good enough" },
    { word: "ambition",  definition: "strong desire to succeed", spellingPrompt: "Spell: wish to succeed" },
    { word: "analysis",  definition: "study in close detail", spellingPrompt: "Spell: study in detail" },
    { word: "appetite",  definition: "desire to eat or gain", spellingPrompt: "Spell: hunger for food" },
    { word: "approval",  definition: "saying yes or accepting", spellingPrompt: "Spell: agreement or consent" },
    { word: "argument",  definition: "a verbal disagreement", spellingPrompt: "Spell: verbal disagreement" },
    { word: "audience",  definition: "people watching a show", spellingPrompt: "Spell: watchers at a show" },
    { word: "boundary",  definition: "a line marking the edge", spellingPrompt: "Spell: marks an edge" },
    { word: "campaign",  definition: "organised effort for a goal", spellingPrompt: "Spell: organised group effort" },
    // ── Mid ──
    { word: "cautious",  definition: "careful to avoid risk", spellingPrompt: "Spell: careful about dangers" },
    { word: "coherent",  definition: "logical and clear",     spellingPrompt: "Spell: logical and clear" },
    { word: "collapse",  definition: "fall down suddenly",    spellingPrompt: "Spell: fall down suddenly" },
    { word: "commence",  definition: "begin or start",        spellingPrompt: "Spell: to begin something" },
    { word: "compound",  definition: "made of multiple parts", spellingPrompt: "Spell: made of many parts" },
    { word: "conflict",  definition: "a clash or struggle",   spellingPrompt: "Spell: a struggle or clash" },
    { word: "convince",  definition: "make someone believe",  spellingPrompt: "Spell: make someone believe" },
    { word: "creation",  definition: "something made",        spellingPrompt: "Spell: something you make" },
    { word: "critical",  definition: "very important",        spellingPrompt: "Spell: very important" },
    { word: "deadline",  definition: "must finish by this time", spellingPrompt: "Spell: finish-by time" },
    // ── Late ──
    { word: "describe",  definition: "give details about",    spellingPrompt: "Spell: explain in detail" },
    { word: "dialogue",  definition: "conversation between people", spellingPrompt: "Spell: people talking" },
    { word: "diplomat",  definition: "country's ambassador",  spellingPrompt: "Spell: country ambassador" },
    { word: "disaster",  definition: "a terrible event",      spellingPrompt: "Spell: a terrible event" },
    { word: "dominant",  definition: "most powerful",         spellingPrompt: "Spell: most powerful one" },
    { word: "dramatic",  definition: "exciting and intense",  spellingPrompt: "Spell: exciting and intense" },
    { word: "educated",  definition: "learned from school",   spellingPrompt: "Spell: learned and schooled" },
    { word: "evidence",  definition: "proof of something",    spellingPrompt: "Spell: proof of a claim" },
    { word: "explicit",  definition: "very clear and stated", spellingPrompt: "Spell: very clear and stated" },
    { word: "equality",  definition: "fair for everyone",     spellingPrompt: "Spell: equal for everyone" },
  ],
  6: [
    // ── Early ──
    { word: "abundance",     definition: "a very large amount",  spellingPrompt: "Spell: a large amount" },
    { word: "anonymous",     definition: "with no known name",   spellingPrompt: "Spell: name unknown" },
    { word: "anticipate",    definition: "expect ahead of time", spellingPrompt: "Spell: expect something" },
    { word: "appreciate",    definition: "grateful for something", spellingPrompt: "Spell: be thankful for" },
    { word: "assessment",    definition: "a test or evaluation", spellingPrompt: "Spell: a test result" },
    { word: "atmosphere",    definition: "air around the Earth", spellingPrompt: "Spell: air around Earth" },
    { word: "beneficial",    definition: "helpful and good",     spellingPrompt: "Spell: helpful and good" },
    { word: "capability",    definition: "ability to do a task", spellingPrompt: "Spell: ability to do it" },
    { word: "causation",     definition: "what makes things happen", spellingPrompt: "Spell: what causes effects" },
    { word: "collaborate",   definition: "work as a team",       spellingPrompt: "Spell: work together" },
    // ── Mid ──
    { word: "commemorate",   definition: "honour a past event",  spellingPrompt: "Spell: honour the past" },
    { word: "complexity",    definition: "being complicated",    spellingPrompt: "Spell: being complicated" },
    { word: "comprehend",    definition: "fully understand",     spellingPrompt: "Spell: fully understand" },
    { word: "consequence",   definition: "result of an action",  spellingPrompt: "Spell: result of actions" },
    { word: "conventional",  definition: "follows traditions",   spellingPrompt: "Spell: follows tradition" },
    { word: "cooperation",   definition: "working together",     spellingPrompt: "Spell: working together" },
    { word: "declaration",   definition: "an official statement", spellingPrompt: "Spell: official statement" },
    { word: "demonstrate",   definition: "show how it is done",  spellingPrompt: "Spell: show how it's done" },
    { word: "distribution",  definition: "sharing things out",   spellingPrompt: "Spell: sharing things out" },
    { word: "elimination",   definition: "remove completely",    spellingPrompt: "Spell: remove completely" },
    // ── Late ──
    { word: "exaggerate",    definition: "make it seem bigger",  spellingPrompt: "Spell: overstate something" },
    { word: "fundamental",   definition: "basic and essential",  spellingPrompt: "Spell: basic and essential" },
    { word: "generosity",    definition: "giving freely to others", spellingPrompt: "Spell: giving freely" },
    { word: "hypothetical",  definition: "imagined, not real",   spellingPrompt: "Spell: imagined not real" },
    { word: "implication",   definition: "what it suggests",     spellingPrompt: "Spell: what it suggests" },
    { word: "independence",  definition: "free from control",    spellingPrompt: "Spell: free from control" },
    { word: "infrastructure", definition: "country's basic systems", spellingPrompt: "Spell: basic systems" },
    { word: "interpretation", definition: "explain the meaning", spellingPrompt: "Spell: explain the meaning" },
    { word: "justification", definition: "a reason for doing it", spellingPrompt: "Spell: reason for an action" },
    { word: "legislation",   definition: "laws made by government", spellingPrompt: "Spell: laws of the land" },
  ],
};

// ─── WORD QUESTION GENERATOR ───
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build per-session word tiers from the grade's word bank.
// Returns { early, mid, late, earlyIdx, midIdx, lateIdx }
function buildWordTiers(grade) {
  const all = WORD_BANK[grade] || WORD_BANK[1];
  const tierSize = Math.floor(all.length / 3);
  return {
    early: shuffleArr(all.slice(0, tierSize)),
    mid:   shuffleArr(all.slice(tierSize, tierSize * 2)),
    late:  shuffleArr(all.slice(tierSize * 2)),
    earlyIdx: 0, midIdx: 0, lateIdx: 0,
  };
}

// Pick a question from the shuffled tiers.
// 50/50 spelling vs vocabulary.
function genLinguaQuestion(grade, questionIndex, wordTiers) {
  const phase = questionIndex < 3 ? "early" : questionIndex < 6 ? "mid" : "late";
  const idxKey = phase + "Idx";
  const tier = wordTiers[phase];
  const wordEntry = tier[wordTiers[idxKey] % tier.length];
  wordTiers[idxKey]++;

  const allWords = WORD_BANK[grade] || WORD_BANK[1];
  const others = allWords.filter(w => w.word !== wordEntry.word);
  const wrongPool = shuffleArr(others);

  const isSpelling = Math.random() < 0.5;

  if (isSpelling) {
    const wrongWords = wrongPool.slice(0, 2).map(w => w.word);
    const options = shuffleArr([wordEntry.word, ...wrongWords]);
    return {
      question: wordEntry.spellingPrompt,
      answer: wordEntry.word,
      options,
      questionType: "SPELLING",
    };
  } else {
    const wrongDefs = wrongPool.slice(0, 2).map(w => w.definition);
    const options = shuffleArr([wordEntry.definition, ...wrongDefs]);
    return {
      question: wordEntry.word.toUpperCase(),
      answer: wordEntry.definition,
      options,
      questionType: "VOCAB",
    };
  }
}

// ─── SOUND ENGINE ───
class SoundEngine {
  constructor() { this.ctx = null; this.initialized = false; }
  init() {
    if (this.initialized) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.initialized = true; } catch(e) {}
  }
  play(type) {
    if (!this.ctx) return;
    try { switch (type) {
      case "jump":     this._sweep(300,800,0.15,"square",0.12); break;
      case "correct":  this._note(523,0.08,"square",0.1); this._note(659,0.08,"square",0.1,0.1); this._note(784,0.12,"square",0.1,0.2); break;
      case "wrong":    this._note(200,0.15,"sawtooth",0.12); this._note(150,0.25,"sawtooth",0.12,0.15); break;
      case "crash":    this._noise(0.3,0.15); this._note(100,0.3,"sawtooth",0.08); break;
      case "trick":    this._sweep(500,1200,0.1,"square",0.08); break;
      case "land":     this._note(150,0.08,"triangle",0.1); this._noise(0.08,0.06); break;
      case "perfect":  this._note(523,0.08,"square",0.1); this._note(659,0.08,"square",0.1,0.08); this._note(784,0.08,"square",0.1,0.16); this._note(1047,0.15,"square",0.1,0.24); break;
      case "select":   this._note(440,0.06,"square",0.08); break;
      case "win":      for(let i=0;i<6;i++) this._note(523+i*60,0.1,"square",0.08,i*0.12); break;
      case "gameover": for(let i=0;i<4;i++) this._note(400-i*60,0.2,"sawtooth",0.08,i*0.2); break;
      case "engine":   this._note(80+Math.random()*20,0.05,"sawtooth",0.02); break;
      case "wheelie":  this._note(200,0.04,"square",0.03); break;
      case "bounce":   this._note(180,0.06,"triangle",0.06); break;
    }} catch(e) {}
  }
  _note(f,d,t,v,delay=0) { const o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.type=t; o.frequency.value=f; g.gain.setValueAtTime(v,this.ctx.currentTime+delay); g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+delay+d); o.connect(g); g.connect(this.ctx.destination); o.start(this.ctx.currentTime+delay); o.stop(this.ctx.currentTime+delay+d+0.05); }
  _sweep(f1,f2,d,t,v) { const o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.type=t; o.frequency.setValueAtTime(f1,this.ctx.currentTime); o.frequency.linearRampToValueAtTime(f2,this.ctx.currentTime+d); g.gain.setValueAtTime(v,this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+d); o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime+d+0.05); }
  _noise(d,v) { const b=this.ctx.createBuffer(1,this.ctx.sampleRate*d,this.ctx.sampleRate),data=b.getChannelData(0); for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1; const s=this.ctx.createBufferSource(),g=this.ctx.createGain(); s.buffer=b; g.gain.setValueAtTime(v,this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+d); s.connect(g); g.connect(this.ctx.destination); s.start(); }
}

// ─── DRAWING HELPERS ───
function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawBike(ctx, x, y, rotation = 0, crashed = false, wheelie = 0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const totalRot = rotation + wheelie;
  if (totalRot) ctx.rotate(totalRot);
  if (crashed) {
    drawPixelRect(ctx, -12, -2, 24, 4, PAL.bikeDark);
    drawPixelRect(ctx, -16, 2, 8, 8, PAL.wheel);
    drawPixelRect(ctx, 10, 4, 8, 8, PAL.wheel);
    drawPixelRect(ctx, -4, -14, 8, 8, PAL.helmet);
    drawPixelRect(ctx, -2, -6, 6, 6, PAL.riderDark);
  } else {
    drawPixelRect(ctx, -18, 4, 10, 10, PAL.wheel);
    drawPixelRect(ctx, 10, 4, 10, 10, PAL.wheel);
    drawPixelRect(ctx, -16, 6, 6, 6, PAL.wheelSpoke);
    drawPixelRect(ctx, 12, 6, 6, 6, PAL.wheelSpoke);
    drawPixelRect(ctx, -14, 0, 30, 6, PAL.bike);
    drawPixelRect(ctx, -10, -4, 22, 4, PAL.bike);
    drawPixelRect(ctx, 10, -8, 4, 6, PAL.bikeDark);
    drawPixelRect(ctx, -6, 2, 8, 4, PAL.bikeDark);
    drawPixelRect(ctx, -18, 0, 6, 3, "#888");
    drawPixelRect(ctx, -2, -16, 8, 12, PAL.rider);
    drawPixelRect(ctx, 0, -14, 4, 8, PAL.riderDark);
    drawPixelRect(ctx, 6, -12, 6, 3, PAL.rider);
    drawPixelRect(ctx, -2, -22, 10, 8, PAL.helmet);
    drawPixelRect(ctx, 6, -20, 4, 4, PAL.helmetVisor);
    drawPixelRect(ctx, -4, -4, 4, 6, PAL.rider);
    drawPixelRect(ctx, 4, -4, 4, 6, PAL.rider);
  }
  ctx.restore();
}

// Answer sign with auto-scaling font and 2-line wrap for longer text
function drawAnswerSign(ctx, x, cy, w, h, label, isActive, isHit, isCorrect) {
  const top = cy - h / 2;
  drawPixelRect(ctx, x + 3, top + 3, w, h, "rgba(0,0,0,0.3)");
  const bg = isHit ? (isCorrect ? PAL.rampCorrect : PAL.rampWrong) : PAL.answerBox;
  drawPixelRect(ctx, x, top, w, h, bg);
  ctx.strokeStyle = isActive ? PAL.star : PAL.answerBoxBorder;
  ctx.lineWidth = isActive ? 3 : 1;
  ctx.strokeRect(x + 0.5, top + 0.5, w - 1, h - 1);
  if (isActive && !isHit) {
    drawPixelRect(ctx, x + 2, top + 2, w - 4, 3, "rgba(255,255,255,0.3)");
    ctx.fillStyle = PAL.star;
    ctx.beginPath(); ctx.moveTo(x-8,cy); ctx.lineTo(x-2,cy-5); ctx.lineTo(x-2,cy+5); ctx.closePath(); ctx.fill();
  }
  if (label !== undefined) {
    const str = String(label);
    const fontSize = str.length > 20 ? 6 : str.length > 12 ? 7 : 11;
    ctx.fillStyle = PAL.text; ctx.strokeStyle = PAL.textShadow; ctx.lineWidth = 2;
    ctx.font = `bold ${fontSize}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";

    if (str.length > 14) {
      // Wrap into 2 lines: split near middle at a space
      const mid = Math.floor(str.length / 2);
      let splitIdx = str.lastIndexOf(" ", mid);
      if (splitIdx < 1) splitIdx = str.indexOf(" ", mid);
      if (splitIdx < 1) splitIdx = mid;
      const line1 = str.slice(0, splitIdx).trim();
      const line2 = str.slice(splitIdx).trim();
      const lh = fontSize + 1;
      ctx.strokeText(line1, x + w/2, cy - lh/2 + 1); ctx.fillText(line1, x + w/2, cy - lh/2);
      ctx.strokeText(line2, x + w/2, cy + lh/2 + 1); ctx.fillText(line2, x + w/2, cy + lh/2);
    } else {
      ctx.strokeText(str, x + w/2, cy + 1); ctx.fillText(str, x + w/2, cy);
    }
    ctx.textBaseline = "alphabetic";
  }
}

function drawJumpRamp(ctx, x, cy, w, h) {
  const bottom = cy + h/2, top = cy - h/2;
  ctx.fillStyle = PAL.jumpRamp;
  ctx.beginPath(); ctx.moveTo(x,bottom); ctx.lineTo(x+w*0.8,top); ctx.lineTo(x+w,top+h*0.3); ctx.lineTo(x+w,bottom); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.jumpRampDark;
  ctx.beginPath(); ctx.moveTo(x+w*0.8,top); ctx.lineTo(x+w,top+h*0.3); ctx.lineTo(x+w,bottom); ctx.lineTo(x+w*0.8,bottom); ctx.closePath(); ctx.fill();
  for (let i=0;i<3;i++) { const sx=x+6+i*10, progress=(sx-x)/(w*0.8), sy=bottom-progress*h; drawPixelRect(ctx,sx,sy,4,Math.max(4,progress*h*0.5),PAL.rampDark); }
  ctx.fillStyle = PAL.text; ctx.font = "bold 10px monospace"; ctx.textAlign = "center"; ctx.fillText("JUMP!", x+w/2, cy+2);
}

function drawObstacle(ctx, x, cy, type) {
  switch (type) {
    case "cone":
      drawPixelRect(ctx,x+2,cy+6,12,4,PAL.coneDark);
      ctx.fillStyle=PAL.cone; ctx.beginPath(); ctx.moveTo(x+3,cy+6); ctx.lineTo(x+8,cy-8); ctx.lineTo(x+13,cy+6); ctx.closePath(); ctx.fill();
      drawPixelRect(ctx,x+5,cy-2,6,2,PAL.coneStripe); break;
    case "barrel":
      drawPixelRect(ctx,x,cy-6,16,16,PAL.barrel); drawPixelRect(ctx,x+1,cy-5,14,2,PAL.barrelBand);
      drawPixelRect(ctx,x+1,cy+3,14,2,PAL.barrelBand); drawPixelRect(ctx,x+2,cy-2,12,6,PAL.barrelDark); break;
    case "bump":
      ctx.fillStyle=PAL.bump; ctx.beginPath(); ctx.moveTo(x,cy+8); ctx.quadraticCurveTo(x+16,cy-6,x+32,cy+8); ctx.closePath(); ctx.fill();
      ctx.fillStyle=PAL.bumpDark; ctx.beginPath(); ctx.moveTo(x+4,cy+8); ctx.quadraticCurveTo(x+16,cy-2,x+28,cy+8); ctx.closePath(); ctx.fill();
      drawPixelRect(ctx,x+8,cy+1,3,3,PAL.star); drawPixelRect(ctx,x+18,cy+1,3,3,PAL.star); break;
    case "double_bump":
      for (let b=0;b<2;b++) { const bx=x+b*28;
        ctx.fillStyle=PAL.bump; ctx.beginPath(); ctx.moveTo(bx,cy+8); ctx.quadraticCurveTo(bx+12,cy-5,bx+24,cy+8); ctx.closePath(); ctx.fill();
        ctx.fillStyle=PAL.bumpDark; ctx.beginPath(); ctx.moveTo(bx+3,cy+8); ctx.quadraticCurveTo(bx+12,cy-1,bx+21,cy+8); ctx.closePath(); ctx.fill();
        drawPixelRect(ctx,bx+8,cy+2,3,2,PAL.star); } break;
    case "tires":
      for (let t=0;t<2;t++) { const ty=cy+2-t*10;
        drawPixelRect(ctx,x+1,ty,14,10,PAL.wheel); drawPixelRect(ctx,x+3,ty+2,10,6,"#444"); drawPixelRect(ctx,x+5,ty+3,6,4,"#666"); } break;
  }
}

function generateObstacles(worldXStart, worldXEnd) {
  const obstacles = [];
  const types = ["cone","barrel","bump","double_bump","tires"];
  const count = 2 + Math.floor(Math.random()*3);
  for (let i=0; i<count; i++) {
    const spacing = (worldXEnd - worldXStart) / (count+1);
    obstacles.push({
      worldX: worldXStart + spacing*(i+1) + (Math.random()-0.5)*30,
      lane: Math.floor(Math.random()*LANE_COUNT),
      type: types[Math.floor(Math.random()*types.length)],
      width: 32, hit: false,
    });
  }
  return obstacles;
}

function drawText(ctx, text, x, y, size=16, color=PAL.text, align="center") {
  ctx.font = `bold ${size}px monospace`; ctx.textAlign = align;
  ctx.fillStyle = PAL.textShadow; ctx.fillText(text, x+1, y+1);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

// ─── PARTICLE SYSTEM ───
class Particles {
  constructor() { this.items = []; }
  emit(x, y, count, color, speedMul=1) {
    for (let i=0; i<count; i++) this.items.push({
      x, y, vx:(Math.random()-0.5)*4*speedMul, vy:-Math.random()*3*speedMul-1,
      life:20+Math.random()*20, maxLife:40, color, size:2+Math.random()*3
    });
  }
  update() { this.items = this.items.filter(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life--; return p.life>0; }); }
  draw(ctx) { this.items.forEach(p => { ctx.globalAlpha=p.life/p.maxLife; drawPixelRect(ctx,p.x,p.y,p.size,p.size,p.color); }); ctx.globalAlpha=1; }
}

// ─── MAIN COMPONENT ───
export default function MotoLingoGame() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const gameState = useRef(null);
  const keysRef = useRef({});
  const touchRef = useRef({ up:false, down:false, left:false, right:false });
  const soundRef = useRef(new SoundEngine());
  const animRef = useRef(null);
  const engineTimerRef = useRef(0);
  const wordListRef = useRef(null);
  const [screen, setScreen] = useState("title");
  const [grade, setGrade] = useState(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const s = Math.min(containerRef.current.clientWidth / GAME_W, containerRef.current.clientHeight / GAME_H);
      setScale(Math.max(1, Math.floor(s)) || 1);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const down = (e) => {
      if (e.key === "Escape") {
        setScreen(prev => prev === "playing" ? "paused" : prev === "paused" ? "playing" : prev);
        return;
      }
      keysRef.current[e.key] = true;
    };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  function createAnswerSigns(problem, worldX) {
    return problem.options.map((opt, i) => ({
      worldX, lane: i, value: opt, correct: opt === problem.answer,
      width: 90, height: 36, hit: false,
    }));
  }

  const startGame = useCallback((selectedGrade) => {
    soundRef.current.init();
    soundRef.current.play("select");
    setGrade(selectedGrade);

    // Build shuffled word tiers for this session
    wordListRef.current = buildWordTiers(selectedGrade);

    const problem = genLinguaQuestion(selectedGrade, 0, wordListRef.current);
    gameState.current = {
      currentSpeed: getDynamicSpeed(0, TOTAL_QUESTIONS, SCROLL_SPEED, MAX_SPEED_MULTIPLIER),
      bikeX: 80, bikeY: laneCenter(1), lane: 1, targetLane: 1,
      vy: 0, airborne: false, rotation: 0,
      wheelieAngle: 0, doingWheelie: false,
      spinCount: 0, flipCount: 0, trickPoints: 0,
      crashed: false, crashTimer: 0, invincible: 0,
      scrollX: 0, particles: new Particles(),
      score: 0, lives: 3, combo: 1,
      questionsAnswered: 0, grade: selectedGrade,
      currentProblem: problem,
      answerSigns: createAnswerSigns(problem, 400),
      answeredThisRound: false, questionDelay: 0,
      jumpRamp: null, waitingForJump: false, lastQuestion: false,
      obstacles: [],
      dustTimer: 0, trickDisplay: "", trickDisplayTimer: 0,
    };
    setScreen("playing");
  }, []);

  // ─── GAME LOOP ───
  useEffect(() => {
    if (screen !== "playing") {
      if (animRef.current && screen === "paused") cancelAnimationFrame(animRef.current);
      if (screen !== "playing" && screen !== "paused") return;
      if (screen === "paused") return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    function loop() {
      const gs = gameState.current;
      if (!gs) return;
      update(gs);
      draw(gs, ctx);
      animRef.current = requestAnimationFrame(loop);
    }

    function update(gs) {
      const keys = keysRef.current;
      const touch = touchRef.current;

      if (gs.crashed) {
        gs.crashTimer--;
        gs.particles.update();
        if (gs.crashTimer <= 0) {
          gs.crashed = false; gs.invincible = 90; gs.rotation = 0; gs.wheelieAngle = 0;
          gs.bikeY = laneCenter(gs.lane); gs.vy = 0; gs.airborne = false;
        }
        gs.scrollX += gs.currentSpeed * 0.3;
        return;
      }

      gs.scrollX += gs.currentSpeed;
      engineTimerRef.current++;
      if (engineTimerRef.current % 14 === 0) soundRef.current.play("engine");

      gs.dustTimer++;
      if (!gs.airborne && gs.dustTimer % 8 === 0)
        gs.particles.emit(gs.bikeX - 16, gs.bikeY + 10, 2, PAL.dust, 0.5);

      // ── Wheelie (grounded only, left input) ──
      if (!gs.airborne) {
        const wantWheelie = keys["ArrowLeft"] || keys["a"] || keys["A"] || touch.left;
        if (wantWheelie) {
          gs.doingWheelie = true;
          gs.wheelieAngle = Math.min(gs.wheelieAngle + WHEELIE_SPEED, WHEELIE_CRASH + 0.05);
          if (gs.wheelieAngle >= WHEELIE_CRASH) { triggerCrash(gs, "TIPPED OVER!"); return; }
        } else {
          gs.wheelieAngle = Math.max(0, gs.wheelieAngle - 0.04);
          if (gs.wheelieAngle < 0.02) { gs.wheelieAngle = 0; gs.doingWheelie = false; }
        }
      } else {
        gs.wheelieAngle = 0;
        gs.doingWheelie = false;
      }

      // ── Lane switching (grounded only) ──
      if (!gs.airborne) {
        if ((keys["ArrowUp"] || keys["w"] || keys["W"] || touch.up) && gs.targetLane < LANE_COUNT - 1) {
          gs.targetLane++; keys["ArrowUp"]=false; keys["w"]=false; keys["W"]=false; touch.up=false;
          soundRef.current.play("select");
        }
        if ((keys["ArrowDown"] || keys["s"] || keys["S"] || touch.down) && gs.targetLane > 0) {
          gs.targetLane--; keys["ArrowDown"]=false; keys["s"]=false; keys["S"]=false; touch.down=false;
          soundRef.current.play("select");
        }
        const targetY = laneCenter(gs.targetLane);
        gs.bikeY += (targetY - gs.bikeY) * 0.3;
        if (Math.abs(gs.bikeY - targetY) < 1) gs.bikeY = targetY;
        gs.lane = gs.targetLane;
      }

      // ── Airborne ──
      if (gs.airborne) {
        gs.vy += GRAVITY;
        gs.bikeY += gs.vy;

        if (keys["ArrowUp"] || keys["w"] || keys["W"] || touch.up) {
          gs.rotation -= FLIP_SPEED;
          if (Math.abs(gs.rotation) >= Math.PI * 2) {
            gs.flipCount++; gs.rotation %= (Math.PI*2);
            gs.trickPoints += 100*gs.combo;
            gs.trickDisplay = `FLIP x${gs.flipCount}! +${100*gs.combo}`;
            gs.trickDisplayTimer = 40; soundRef.current.play("trick");
            gs.particles.emit(gs.bikeX, gs.bikeY, 5, PAL.star, 1.5);
          }
        }
        if (keys["ArrowDown"] || keys["s"] || keys["S"] || touch.down) {
          gs.rotation += FLIP_SPEED;
          if (Math.abs(gs.rotation) >= Math.PI * 2) {
            gs.flipCount++; gs.rotation %= (Math.PI*2);
            gs.trickPoints += 100*gs.combo;
            gs.trickDisplay = `BACKFLIP x${gs.flipCount}! +${100*gs.combo}`;
            gs.trickDisplayTimer = 40; soundRef.current.play("trick");
            gs.particles.emit(gs.bikeX, gs.bikeY, 5, PAL.star, 1.5);
          }
        }
        if (keys["ArrowLeft"] || keys["a"] || keys["A"] || touch.left) {
          gs.rotation -= SPIN_SPEED;
          if (gs.spinCount < 3 && Math.abs(gs.rotation) > Math.PI*0.5*(gs.spinCount+1)) {
            gs.spinCount++; gs.trickPoints += 75*gs.combo;
            gs.trickDisplay = `SPIN x${gs.spinCount}! +${75*gs.combo}`;
            gs.trickDisplayTimer = 40; soundRef.current.play("trick");
          }
        }
        if (keys["ArrowRight"] || keys["d"] || keys["D"] || touch.right) {
          gs.rotation += SPIN_SPEED;
        }

        // Landing
        const groundLevel = laneCenter(gs.lane);
        if (gs.bikeY >= groundLevel) {
          gs.bikeY = groundLevel; gs.vy = 0; gs.airborne = false;
          gs.score += gs.trickPoints;

          const normRot = ((gs.rotation % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
          const landAngle = Math.min(normRot, Math.PI*2 - normRot);

          if (landAngle < LAND_PERFECT) {
            gs.rotation = 0;
            const bonus = gs.trickPoints > 0 ? 50 : 0;
            if (bonus > 0) {
              gs.score += bonus;
              gs.trickDisplay = `PERFECT LANDING! +${bonus}`;
              gs.trickDisplayTimer = 45;
              soundRef.current.play("perfect");
              gs.particles.emit(gs.bikeX, gs.bikeY + 6, 10, PAL.perfect, 1.5);
            }
          } else if (landAngle < LAND_OK) {
            gs.rotation = 0;
            soundRef.current.play("bounce");
            gs.particles.emit(gs.bikeX, gs.bikeY + 8, 6, PAL.dust, 1);
            if (gs.trickPoints > 0) { gs.trickDisplay = "GOOD LANDING"; gs.trickDisplayTimer = 30; }
          } else {
            triggerCrash(gs, "OUCH!");
          }
          gs.flipCount = 0; gs.spinCount = 0; gs.trickPoints = 0;
        }
      }

      if (gs.invincible > 0) gs.invincible--;
      if (gs.trickDisplayTimer > 0) gs.trickDisplayTimer--;

      // ── Answer sign collision ──
      if (!gs.answeredThisRound && !gs.airborne) {
        for (const sign of gs.answerSigns) {
          if (sign.hit) continue;
          const signScreenX = sign.worldX - gs.scrollX;
          const signCY = laneCenter(sign.lane);
          if (gs.bikeX+16 > signScreenX && gs.bikeX-16 < signScreenX+sign.width && Math.abs(gs.bikeY-signCY) < LANE_H/2) {
            sign.hit = true; gs.answeredThisRound = true;
            if (sign.correct) {
              soundRef.current.play("correct");
              gs.score += 50*gs.combo; gs.combo = Math.min(gs.combo+1, 5);
              gs.questionsAnswered++; gs.particles.emit(gs.bikeX,gs.bikeY,12,PAL.star,2);
              gs.trickDisplay = "CORRECT!"; gs.trickDisplayTimer = 50;
              gs.jumpRamp = { worldX: sign.worldX+120, lane: gs.lane, width: 48, height: 32, active: true };
              gs.waitingForJump = true;
              if (gs.questionsAnswered >= TOTAL_QUESTIONS) gs.lastQuestion = true;
            } else {
              soundRef.current.play("wrong"); gs.combo = 1; gs.questionsAnswered++;
              if (gs.invincible <= 0) {
                gs.lives--;
                if (gs.lives <= 0) { triggerCrash(gs,"WRONG!"); setTimeout(()=>{soundRef.current.play("gameover");setScreen("gameover");},1500); return; }
                else triggerCrash(gs,"WRONG!");
              } else { gs.trickDisplay="WRONG!"; gs.trickDisplayTimer=50; }
              if (gs.questionsAnswered>=TOTAL_QUESTIONS) setTimeout(()=>{soundRef.current.play("win");setScreen("win");},1500);
              else gs.questionDelay = 110;
            }
          }
        }
      }

      // ── Jump ramp collision ──
      if (gs.jumpRamp && gs.jumpRamp.active && !gs.airborne) {
        const jr = gs.jumpRamp;
        const jrScreenX = jr.worldX - gs.scrollX;
        const jrCY = laneCenter(jr.lane);
        if (gs.bikeX+16 > jrScreenX && gs.bikeX-16 < jrScreenX+jr.width && Math.abs(gs.bikeY-jrCY) < LANE_H/2) {
          jr.active = false; gs.waitingForJump = false;
          gs.airborne = true; gs.vy = -7.5;
          gs.flipCount=0; gs.spinCount=0; gs.trickPoints=0; gs.wheelieAngle=0;
          soundRef.current.play("jump");
          gs.particles.emit(gs.bikeX,gs.bikeY,10,PAL.jumpRamp,2);
          gs.trickDisplay = "BIG AIR! DO TRICKS!"; gs.trickDisplayTimer = 60;
          if (gs.lastQuestion) setTimeout(()=>{soundRef.current.play("win");setScreen("win");},2500);
          else gs.questionDelay = 120;
        }
      }

      // Jump ramp missed
      if (gs.jumpRamp && gs.jumpRamp.active && gs.jumpRamp.worldX - gs.scrollX < -80) {
        gs.jumpRamp.active = false; gs.waitingForJump = false;
        if (gs.lastQuestion) setTimeout(()=>{soundRef.current.play("win");setScreen("win");},1000);
        else gs.questionDelay = 60;
      }

      // ── Obstacle collision ──
      if (!gs.airborne && !gs.crashed) {
        for (const obs of gs.obstacles) {
          if (obs.hit) continue;
          const osx = obs.worldX - gs.scrollX;
          if (osx < -60 || osx > GAME_W+60) continue;
          const obsCY = laneCenter(obs.lane);
          if (gs.bikeX+14 > osx && gs.bikeX-14 < osx+obs.width && Math.abs(gs.bikeY-obsCY) < LANE_H/2-4) {
            obs.hit = true;
            const isBump = obs.type==="bump"||obs.type==="double_bump";
            if (isBump) {
              gs.airborne=true; gs.vy=-3.5; gs.wheelieAngle=0;
              gs.particles.emit(gs.bikeX,gs.bikeY+6,4,PAL.dust,1);
              soundRef.current.play("land");
            } else if (gs.doingWheelie && gs.wheelieAngle > 0.1) {
              gs.airborne=true; gs.vy=-3.5; gs.wheelieAngle=0;
              gs.particles.emit(gs.bikeX,gs.bikeY+6,4,PAL.dust,1);
              soundRef.current.play("land");
              gs.trickDisplay = "WHEELIE! +10"; gs.trickDisplayTimer = 30;
              gs.score += 10;
            } else {
              gs.particles.emit(gs.bikeX,gs.bikeY,6,PAL.explosion,1);
              gs.score = Math.max(0, gs.score-10);
              gs.trickDisplay = "OUCH! -10"; gs.trickDisplayTimer = 30;
              soundRef.current.play("land");
            }
          }
        }
        gs.obstacles = gs.obstacles.filter(o => o.worldX - gs.scrollX > -100);
      }

      // Answer signs all missed
      if (!gs.answeredThisRound && !gs.waitingForJump) {
        if (gs.answerSigns.every(s => s.worldX+s.width-gs.scrollX < -20)) {
          gs.answeredThisRound=true; gs.combo=1; gs.questionsAnswered++;
          if (gs.invincible<=0) { gs.lives--; if (gs.lives<=0) { triggerCrash(gs,"MISSED!"); setTimeout(()=>{soundRef.current.play("gameover");setScreen("gameover");},1500); return; } }
          gs.trickDisplay="MISSED!"; gs.trickDisplayTimer=40;
          if (gs.questionsAnswered>=TOTAL_QUESTIONS) setTimeout(()=>{soundRef.current.play("win");setScreen("win");},1000);
          else gs.questionDelay=60;
        }
      }

      // Spawn next question
      if (gs.questionDelay > 0) {
        gs.questionDelay--;
        if (gs.questionDelay === 0) {
          const problem = genLinguaQuestion(gs.grade, gs.questionsAnswered, wordListRef.current);
          gs.currentProblem = problem;
          gs.currentSpeed = getDynamicSpeed(gs.questionsAnswered, TOTAL_QUESTIONS, SCROLL_SPEED, MAX_SPEED_MULTIPLIER);
          const questionWorldX = gs.scrollX + GAME_W + 180;
          gs.answerSigns = createAnswerSigns(problem, questionWorldX);
          gs.answeredThisRound=false; gs.jumpRamp=null; gs.waitingForJump=false; gs.lastQuestion=false;
          const obsStart = gs.scrollX + GAME_W + 20, obsEnd = questionWorldX - 60;
          if (obsEnd > obsStart + 50) gs.obstacles = gs.obstacles.concat(generateObstacles(obsStart, obsEnd));
        }
      }

      gs.particles.update();
    }

    function triggerCrash(gs, msg) {
      gs.crashed=true; gs.crashTimer=60; gs.airborne=false; gs.wheelieAngle=0;
      soundRef.current.play("crash");
      gs.particles.emit(gs.bikeX,gs.bikeY,15,PAL.explosion,2);
      gs.particles.emit(gs.bikeX,gs.bikeY,10,"#888",1.5);
      gs.trickDisplay=msg; gs.trickDisplayTimer=50;
    }

    function draw(gs, ctx) {
      // Sky
      ctx.fillStyle=PAL.sky; ctx.fillRect(0,0,GAME_W,GAME_H);
      for (let i=0;i<5;i++) { ctx.fillStyle=i%2===0?PAL.skyLight:PAL.sky; ctx.fillRect(0,i*12,GAME_W,12); }

      // Mountains
      ctx.fillStyle="#3858a8";
      for (let i=0;i<8;i++) { const mx=i*120-(gs.scrollX*0.15)%120; ctx.beginPath(); ctx.moveTo(mx,100); ctx.lineTo(mx+60,50+(i%3)*15); ctx.lineTo(mx+120,100); ctx.closePath(); ctx.fill(); }

      // Clouds
      for (let i=0;i<5;i++) { const cx=((i*150+30)-gs.scrollX*0.08)%(GAME_W+100)-50; drawPixelRect(ctx,cx,25+i*10,32,8,"#fcfcfc"); drawPixelRect(ctx,cx+8,20+i*10,16,6,"#fcfcfc"); }

      // Ground
      const groundTop = ROAD_BOTTOM + 4;
      ctx.fillStyle=PAL.ground; ctx.fillRect(0,groundTop,GAME_W,GAME_H-groundTop);
      ctx.fillStyle=PAL.groundDark; ctx.fillRect(0,groundTop,GAME_W,3);

      // Lanes
      for (let lane=0; lane<LANE_COUNT; lane++) {
        const lt = laneTop(lane);
        const isActive = gs.lane === lane;
        ctx.fillStyle = lane%2===0 ? PAL.road : PAL.roadAlt;
        ctx.fillRect(0, lt, GAME_W, LANE_H);
        if (isActive && !gs.airborne) { ctx.fillStyle=PAL.laneHighlight; ctx.fillRect(0,lt,GAME_W,LANE_H); }
        const cy = laneCenter(lane);
        for (let dx=-(gs.scrollX%24); dx<GAME_W; dx+=24) drawPixelRect(ctx,dx,cy-1,12,2,PAL.roadLine);
        drawPixelRect(ctx,0,lt,GAME_W,2,PAL.roadBorder);
        drawPixelRect(ctx,0,lt+LANE_H-2,GAME_W,2,PAL.roadBorder);
      }

      // Lane labels
      for (let lane=0;lane<LANE_COUNT;lane++) {
        const cy=laneCenter(lane);
        ctx.fillStyle="rgba(0,0,0,0.35)"; ctx.fillRect(2,cy-8,16,16);
        drawText(ctx, String(lane+1), 10, cy+4, 9, PAL.roadLine);
      }

      // Obstacles
      gs.obstacles.forEach(obs => { if (obs.hit) return; const ox=obs.worldX-gs.scrollX; if (ox>-60&&ox<GAME_W+60) drawObstacle(ctx,ox,laneCenter(obs.lane),obs.type); });

      // Answer signs
      gs.answerSigns.forEach(sign => {
        const sx=sign.worldX-gs.scrollX;
        if (sx>-100&&sx<GAME_W+100) drawAnswerSign(ctx,sx,laneCenter(sign.lane),sign.width,sign.height,sign.value,gs.lane===sign.lane&&!gs.airborne&&!sign.hit,sign.hit,sign.correct);
      });

      // Jump ramp
      if (gs.jumpRamp&&gs.jumpRamp.active) { const jr=gs.jumpRamp,jrX=jr.worldX-gs.scrollX; if(jrX>-80&&jrX<GAME_W+80) drawJumpRamp(ctx,jrX,laneCenter(jr.lane),jr.width,jr.height); }

      // Bike
      if (!(gs.invincible>0&&Math.floor(gs.invincible/3)%2===0))
        drawBike(ctx, gs.bikeX, gs.bikeY, gs.rotation, gs.crashed, gs.airborne ? 0 : -gs.wheelieAngle);

      // Wheelie indicator
      if (gs.doingWheelie && !gs.airborne && !gs.crashed) {
        const pct = gs.wheelieAngle / WHEELIE_CRASH;
        const color = pct < 0.6 ? PAL.rampCorrect : pct < 0.85 ? PAL.star : PAL.explosion;
        drawPixelRect(ctx, gs.bikeX - 12, gs.bikeY - 32, 24 * pct, 3, color);
        drawPixelRect(ctx, gs.bikeX - 12, gs.bikeY - 32, 24, 3, "rgba(255,255,255,0.2)");
      }

      gs.particles.draw(ctx);

      // ── Question bubble with SPELLING / VOCAB pill ──
      if (gs.currentProblem && !gs.answeredThisRound) {
        const qType = gs.currentProblem.questionType || "VOCAB";
        const pillColor = qType === "SPELLING" ? PAL.spelling : PAL.vocab;

        // Pill label
        const pillW = 72, pillH = 13, pillX = GAME_W/2 - pillW/2;
        drawPixelRect(ctx, pillX, 4, pillW, pillH, pillColor);
        drawPixelRect(ctx, pillX+1, 5, pillW-2, 2, "rgba(255,255,255,0.3)");
        ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = "#111"; ctx.fillText(qType, GAME_W/2, 14);

        // Question text bubble
        const qText = gs.currentProblem.question;
        ctx.font = "bold 12px monospace";
        const qw = Math.max(ctx.measureText(qText).width + 24, 120), qx = GAME_W/2 - qw/2;
        ctx.fillStyle = "rgba(0,0,0,0.82)"; ctx.fillRect(qx, 19, qw, 24);
        ctx.strokeStyle = pillColor; ctx.lineWidth = 2; ctx.strokeRect(qx, 19, qw, 24);
        drawText(ctx, qText, GAME_W/2, 35, 12, pillColor);

        drawText(ctx, `Q${gs.questionsAnswered+1}/${TOTAL_QUESTIONS}`, GAME_W/2, 50, 9, PAL.riderDark);
      }

      // Trick/message display
      if (gs.trickDisplayTimer>0 && gs.trickDisplay) {
        ctx.globalAlpha = Math.min(1, gs.trickDisplayTimer/15);
        const dy = gs.airborne ? -50 : -30;
        drawText(ctx, gs.trickDisplay, GAME_W/2, GAME_H/2+dy, 14, PAL.star);
        ctx.globalAlpha = 1;
      }

      // ── HUD ──
      ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(4,GAME_H-26,95,20);
      drawText(ctx,`SCORE: ${gs.score}`,52,GAME_H-11,10,PAL.text);

      for (let i=0;i<gs.lives;i++) {
        drawPixelRect(ctx,GAME_W-60+i*18,GAME_H-24,14,14,PAL.bike);
        drawText(ctx,"♥",GAME_W-53+i*18,GAME_H-11,11,PAL.text);
      }

      if (gs.combo>1) drawText(ctx,`x${gs.combo} COMBO`,GAME_W/2,GAME_H-18,10,PAL.star);

      // Progress bar (teal to match vocab theme)
      const progW = 120, progH = 8, progX = GAME_W/2-progW/2, progY = GAME_H-10;
      const progFill = Math.min(1, gs.questionsAnswered / TOTAL_QUESTIONS);
      ctx.fillStyle=PAL.progressBg; ctx.fillRect(progX,progY,progW,progH);
      ctx.fillStyle=PAL.progressFill; ctx.fillRect(progX,progY,progW*progFill,progH);
      ctx.strokeStyle=PAL.progressBorder; ctx.lineWidth=1; ctx.strokeRect(progX,progY,progW,progH);
      drawText(ctx,`${gs.questionsAnswered}/${TOTAL_QUESTIONS}`,GAME_W/2,progY-2,7,PAL.text);

      drawText(ctx,`GRADE ${gs.grade}`,52,GAME_H-1,8,PAL.riderDark);

      if (gs.airborne) drawText(ctx,"↑↓ FLIP  ←→ SPIN",GAME_W/2,GAME_H-1,7,"#88a8ff");
    }

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [screen]);

  const handleTouch = (dir, isDown) => { touchRef.current[dir] = isDown; };
  const canvasStyle = { width: GAME_W*scale, height: GAME_H*scale, imageRendering: "pixelated" };

  // ─── TITLE SCREEN ───
  if (screen === "title") {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen w-full" style={{ background:"#0d1b2a", fontFamily:"monospace" }}>
        <div className="text-center p-4" style={{ maxWidth:480 }}>
          <h1 className="text-3xl md:text-5xl font-bold mb-1" style={{ color:PAL.vocab, textShadow:"3px 3px 0 #004466" }}>MOTOLINGO!</h1>
          <p className="text-sm md:text-base mb-1" style={{ color:PAL.skyLight }}>Answer the word → Hit the jump → Do tricks!</p>
          <p className="text-xs mb-4" style={{ color:PAL.riderDark }}>Spelling &amp; vocabulary challenges for Grades 1–6</p>
          <p className="text-xs mb-1" style={{ color:"#f8a800" }}>🟠 SPELLING — spell the word &nbsp;&nbsp; 🔵 VOCAB — find the definition</p>
          <p className="text-xs mb-4" style={{ color:PAL.riderDark }}>Hold ◄ to wheelie over obstacles · speed builds as you go!</p>
          <p className="text-xs mb-3 font-bold" style={{ color:PAL.text }}>CHOOSE YOUR GRADE</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1,2,3,4,5,6].map(g => (
              <button key={g} onClick={() => startGame(g)}
                className="font-bold py-3 px-4 rounded-lg text-lg md:text-xl transition-transform active:scale-95"
                style={{ background: PAL.vocab, color:"#111", border:"3px solid #008aaa", minHeight:56 }}>
                Grade {g}
              </button>
            ))}
          </div>
          <div className="text-xs" style={{ color:PAL.riderDark }}>
            <p>Desktop: ↑↓ lanes &amp; flips · → spin · ← wheelie/spin · Esc pause</p>
            <p>Mobile: On-screen buttons below the game</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── PAUSE SCREEN ───
  if (screen === "paused") {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen w-full" style={{ background:"#0d1b2a", fontFamily:"monospace" }}>
        <div className="text-center p-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color:PAL.vocab, textShadow:"3px 3px 0 #004466" }}>PAUSED</h1>
          <div className="flex flex-col gap-3" style={{ minWidth:220 }}>
            <button onClick={() => setScreen("playing")}
              className="font-bold py-3 px-8 rounded-lg text-xl transition-transform active:scale-95"
              style={{ background:PAL.rampCorrect, color:PAL.text, border:"3px solid #007800" }}>RESUME</button>
            <button onClick={() => { if(grade) startGame(grade); }}
              className="font-bold py-3 px-8 rounded-lg text-xl transition-transform active:scale-95"
              style={{ background:PAL.vocab, color:"#111", border:"3px solid #008aaa" }}>RESTART</button>
            <button onClick={() => setScreen("title")}
              className="font-bold py-3 px-8 rounded-lg text-xl transition-transform active:scale-95"
              style={{ background:PAL.explosion, color:PAL.text, border:"3px solid #a00030" }}>QUIT</button>
          </div>
          <p className="text-xs mt-4" style={{ color:PAL.riderDark }}>Press Esc to resume</p>
        </div>
      </div>
    );
  }

  // ─── WIN SCREEN ───
  if (screen === "win") {
    const finalScore = gameState.current?.score || 0;
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen w-full" style={{ background:"#0d1b2a", fontFamily:"monospace" }}>
        <div className="text-center p-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color:PAL.vocab, textShadow:"3px 3px 0 #004466" }}>YOU WIN!</h1>
          <p className="text-2xl mb-2" style={{ color:PAL.text }}>FINAL SCORE: {finalScore}</p>
          <p className="text-lg mb-6" style={{ color:PAL.skyLight }}>Grade {grade} Complete!</p>
          <button onClick={() => setScreen("title")}
            className="font-bold py-3 px-8 rounded-lg text-xl transition-transform active:scale-95"
            style={{ background:PAL.rampCorrect, color:PAL.text, border:"3px solid #007800" }}>PLAY AGAIN</button>
        </div>
      </div>
    );
  }

  // ─── GAME OVER SCREEN ───
  if (screen === "gameover") {
    const finalScore = gameState.current?.score || 0;
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen w-full" style={{ background:"#0d1b2a", fontFamily:"monospace" }}>
        <div className="text-center p-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color:PAL.explosion, textShadow:"3px 3px 0 #600" }}>GAME OVER</h1>
          <p className="text-2xl mb-2" style={{ color:PAL.text }}>SCORE: {finalScore}</p>
          <p className="text-lg mb-6" style={{ color:PAL.skyLight }}>Answered {gameState.current?.questionsAnswered||0}/{TOTAL_QUESTIONS}</p>
          <button onClick={() => setScreen("title")}
            className="font-bold py-3 px-8 rounded-lg text-xl transition-transform active:scale-95"
            style={{ background:PAL.vocab, color:"#111", border:"3px solid #008aaa" }}>TRY AGAIN</button>
        </div>
      </div>
    );
  }

  // ─── PLAYING SCREEN ───
  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen w-full select-none" style={{ background:"#0d1b2a", touchAction:"none" }}>
      <div className="w-full flex justify-end px-2 mb-1" style={{ maxWidth: GAME_W*scale }}>
        <button onClick={() => setScreen("paused")}
          className="font-bold rounded px-3 py-1 text-sm transition-transform active:scale-90"
          style={{ background:"rgba(255,255,255,0.15)", color:PAL.text, fontFamily:"monospace", border:"1px solid rgba(255,255,255,0.3)" }}>
          ⏸ PAUSE
        </button>
      </div>
      <canvas ref={canvasRef} width={GAME_W} height={GAME_H} style={canvasStyle} className="block" />
      {/* Mobile controls */}
      <div className="flex justify-between w-full px-3 mt-2" style={{ maxWidth: GAME_W*scale }}>
        <div className="flex flex-col items-center gap-1">
          <button onTouchStart={e=>{e.preventDefault();handleTouch("up",true)}} onTouchEnd={e=>{e.preventDefault();handleTouch("up",false)}}
            onMouseDown={()=>handleTouch("up",true)} onMouseUp={()=>handleTouch("up",false)}
            className="font-bold rounded-lg active:scale-90 transition-transform"
            style={{ background:PAL.vocab, color:"#111", border:"3px solid #008aaa", width:60, height:44, fontSize:20 }}>▲</button>
          <button onTouchStart={e=>{e.preventDefault();handleTouch("down",true)}} onTouchEnd={e=>{e.preventDefault();handleTouch("down",false)}}
            onMouseDown={()=>handleTouch("down",true)} onMouseUp={()=>handleTouch("down",false)}
            className="font-bold rounded-lg active:scale-90 transition-transform"
            style={{ background:PAL.vocab, color:"#111", border:"3px solid #008aaa", width:60, height:44, fontSize:20 }}>▼</button>
        </div>
        <div className="flex gap-1 items-center">
          <button onTouchStart={e=>{e.preventDefault();handleTouch("left",true)}} onTouchEnd={e=>{e.preventDefault();handleTouch("left",false)}}
            onMouseDown={()=>handleTouch("left",true)} onMouseUp={()=>handleTouch("left",false)}
            className="font-bold rounded-lg active:scale-90 transition-transform"
            style={{ background:PAL.helmet, color:PAL.text, border:"3px solid #1028b0", width:46, height:60, fontSize:20 }}>◄</button>
          <button onTouchStart={e=>{e.preventDefault();handleTouch("right",true)}} onTouchEnd={e=>{e.preventDefault();handleTouch("right",false)}}
            onMouseDown={()=>handleTouch("right",true)} onMouseUp={()=>handleTouch("right",false)}
            className="font-bold rounded-lg active:scale-90 transition-transform"
            style={{ background:PAL.helmet, color:PAL.text, border:"3px solid #1028b0", width:46, height:60, fontSize:20 }}>►</button>
        </div>
      </div>
    </div>
  );
}
