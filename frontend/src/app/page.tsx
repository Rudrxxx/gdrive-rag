"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, Link as LinkIcon, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

/* ── Animation helpers ── */
const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const, delay },
});

const features = [
  {
    icon: FileText,
    title: "Instant Answers",
    desc: "Ask questions in plain English and get answers pulled directly from your documents.",
  },
  {
    icon: LinkIcon,
    title: "Source Citations",
    desc: "Every answer shows exactly which file it came from. No guessing, no hallucinations.",
  },
  {
    icon: RefreshCw,
    title: "Incremental Sync",
    desc: "Only syncs new or changed files. Your knowledge base stays fresh automatically.",
  },
];

function HomeContent() {
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (error === "invalid_state") {
      alert(
        "Login failed: Invalid state. This usually happens if the server restarts during login. Please try again."
      );
    }

    // Check auth status on mount
    const checkAuth = async () => {
      try {
        const statusRes = await axios.get(`${getApiBaseUrl()}/auth/status`);
        if (statusRes.data.authenticated) {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };
    checkAuth();
  }, [error]);

  const handleDashboardClick = async () => {
    setLoading(true);
    try {
      const statusRes = await axios.get(`${getApiBaseUrl()}/auth/status`);
      if (statusRes.data.authenticated) {
        window.location.href = "/dashboard";
        return;
      } else {
        window.location.href = `${getApiBaseUrl()}/auth/login`;
      }
    } catch (error) {
      console.error("Failed to check auth, trying to login anyway:", error);
      window.location.href = `${getApiBaseUrl()}/auth/login`;
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const statusRes = await axios.get(`${getApiBaseUrl()}/auth/status`);
      if (statusRes.data.authenticated) {
        window.location.href = "/dashboard";
        return;
      }
      window.location.href = `${getApiBaseUrl()}/auth/login`;
    } catch (error) {
      console.error("Failed to check auth, trying to login anyway:", error);
      window.location.href = `${getApiBaseUrl()}/auth/login`;
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground font-body relative overflow-x-hidden selection:bg-foreground/10">

      {/* ── Dot grid background ── */}
      <div className="dot-grid pointer-events-none absolute inset-0 z-0" />

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-20 py-5">
        <Link href="/" className="text-xl font-semibold tracking-tight text-foreground">
          ✦ DriveAI
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
        </div>

        {isAuthenticated ? (
          <button
            onClick={() => { window.location.href = "/dashboard"; }}
            className="rounded-full px-5 py-2 text-sm font-medium bg-foreground text-white hover:bg-foreground/90 transition-colors"
          >
            Dashboard
          </button>
        ) : (
          <button
            onClick={handleLogin}
            disabled={loading}
            className="rounded-full px-5 py-2 text-sm font-medium bg-foreground text-white hover:bg-foreground/90 transition-colors disabled:opacity-60"
          >
            Get Started
          </button>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-24 pb-8 min-h-[80vh]">

        {/* Badge */}
        <motion.div {...fadeUp(0)}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-1.5 text-sm text-muted-foreground font-body mb-6">
            RAG-powered document intelligence ✦
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.1)}
          className="font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-2xl text-center mt-2"
        >
          Ask anything about your{" "}
          <em className="not-italic" style={{ fontStyle: "italic" }}>Google Drive</em>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          {...fadeUp(0.2)}
          className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed font-body text-center"
        >
          Connect your Drive, sync your documents, and get instant AI-powered answers with source citations — no hallucinations.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div {...fadeUp(0.3)} className="mt-7 flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={() => { window.location.href = "/dashboard"; }}
              className="rounded-full px-6 py-3 text-sm font-medium bg-foreground text-white hover:bg-foreground/90 transition-colors"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="rounded-full px-6 py-3 text-sm font-medium bg-foreground text-white hover:bg-foreground/90 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting…
                  </>
                ) : (
                  "Connect Google Drive"
                )}
              </button>
              <button
                onClick={handleDashboardClick}
                className="rounded-full px-6 py-3 text-sm font-medium border border-border text-foreground hover:bg-gray-50 transition-colors"
              >
                See how it works
              </button>
            </>
          )}
        </motion.div>
      </section>

      {/* ── Feature Cards ── */}
      <motion.section
        {...fadeUp(0.4)}
        id="features"
        className="relative z-10 px-6 pb-24 flex justify-center"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border bg-white p-6 text-left shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <feature.icon className="w-[18px] h-[18px] text-foreground/70" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Footer ── */}
      <footer className="relative z-10 flex justify-center gap-6 pb-8 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">
          Terms of Service
        </Link>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-foreground bg-background font-body">
          Loading…
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
