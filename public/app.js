const demoAccount = {
  username: "ArenaDemo",
  email: "demo@manhunt.app",
  password: "ArenaDemo2026!"
};

const storageKey = "man-hunt.accounts";
const characterModelPath = "/assets/characters/models/profile-character.glb";
const characterSourcePath = "/assets/characters/source/profile-character.png";

const fighters = [
  {
    name: "Nova Rush",
    rarity: "Epic",
    className: "Duelist",
    level: 7,
    summary: "Built as a fast duelist with high agility and burst openings. Designed for early 1v1 dominance and later 3v3 cleanup.",
    stats: { Power: 72, Defense: 58, Speed: 91, Agility: 89, Vitality: 66, Focus: 70 },
    notes: [
      "12 wins, 4 losses",
      "3-match streak in Gold III",
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
    stats: { Power: 64, Defense: 92, Speed: 44, Agility: 39, Vitality: 88, Focus: 58 }
  },
  {
    name: "Echo Wire",
    rarity: "Rare",
    className: "Support",
    level: 5,
    summary: "Enables team play with recovery windows, tempo boosts, and layered defensive utility.",
    stats: { Power: 49, Defense: 57, Speed: 73, Agility: 68, Vitality: 69, Focus: 81 }
  },
  {
    name: "Hex Mercer",
    rarity: "Common",
    className: "Bruiser",
    level: 4,
    summary: "A straightforward striker with high power and honest brawl pressure.",
    stats: { Power: 81, Defense: 61, Speed: 55, Agility: 51, Vitality: 74, Focus: 47 }
  }
];

const app = document.getElementById("app");
const state = {
  mode: "login",
  authenticated: false,
  currentUser: null,
  activeScreen: "profile",
  message: "",
  hasCharacterModel: false,
  sourceImageExists: false,
  generationInProgress: false,
  appNotice: "",
  characterImageVersion: Date.now(),
  authDraft: {
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  }
};

function getAccounts() {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "[]");
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  window.localStorage.setItem(storageKey, JSON.stringify(accounts));
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
  const currentFighter = fighters[0];
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
                      <span>Gold III</span>
                      <span>Roster 8/20</span>
                    </div>
                  </div>
                </div>
              </div>
              <aside class="panel character-viewer-card">
                <div class="viewer-copy">
                  <p class="eyebrow">Featured Character</p>
                  <h3>3D Turntable Viewer</h3>
                  <p>Once we generate a <code>.glb</code>, the character will appear here on a podium and can be rotated to see the full model.</p>
                </div>
                <div class="viewer-stage">
                  ${state.hasCharacterModel ? `
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
                <p class="viewer-meta">Planned asset path: <code>${characterModelPath}</code></p>
              </aside>
            </div>
            <div class="content-grid profile-tools-grid">
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
            </div>
            <div class="dashboard-grid">
              <article class="panel"><p class="eyebrow">Joined</p><h3>${formatDate(state.currentUser.joinedAt)}</h3><p>Stored locally in browser storage for now.</p></article>
              <article class="panel"><p class="eyebrow">Current Division</p><h3>Gold III</h3><p>Your profile page can become the home for rank and battle record.</p></article>
              <article class="panel"><p class="eyebrow">Favorite Fighter</p><h3>Nova Rush</h3><p>Fast duelist, high-agility closer, and current headliner for your roster.</p></article>
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
                  <p>Speed Duelist</p>
                  <div class="stat-row"><span>Power 72</span><span>Agility 91</span></div>
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
            </div>
            <div class="roster-grid">
              ${fighters.map((fighter, index) => `
                <article class="fighter-card ${index === 0 ? "selected" : ""}">
                  <span class="tag">${fighter.rarity}</span>
                  <h4>${fighter.name}</h4>
                  <p>${fighter.className}</p>
                  <div class="fighter-stats">
                    <span>Power ${fighter.stats.Power}</span>
                    <span>Defense ${fighter.stats.Defense}</span>
                    <span>Speed ${fighter.stats.Speed}</span>
                    <span>Vitality ${fighter.stats.Vitality}</span>
                  </div>
                </article>
              `).join("")}
            </div>
            <div class="content-grid">
              <article class="panel">
                <div class="panel-header"><div><p class="eyebrow">Selected Fighter</p><h3>${currentFighter.name}</h3></div><span class="pill">Level ${currentFighter.level}</span></div>
                <p>${currentFighter.summary}</p>
                <div class="bars">
                  ${Object.entries(currentFighter.stats).map(([label, value]) => `
                    <div class="bar"><span>${label}</span><div class="bar-track"><i class="bar-fill" style="width:${value}%"></i></div></div>
                  `).join("")}
                </div>
              </article>
              <article class="panel">
                <div class="panel-header"><div><p class="eyebrow">Career Notes</p><h3>Battle history matters</h3></div></div>
                <ul class="clean-list">${currentFighter.notes.map((note) => `<li>${note}</li>`).join("")}</ul>
              </article>
            </div>
          </section>
        ` : ""}

        ${state.activeScreen === "fighter-lab" ? `
          <section>
            <div class="section-intro"><div><p class="eyebrow">Creation Flow</p><h3>Fighter Lab</h3></div></div>
            <div class="content-grid">
              <article class="panel upload-zone"><div><p class="eyebrow">Step 1</p><h3>Photo Intake Placeholder</h3><p>The final app will support camera capture or upload.</p></div></article>
              <article class="panel">
                <p class="eyebrow">Step 2</p><h3>Fighter Reveal</h3>
                <div class="reveal-card"><div class="portrait-orb"></div><div><h4>Generated Fighter Card</h4><p>Class, rarity, stats, trait, and visual identity will appear here after generation.</p></div></div>
                <div class="attribute-grid">${["Power","Defense","Speed","Agility","Vitality","Focus"].map((label) => `<span>${label}</span>`).join("")}</div>
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
              ${[
                ["#01", "OrbitKid", "Diamond I", "920"],
                ["#12", "You", "Gold III", "711"],
                ["#13", "FrostByte", "Gold III", "706"],
                ["#14", "NovaPalm", "Gold II", "699"]
              ].map((row) => `<div class="leaderboard-row ${row[1] === "You" ? "active" : ""}"><span>${row[0]}</span><span>${row[1]}</span><span>${row[2]}</span><span>${row[3]}</span></div>`).join("")}
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
    authForm.addEventListener("submit", (event) => {
      event.preventDefault();
      syncAuthDraftFromInputs();
      handleAuthSubmit();
    });
  }

  const authSubmitButton = document.getElementById("auth-submit-button");
  if (authSubmitButton) {
    authSubmitButton.addEventListener("click", () => {
      syncAuthDraftFromInputs();
      handleAuthSubmit();
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

  const logout = document.getElementById("logout");
  if (logout) {
    logout.addEventListener("click", () => {
      state.authenticated = false;
      state.currentUser = null;
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

function handleAuthSubmit() {
  const accounts = getAccounts();
  const email = state.authDraft.email.trim().toLowerCase();
  const password = state.authDraft.password;

  if (state.mode === "login") {
    const isDemo = email === demoAccount.email.toLowerCase() && password === demoAccount.password;
    if (isDemo) {
      loginAsDemo();
      return;
    }

    const matched = accounts.find((account) => account.email === email && account.password === password);
    if (!matched) {
      state.message = "No matching account found yet. Use the demo account or create a local profile.";
      render();
      return;
    }

    state.authenticated = true;
    state.currentUser = matched;
    state.activeScreen = "profile";
    state.message = "";
    resetAuthDraft();
    render();
    return;
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

  if (email === demoAccount.email.toLowerCase() || accounts.some((account) => account.email === email)) {
    state.message = "That email is already in use in this local prototype.";
    render();
    return;
  }

  const account = {
    username,
    email,
    password,
    joinedAt: new Date().toISOString()
  };

  accounts.push(account);
  saveAccounts(accounts);

  state.authenticated = true;
  state.currentUser = account;
  state.activeScreen = "profile";
  state.message = "";
  resetAuthDraft();
  render();
}

function loginAsDemo() {
  state.authenticated = true;
  state.currentUser = {
    username: demoAccount.username,
    email: demoAccount.email,
    joinedAt: "2026-04-19T12:00:00.000Z"
  };
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
