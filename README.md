# SignCMS — Digital Signage Management System

A local-first starter implementation for managing advertising screens connected to Windows Mini PCs.

## What is included
- React CMS website (Vite)
- Express API with MongoDB
- Owner setup/login using password hashing and signed JWTs
- Screen pairing-code workflow and screen heartbeat endpoint
- Media upload/listing
- Playlist creation and screen assignment
- Campaign CRUD starter endpoints
- Electron Windows player shell with pairing, sync, playback and heartbeat
- API smoke-test script
- Windows setup documentation

## Requirements
- Node.js 20+
- MongoDB Community Server running locally
- Windows 10/11 for building/running the Electron player

## Quick start (PowerShell)

1. Install MongoDB Community Server and make sure the MongoDB service is running.
2. Open PowerShell in `signcms\server`:
   ```powershell
   Copy-Item .env.example .env
   npm install
   npm run setup-owner
   npm run dev
   ```
3. Open another PowerShell in `signcms\client`:
   ```powershell
   npm install
   npm run dev
   ```
4. Open `http://localhost:5173`.

The default local API is `http://localhost:4000`. Configure `VITE_API_URL` in `client/.env` if needed.

## First owner
Set `OWNER_EMAIL` and `OWNER_PASSWORD` in `server/.env` before running `npm run setup-owner`.
The setup script refuses to create another owner if one already exists. Never commit `.env`.

## Windows Player
In `signcms\player`:
```powershell
Copy-Item .env.example .env
npm install
npm run dev
```
For a Windows installer:
```powershell
npm run build:win
```
This build requires package registry access and a Windows build environment. It has not been built in this delivery environment.

## Deploying (quick checklist)
1. **Server** (Node 20+, MongoDB reachable only from the server):
   ```powershell
   cd server
   npm ci --omit=dev
   Copy-Item .env.example .env   # then fill JWT_SECRET, OWNER_PASSWORD, MONGODB_DB, CORS_ORIGIN
   npm run setup-owner
   npm start
   ```
   Put it behind an HTTPS reverse proxy (Caddy/nginx) and set `TRUST_PROXY=true`.
   Back up the `uploads/` folder and the MongoDB database.
2. **CMS website**: set `VITE_API_URL=https://your-api-domain` in `client/.env`, then
   `npm ci && npm run build` and serve `client/dist` as static files. `CORS_ORIGIN` on the server must equal the website's origin.
3. **Player**: pair each Mini PC using the HTTPS API URL. A packaged (installed) player starts with Windows.

Never ship `.env` files or `node_modules` in a zip or repository.

## Tests
With MongoDB and the API running:
```powershell
cd server
npm test
```
The current test is only a placeholder guard (it does not exercise the API). Use a separate `signcms_test` database for any tests you add.

## Important limitations
This is a functional foundation/MVP, not a certified production deployment. Before using it on customer screens, add HTTPS deployment, secure device credential rotation, upload malware scanning, backup/restore, operational monitoring, and end-to-end tests on the actual Mini PC and display. Electron startup-on-login is documented but not silently configured by the app.
