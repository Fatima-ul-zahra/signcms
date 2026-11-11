const $ = (id) => document.getElementById(id);

const HEARTBEAT_MS = 15 * 1000;
const SYNC_MS = 60 * 1000;
const SAVED_PLAYLIST_KEY = "signcms_playlist";
const SAVED_KEYS = ["signcms_api", "signcms_token", "signcms_screen", SAVED_PLAYLIST_KEY];

// Only exists in the installed player; it saves media files on this PC.
const desktop = window.signcmsDesktop;

const state = {
  api: "",
  deviceToken: "",
  screenId: "",
  items: [],
  index: 0,
  timer: null,
  currentMediaId: null,
  started: false,
  syncing: false,
};

function showMessage(text) {
  $("message").textContent = text;
}

async function request(path, options = {}) {
  const response = await fetch(state.api + path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(state.deviceToken ? { "x-device-token": state.deviceToken } : {}),
    },
  });
  const body = await response.json();
  if (response.status === 401 && state.deviceToken) {
    // This screen was deleted on the website (or its pairing is no longer valid): go back to the pairing screen.
    SAVED_KEYS.forEach((key) => localStorage.removeItem(key));
    location.reload();
    return new Promise(() => {});
  }
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

const postJson = (path, payload) =>
  request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

// ---------- Pairing ----------
$("pairBtn").onclick = async () => {
  state.api = $("api").value.trim().replace(/\/$/, "");
  const code = $("code").value.trim();
  try {
    const result = await postJson("/api/player/pair", { code });
    state.deviceToken = result.deviceToken;
    state.screenId = result.screenId;
    localStorage.removeItem(SAVED_PLAYLIST_KEY);
    localStorage.setItem("signcms_api", state.api);
    localStorage.setItem("signcms_token", state.deviceToken);
    localStorage.setItem("signcms_screen", state.screenId);
    start();
  } catch (error) {
    showMessage(error.message);
  }
};

// ---------- Lifecycle ----------
async function start() {
  if (state.started) return;
  state.started = true;

  $("pair").hidden = true;
  $("stage").hidden = false;
  $("screenName").textContent = "Screen " + state.screenId;

  // Play what was saved last time right away, even before (or without) the server.
  loadSavedPlaylist();

  heartbeat();
  setInterval(heartbeat, HEARTBEAT_MS);
  setInterval(sync, SYNC_MS);
  await sync();
}

async function heartbeat() {
  try {
    await postJson("/api/player/heartbeat", { currentMediaId: state.currentMediaId });
    $("state").textContent = "Online";
  } catch {
    $("state").textContent = state.items.length ? "Offline · playing saved content" : "Offline · retrying";
  }
}

// ---------- Saved playlist (works without internet) ----------
function loadSavedPlaylist() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_PLAYLIST_KEY) || "[]");
    if (Array.isArray(saved) && saved.length) {
      state.items = saved;
      state.index = 0;
      play();
    }
  } catch {
    /* ignore a damaged saved playlist */
  }
}

const playlistKey = (items) => JSON.stringify(items.map((item) => [item.mediaId, item.duration, item.media?.filename]));

async function sync() {
  if (state.syncing) return;
  state.syncing = true;
  try {
    const result = await request("/api/player/sync");
    const items = result.playlist?.items || [];

    if (!items.length) {
      state.items = [];
      localStorage.removeItem(SAVED_PLAYLIST_KEY);
      clearTimeout(state.timer);
      $("content").innerHTML = '<div style="color:#aaa">No playlist assigned yet</div>';
      if (desktop) desktop.pruneCache([]).catch(() => {});
      return;
    }

    // Save every file on this PC. The old playlist keeps playing while new files download.
    if (desktop) {
      for (const item of items) {
        try {
          item.localUrl = await desktop.cacheMedia(state.api + item.media.url, item.media.filename);
        } catch {
          /* keep the server URL as a fallback */
        }
      }
    }

    if (playlistKey(items) !== playlistKey(state.items)) {
      state.items = items;
      state.index = 0;
      localStorage.setItem(SAVED_PLAYLIST_KEY, JSON.stringify(items));
      play();
    } else {
      // Same playlist: only refresh the saved file locations.
      state.items.forEach((item, i) => {
        if (items[i].localUrl) item.localUrl = items[i].localUrl;
      });
      localStorage.setItem(SAVED_PLAYLIST_KEY, JSON.stringify(state.items));
    }

    if (desktop) desktop.pruneCache(items.map((item) => item.media.filename)).catch(() => {});
  } catch {
    $("state").textContent = state.items.length ? "Offline · playing saved content" : "Offline";
  } finally {
    state.syncing = false;
  }
}

// ---------- Playback ----------
function play(attempt = 0) {
  clearTimeout(state.timer);
  if (!state.items.length) return;
  if (state.index >= state.items.length) state.index = 0;

  const item = state.items[state.index];
  if (!item.media) return next();

  state.currentMediaId = item.mediaId;
  const useSaved = attempt === 0 && Boolean(item.localUrl);
  const url = useSaved ? item.localUrl : state.api + item.media.url;

  // If the saved file cannot be opened, try the server copy; if that fails too, skip after a short pause.
  const failed = () => {
    if (useSaved) return play(1);
    state.timer = setTimeout(next, 2000);
  };

  const content = $("content");
  content.innerHTML = "";

  if (item.media.mimeType.startsWith("video")) {
    const video = document.createElement("video");
    Object.assign(video, { src: url, autoplay: true, muted: false, playsInline: true });
    video.onended = next;
    video.onerror = failed;
    content.append(video);
    video.play().catch(() => {});
  } else {
    const image = document.createElement("img");
    image.onload = () => {
      state.timer = setTimeout(next, (item.duration || 10) * 1000);
    };
    image.onerror = failed;
    image.src = url;
    content.append(image);
  }
}

function next() {
  state.index = (state.index + 1) % state.items.length;
  play();
}

// ---------- Resume a previously paired screen ----------
state.api = localStorage.getItem("signcms_api") || "";
state.deviceToken = localStorage.getItem("signcms_token") || "";
state.screenId = localStorage.getItem("signcms_screen") || "";

if (state.api && state.deviceToken && state.screenId) {
  $("api").value = state.api;
  start().catch(() => {});
}
