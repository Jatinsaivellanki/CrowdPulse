"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  FlaskConical,
  Grid3X3,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  Video,
  X,
} from "lucide-react";
import { CrowdPulseLogo } from "./Logo";
import { fetchHealth } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/testing-lab", label: "Model Testing Lab", icon: FlaskConical },
  { href: "/video-analysis", label: "Video Analysis", icon: Video },
  { href: "/visualization", label: "Crowd Visualization", icon: Grid3X3 },
  { href: "/risk-alerts", label: "Risk & Alerts", icon: ShieldAlert },
  { href: "/performance", label: "Model Performance", icon: BarChart3 },
  { href: "/about", label: "About", icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetchHealth();
        if (active) {
          setHealth(res);
          setHealthError(null);
        }
      } catch (err) {
        if (active) {
          setHealth(null);
          setHealthError(err instanceof Error ? err.message : "Backend unreachable");
        }
      }
    };
    check();
    const timer = setInterval(check, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const modelOnline = Boolean(health?.model_loaded);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1 pt-1">
          <Link href="/" onClick={() => setMobileOpen(false)}>
            <CrowdPulseLogo />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1.5" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-cyan-500/20 to-sky-500/10 text-cyan-300 border border-cyan-400/30 shadow-sm shadow-cyan-500/10"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-300"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 border-t border-slate-800/80 pt-4">
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/60 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-400 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              Inference API
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                modelOnline
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  modelOnline ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              {modelOnline ? "Ready" : "Offline"}
            </span>
          </div>
          {health ? (
            <p className="font-mono text-[11px] text-slate-400 truncate">
              {health.model_name} · {health.device.toUpperCase()}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 truncate" title={healthError || ""}>
              {healthError ? "Backend unreachable" : "Checking API..."}
            </p>
          )}
        </div>
        <p className="px-1 text-[11px] leading-relaxed text-slate-500">
          Academic CNN Density Estimation · ShanghaiTech Part A &amp; B
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#050914] text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col border-r border-slate-800/80 bg-[#070d1d]/90 backdrop-blur-xl z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-800 bg-[#070d1d]">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800/80 bg-[#050914]/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <Link href="/">
            <CrowdPulseLogo />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-slate-800 bg-slate-900/70 p-2 text-slate-300 hover:text-white"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
