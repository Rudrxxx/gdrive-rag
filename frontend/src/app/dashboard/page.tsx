"use client";

import { ChatInterface } from "@/components/ChatInterface";
import { SyncPanel } from "@/components/SyncPanel";
import { DocsPanel } from "@/components/DocsPanel";
import { StorageStats } from "@/components/StorageStats";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
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
          // Fetch already-synced documents so the sidebar populates on load
          try {
            const docsRes = await axios.get(`${getApiBaseUrl()}/documents`);
            if (docsRes.data?.documents?.length > 0) {
              setDocs(docsRes.data.documents);
            }
          } catch (err) {
            console.error("Failed to fetch existing documents:", err);
          }
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
    return <div className="flex items-center justify-center min-h-screen text-gray-500 bg-white font-body">Verifying access...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 font-body overflow-hidden selection:bg-gray-900/10">

      {/* Left Sidebar */}
      <div className="w-[300px] shrink-0 border-r border-gray-200 bg-[#FAFAFA] flex flex-col">
        
        {/* App Brand Header */}
        <Link href="/" className="h-14 flex items-center px-5 border-b border-gray-200 hover:bg-gray-100/50 transition-colors cursor-pointer">
          <span className="text-sm font-semibold text-gray-900">✦ DriveAI</span>
        </Link>

        {/* Sync Section */}
        <div className="px-4 py-4 border-b border-gray-200">
          <SyncPanel onSyncSuccess={handleSyncSuccess} autoSync={shouldAutoSync} />
        </div>

        {/* Docs Section */}
        <div className="flex-1 flex flex-col min-h-0 px-4 pt-4">
          <h3 className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3 pl-0.5">Knowledge Base</h3>
          <DocsPanel docs={docs} onDocumentClick={handleDocumentClick} onDocumentDelete={handleDocumentDelete} />
        </div>

        {/* Storage Stats */}
        <StorageStats refreshKey={statsRefreshKey} />
      </div>

      {/* Right Column: Chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <ChatInterface />
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-500 bg-white font-body">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
