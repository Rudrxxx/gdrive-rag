"use client";

import { ChatInterface } from "@/components/ChatInterface";
import { SyncPanel } from "@/components/SyncPanel";
import { DocsPanel } from "@/components/DocsPanel";
import { StorageStats } from "@/components/StorageStats";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { HardDrive } from "lucide-react";
import Link from "next/link";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

function DashboardContent() {
  const [docs, setDocs] = useState<{ id: string, name: string, status: string }[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldAutoSync = searchParams.get("sync") === "true";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get(`${getApiBaseUrl()}/auth/status`);
        if (res.data.authenticated) {
          setIsAuthenticated(true);
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to check auth status:", error);
        router.push("/");
      }
    };
    
    checkAuth();
  }, [router]);

  const handleSyncSuccess = (newDocs: { id: string, name: string, status: string }[]) => {
    setDocs((prev) => {
      // Prevent duplicates by checking doc.id
      const existingIds = new Set(prev.map(d => d.id));
      const uniqueNewDocs = newDocs.filter(d => !existingIds.has(d.id));
      return [...uniqueNewDocs, ...prev];
    });
    setStatsRefreshKey((k) => k + 1);
  };

  const handleDocumentClick = (docName: string) => {
    // We can dispatch a custom event that ChatInterface will listen to
    window.dispatchEvent(new CustomEvent('requestDocumentSummary', { detail: { docName } }));
  };

  const handleDocumentDelete = (docId: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    setStatsRefreshKey((k) => k + 1);
  };

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen text-white bg-[#030303]">Verifying access...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-[#030303] text-white font-sans overflow-hidden selection:bg-white selection:text-black">
      
      {/* --- PREMIUM BACKGROUND EFFECTS --- */}
      <div className="absolute inset-0 z-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[100vw] max-w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none z-0" />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#8080800A_1px,transparent_1px),linear-gradient(to_bottom,#8080800A_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Left Sidebar */}
      <div className="w-[320px] shrink-0 border-r border-white/[0.05] bg-[#080808] flex flex-col relative z-10">
        
        {/* App Brand Header */}
        <Link href="/" className="h-16 flex items-center px-6 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors cursor-pointer group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform" style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <HardDrive className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold tracking-wide text-[0.95rem] text-white/90 group-hover:text-white transition-colors">DriveAI</span>
        </Link>

        {/* Sync Section */}
        <div className="p-5 border-b border-white/[0.06]">
          <SyncPanel onSyncSuccess={handleSyncSuccess} autoSync={shouldAutoSync} />
        </div>

        {/* Docs Section */}
        <div className="flex-1 flex flex-col min-h-0 p-5 pt-5">
          <h3 className="text-[0.7rem] font-semibold text-white/40 uppercase tracking-[0.15em] mb-4 pl-1">Knowledge Base</h3>
          <DocsPanel docs={docs} onDocumentClick={handleDocumentClick} onDocumentDelete={handleDocumentDelete} />
        </div>

        {/* Storage Stats */}
        <StorageStats refreshKey={statsRefreshKey} />
      </div>

      {/* Right Column: Chat */}
      <div className="flex-1 relative z-10 flex flex-col min-w-0 bg-transparent">
        <ChatInterface />
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white bg-[#030303]">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
