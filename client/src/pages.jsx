import React from "react";
import {
  Monitor, Images, Layers, CalendarDays, Plus, Upload, Play, Wifi, MonitorPlay,
} from "lucide-react";
import { API_URL } from "./api.js";

const ACCEPTED_MEDIA = "image/jpeg,image/png,image/webp,video/mp4";

function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

function ScreenStatus({ status }) {
  return <span className={"status " + status}>{status}</span>;
}

export function Dashboard({ data, onNavigate, onPair, onUpload, onNewPlaylist }) {
  const stats = [
    ["Total screens", data.dash?.screens ?? 0, Monitor],
    ["Online screens", data.dash?.onlineScreens ?? 0, Wifi],
    ["Media files", data.dash?.totalMedia ?? 0, Images],
    ["Active campaigns", data.dash?.activeCampaigns ?? 0, CalendarDays],
  ];
  const screens = data.screens || [];

  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow light">OVERVIEW</span>
          <h1>Your screens. Your content. One place.</h1>
          <p>Manage your digital signage network from a single workspace.</p>
        </div>
        <MonitorPlay size={70} />
      </div>

      <div className="stats">
        {stats.map(([label, value, Icon]) => (
          <div className="stat" key={label}>
            <Icon />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="grid2">
        <section className="panel">
          <div className="panel-head">
            <h3>Screen overview</h3>
            <button onClick={() => onNavigate("Screens")}>View all</button>
          </div>
          {screens.slice(0, 5).map((s) => (
            <div className="screen-row" key={s._id}>
              <div className="screen-icon"><Monitor /></div>
              <div className="grow">
                <b>{s.name}</b>
                <small>{String(s.screenId ?? s._id).slice(0, 12)}…</small>
              </div>
              <ScreenStatus status={s.status} />
            </div>
          ))}
          {!screens.length && <Empty>No screens paired yet. Generate a pairing code to get started.</Empty>}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Quick actions</h3></div>
          <button className="action" onClick={onPair}><Plus /> Pair a new screen</button>
          <label className="action">
            <Upload /> Upload media
            <input hidden type="file" accept={ACCEPTED_MEDIA} onChange={onUpload} />
          </label>
          <button className="action" onClick={onNewPlaylist}><Layers /> Create playlist</button>
        </section>
      </div>
    </>
  );
}

export function Screens({ screens = [], onPair, onAssign }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Your screens</h3>
        <button className="primary small" onClick={onPair}><Plus size={16} /> Pair screen</button>
      </div>
      <div className="table">
        {screens.map((s) => (
          <div className="table-row" key={s._id}>
            <Monitor />
            <div className="grow">
              <b>{s.name}</b>
              <small>{s.screenId ?? s._id}</small>
            </div>
            <ScreenStatus status={s.status} />
            <button onClick={() => onAssign(s)}>Assign first playlist</button>
            <button onClick={() => onDelete(s)} style={{ background: "#42272d", color: "#ff8c9a" }}>Delete</button>
          </div>
        ))}
      </div>
      {!screens.length && <Empty>No screens yet. Pair a Windows Mini PC player to begin.</Empty>}
    </section>
  );
}

export function MediaLibrary({ media = [], onUpload, onDelete }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Media library</h3>
        <label className="primary small">
          <Upload size={16} /> Upload media
          <input hidden type="file" accept={ACCEPTED_MEDIA} onChange={onUpload} />
        </label>
      </div>
      <div className="media-grid">
        {media.map((m) => (
          <div className="media-card" key={m._id}>
            {m.mimeType.startsWith("image") ? (
              <img src={API_URL + m.url} alt={m.name} />
            ) : (
              <div className="video-thumb"><Play /></div>
            )}
            <b>{m.name}</b>
            <small>{(m.size / 1024 / 1024).toFixed(1)} MB</small>
            <button
              onClick={() => onDelete(m)}
              style={{
                marginTop: 8,
                background: "#42272d",
                color: "#ff8c9a",
                padding: "6px 10px",
                borderRadius: 7,
                fontSize: 11,
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      {!media.length && <Empty>Upload images and MP4 videos to build your library.</Empty>}
    </section>
  );
}

const DURATIONS = [5, 10, 15, 30, 60];

export function Playlists({ playlists = [], media = [], onNew, onChange }) {
  const mediaName = (id) => media.find((m) => m._id === id)?.name || "(deleted media)";

  const addItem = (playlist, mediaId) => {
    if (!mediaId) return;
    onChange(playlist, [...playlist.items, { mediaId, duration: 10 }]);
  };
  const removeItem = (playlist, index) =>
    onChange(playlist, playlist.items.filter((_, i) => i !== index));
  const setDuration = (playlist, index, duration) =>
    onChange(playlist, playlist.items.map((item, i) => (i === index ? { ...item, duration: Number(duration) } : item)));
  const move = (playlist, index, delta) => {
    const items = [...playlist.items];
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    onChange(playlist, items);
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Playlists</h3>
        <button className="primary small" onClick={onNew}><Plus size={16} /> New playlist</button>
      </div>

      {playlists.map((p) => (
        <div key={p._id} style={{ borderBottom: "1px solid #252a37", padding: "14px 0" }}>
          <div className="table-row" style={{ border: 0 }}>
            <Layers />
            <div className="grow">
              <b>{p.name}</b>
              <small>{p.items.length} items</small>
            </div>
            <select
              value=""
              onChange={(e) => addItem(p, e.target.value)}
              style={{ background: "#1a1f2c", color: "#c4c9d5", border: "1px solid #2b3242", borderRadius: 7, padding: 7 }}
            >
              <option value="">+ Add media…</option>
              {media.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          {p.items.map((item, i) => (
            <div className="table-row" key={i} style={{ paddingLeft: 36 }}>
              <span>{i + 1}.</span>
              <div className="grow"><b>{mediaName(item.mediaId)}</b></div>
              <select
                value={item.duration}
                onChange={(e) => setDuration(p, i, e.target.value)}
                style={{ background: "#1a1f2c", color: "#c4c9d5", border: "1px solid #2b3242", borderRadius: 7, padding: 5 }}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} sec</option>
                ))}
              </select>
              <button onClick={() => move(p, i, -1)}>↑</button>
              <button onClick={() => move(p, i, 1)}>↓</button>
              <button onClick={() => removeItem(p, i)}>Remove</button>
            </div>
          ))}
          {!p.items.length && <Empty>Empty playlist. Use “Add media…” to add images or videos.</Empty>}
        </div>
      ))}
      {!playlists.length && <Empty>No playlists yet. Click “New playlist”.</Empty>}
    </section>
  );
}

export function Campaigns({ campaigns = [], onNew }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Campaigns</h3>
        <button className="primary small" onClick={onNew}><Plus size={16} /> New campaign</button>
      </div>
      {campaigns.map((c) => (
        <div className="table-row" key={c._id}>
          <CalendarDays />
          <div className="grow">
            <b>{c.name}</b>
            <small>{c.status}</small>
          </div>
        </div>
      ))}
      {!campaigns.length && <Empty>No campaigns created yet.</Empty>}
    </section>
  );
}

export function Placeholder({ title, text }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <Empty>{text}</Empty>
    </section>
  );
}
