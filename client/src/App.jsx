import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  createLog,
  generateWeekly,
  getInsightHistory,
  getMe,
  getToken,
  getTrends,
  login,
  register,
  setToken,
} from "./api/client";
import Dashboard from "./components/Dashboard";
import InsightCard from "./components/InsightCard";
import LogForm from "./components/LogForm";
import ChatPanel from "./components/ChatPanel";
import healthLogo from "./assets/health-logo.svg";

const defaultAuth = {
  email: "",
  password: "",
  name: "",
};

function App() {
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(defaultAuth);
  const [user, setUser] = useState(null);
  const [days, setDays] = useState(30);
  const [trends, setTrends] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState({
    auth: false,
    log: false,
    trends: false,
    weekly: false,
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const hasToken = useMemo(() => Boolean(getToken()), []);

  const refreshInsights = useCallback(async (windowDays = days) => {
    setLoading((prev) => ({ ...prev, trends: true }));
    try {
      const trendData = await getTrends(windowDays);
      setTrends(trendData);
      const historyData = await getInsightHistory();
      setHistory(historyData.reports || []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load trends.");
    } finally {
      setLoading((prev) => ({ ...prev, trends: false }));
    }
  }, [days]);

  useEffect(() => {
    if (!hasToken) return;
    (async () => {
      try {
        const me = await getMe();
        setUser(me.user);
        await refreshInsights(30);
      } catch {
        setToken("");
      }
    })();
  }, [hasToken, refreshInsights]);

  async function handleAuth(event) {
    event.preventDefault();
    setLoading((prev) => ({ ...prev, auth: true }));
    setError("");
    try {
      const payload =
        authMode === "register"
          ? { email: authForm.email, password: authForm.password, name: authForm.name || undefined }
          : { email: authForm.email, password: authForm.password };
      const data = authMode === "register" ? await register(payload) : await login(payload);
      setUser(data.user);
      await refreshInsights(30);
      setNotice(`Welcome ${data.user.name || data.user.email}`);
    } catch (err) {
      setError(err?.response?.data?.error || "Authentication failed.");
    } finally {
      setLoading((prev) => ({ ...prev, auth: false }));
    }
  }

  async function handleCreateLog(payload, onDone) {
    setLoading((prev) => ({ ...prev, log: true }));
    setError("");
    try {
      await createLog(payload);
      onDone?.();
      setNotice("Daily log saved.");
      await refreshInsights(days);
    } catch (err) {
      const serverError = err?.response?.data?.error;
      const details = err?.response?.data?.details?.[0]?.message;
      setError(serverError || details || err?.message || "Failed to save daily log.");
    } finally {
      setLoading((prev) => ({ ...prev, log: false }));
    }
  }

  async function handleGenerateWeekly() {
    setLoading((prev) => ({ ...prev, weekly: true }));
    setError("");
    try {
      const data = await generateWeekly(days);
      setWeeklyReport(data.report);
      setHistory((prev) => (data.snapshotId ? [{ id: data.snapshotId, narrative: data.report.narrative }, ...prev] : prev));
      setNotice("Weekly report generated.");
    } catch (err) {
      setError(err?.response?.data?.error || "Could not generate weekly report.");
    } finally {
      setLoading((prev) => ({ ...prev, weekly: false }));
    }
  }

  async function handleAsk(question) {
    try {
      const data = await generateWeekly(days);
      setWeeklyReport(data.report);
      return `Question: ${question}\n\n${data.report.narrative}`;
    } catch (err) {
      return err?.response?.data?.error || "Could not answer right now.";
    }
  }

  function logout() {
    setToken("");
    window.location.reload();
  }

  if (!user) {
    return (
      <main className="app-shell auth-shell">
        <section className="auth-card">
          <div className="brand-heading auth-brand">
            <img src={healthLogo} alt="Health Intelligence logo" className="brand-logo" />
            <h1>Personal Health & Habit Intelligence</h1>
          </div>
          <p className="subtitle">
            Log daily signals. Detect delayed patterns. Get weekly narrative insights from your own data.
          </p>

          <div className="tabs">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => setAuthMode("register")}
              type="button"
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuth}>
            {authMode === "register" ? (
              <label className="field">
                <span>Name</span>
                <input
                  value={authForm.name}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Your name"
                />
              </label>
            ) : null}
            <label className="field">
              <span>Email</span>
              <input
                value={authForm.email}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="you@example.com"
                type="email"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                value={authForm.password}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="minimum 8 characters"
                type="password"
                minLength={8}
                required
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={loading.auth}>
              {loading.auth ? "Please wait..." : authMode === "register" ? "Create Account" : "Sign In"}
            </button>
          </form>

          {error ? <p className="msg error">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand-heading app-brand">
            <img src={healthLogo} alt="Health Intelligence logo" className="brand-logo" />
            <h1>Health Intelligence Agent</h1>
          </div>
          <p>Hi {user.name || user.email}. Your personal longitudinal analytics workspace.</p>
        </div>
        <div className="top-actions">
          <label>
            <select
              value={days}
              onChange={async (event) => {
                const nextDays = Number(event.target.value);
                setDays(nextDays);
                await refreshInsights(nextDays);
              }}
            >
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
          <button className="btn" onClick={handleGenerateWeekly} disabled={loading.weekly}>
            {loading.weekly ? "Generating..." : "Generate Weekly Report"}
          </button>
          <button className="btn btn-quiet" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {notice ? <p className="msg ok">{notice}</p> : null}
      {error ? <p className="msg error">{error}</p> : null}

      <section className="layout">
        <div className="left-col">
          <LogForm onSubmit={handleCreateLog} loading={loading.log} />
          <ChatPanel onAsk={handleAsk} loading={loading.weekly} />
        </div>
        <div className="right-col">
          <Dashboard trends={trends} loading={loading.trends} />
          <InsightCard report={weeklyReport} loading={loading.weekly} />
          <section className="card">
            <div className="card-head">
              <h2>Report History</h2>
              <p>Latest saved weekly narratives.</p>
            </div>
            <ul className="history-list">
              {history.length ? history.slice(0, 5).map((item) => <li key={item.id}>{item.narrative}</li>) : <li>No snapshots yet.</li>}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}

export default App;
