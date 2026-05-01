"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Loader2, CheckCircle2, AlertCircle, LogOut } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

export function SyncPanel({ onSyncSuccess, autoSync = false }: { onSyncSuccess: (docs: {id: string, name: string, status: string}[]) => void, autoSync?: boolean }) {
  const [syncing, setSyncing] = useState(false);
  const [folderUrl, setFolderUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error" | "processing">("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Poll for storage stats to know when background processing is done
    let interval: NodeJS.Timeout;
    
    const checkStatus = async () => {
      try {
        const res = await axios.get(`${getApiBaseUrl()}/storage/stats`);
        if (res.data.status === "Processing in background...") {
          setStatus("processing");
          setMessage("AI is extracting text and indexing documents...");
        } else if (status === "processing" && res.data.status === "Ready") {
          setStatus("success");
          setMessage("Indexing complete! Documents are ready to be queried.");
        }
      } catch (err) {
        // ignore polling errors
      }
    };

    if (status === "processing" || status === "success") {
       checkStatus();
       interval = setInterval(checkStatus, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const handleSync = async (force: boolean = false) => {
    setSyncing(true);
    setStatus("idle");
    setMessage(force ? "Force syncing from Google Drive..." : "Syncing from Google Drive...");
    try {
      const urlParams = new URLSearchParams();
      if (force) urlParams.append("force", "true");
      if (folderUrl.trim()) urlParams.append("folder_url", folderUrl.trim());
      
      const res = await axios.post(`${getApiBaseUrl()}/sync-drive?${urlParams.toString()}`);
      setStatus("success");
      setMessage(res.data.message || `Successfully synced ${res.data.files_processed} files.`);
      
      if (res.data.files && res.data.files.length > 0) {
        onSyncSuccess(res.data.files.map((f: { id: string; name: string }) => ({
          id: f.id,
          name: f.name,
          status: "Synced"
        })));
      }
      
      // Clean up URL to remove ?sync=true
      router.replace("/dashboard");
    } catch (err: unknown) {
      setStatus("error");
      const errorMsg = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
      setMessage(errorMsg || "An error occurred during sync. The server might have timed out because the files were too large. Please click Sync again to continue.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (autoSync) {
      queueMicrotask(() => handleSync(true));
    }
  }, [autoSync]);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Connected indicator */}
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        <span className="text-xs text-gray-500">Connected</span>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        Fetch PDFs and TXTs from your Drive. Leave blank for root, or paste a folder link.
      </p>

      <input
        type="text"
        placeholder="https://drive.google.com/drive/folders/..."
        value={folderUrl}
        onChange={(e) => setFolderUrl(e.target.value)}
        disabled={syncing}
        className="w-full border border-gray-200 bg-white text-gray-900 placeholder-gray-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all text-xs"
      />

      <button
        onClick={() => handleSync(false)}
        disabled={syncing}
        className="w-full py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-gray-900 text-white hover:bg-gray-800"
      >
        {syncing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        {syncing ? "Syncing..." : "Sync Drive"}
      </button>
      
      <button
        onClick={() => handleSync(true)}
        disabled={syncing}
        className="w-full py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      >
        Force Sync All Files
      </button>

      <button
        onClick={async () => {
          try {
            await axios.post(`${getApiBaseUrl()}/disconnect-drive`);
            await new Promise(r => setTimeout(r, 500));
            router.push("/");
          } catch {
            setStatus("error");
            setMessage("Failed to logout.");
          }
        }}
        disabled={syncing}
        className="w-full py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        <LogOut className="w-3 h-3" />
        Logout &amp; Disconnect
      </button>

      {status !== "idle" && (
        <motion.div 
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-1 p-2.5 rounded-lg flex items-start gap-2 text-xs ${
            status === "success" ? "bg-green-50 border border-green-200 text-green-700" : 
            status === "processing" ? "bg-blue-50 border border-blue-200 text-blue-700" :
            "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {status === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-500" /> : 
           status === "processing" ? <Loader2 className="w-3.5 h-3.5 shrink-0 mt-0.5 animate-spin text-blue-500" /> :
           <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />}
          <span className="leading-relaxed">{message}</span>
        </motion.div>
      )}
    </div>
  );
}
