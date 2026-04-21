const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const crypto = require("crypto");

const port = process.env.PORT || 3100;
const publicDir = path.join(__dirname, "..", "public");
const rootDir = path.join(__dirname, "..");
const sourceImagePath = path.join(publicDir, "assets", "characters", "source", "profile-character.png");
const modelPath = path.join(publicDir, "assets", "characters", "models", "profile-character.glb");
const generatorScriptPath = path.join(rootDir, "tools", "generate_profile_model.py");
const pythonExePath = "C:\\Users\\binny\\AppData\\Local\\Programs\\Python\\Python311\\python.exe";
const localDataDir = path.join(rootDir, "data");
const localDbPath = path.join(localDataDir, "local-db.json");
let generationInProgress = false;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendFile(filePath, response) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream"
    });
    response.end(data);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 15 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function ensureLocalDb() {
  fs.mkdirSync(localDataDir, { recursive: true });

  if (!fileExists(localDbPath)) {
    fs.writeFileSync(localDbPath, JSON.stringify({ users: [], characters: [] }, null, 2));
  }
}

function readLocalDb() {
  ensureLocalDb();

  try {
    const data = JSON.parse(fs.readFileSync(localDbPath, "utf8"));
    return {
      users: Array.isArray(data.users) ? data.users : [],
      characters: Array.isArray(data.characters) ? data.characters : []
    };
  } catch {
    return { users: [], characters: [] };
  }
}

function writeLocalDb(db) {
  ensureLocalDb();
  fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2));
}

function normalizeRankedScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.floor(score));
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: String(user.username || ""),
    email: String(user.email || "").toLowerCase(),
    joinedAt: user.joinedAt || new Date().toISOString(),
    rankedScore: normalizeRankedScore(user.rankedScore)
  };
}

function sanitizeCharacter(character) {
  if (!character) {
    return null;
  }

  return {
    id: character.id,
    userId: character.userId,
    name: String(character.name || "Unknown Fighter"),
    className: String(character.className || "Fighter"),
    power: String(character.power || "Unknown"),
    powerRarity: String(character.powerRarity || "Common"),
    rarity: String(character.powerRarity || character.rarity || "Common"),
    level: normalizeRankedScore(character.level) || 1,
    summary: String(character.summary || ""),
    notes: Array.isArray(character.notes) ? character.notes.map((note) => String(note)) : [],
    stats: {
      Attack: normalizeRankedScore(character.stats?.Attack),
      Defense: normalizeRankedScore(character.stats?.Defense),
      Agility: normalizeRankedScore(character.stats?.Agility),
      Vitality: normalizeRankedScore(character.stats?.Vitality)
    },
    createdAt: character.createdAt || new Date().toISOString()
  };
}

function findUserById(db, userId) {
  return db.users.find((user) => user.id === userId);
}

function requireUser(db, userId) {
  const user = findUserById(db, userId);
  if (!user) {
    throw new Error("User not found.");
  }

  return user;
}

function getCharacterStatus() {
  return {
    sourceImageExists: fileExists(sourceImagePath),
    modelExists: fileExists(modelPath),
    generationInProgress
  };
}

function ensureCharacterDirs() {
  fs.mkdirSync(path.dirname(sourceImagePath), { recursive: true });
  fs.mkdirSync(path.dirname(modelPath), { recursive: true });
}

function saveUploadedCharacter(dataUrl) {
  const match = /^data:image\/png;base64,(.+)$/i.exec(dataUrl || "");
  if (!match) {
    throw new Error("Only PNG uploads are supported right now.");
  }

  ensureCharacterDirs();
  fs.writeFileSync(sourceImagePath, Buffer.from(match[1], "base64"));
}

function runProfileGeneration() {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonExePath, [generatorScriptPath], {
      cwd: rootDir,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `Generator exited with code ${code}`));
    });
  });
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `localhost:${port}`}`);

  if (request.method === "GET" && request.url === "/api/character-status") {
    sendJson(response, 200, getCharacterStatus());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/register") {
    readJsonBody(request)
      .then((body) => {
        const db = readLocalDb();
        const username = String(body.username || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        if (!username || !email || !password) {
          sendJson(response, 400, { ok: false, message: "Username, email, and password are required." });
          return;
        }

        if (db.users.some((user) => String(user.email || "").toLowerCase() === email)) {
          sendJson(response, 409, { ok: false, message: "That email is already in use in this local prototype." });
          return;
        }

        const user = {
          id: createId("user"),
          username,
          email,
          password,
          joinedAt: new Date().toISOString(),
          rankedScore: 0
        };

        db.users.push(user);
        writeLocalDb(db);
        sendJson(response, 201, { ok: true, user: sanitizeUser(user), characters: [] });
      })
      .catch((error) => {
        sendJson(response, 400, { ok: false, message: error.message || "Registration failed." });
      });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    readJsonBody(request)
      .then((body) => {
        const db = readLocalDb();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const user = db.users.find((entry) => String(entry.email || "").toLowerCase() === email && entry.password === password);

        if (!user) {
          sendJson(response, 401, { ok: false, message: "No matching account found yet." });
          return;
        }

        const characters = db.characters
          .filter((character) => character.userId === user.id)
          .map(sanitizeCharacter)
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

        sendJson(response, 200, { ok: true, user: sanitizeUser(user), characters });
      })
      .catch((error) => {
        sendJson(response, 400, { ok: false, message: error.message || "Login failed." });
      });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/characters") {
    try {
      const db = readLocalDb();
      const userId = url.searchParams.get("userId");
      requireUser(db, userId);
      const characters = db.characters
        .filter((character) => character.userId === userId)
        .map(sanitizeCharacter)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
      sendJson(response, 200, { ok: true, characters });
    } catch (error) {
      sendJson(response, 404, { ok: false, message: error.message || "Characters not found." });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/characters") {
    readJsonBody(request)
      .then((body) => {
        const db = readLocalDb();
        const user = requireUser(db, body.userId);
        const character = sanitizeCharacter({
          ...body.character,
          id: createId("fighter"),
          userId: user.id,
          createdAt: new Date().toISOString()
        });

        db.characters.push(character);
        writeLocalDb(db);
        sendJson(response, 201, { ok: true, character });
      })
      .catch((error) => {
        sendJson(response, 400, { ok: false, message: error.message || "Saving character failed." });
      });
    return;
  }

  if (request.method === "PATCH" && url.pathname.startsWith("/api/characters/")) {
    readJsonBody(request)
      .then((body) => {
        const db = readLocalDb();
        const user = requireUser(db, body.userId);
        const characterId = decodeURIComponent(url.pathname.replace("/api/characters/", ""));
        const characterIndex = db.characters.findIndex((character) => character.id === characterId && character.userId === user.id);

        if (characterIndex < 0) {
          sendJson(response, 404, { ok: false, message: "Character not found." });
          return;
        }

        const name = String(body.name || "").trim();
        if (!name) {
          sendJson(response, 400, { ok: false, message: "Character name is required." });
          return;
        }

        const character = sanitizeCharacter({
          ...db.characters[characterIndex],
          name,
          summary: String(db.characters[characterIndex].summary || "").replace(/^.*? is a /, `${name} is a `)
        });

        db.characters[characterIndex] = character;
        writeLocalDb(db);
        sendJson(response, 200, { ok: true, character });
      })
      .catch((error) => {
        sendJson(response, 400, { ok: false, message: error.message || "Updating character failed." });
      });
    return;
  }

  if (request.method === "POST" && request.url === "/api/upload-character") {
    readJsonBody(request)
      .then((body) => {
        saveUploadedCharacter(body.dataUrl);
        sendJson(response, 200, {
          ok: true,
          message: "Character source image uploaded successfully.",
          status: getCharacterStatus()
        });
      })
      .catch((error) => {
        sendJson(response, 400, { ok: false, message: error.message || "Upload failed." });
      });
    return;
  }

  if (request.method === "POST" && request.url === "/api/generate-profile-model") {
    if (generationInProgress) {
      sendJson(response, 409, {
        ok: false,
        message: "Generation is already running.",
        status: getCharacterStatus()
      });
      return;
    }

    if (!fileExists(sourceImagePath)) {
      sendJson(response, 400, {
        ok: false,
        message: "Upload a PNG character image first before generating the 3D model.",
        status: getCharacterStatus()
      });
      return;
    }

    if (!fileExists(pythonExePath)) {
      sendJson(response, 500, {
        ok: false,
        message: "Python 3.11 was not found at the configured local path.",
        status: getCharacterStatus()
      });
      return;
    }

    generationInProgress = true;

    runProfileGeneration()
      .then(({ stdout, stderr }) => {
        generationInProgress = false;
        sendJson(response, 200, {
          ok: true,
          message: "3D model generation finished.",
          stdout,
          stderr,
          status: getCharacterStatus()
        });
      })
      .catch((error) => {
        generationInProgress = false;
        sendJson(response, 500, {
          ok: false,
          message: error.message || "3D model generation failed.",
          status: getCharacterStatus()
        });
      });
    return;
  }

  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[\\/])+/, "");
  const filePath = path.join(publicDir, safePath);
  const hasExtension = Boolean(path.extname(filePath));

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(filePath, response);
      return;
    }

    if (hasExtension) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    sendFile(path.join(publicDir, "index.html"), response);
  });
});

server.listen(port, () => {
  console.log(`Man Hunt prototype running at http://localhost:${port}`);
});
