"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Database, Trash2 } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

function getFileExtension(name: string): string {
  const parts = name.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toUpperCase();
}

export function DocsPanel({
  docs, onDocumentClick, onDocumentDelete,
}: {
  docs: { id: string; name: string; status: string }[];
  onDocumentClick?: (name: string) => void;
  onDocumentDelete?: (docId: string) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (deletingId) return;
    if (confirmDeleteId === docId) { performDelete(docId); }
    else {
      setConfirmDeleteId(docId);
      setTimeout(() => setConfirmDeleteId((prev) => (prev === docId ? null : prev)), 2000);
    }
  };

  const performDelete = async (docId: string) => {
    setDeletingId(docId); setConfirmDeleteId(null);
    try {
      await axios.delete(`${getApiBaseUrl()}/documents/${docId}`);
      onDocumentDelete?.(docId); setToast("Removed");
    } catch { setToast("Failed to remove"); }
    finally { setDeletingId(null); }
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="relative flex-1 overflow-y-auto -mr-1 pr-1 space-y-0.5">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="absolute top-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
            <div className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium shadow-sm">{toast}</div>
          </motion.div>
        )}
      </AnimatePresence>
      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
          <Database className="w-5 h-5" /><p className="text-xs">No documents synced.</p>
        </div>
      ) : docs.map((doc, idx) => {
        const ext = getFileExtension(doc.name);
        const isConfirming = confirmDeleteId === doc.id;
        const isDeleting = deletingId === doc.id;
        return (
          <motion.div key={`${doc.id}-${idx}`} initial={{ opacity: 0 }} animate={{ opacity: isDeleting ? 0.4 : 1 }}
            onClick={() => onDocumentClick?.(doc.name)}
            className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 cursor-pointer group/item transition-colors"
            title="Click to summarize">
            <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">{doc.name}</span>
            <button onClick={(e) => handleDeleteClick(e, doc.id)} disabled={isDeleting}
              className={`shrink-0 p-1 rounded transition-all ${isConfirming ? "opacity-100 text-red-500" : "opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-red-500"} disabled:opacity-20`}>
              <Trash2 className="w-3 h-3" />
            </button>
            {ext && <span className="text-[9px] font-medium text-gray-400 shrink-0 uppercase">{ext}</span>}
          </motion.div>
        );
      })}
    </div>
  );
}
