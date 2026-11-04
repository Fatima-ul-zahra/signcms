
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Monitor,
  Images,
  Layers,
  CalendarDays,
  Users,
  Settings,
  LogOut,
  RefreshCw,
} from "lucide-react";

import { createApi, TOKEN_KEY } from "./api.js";
import Login from "./Login.jsx";
import {
  Dashboard,
  Screens,
  MediaLibrary,
  Playlists,
  Campaigns,
  Placeholder,
} from "./pages.jsx";

const NAV = [
  ["Dashboard", LayoutDashboard],
  ["Screens", Monitor],
  ["Media Library", Images],
  ["Playlists", Layers],
];

const PLACEHOLDER_TEXT = {
  Users: "User management APIs are role-protected; the initial owner account is configured through the setup script.",
  Settings: "Configure the API URL and server environment in the project .env files.",
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("Dashboard");
  const [data, setData] = useState({});
  const [error, setError] = useState("");

  const api = useMemo(() => createApi(token), [token]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;

    setError("");

    try {
      const [dash, screens, media, playlists, campaigns] =
        await Promise.all(
          [
            "/api/dashboard",
            "/api/screens",
            "/api/media",
            "/api/playlists",
            "/api/campaigns",
          ].map((p) => api(p))
        );

      setData({ dash, screens, media, playlists, campaigns });
    } catch (e) {
      setError(e.message);
    }
  }, [api, token]);

  useEffect(() => {
    if (!token) return;

    api("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(logout);

    load();
  }, [token, api, load, logout]);

  async function run(action) {
    try {
      await action();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function login(email, password) {
    setError("");

    try {
      const res = await createApi("")("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (e) {
      setError(e.message);
    }
  }

  const pairScreen = () =>
    run(async () => {
      const label = prompt("Screen name") || "New screen";

      const res = await api("/api/screens/pairing-codes", {
        method: "POST",
        body: JSON.stringify({ label }),
      });

      alert(
        `Pairing code: ${res.code}\nValid for ${res.expiresInMinutes} minutes`
      );
    });

  const uploadMedia = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    return run(() =>
      api("/api/media", {
        method: "POST",
        body: form,
      })
    );
  };

  const newPlaylist = () => {
    const name = prompt("Playlist name");
    if (!name) return;

    return run(() =>
      api("/api/playlists", {
        method: "POST",
        body: JSON.stringify({ name, items: [] }),
      })
    );
  };

  const changePlaylist = (playlist, items) =>
    run(() =>
      api(`/api/playlists/${playlist._id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: playlist.name,
          items,
        }),
      })
    );

  // Delete media function
  const deleteMedia = (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;

    return run(() =>
      api(`/api/media/${item._id}`, {
        method: "DELETE",
      })
    );
  };

  const newCampaign = () => {
    const name = prompt("Campaign name");
    if (!name) return;

    return run(() =>
      api("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({ name }),
      })
    );
  };

  const assignPlaylist = (screen) => {
    const playlist = data.playlists?.[0];

    if (!playlist) return alert("Create a playlist first");

    return run(async () => {
      await api(`/api/screens/${screen.screenId}/assign-playlist`, {
        method: "POST",
        body: JSON.stringify({ playlistId: playlist._id }),
      });

      alert(`Assigned ${playlist.name}`);
    });
  };

  if (!token) {
    return <Login onLogin={login} error={error} />;
  }

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <span className="brand-mark">S</span>
          <b>SignCMS</b>
        </div>

        <div className="workspace">
          WORKSPACE <span>TF</span>
        </div>

        {NAV.map(([name, Icon]) => (
          <button
            key={name}
            className={"nav " + (page === name ? "active" : "")}
            onClick={() => setPage(name)}
          >
            <Icon size={18} />
            {name}
          </button>
        ))}

        <div className="side-bottom">
          <div className="avatar">
            {(user?.name || "O")[0]}
          </div>

          <div>
            <b>{user?.name || "Owner"}</b>
            <small>{user?.role}</small>
          </div>

          <button className="iconbtn" onClick={logout}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <span className="eyebrow">SIGNAGE MANAGEMENT</span>
            <h2>{page}</h2>
          </div>

          <div className="head-actions">
            <span className="live-dot" />
            System connected

            <button className="iconbtn" onClick={load}>
              <RefreshCw size={17} />
            </button>
          </div>
        </header>

        {error && <div className="error banner">{error}</div>}

        {page === "Dashboard" && (
          <Dashboard
            data={data}
            onNavigate={setPage}
            onPair={pairScreen}
            onUpload={uploadMedia}
            onNewPlaylist={newPlaylist}
          />
        )}

        {page === "Screens" && (
          <Screens
            screens={data.screens}
            onPair={pairScreen}
            onAssign={assignPlaylist}
          />
        )}

        {/* Updated Media Library with Delete functionality */}
        {page === "Media Library" && (
          <MediaLibrary
            media={data.media}
            onUpload={uploadMedia}
            onDelete={deleteMedia}
          />
        )}

        {page === "Playlists" && (
          <Playlists
            playlists={data.playlists}
            media={data.media}
            onNew={newPlaylist}
            onChange={changePlaylist}
          />
        )}

        {page === "Campaigns" && (
          <Campaigns
            campaigns={data.campaigns}
            onNew={newCampaign}
          />
        )}

        {PLACEHOLDER_TEXT[page] && (
          <Placeholder
            title={page}
            text={PLACEHOLDER_TEXT[page]}
          />
        )}

        <footer>
          SignCMS · Digital signage management
          <span>v1.0.0</span>
        </footer>
      </main>
    </div>
  );
}
