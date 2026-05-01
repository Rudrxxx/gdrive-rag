"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, HardDrive, User, Sparkles, FileText, ArrowRight, Trash2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from "axios";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

interface Message {
  role: "user" | "ai";
  content: string;
  sources?: { doc_id: string; name: string; chunk_text: string }[];
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="block w-1.5 h-1.5 rounded-full bg-gray-400"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }} />
      ))}
    </div>
  );
}

export function ChatInterface() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${getApiBaseUrl()}/chat/history?t=${new Date().getTime()}`);
        if (res.data?.history) setMessages(res.data.history);
      } catch (err) { console.error("Failed to load chat history", err); }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSourceClick = (docName: string) => {
    if (loading) return;
    handleSubmit(undefined, `Please provide a comprehensive summary of the document: ${docName}`);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ docName: string }>;
      if (ce.detail?.docName) handleSourceClick(ce.detail.docName);
    };
    window.addEventListener('requestDocumentSummary', handler);
    return () => window.removeEventListener('requestDocumentSummary', handler);
  }, [loading]);

  const handleSubmit = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const userQuery = (overrideQuery || query).trim();
    if (!userQuery) return;
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setLoading(true);
    try {
      const res = await axios.post(`${getApiBaseUrl()}/ask`, { query: userQuery });
      setMessages((prev) => [...prev, { role: "ai", content: res.data.answer, sources: res.data.sources }]);
    } catch (err: any) {
      let errorMsg = "Sorry, I encountered an error answering that.";
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string' && err.response.data.detail.includes('Rate limit reached'))
          errorMsg = "The AI rate limit has been reached. Please wait a while.";
        else errorMsg = `Error: ${err.response.data.detail}`;
      }
      setMessages((prev) => [...prev, { role: "ai", content: errorMsg }]);
    } finally { setLoading(false); }
  };


  const handleClearChat = async () => {
    if (loading || messages.length === 0) return;
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
    try {
      setLoading(true);
      await axios.delete(`${getApiBaseUrl()}/chat`);
      setMessages([]); setConfirmClear(false);
    } catch (err) { console.error("Failed to clear chat", err); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top bar */}
      <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
        <span className="text-sm font-medium text-gray-900">DriveAI</span>
        {messages.length > 0 && (
          <button onClick={handleClearChat} disabled={loading}
            className={`flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50 ${confirmClear ? "text-red-500" : "text-gray-400 hover:text-gray-600"}`}>
            <Trash2 className="w-3.5 h-3.5" />
            {confirmClear ? "Click again to confirm" : "Clear Chat"}
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="h-[60vh] flex flex-col items-center justify-center">
              <HardDrive className="w-10 h-10 text-gray-300" />
              <p className="text-base font-medium text-gray-900 mt-4">Ask anything about your documents</p>
              <p className="text-sm text-gray-400 mt-1">Your synced files are indexed and ready to query.</p>
            </div>
          ) : messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "gap-3"}`}>
              {msg.role === "ai" && <Sparkles className="w-4 h-4 text-gray-400 shrink-0 mt-1" />}
              <div className={msg.role === "user"
                ? "bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-lg"
                : "flex flex-col gap-2 min-w-0 max-w-2xl"}>
                <div className={msg.role === "user"
                  ? "prose prose-sm prose-invert max-w-none"
                  : "text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-900 prose-strong:text-gray-900"}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.sources.map((src, i) => (
                      <button key={i} onClick={() => handleSourceClick(src.name)}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer active:scale-95">
                        <FileText className="w-3 h-3" /><span className="truncate max-w-[180px]">{src.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <Sparkles className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
              <TypingDots />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your documents… Press Enter to send"
              className="flex-1 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 px-4 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 placeholder-gray-400 transition-all" />
            <button type="submit" disabled={!query.trim() || loading}
              className="bg-gray-900 text-white rounded-lg w-9 h-9 flex items-center justify-center hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-gray-900 transition-colors shrink-0">
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <p className="text-center text-[10px] text-gray-400 mt-2">LLaMA 3.3 can make mistakes. Always verify important information.</p>
        </div>
      </div>
    </div>
  );
}
