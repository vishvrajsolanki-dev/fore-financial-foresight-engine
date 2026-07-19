"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  User,
  Shield,
  Bell,
  CreditCard,
  Palette,
  HelpCircle,
  FileDown,
  Trash2,
} from "lucide-react";
import AppShell from "@/components/shell/AppShell";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";
import { applyAppearance, type Appearance } from "@/lib/theme/appearance";
import { PLANS } from "@/lib/billing/plans";

type Section =
  | "menu"
  | "profile"
  | "security"
  | "notifications"
  | "billing"
  | "appearance"
  | "help"
  | "privacy";

const CARDS: { id: Section; title: string; body: string; icon: typeof User }[] = [
  { id: "profile", title: "Profile", body: "Name and email", icon: User },
  { id: "security", title: "Security", body: "Password and sessions", icon: Shield },
  { id: "notifications", title: "Notifications", body: "Email and in-app alerts", icon: Bell },
  { id: "billing", title: "Billing", body: "Plan and subscription", icon: CreditCard },
  { id: "appearance", title: "Appearance", body: "Light or Evening", icon: Palette },
  { id: "help", title: "Help", body: "Docs and security", icon: HelpCircle },
  { id: "privacy", title: "Privacy", body: "Export and delete", icon: FileDown },
];

export default function SettingsPage() {
  const { fullStackEnabled, authUser, logout } = useFinancialContext();
  const [section, setSection] = useState<Section>("menu");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(authUser?.email ?? "");
  const [appearance, setAppearanceState] = useState<Appearance>("light");
  const [notif, setNotif] = useState({
    emailProduct: true,
    emailSecurity: true,
    emailMarketing: false,
    inAppAlerts: true,
    weeklyBrief: true,
  });
  const [plan, setPlan] = useState("free");
  const [sessions, setSessions] = useState<{ id: string; current: boolean; createdAt: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!fullStackEnabled) return;
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setName(d.profile.name ?? "");
          setEmail(d.profile.email ?? "");
        }
      })
      .catch(() => undefined);
    fetch("/api/account/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences) {
          setAppearanceState(d.preferences.appearance === "evening" ? "evening" : "light");
          setNotif(d.preferences.notifications);
        }
      })
      .catch(() => undefined);
    fetch("/api/account/billing")
      .then((r) => r.json())
      .then((d) => {
        if (d.subscription?.plan) setPlan(d.subscription.plan);
      })
      .catch(() => undefined);
  }, [fullStackEnabled]);

  async function saveProfile() {
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || null }),
    });
    setMsg(res.ok ? "Profile saved" : "Could not save profile");
  }

  async function saveAppearance(next: Appearance) {
    setAppearanceState(next);
    applyAppearance(next);
    if (!fullStackEnabled) {
      setMsg("Appearance saved on this device");
      return;
    }
    await fetch("/api/account/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appearance: next }),
    });
    setMsg("Appearance saved");
  }

  async function saveNotifications() {
    const res = await fetch("/api/account/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notif),
    });
    setMsg(res.ok ? "Notifications saved" : "Could not save");
  }

  async function savePlan(next: string) {
    const res = await fetch("/api/account/billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: next }),
    });
    if (res.ok) {
      setPlan(next);
      setMsg(`Plan updated to ${next}`);
    } else {
      setMsg("Could not update plan");
    }
  }

  async function changePassword() {
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setMsg(res.ok ? "Password updated — other sessions revoked" : "Password change failed");
  }

  async function loadSessions() {
    const res = await fetch("/api/account/sessions");
    const d = await res.json();
    setSessions(d.sessions ?? []);
  }

  async function exportData() {
    window.location.href = "/api/account/export";
  }

  async function deleteAccount() {
    if (!confirm("Delete your account and all financial data? This cannot be undone.")) return;
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      await logout();
      window.location.href = "/";
    } else setMsg("Delete failed");
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="display text-3xl">Settings</h1>
          <p className="muted mt-1">Account and preferences</p>
        </div>
        {section !== "menu" && (
          <button className="btn-ghost btn text-sm" onClick={() => setSection("menu")}>
            All settings
          </button>
        )}
      </div>
      {msg && <p className="text-sm mb-3" style={{ color: "var(--accent)" }}>{msg}</p>}

      {!fullStackEnabled && section === "menu" && (
        <p className="muted text-sm mb-4">Demo mode — appearance works locally; account APIs need DATABASE_URL.</p>
      )}

      {section === "menu" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 rise-in">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                className="card text-left"
                onClick={() => {
                  setSection(c.id);
                  if (c.id === "security" && fullStackEnabled) loadSessions();
                }}
              >
                <Icon size={20} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
                <h2 className="display text-xl mt-3">{c.title}</h2>
                <p className="muted text-sm mt-1">{c.body}</p>
              </button>
            );
          })}
        </div>
      )}

      {section === "profile" && (
        <div className="card max-w-lg grid gap-3">
          <label className="grid gap-1 text-sm">
            Name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={!fullStackEnabled} />
          </label>
          <label className="grid gap-1 text-sm">
            Email
            <input className="input" value={email} disabled />
          </label>
          <button className="btn w-fit" onClick={saveProfile} disabled={!fullStackEnabled}>
            Save profile
          </button>
        </div>
      )}

      {section === "security" && (
        <div className="grid gap-4 max-w-lg">
          <div className="card grid gap-3">
            <h2 className="font-semibold">Change password</h2>
            <input
              className="input"
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              className="input"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button className="btn w-fit" onClick={changePassword} disabled={!fullStackEnabled}>
              Update password
            </button>
          </div>
          <div className="card">
            <h2 className="font-semibold mb-2">Sessions</h2>
            <ul className="text-sm space-y-2">
              {sessions.map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span className="muted">{new Date(s.createdAt).toLocaleString()}</span>
                  {s.current ? <span className="pill pill-success">Current</span> : null}
                </li>
              ))}
              {!sessions.length && <li className="muted">No sessions loaded</li>}
            </ul>
          </div>
        </div>
      )}

      {section === "notifications" && (
        <div className="card max-w-lg grid gap-3">
          {(
            [
              ["emailProduct", "Product emails"],
              ["emailSecurity", "Security emails"],
              ["emailMarketing", "Marketing emails"],
              ["inAppAlerts", "In-app alerts"],
              ["weeklyBrief", "Weekly brief"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 text-sm">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={notif[key]}
                onChange={(e) => setNotif((n) => ({ ...n, [key]: e.target.checked }))}
                disabled={!fullStackEnabled}
              />
            </label>
          ))}
          <button className="btn w-fit" onClick={saveNotifications} disabled={!fullStackEnabled}>
            Save notifications
          </button>
        </div>
      )}

      {section === "billing" && (
        <div className="grid sm:grid-cols-3 gap-4">
          {Object.values(PLANS).map((p) => (
            <div key={p.id} className="card" style={plan === p.id ? { borderColor: "var(--accent)" } : undefined}>
              <h2 className="display text-xl">{p.name}</h2>
              <p className="tabular mt-1">₹{p.priceMonthlyInr}/mo</p>
              <button
                className="btn mt-4 w-full"
                disabled={!fullStackEnabled || plan === p.id}
                onClick={() => savePlan(p.id)}
              >
                {plan === p.id ? "Current plan" : "Select"}
              </button>
            </div>
          ))}
        </div>
      )}

      {section === "appearance" && (
        <div className="card max-w-lg grid gap-3">
          <p className="muted text-sm">Themes: Light and Evening (Twilight). Not a harsh dark mode.</p>
          <div className="flex gap-3">
            <button
              className={`btn ${appearance === "light" ? "" : "btn-ghost"}`}
              onClick={() => saveAppearance("light")}
            >
              Light
            </button>
            <button
              className={`btn ${appearance === "evening" ? "" : "btn-ghost"}`}
              onClick={() => saveAppearance("evening")}
            >
              Evening
            </button>
          </div>
        </div>
      )}

      {section === "help" && (
        <div className="card max-w-lg grid gap-3">
          <Link href="/docs/security" className="btn-ghost btn justify-start">
            Security documentation
          </Link>
          <Link href="/features" className="btn-ghost btn justify-start">
            Features
          </Link>
          <Link href="/pricing" className="btn-ghost btn justify-start">
            Pricing
          </Link>
        </div>
      )}

      {section === "privacy" && (
        <div className="card max-w-lg grid gap-3">
          <button className="btn w-fit" onClick={exportData} disabled={!fullStackEnabled}>
            <FileDown size={16} /> Export my data
          </button>
          <button className="btn-danger btn w-fit" onClick={deleteAccount} disabled={!fullStackEnabled}>
            <Trash2 size={16} /> Delete account
          </button>
        </div>
      )}
    </AppShell>
  );
}
