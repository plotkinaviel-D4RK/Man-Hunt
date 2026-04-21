const demoAccount = {
  username: "ArenaDemo",
  email: "demo@manhunt.app",
  password: "ArenaDemo2026!",
  rankedScore: 711
};

const characterModelPath = "/assets/characters/models/profile-character.glb";
const characterSourcePath = "/assets/characters/source/profile-character.png";
const tierSize = 100;
const tierOrder = ["III", "II", "I"];
const rankDivisions = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"];
const championThreshold = rankDivisions.length * tierOrder.length * tierSize;
const powerTypes = ["Fire", "Water", "Air", "Earth", "Lightning", "Shadow", "Light", "Ice", "Metal", "Nature"];
const powerRarities = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythical"];
const fighterClasses = ["Duelist", "Tank", "Bruiser", "Support", "Assassin", "Guardian", "Mage", "Ranger"];
const fighterNamePrefixes = ["Nova", "Iron", "Ash", "Storm", "Echo", "Frost", "Viper", "Blaze", "Rune", "Sky"];
const fighterNameSuffixes = ["Rush", "Vale", "Mercer", "Strike", "Bloom", "Pulse", "Shade", "Breaker", "Torrent", "Flare"];
const powerThemes = {
  Fire: { primary: "#ff8247", secondary: "#ffb54d", accent: "#ff5d3d" },
  Water: { primary: "#46b8ff", secondary: "#7ae0ff", accent: "#2086ff" },
  Air: { primary: "#c9f4ff", secondary: "#91d9ff", accent: "#6fb4ff" },
  Earth: { primary: "#9b7a4f", secondary: "#d8b27e", accent: "#6a5134" },
  Lightning: { primary: "#ffd84e", secondary: "#fff27d", accent: "#f7a600" },
  Shadow: { primary: "#54446f", secondary: "#8c73b6", accent: "#261a3f" },
  Light: { primary: "#fff4b0", secondary: "#ffffff", accent: "#ffd36a" },
  Ice: { primary: "#9de7ff", secondary: "#ddf9ff", accent: "#67bfff" },
  Metal: { primary: "#adb6c8", secondary: "#e1e7f0", accent: "#707b92" },
  Nature: { primary: "#59ca78", secondary: "#96ef9f", accent: "#2c8e4d" }
};
const maxRandomFighterRerolls = 3;
const maxRosterSize = 4;

const fighters = [
  {
    name: "Nova Rush",
    rarity: "Epic",
    className: "Duelist",
    level: 7,
    summary: "Built as a fast duelist with high agility and burst openings. Designed for early 1v1 dominance and later 3v3 cleanup.",
    stats: { Attack: 72, Defense: 58, Agility: 89, Vitality: 66, Power: 70 },
    notes: [
      "12 wins, 4 losses",
      "3-match ranked streak",
      "Signature move: Flash Divide",
      "Trait: Evade chance rises after each non-critical hit"
    ]
  },
  {
    name: "Glacier Vale",
    rarity: "Rare",
    className: "Tank",
    level: 6,
    summary: "A heavy frontliner built for survival and attrition, with elite defense and reliable control pressure.",
    stats: { Attack: 64, Defense: 92, Agility: 39, Vitality: 88, Power: 58 }
  },
  {
    name: "Echo Wire",
    rarity: "Rare",
    className: "Support",
    level: 5,
    summary: "Enables team play with recovery windows, tempo boosts, and layered defensive utility.",
    stats: { Attack: 49, Defense: 57, Agility: 68, Vitality: 69, Power: 81 }
  },
  {
    name: "Hex Mercer",
    rarity: "Common",
    className: "Bruiser",
    level: 4,
    summary: "A straightforward striker with high power and honest brawl pressure.",
    stats: { Attack: 81, Defense: 61, Agility: 51, Vitality: 74, Power: 47 }
  }
];

const app = document.getElementById("app");
const state = {
  mode: "login",
  authenticated: false,
  currentUser: null,
  savedFighters: [],
  activeScreen: "profile",
  message: "",
  hasCharacterModel: false,
  sourceImageExists: false,
  generationInProgress: false,
  appNotice: "",
  characterImageVersion: Date.now(),
  generatedFighter: null,
  remainingRandomFighterRerolls: maxRandomFighterRerolls,
  rosterFighters: [],
  selectedRosterFighterId: null,
  draggedRosterFighterId: null,
  authDraft: {
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  }
};

function normalizeRankedScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.floor(score));
}

function normalizeAccount(account) {
  return {
    ...account,
    rankedScore: normalizeRankedScore(account?.rankedScore)
  };
}

function normalizeFighter(fighter) {
  return {
    ...fighter,
    id: fighter?.id || `fighter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(fighter?.name || "Unknown Fighter"),
    className: String(fighter?.className || "Fighter"),
    power: String(fighter?.power || "Unknown"),
    powerRarity: String(fighter?.powerRarity || fighter?.rarity || "Common"),
    rarity: String(fighter?.powerRarity || fighter?.rarity || "Common"),
    level: normalizeRankedScore(fighter?.level) || 1,
    summary: String(fighter?.summary || ""),
    notes: Array.isArray(fighter?.notes) ? fighter.notes : [],
    stats: {
      Attack: normalizeRankedScore(fighter?.stats?.Attack),
      Defense: normalizeRankedScore(fighter?.stats?.Defense),
      Agility: normalizeRankedScore(fighter?.stats?.Agility),
      Vitality: normalizeRankedScore(fighter?.stats?.Vitality)
    }
  };
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload;
}

async function loadSavedFighters() {
  if (!state.currentUser?.id) {
    state.savedFighters = [];
    return;
  }

  const payload = await apiRequest(`/api/characters?userId=${encodeURIComponent(state.currentUser.id)}`);
  state.savedFighters = (payload.characters || []).map(normalizeFighter);
}

async function saveFighterToAccount(fighter) {
  if (!state.currentUser?.id) {
    return fighter;
  }

  const payload = await apiRequest("/api/characters", {
    method: "POST",
    body: JSON.stringify({
      userId: state.currentUser.id,
      character: fighter
    })
  });

  return normalizeFighter(payload.character);
}

async function updateFighterNameOnAccount(fighterId, name) {
  if (!state.currentUser?.id) {
    return null;
  }

  const payload = await apiRequest(`/api/characters/${encodeURIComponent(fighterId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      userId: state.currentUser.id,
      name
    })
  });

  return normalizeFighter(payload.character);
}

function rankInfoForScore(scoreValue) {
  const score = normalizeRankedScore(scoreValue);

  if (score >= championThreshold) {
    return {
      score,
      isChampion: true,
      division: "Champion",
      tier: null,
      label: "Champion",
      displayRank: `${score} Score`,
      fullLabel: `Champion ${score} Score`,
      nextRankLabel: null,
      pointsIntoTier: score - championThreshold,
      pointsToNextTier: null,
      tierProgress: null
    };
  }

  const tierIndex = Math.floor(score / tierSize);
  const divisionIndex = Math.floor(tierIndex / tierOrder.length);
  const tierOffset = tierIndex % tierOrder.length;
  const division = rankDivisions[divisionIndex];
  const tier = tierOrder[tierOffset];
  const pointsIntoTier = score % tierSize;
  const nextTierScore = (tierIndex + 1) * tierSize;
  const nextRankLabel = nextTierScore >= championThreshold ? "Champion" : rankInfoForScore(nextTierScore).label;

  return {
    score,
    isChampion: false,
    division,
    tier,
    label: `${division} ${tier}`,
    displayRank: `${division} ${tier}`,
    fullLabel: `${division} ${tier} • ${score} Score`,
    nextRankLabel,
    pointsIntoTier,
    pointsToNextTier: nextTierScore - score,
    tierProgress: `${pointsIntoTier}/${tierSize}`
  };
}

function currentRankInfo() {
  return rankInfoForScore(state.currentUser?.rankedScore ?? 0);
}

function leaderboardRowsForUser(user) {
  const userScore = normalizeRankedScore(user?.rankedScore);
  const rows = [
    { username: "SkyBreaker", score: 2860 },
    { username: "OrbitKid", score: 2410 },
    { username: "CrimsonArc", score: 2245 },
    { username: user?.username || "You", score: userScore, isCurrentUser: true },
    { username: "FrostByte", score: Math.max(0, userScore - 14) },
    { username: "NovaPalm", score: Math.max(0, userScore - 57) },
    { username: "IronPulse", score: Math.max(0, userScore - 103) }
  ];

  return rows
    .sort((left, right) => right.score - left.score)
    .map((row, index) => ({
      placement: `#${String(index + 1).padStart(2, "0")}`,
      username: row.isCurrentUser ? "You" : row.username,
      rank: rankInfoForScore(row.score).displayRank,
      score: row.score,
      isCurrentUser: Boolean(row.isCurrentUser)
    }));
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomStat(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomFighter() {
  const power = randomFrom(powerTypes);
  const powerRarity = randomFrom(powerRarities);
  const className = randomFrom(fighterClasses);
  const name = `${randomFrom(fighterNamePrefixes)} ${randomFrom(fighterNameSuffixes)}`;

  return {
    id: `fighter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    className,
    power,
    powerRarity,
    rarity: powerRarity,
    level: randomStat(1, 10),
    summary: `${name} is a ${className.toLowerCase()} built around ${power.toLowerCase()} control and aggressive arena pressure.`,
    stats: {
      Attack: randomStat(45, 96),
      Defense: randomStat(40, 94),
      Agility: randomStat(42, 97),
      Vitality: randomStat(44, 95)
    },
    notes: [
      `${power} affinity`,
      `${powerRarity} rarity power`,
      `${className} class frame`,
      `Generated for the player roster`
    ]
  };
}

function addFighterToRoster(fighter) {
  const nextRoster = [normalizeFighter(fighter), ...state.savedFighters];
  state.savedFighters = nextRoster;
  state.selectedRosterFighterId = fighter.id;
}

function moveRosterFighter(draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) {
    return;
  }

  const nextFighters = [...state.savedFighters];
  const draggedIndex = nextFighters.findIndex((fighter) => fighter.id === draggedId);
  const targetIndex = nextFighters.findIndex((fighter) => fighter.id === targetId);

  if (draggedIndex < 0 || targetIndex < 0) {
    return;
  }

  const [draggedFighter] = nextFighters.splice(draggedIndex, 1);
  const adjustedTargetIndex = nextFighters.findIndex((fighter) => fighter.id === targetId);
  nextFighters.splice(adjustedTargetIndex, 0, draggedFighter);
  state.savedFighters = nextFighters;
  state.selectedRosterFighterId = draggedId;
}

function summaryForFighter(fighter, name = fighter.name) {
  return `${name} is a ${fighter.className.toLowerCase()} built around ${fighter.power.toLowerCase()} control and aggressive arena pressure.`;
}

async function renameFighter(fighterId, nextName) {
  const name = nextName.trim();
  if (!name) {
    state.appNotice = "Choose a fighter name before saving.";
    return;
  }

  const rosterFighter = state.savedFighters.find((fighter) => fighter.id === fighterId);
  if (rosterFighter) {
    rosterFighter.name = name;
    rosterFighter.summary = summaryForFighter(rosterFighter, name);
  }

  if (state.generatedFighter?.id === fighterId) {
    state.generatedFighter.name = name;
    state.generatedFighter.summary = summaryForFighter(state.generatedFighter, name);
  }

  if (!state.currentUser?.id || !rosterFighter) {
    state.appNotice = `Renamed fighter to ${name}.`;
    return;
  }

  try {
    const savedFighter = await updateFighterNameOnAccount(fighterId, name);
    state.savedFighters = state.savedFighters.map((fighter) => fighter.id === fighterId ? savedFighter : fighter);
    if (state.generatedFighter?.id === fighterId) {
      state.generatedFighter = savedFighter;
    }
    state.appNotice = `Renamed fighter to ${name}.`;
  } catch (error) {
    state.appNotice = error.message || "Name changed on this screen, but saving it failed.";
  }
}

function renameFighterForm(fighter, formId) {
  return `
    <form class="rename-fighter-form" data-rename-fighter-id="${fighter.id}" id="${formId}">
      <label class="rename-fighter-field">
        <span>Character Name</span>
        <input type="text" value="${escapeHtml(fighter.name)}" maxlength="32" aria-label="Character name">
      </label>
      <button class="ghost-button" type="submit">Save Name</button>
    </form>
  `;
}

function themeForPower(power) {
  return powerThemes[power] || { primary: "#8a5bff", secondary: "#5bcbff", accent: "#6b3df2" };
}

function styleForPowerChip(power) {
  const theme = themeForPower(power);
  return `--chip-bg:${theme.primary};--chip-border:${theme.accent};`;
}

function rarityClassFor(rarity) {
  return `rarity-${String(rarity || "").toLowerCase()}`;
}

function statChip(label, value) {
  return `<span class="stat-chip stat-${String(label).toLowerCase()}">${label} ${value}</span>`;
}

function powerChip(power) {
  return `<span class="power-chip" style="${styleForPowerChip(power)}">${power}</span>`;
}

function rarityChip(rarity) {
  return `<span class="rarity-chip ${rarityClassFor(rarity)}">${rarity}</span>`;
}

function randomFighterViewerMarkup(fighter) {
  if (!fighter) {
    return "";
  }

  const theme = themeForPower(fighter.power);
  const style = `--fighter-primary:${theme.primary};--fighter-secondary:${theme.secondary};--fighter-accent:${theme.accent};`;
  const rarityClass = rarityClassFor(fighter.powerRarity);

  return `
    <div class="procedural-model-shell" style="${style}">
      <div class="procedural-model-aura"></div>
      <div class="procedural-model-turntable">
        <div class="procedural-model-character">
          <div class="procedural-model-cape"></div>
          <div class="procedural-model-shoulder left"></div>
          <div class="procedural-model-shoulder right"></div>
          <div class="procedural-model-head"></div>
          <div class="procedural-model-visor"></div>
          <div class="procedural-model-torso"></div>
          <div class="procedural-model-waist"></div>
          <div class="procedural-model-arm left"></div>
          <div class="procedural-model-arm right"></div>
          <div class="procedural-model-forearm left"></div>
          <div class="procedural-model-forearm right"></div>
          <div class="procedural-model-thigh left"></div>
          <div class="procedural-model-thigh right"></div>
          <div class="procedural-model-leg left"></div>
          <div class="procedural-model-leg right"></div>
          <div class="procedural-model-core"></div>
        </div>
      </div>
      <div class="procedural-model-caption">
        <span class="tag generated-power-tag" style="${styleForPowerChip(fighter.power)}">${escapeHtml(fighter.power)}</span>
        <strong class="procedural-model-name">${escapeHtml(fighter.name)}</strong>
        <span class="procedural-model-rarity ${rarityClass}">${escapeHtml(fighter.powerRarity)} Power</span>
      </div>
    </div>
  `;
}

function render() {
  if (!app) {
    document.body.innerHTML = `<main style="padding:24px;font-family:Arial,sans-serif"><h1>Man Hunt</h1><p>The app container could not be found. Reload the page and make sure the local server is running.</p></main>`;
    return;
  }

  try {
    app.innerHTML = state.authenticated ? appTemplate() : authTemplate();
    bindEvents();
  } catch (error) {
    document.body.innerHTML = `<main style="padding:24px;font-family:Arial,sans-serif"><h1>Man Hunt</h1><p>The app hit a rendering error.</p><pre style="white-space:pre-wrap">${escapeHtml(error?.stack || error?.message || String(error))}</pre></main>`;
  }
}

function characterSourceUrl() {
  return `${characterSourcePath}?v=${state.characterImageVersion}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function authTemplate() {
  const isLogin = state.mode === "login";
  return `
    <main class="auth-shell">
      <section class="auth-hero panel">
        <div>
          <p class="eyebrow">Competitive Collection</p>
          <h1>Man Hunt</h1>
          <h2>Turn real people into fighters, build a roster, and climb through cinematic battles.</h2>
          <p class="auth-copy">The site now opens directly into login and account creation so it behaves like a real app from the first screen.</p>
        </div>
        <div class="auth-preview-grid">
          <article class="auth-preview-card">
            <span class="tag">Roster Depth</span>
            <h3>1v1 to 3v3 progression</h3>
            <p>Start simple, then unlock deeper team-building and lineup strategy.</p>
          </article>
          <article class="auth-preview-card">
            <span class="tag">Cinematic Clips</span>
            <h3>Short battle highlights</h3>
            <p>Every match is designed to feel shareable, readable, and dramatic.</p>
          </article>
        </div>
      </section>

      <section class="auth-panel panel">
        <div class="auth-tabs">
          <button class="auth-tab ${isLogin ? "active" : ""}" data-mode="login" type="button">Log In</button>
          <button class="auth-tab ${isLogin ? "" : "active"}" data-mode="signup" type="button">Create Account</button>
        </div>

        <div class="auth-form-copy">
          <p class="eyebrow">${isLogin ? "Welcome back" : "New player"}</p>
          <h3>${isLogin ? "Enter the arena" : "Build your account"}</h3>
          <p>${isLogin ? "Use your credentials to access your roster, rank, and battle history." : "Create a local profile to start collecting fighters and climbing the ladder."}</p>
        </div>

        <form class="auth-form" id="auth-form">
          <label class="auth-field ${isLogin ? "hidden" : ""}">
            <span>Username</span>
            <input id="username" type="text" placeholder="Choose your player name" value="${escapeHtml(state.authDraft.username)}">
          </label>

          <label class="auth-field">
            <span>Email</span>
            <input id="email" type="email" placeholder="you@example.com" value="${escapeHtml(state.authDraft.email)}">
          </label>

          <label class="auth-field">
            <span>Password</span>
            <input id="password" type="password" placeholder="${isLogin ? "Enter your password" : "Create a strong password"}" value="${escapeHtml(state.authDraft.password)}">
          </label>

          <label class="auth-field ${isLogin ? "hidden" : ""}">
            <span>Confirm Password</span>
            <input id="confirm-password" type="password" placeholder="Re-enter your password" value="${escapeHtml(state.authDraft.confirmPassword)}">
          </label>

          <button class="primary-button auth-submit" id="auth-submit-button" type="button">${isLogin ? "Log In" : "Create Account"}</button>
        </form>

        <div class="demo-card">
          <p class="eyebrow">Demo Account</p>
          <h4>Use this to preview the logged-in experience</h4>
          <p><strong>Username:</strong> ${demoAccount.username}</p>
          <p><strong>Email:</strong> ${demoAccount.email}</p>
          <p><strong>Password:</strong> ${demoAccount.password}</p>
          <button class="ghost-button" id="fill-demo" type="button">Fill Demo Login</button>
          <button class="primary-button demo-login-button" id="demo-login" type="button">Enter With Demo Account</button>
        </div>

        ${state.message ? `<p class="auth-message">${state.message}</p>` : ""}
      </section>
    </main>
  `;
}

function appTemplate() {
  const rosterFighters = state.savedFighters.slice(0, maxRosterSize);
  const currentFighter = rosterFighters.find((fighter) => fighter.id === state.selectedRosterFighterId) || rosterFighters[0] || null;
  const rankInfo = currentRankInfo();
  const leaderboardRows = leaderboardRowsForUser(state.currentUser);
  const generatedFighter = state.generatedFighter;
  const hasGeneratedFighter = Boolean(generatedFighter);
  const canRerollRandomFighter = !hasGeneratedFighter || state.remainingRandomFighterRerolls > 0;
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">MH</div>
          <div>
            <p class="eyebrow">Competitive Collection</p>
            <h1>Man Hunt</h1>
          </div>
        </div>
        <nav class="nav">
          ${["profile", "overview", "roster", "fighter-lab", "battle", "rankings"].map((screen) => `
            <button class="nav-link ${state.activeScreen === screen ? "active" : ""}" data-screen="${screen}" type="button">${labelFor(screen)}</button>
          `).join("")}
        </nav>
        <section class="sidebar-card panel">
          <p class="eyebrow">MVP Status</p>
          <h2>Functional Local Prototype</h2>
          <p>Login, create-account, demo access, and local profile storage now work in-browser.</p>
        </section>
      </aside>

      <main class="main-content">
        <header class="topbar">
          <div>
            <p class="eyebrow">Prototype Build</p>
            <h2>${labelFor(state.activeScreen)}</h2>
          </div>
          <div class="topbar-actions">
            <button class="ghost-button" type="button">${state.currentUser.username}</button>
            <button class="primary-button" id="logout" type="button">Log Out</button>
          </div>
        </header>

        ${state.activeScreen === "profile" ? `
          <section>
            <div class="profile-layout">
              <div>
                <div class="hero-card">
                  <div class="hero-copy">
                    <p class="eyebrow">Player Identity</p>
                    <h3>${state.currentUser.username} is ready to build a roster.</h3>
                    <p>This is the first logged-in screen, so the app opens like a real player profile after successful login.</p>
                  </div>
                  <div class="panel profile-badge">
                    <p class="eyebrow">Account Snapshot</p>
                    <h4>${state.currentUser.username}</h4>
                    <p>${state.currentUser.email}</p>
                    <div class="fighter-stats">
                      <span>Season Zero</span>
                      <span>${rankInfo.displayRank}</span>
                      <span>Roster ${rosterFighters.length}/${maxRosterSize}</span>
                    </div>
                  </div>
                </div>
              </div>
              <aside class="panel character-viewer-card">
                <div class="viewer-copy">
                  <p class="eyebrow">Featured Character</p>
                  <h3>3D Turntable Viewer</h3>
                  <p>${generatedFighter ? "Random fighters now generate an instant 3D preview in-browser, while uploaded PNG fighters can still use the GLB pipeline." : "Once we generate a <code>.glb</code>, the character will appear here on a podium and can be rotated to see the full model."}</p>
                </div>
                <div class="viewer-stage">
                  ${generatedFighter ? `
                    ${randomFighterViewerMarkup(generatedFighter)}
                  ` : state.hasCharacterModel ? `
                    <model-viewer
                      class="character-viewer"
                      src="${characterModelPath}"
                      camera-controls
                      auto-rotate
                      rotation-per-second="20deg"
                      shadow-intensity="1"
                      exposure="1"
                      environment-image="neutral"
                    ></model-viewer>
                  ` : `
                    <div class="viewer-empty">
                      <h4>No 3D model loaded yet</h4>
                      <p>Drop the source image into <code>${characterSourcePath}</code>, then generate and export a <code>.glb</code> file to <code>${characterModelPath}</code>.</p>
                    </div>
                  `}
                  <div class="podium"></div>
                </div>
              </aside>
            </div>
            <div class="dashboard-grid">
              <article class="panel"><p class="eyebrow">Joined</p><h3>${formatDate(state.currentUser.joinedAt)}</h3><p>Stored locally on this machine so we can test persistence before moving to a hosted database.</p></article>
              <article class="panel"><p class="eyebrow">Current Division</p><h3>${rankInfo.displayRank}</h3><p>${rankInfo.isChampion ? `Champion score: ${rankInfo.score}` : `${rankInfo.pointsToNextTier} points to ${rankInfo.nextRankLabel}.`}</p></article>
              <article class="panel"><p class="eyebrow">Ranked Score</p><h3>${rankInfo.score}</h3><p>${rankInfo.isChampion ? "Champion players keep climbing with raw score only." : `Tier progress: ${rankInfo.tierProgress}`}</p></article>
              <article class="panel"><p class="eyebrow">Favorite Fighter</p><h3>${currentFighter ? currentFighter.name : "No fighters yet"}</h3><p>${currentFighter ? `${currentFighter.className} with ${currentFighter.power} power leads your active roster.` : "Generate a fighter in Profile and it will appear here and in your roster."}</p></article>
            </div>
          </section>
        ` : ""}

        ${state.activeScreen === "overview" ? `
          <section>
            <div class="hero-card">
              <div class="hero-copy">
                <p class="eyebrow">Fighters from real life</p>
                <h3>Build a roster. Climb the ladder. Drop cinematic battle clips.</h3>
                <p>This prototype shows the product direction for the app: collection, progression, and competitive identity.</p>
              </div>
              <div>
                <div class="preview-card glow-blue">
                  <span class="tag">Featured Fighter</span>
                  <h4>Nova Rush</h4>
                  <p>Agility Duelist</p>
                  <div class="stat-row"><span>Attack 72</span><span>Agility 89</span></div>
                </div>
                <div class="preview-card glow-purple">
                  <span class="tag">Rare Trait</span>
                  <h4>Phantom Guard</h4>
                  <p>Counter burst after dodge streaks</p>
                </div>
              </div>
            </div>
          </section>
        ` : ""}

        ${state.activeScreen === "roster" ? `
          <section>
            <div class="section-intro">
              <div><p class="eyebrow">Collection</p><h3>Roster Builder</h3></div>
              <span class="pill">Roster ${rosterFighters.length}/${maxRosterSize}</span>
            </div>
            ${rosterFighters.length ? `
              <div class="roster-grid">
              ${rosterFighters.map((fighter) => `
                <article class="fighter-card ${currentFighter?.id === fighter.id ? "selected" : ""} ${state.draggedRosterFighterId === fighter.id ? "dragging" : ""}" data-roster-fighter-id="${fighter.id}" draggable="true">
                  ${rarityChip(fighter.powerRarity)}
                  <h4>${fighter.name}</h4>
                  <p>${fighter.className}</p>
                  <div class="fighter-stats">
                    ${statChip("Attack", fighter.stats.Attack)}
                    ${statChip("Defense", fighter.stats.Defense)}
                    ${statChip("Agility", fighter.stats.Agility)}
                    ${statChip("Vitality", fighter.stats.Vitality)}
                  </div>
                  <div class="fighter-stats">
                    ${powerChip(fighter.power)}
                    ${rarityChip(fighter.powerRarity)}
                  </div>
                </article>
              `).join("")}
              </div>
              <div class="content-grid">
              <article class="panel">
                <div class="panel-header"><div><p class="eyebrow">Selected Fighter</p><h3>${currentFighter.name}</h3></div><span class="pill">Level ${currentFighter.level}</span></div>
                ${renameFighterForm(currentFighter, "roster-rename-fighter")}
                <p>${currentFighter.summary}</p>
                <div class="bars">
                  ${Object.entries(currentFighter.stats).map(([label, value]) => `
                    <div class="bar"><span class="bar-label stat-text-${String(label).toLowerCase()}">${label}</span><div class="bar-track"><i class="bar-fill" style="width:${value}%"></i></div></div>
                  `).join("")}
                </div>
                <div class="fighter-stats">
                  ${powerChip(currentFighter.power)}
                  ${rarityChip(currentFighter.powerRarity)}
                </div>
              </article>
              <article class="panel roster-model-card">
                <div class="panel-header"><div><p class="eyebrow">Character Model</p><h3>${currentFighter.name}</h3></div></div>
                <div class="roster-model-stage">
                  ${randomFighterViewerMarkup(currentFighter)}
                  <div class="podium"></div>
                </div>
              </article>
              </div>
            ` : `
              <div class="panel roster-empty-state">
                <p class="eyebrow">Empty Roster</p>
                <h3>No fighters saved yet</h3>
                <p>Generate fighters from the Profile tab and the newest four will automatically appear here.</p>
              </div>
            `}
          </section>
        ` : ""}

        ${state.activeScreen === "fighter-lab" ? `
          <section>
            <div class="section-intro"><div><p class="eyebrow">Creation Flow</p><h3>Fighter Lab</h3></div></div>
            <div class="content-grid creation-tools-grid">
              <article class="panel">
                <p class="eyebrow">Character Source Upload</p>
                <h3>Add the 2D character art</h3>
                <p>Upload a PNG here and the app will save it to the correct project folder for the 3D pipeline.</p>
                <label class="upload-button" for="character-upload">Choose PNG</label>
                <input id="character-upload" class="hidden-file-input" type="file" accept="image/png">
                <div class="status-stack">
                  <span class="status-chip ${state.sourceImageExists ? "is-live" : ""}">${state.sourceImageExists ? "Source image ready" : "No source image yet"}</span>
                  <span class="status-chip ${state.hasCharacterModel ? "is-live" : ""}">${state.hasCharacterModel ? "3D model ready" : "No 3D model yet"}</span>
                  <span class="status-chip ${state.generationInProgress ? "is-live" : ""}">${state.generationInProgress ? "Generation running" : "Generator idle"}</span>
                </div>
                ${state.appNotice ? `<p class="auth-message app-notice">${state.appNotice}</p>` : ""}
              </article>
              <article class="panel">
                <p class="eyebrow">Source Preview</p>
                <h3>Current uploaded character</h3>
                ${state.sourceImageExists ? `
                  <div class="source-preview-card">
                    <img class="source-preview-image" src="${characterSourceUrl()}" alt="Uploaded character source">
                  </div>
                ` : `
                  <div class="source-preview-empty">
                    <p>Upload a PNG to preview the exact image that will be used for local 3D generation.</p>
                  </div>
                `}
                <button class="primary-button" id="generate-model" type="button" ${state.sourceImageExists && !state.generationInProgress ? "" : "disabled"}>${state.generationInProgress ? "Generating..." : "Generate 3D Model"}</button>
              </article>
              <article class="panel">
                <p class="eyebrow">No Photo Needed</p>
                <h3>Generate Random Character</h3>
                <p>Create a fully original fighter with randomized stats, class, elemental power, and rarity without starting from a real person. After the first roll, you can reroll up to ${maxRandomFighterRerolls} times.</p>
                <button class="primary-button" id="generate-random-fighter" type="button" ${canRerollRandomFighter ? "" : "disabled"}>${hasGeneratedFighter ? `Reroll Fighter (${state.remainingRandomFighterRerolls} left)` : "Generate Random Fighter"}</button>
                ${generatedFighter ? `
                  <div class="generated-fighter-card">
                    <div class="generated-fighter-header">
                      <div>
                        <p class="eyebrow">Latest Roll</p>
                        <h4>${generatedFighter.name}</h4>
                      </div>
                      <span class="pill">${generatedFighter.className}</span>
                    </div>
                    ${renameFighterForm(generatedFighter, "fighter-lab-rename-fighter")}
                    <p class="generated-fighter-copy">${generatedFighter.summary}</p>
                    <p class="generated-fighter-copy">Rerolls remaining: ${state.remainingRandomFighterRerolls}</p>
                    <div class="fighter-stats generated-fighter-stats">
                      ${statChip("Attack", generatedFighter.stats.Attack)}
                      ${statChip("Defense", generatedFighter.stats.Defense)}
                      ${statChip("Agility", generatedFighter.stats.Agility)}
                      ${statChip("Vitality", generatedFighter.stats.Vitality)}
                    </div>
                    <div class="generated-fighter-power">
                      ${powerChip(generatedFighter.power)}
                      ${rarityChip(generatedFighter.powerRarity)}
                    </div>
                    <p class="generated-model-note">${state.currentUser?.id ? "Saved to this local account automatically and added to your roster." : "A matching 3D model preview was generated automatically and placed in the viewer above."}</p>
                  </div>
                ` : `
                  <div class="generated-fighter-empty">
                    <p>Press the button to roll a brand-new fighter concept with a random power like Fire, Water, Air, Earth, and more.</p>
                  </div>
                `}
              </article>
            </div>
          </section>
        ` : ""}

        ${state.activeScreen === "battle" ? `
          <section>
            <div class="section-intro"><div><p class="eyebrow">Competitive Loop</p><h3>Battle Room</h3></div></div>
            <div class="battle-layout">
              <article class="panel battle-preview"><p class="eyebrow">Clip Preview</p><h3>Cinematic 1v1 Sequence</h3><div class="battle-stage"></div><p>Final clips will be assembled from reusable combat scenes and stat-driven outcome logic.</p></article>
              <article class="panel"><p class="eyebrow">Road to 3v3</p><h3>Battle Modes</h3><ul class="clean-list"><li>1v1 available from the start</li><li>2v2 unlocks later</li><li>3v3 becomes the main competitive format</li></ul></article>
            </div>
          </section>
        ` : ""}

        ${state.activeScreen === "rankings" ? `
          <section>
            <div class="section-intro"><div><p class="eyebrow">Competitive Identity</p><h3>Rankings</h3></div></div>
            <div class="panel">
              ${leaderboardRows.map((row) => `<div class="leaderboard-row ${row.isCurrentUser ? "active" : ""}"><span>${row.placement}</span><span>${row.username}</span><span>${row.rank}</span><span>${row.score}</span></div>`).join("")}
            </div>
          </section>
        ` : ""}
      </main>
    </div>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      state.message = "";
      render();
    });
  });

  const fillDemo = document.getElementById("fill-demo");
  if (fillDemo) {
    fillDemo.addEventListener("click", () => {
      state.authDraft.email = demoAccount.email;
      state.authDraft.password = demoAccount.password;
      state.message = "Demo account loaded. Press Log In to enter the prototype.";
      render();
    });
  }

  const demoLogin = document.getElementById("demo-login");
  if (demoLogin) {
    demoLogin.addEventListener("click", () => {
      loginAsDemo();
    });
  }

  const authForm = document.getElementById("auth-form");
  if (authForm) {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      syncAuthDraftFromInputs();
      await handleAuthSubmit();
    });
  }

  const authSubmitButton = document.getElementById("auth-submit-button");
  if (authSubmitButton) {
    authSubmitButton.addEventListener("click", async () => {
      syncAuthDraftFromInputs();
      await handleAuthSubmit();
    });
  }

  ["username", "email", "password", "confirm-password"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) {
      return;
    }

    input.addEventListener("input", syncAuthDraftFromInputs);
  });

  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeScreen = button.dataset.screen;
      render();
    });
  });

  document.querySelectorAll("[data-roster-fighter-id]").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedRosterFighterId = card.dataset.rosterFighterId;
      render();
    });

    card.addEventListener("dragstart", (event) => {
      state.draggedRosterFighterId = card.dataset.rosterFighterId;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", card.dataset.rosterFighterId);
      card.classList.add("dragging");
    });

    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      card.classList.add("drag-over");
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });

    card.addEventListener("drop", (event) => {
      event.preventDefault();
      const draggedId = event.dataTransfer.getData("text/plain") || state.draggedRosterFighterId;
      moveRosterFighter(draggedId, card.dataset.rosterFighterId);
      state.draggedRosterFighterId = null;
      render();
    });

    card.addEventListener("dragend", () => {
      state.draggedRosterFighterId = null;
      render();
    });
  });

  document.querySelectorAll("[data-rename-fighter-id]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = form.querySelector("input");
      await renameFighter(form.dataset.renameFighterId, input?.value || "");
      render();
    });
  });

  const logout = document.getElementById("logout");
  if (logout) {
    logout.addEventListener("click", () => {
      state.authenticated = false;
      state.currentUser = null;
      state.savedFighters = [];
      state.selectedRosterFighterId = null;
      state.generatedFighter = null;
      state.mode = "login";
      state.message = "";
      render();
    });
  }

  const characterUpload = document.getElementById("character-upload");
  if (characterUpload) {
    characterUpload.addEventListener("change", async (event) => {
      const [file] = event.target.files || [];
      if (!file) {
        return;
      }

      if (file.type !== "image/png") {
        state.appNotice = "Please upload a PNG file for the character source.";
        render();
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      await uploadCharacterSource(dataUrl);
      event.target.value = "";
    });
  }

  const generateModel = document.getElementById("generate-model");
  if (generateModel) {
    generateModel.addEventListener("click", async () => {
      await generateProfileModel();
    });
  }

  const generateRandomFighterButton = document.getElementById("generate-random-fighter");
  if (generateRandomFighterButton) {
    generateRandomFighterButton.addEventListener("click", async () => {
      if (state.generatedFighter && state.remainingRandomFighterRerolls <= 0) {
        state.appNotice = "You have used all 3 rerolls for this random fighter.";
        render();
        return;
      }

      if (state.generatedFighter) {
        state.remainingRandomFighterRerolls -= 1;
      }

      const rolledFighter = normalizeFighter(generateRandomFighter());
      state.generatedFighter = rolledFighter;
      state.appNotice = `Random fighter generated: ${rolledFighter.name} with ${rolledFighter.power} power (${rolledFighter.powerRarity}).`;
      render();

      if (!state.currentUser?.id) {
        addFighterToRoster(rolledFighter);
        state.appNotice = state.remainingRandomFighterRerolls > 0
          ? `${rolledFighter.name} was added to the demo roster. ${state.remainingRandomFighterRerolls} rerolls remaining.`
          : `${rolledFighter.name} was added to the demo roster. No rerolls remaining.`;
        render();
        return;
      }

      try {
        const savedFighter = await saveFighterToAccount(rolledFighter);
        state.generatedFighter = savedFighter;
        addFighterToRoster(savedFighter);
        state.appNotice = state.remainingRandomFighterRerolls > 0
          ? `${savedFighter.name} was saved to ${state.currentUser.username}'s local roster. ${state.remainingRandomFighterRerolls} rerolls remaining.`
          : `${savedFighter.name} was saved to ${state.currentUser.username}'s local roster. No rerolls remaining.`;
      } catch (error) {
        state.appNotice = error.message || "The fighter rolled, but saving it failed.";
      }

      render();
    });
  }
}

function syncAuthDraftFromInputs() {
  state.authDraft.username = document.getElementById("username")?.value ?? state.authDraft.username;
  state.authDraft.email = document.getElementById("email")?.value ?? state.authDraft.email;
  state.authDraft.password = document.getElementById("password")?.value ?? state.authDraft.password;
  state.authDraft.confirmPassword = document.getElementById("confirm-password")?.value ?? state.authDraft.confirmPassword;
}

function resetAuthDraft() {
  state.authDraft = {
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  };
}

async function detectCharacterModel() {
  await refreshCharacterStatus();
}

async function refreshCharacterStatus() {
  try {
    const response = await fetch("/api/character-status");
    const payload = await response.json();
    state.sourceImageExists = Boolean(payload.sourceImageExists);
    state.hasCharacterModel = Boolean(payload.modelExists);
    state.generationInProgress = Boolean(payload.generationInProgress);
  } catch {
    state.hasCharacterModel = false;
    state.sourceImageExists = false;
    state.generationInProgress = false;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.readAsDataURL(file);
  });
}

async function uploadCharacterSource(dataUrl) {
  state.appNotice = "Uploading character source...";
  state.generatedFighter = null;
  render();

  try {
    const response = await fetch("/api/upload-character", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || "Upload failed.");
    }

    state.characterImageVersion = Date.now();
    state.appNotice = payload.message;
    await refreshCharacterStatus();
  } catch (error) {
    state.appNotice = error.message || "Upload failed.";
  }

  render();
}

async function generateProfileModel() {
  state.generationInProgress = true;
  state.generatedFighter = null;
  state.appNotice = "Generating the 3D model locally. This can take a while on the first run.";
  render();

  try {
    const response = await fetch("/api/generate-profile-model", {
      method: "POST"
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || "3D model generation failed.");
    }

    state.appNotice = payload.message;
    await refreshCharacterStatus();
  } catch (error) {
    state.appNotice = error.message || "3D model generation failed.";
    await refreshCharacterStatus();
  }

  render();
}

async function handleAuthSubmit() {
  const email = state.authDraft.email.trim().toLowerCase();
  const password = state.authDraft.password;

  if (state.mode === "login") {
    const isDemo = email === demoAccount.email.toLowerCase() && password === demoAccount.password;
    if (isDemo) {
      loginAsDemo();
      return;
    }

    try {
      const payload = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      state.authenticated = true;
      state.currentUser = normalizeAccount(payload.user);
      state.savedFighters = (payload.characters || []).map(normalizeFighter);
      state.selectedRosterFighterId = state.savedFighters[0]?.id || null;
      state.activeScreen = "profile";
      state.message = "";
      state.appNotice = state.savedFighters.length
        ? `${state.savedFighters.length} saved fighters loaded from this machine.`
        : "Your local account loaded. Generate a fighter to start building your roster.";
      resetAuthDraft();
      render();
      return;
    } catch (error) {
      state.message = "No matching account found yet. Use the demo account or create a local profile.";
      render();
      return;
    }
  }

  const username = state.authDraft.username.trim();
  const confirmPassword = state.authDraft.confirmPassword;

  if (!username || !email || !password) {
    state.message = "Fill out all account fields to continue.";
    render();
    return;
  }

  if (password !== confirmPassword) {
    state.message = "Passwords do not match yet.";
    render();
    return;
  }

  if (email === demoAccount.email.toLowerCase()) {
    state.message = "That email is already reserved for the demo account.";
    render();
    return;
  }

  try {
    const payload = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password })
    });

    state.authenticated = true;
    state.currentUser = normalizeAccount(payload.user);
    state.savedFighters = [];
    state.selectedRosterFighterId = null;
    state.activeScreen = "profile";
    state.message = "";
    state.appNotice = "Local account created. Any fighters you generate now will be saved on this machine.";
    resetAuthDraft();
    render();
  } catch (error) {
    state.message = error.message || "Account creation failed.";
    render();
  }
}

function loginAsDemo() {
  state.authenticated = true;
  state.currentUser = normalizeAccount({
    username: demoAccount.username,
    email: demoAccount.email,
    joinedAt: "2026-04-19T12:00:00.000Z",
    rankedScore: demoAccount.rankedScore
  });
  state.savedFighters = [];
  state.selectedRosterFighterId = null;
  state.generatedFighter = null;
  state.appNotice = "Demo mode is active. Create a local account when you want fighter storage on this machine.";
  state.activeScreen = "profile";
  state.message = "";
  resetAuthDraft();
  render();
}

function labelFor(screen) {
  const labels = {
    profile: "Profile",
    overview: "Overview",
    roster: "Roster",
    "fighter-lab": "Fighter Lab",
    battle: "Battle Room",
    rankings: "Rankings"
  };
  return labels[screen] || screen;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Today";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

detectCharacterModel().finally(render);
