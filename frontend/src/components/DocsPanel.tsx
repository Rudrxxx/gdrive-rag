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

function getExtBadgeStyle(ext: string): { bg: string; text: string } {
  switch (ext) {
    case "PDF":
      return { bg: "bg-red-500/15 border-red-500/25", text: "text-red-400" };
    case "DOC":
    case "DOCX":
      return { bg: "bg-blue-500/15 border-blue-500/25", text: "text-blue-400" };
    case "TXT":
      return { bg: "bg-white/[0.08] border-white/[0.12]", text: "text-white/50" };
    default:
      return { bg: "bg-white/[0.06] border-white/[0.1]", text: "text-white/40" };
  }
}

export function DocsPanel({
  docs,
  onDocumentClick,
  onDocumentDelete,
}: {
  docs: { id: string; name: string; status: string }[];
  onDocumentClick?: (name: string) => void;
  onDocumentDelete?: (docId: string) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation(); // don't trigger summarize
    if (deletingId) return;

    if (confirmDeleteId === docId) {
      // Second click — confirmed
      performDelete(docId);
    } else {
      // First click — arm confirmation
      setConfirmDeleteId(docId);
      setTimeout(() => setConfirmDeleteId((prev) => (prev === docId ? null : prev)), 2000);
    }
  };

  const performDelete = async (docId: string) => {
    setDeletingId(docId);
    setConfirmDeleteId(null);
    try {
      await axios.delete(`${getApiBaseUrl()}/documents/${docId}`);
      onDocumentDelete?.(docId);
      showToast("Removed");
    } catch (err) {
      console.error("Failed to delete document:", err);
      showToast("Failed to remove");
    } finally {
      setDeletingId(null);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="relative flex-1 overflow-y-auto pr-1 -mr-1 space-y-1.5 custom-scrollbar">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-0 left-0 right-0 z-30 flex justify-center pointer-events-none"
          >
            <div className="px-3 py-1.5 rounded-lg bg-white/[0.08] border border-white/[0.1] text-xs font-medium text-white/70 backdrop-blur-md shadow-lg">
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-white/30 gap-3">
          <Database className="w-6 h-6 opacity-50" />
          <p className="text-xs">No documents synced.</p>
        </div>
      ) : (
        docs.map((doc, idx) => {
          const ext = getFileExtension(doc.name);
          const badge = getExtBadgeStyle(ext);
          const isConfirming = confirmDeleteId === doc.id;
          const isDeleting = deletingId === doc.id;

          return (
            <motion.div
              key={`${doc.id}-${idx}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: isDeleting ? 0.5 : 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => onDocumentClick && onDocumentClick(doc.name)}
              className="p-2.5 rounded-lg flex items-center gap-3 group/item hover:bg-white/[0.06] transition-all cursor-pointer active:scale-[0.98]"
              title="Click to ask AI to summarize this document"
            >
              {/* File icon */}
              <div className="w-7 h-7 rounded-md bg-white/[0.05] flex items-center justify-center text-white/50 group-hover/item:text-white group-hover/item:bg-white/[0.1] transition-colors border border-white/[0.05]">
                <FileText className="w-3.5 h-3.5" />
              </div>

              {/* Filename */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white/70 group-hover/item:text-white transition-colors">
                  {doc.name}
                </p>
              </div>

              {/* Summarize label (hover) */}
              <span className="text-[0.65rem] font-medium text-indigo-400 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 whitespace-nowrap shrink-0">
                Summarize →
              </span>

              {/* Delete button (hover-visible) */}
              <button
                onClick={(e) => handleDeleteClick(e, doc.id)}
                disabled={isDeleting}
                className={`shrink-0 p-1 rounded-md transition-all duration-200 ${
                  isConfirming
                    ? "opacity-100 text-red-400 bg-red-500/15 border border-red-500/25"
                    : "opacity-0 group-hover/item:opacity-100 text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-transparent"
                } disabled:opacity-30`}
                title={isConfirming ? "Click again to confirm removal" : "Remove from knowledge base"}
              >
                <Trash2 className="w-3 h-3" />
              </button>

              {/* File type badge */}
              {ext && (
                <span
                  className={`text-[0.6rem] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${badge.bg} ${badge.text}`}
                >
                  {ext}
                </span>
              )}
            </motion.div>
          );
        })
      )}
    </div>
  );
}
