# Man Hunt Prototype

This is a lightweight local prototype stack with a plain working login page, demo account, and local account creation.

## Run locally

1. Open the folder in VS Code.
2. Open the terminal.
3. Run `node server/server.js`
4. Open `http://localhost:3100`

You can also run `start-local.bat` from the project root for the same result.

## Demo account

- Email: `demo@manhunt.app`
- Password: `ArenaDemo2026!`

## Folder structure

- `public/` - browser files
- `server/` - local Node server
- `tools/` - 3D generation tools and scripts
- `dist/` - old build artifacts, safe to ignore

## Current scope

- Login page opens first
- Create account saves to browser storage
- Demo login works
- Profile page opens after login
- Profile page can upload the character PNG directly into the project
- Profile page can trigger local 3D model generation
- Roster, fighter lab, battle room, and rankings are stubbed product screens
- Profile page includes a ready slot for a spinning 3D character model

## 3D profile character workflow

1. Start the site with `node server/server.js`
2. Log in and open the `Profile` page
3. Upload a PNG with the `Choose PNG` button
4. Click `Generate 3D Model`
5. The generated model should end up here:
   - `public/assets/characters/models/profile-character.glb`
6. Refresh `http://localhost:3100` if needed and the profile viewer will pick it up automatically

Manual fallback:

- Source image path: `public/assets/characters/source/profile-character.png`
- Generator helper: `generate-profile-model.bat`
