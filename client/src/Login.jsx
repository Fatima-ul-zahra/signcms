import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import "./login.css";

const SCREENS = [
  { name: "Screen 01", tone: "violet" },
  { name: "Screen 02", tone: "blue" },
  { name: "Screen 03", tone: "pink" },
];

export default function Login({ onLogin, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lg-page">
      {/* animated background */}
      <div className="lg-bg" aria-hidden="true">
        <span className="lg-orb lg-orb-1" />
        <span className="lg-orb lg-orb-2" />
        <span className="lg-orb lg-orb-3" />
        <span className="lg-grid" />
      </div>

      {/* left: brand + animated screens */}
      <section className="lg-showcase" aria-hidden="true">
        <div className="lg-brand">
          <span className="lg-logo">S</span>
          <span className="lg-brand-name">SignCMS</span>
        </div>

        <h2 className="lg-headline">
          Your screens.
          <br />
          <span className="lg-gradient-text">Your content. One place.</span>
        </h2>
        <p className="lg-sub">Upload media, build playlists and send them to every screen from one dashboard.</p>

        <div className="lg-screens">
          {SCREENS.map((screen, i) => (
            <div key={screen.name} className={`lg-screen lg-tone-${screen.tone} lg-float-${i + 1}`}>
              <div className="lg-screen-top">
                <span className="lg-live" />
                <span>{screen.name}</span>
                <em>Online</em>
              </div>
              <div className="lg-screen-art" />
              <div className="lg-screen-lines">
                <span />
                <span />
              </div>
              <div className="lg-progress">
                <span />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* right: login card */}
      <main className="lg-side">
        <form className="lg-card" onSubmit={submit}>
          <div className="lg-card-logo">S</div>
          <h1>Welcome back</h1>
          <p className="lg-card-sub">Sign in to manage your screens.</p>

          {error && (
            <div className="lg-error" key={error} role="alert">
              {error}
            </div>
          )}

          <label className="lg-label" htmlFor="lg-email">Email</label>
          <div className="lg-field">
            <Mail size={17} />
            <input
              id="lg-email"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label className="lg-label" htmlFor="lg-password">Password</label>
          <div className="lg-field">
            <Lock size={17} />
            <input
              id="lg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="lg-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <button className="lg-submit" disabled={loading}>
            {loading ? <span className="lg-spinner" /> : <>Sign in <ArrowRight size={17} /></>}
          </button>

          <small className="lg-hint">Need access? Contact your administrator.</small>
        </form>
      </main>
    </div>
  );
}
