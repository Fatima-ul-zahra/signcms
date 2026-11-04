const $ = (id) => document.getElementById(id);

const HEARTBEAT_MS = 15 * 1000;
const SYNC_MS = 60 * 1000;

const state = {
  api: "",
  deviceToken: "",
  screenId: "",
  items: [],
  index: 0,
  timer: null,
  currentMediaId: null,
  started: false,
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

  await sync();
  setInterval(heartbeat, HEARTBEAT_MS);
  setInterval(sync, SYNC_MS);
}

async function heartbeat() {
  try {
    await postJson("/api/player/heartbeat", { currentMediaId: state.currentMediaId });
    $("state").textContent = "Online";
  } catch {
    $("state").textContent = "Offline · retrying";
  }
}

async function sync() {
  try {
    const result = await request("/api/player/sync");
    const items = result.playlist?.items || [];
    const changed = JSON.stringify(items) !== JSON.stringify(state.items);
    state.items = items;

    if (!items.length) {
      $("content").innerHTML = '<div style="color:#aaa">No playlist assigned yet</div>';
      return;
    }
    if (state.index >= items.length) state.index = 0;
    // Start playback on first load, or restart when the playlist changed.
    if (changed || !$("content").children.length) play();
  } catch {
    $("state").textContent = "Offline";
  }
}

// ---------- Playback ----------
function play() {
  clearTimeout(state.timer);
  if (!state.items.length) return;

  const item = state.items[state.index];
  if (!item.media) return next();

  state.currentMediaId = item.mediaId;
  const url = state.api + item.media.url;
  const content = $("content");
  content.innerHTML = "";

  if (item.media.mimeType.startsWith("video")) {
    const video = document.createElement("video");
    Object.assign(video, { src: url, autoplay: true, muted: false, playsInline: true });
    video.onended = next;
    video.onerror = next;
    content.append(video);
    video.play().catch(() => {});
  } else {
    const image = document.createElement("img");
    image.src = url;
    image.onload = () => {
      state.timer = setTimeout(next, (item.duration || 10) * 1000);
    };
    image.onerror = next;
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
