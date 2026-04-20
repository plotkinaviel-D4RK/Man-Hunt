const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const port = process.env.PORT || 3100;
const publicDir = path.join(__dirname, "..", "public");
const rootDir = path.join(__dirname, "..");
const sourceImagePath = path.join(publicDir, "assets", "characters", "source", "profile-character.png");
const modelPath = path.join(publicDir, "assets", "characters", "models", "profile-character.glb");
const generatorScriptPath = path.join(rootDir, "tools", "generate_profile_model.py");
const pythonExePath = "C:\\Users\\binny\\AppData\\Local\\Programs\\Python\\Python311\\python.exe";
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
  if (request.method === "GET" && request.url === "/api/character-status") {
    sendJson(response, 200, getCharacterStatus());
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

  const requestPath = request.url === "/" ? "/index.html" : request.url;
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
