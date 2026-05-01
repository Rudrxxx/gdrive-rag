"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

interface StorageStatsData {
  vectors: number;
  docs_count: number;
  faiss_size_kb: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function StorageStats({ refreshKey }: { refreshKey?: number }) {
  const [stats, setStats] = useState<StorageStatsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${getApiBaseUrl()}/storage/stats`);
        if (!cancelled) {
          setStats({
            vectors: res.data.vectors ?? 0,
            docs_count: res.data.docs_count ?? 0,
            faiss_size_kb: res.data.faiss_size_kb ?? 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch storage stats:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (!stats) return null;

  const items = [
    { value: formatNumber(stats.vectors), label: "vectors" },
    { value: formatNumber(stats.docs_count), label: "docs" },
    { value: `${formatNumber(stats.faiss_size_kb)} KB`, label: "index" },
  ];

  return (
    <div className="shrink-0 border-t border-white/[0.05] bg-[#050505] px-4 py-3 flex items-center justify-between">
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-col items-center flex-1 relative">
          <span className="text-[0.7rem] font-semibold text-white/70 leading-none tabular-nums">
            {item.value}
          </span>
          <span className="text-[0.55rem] text-white/30 mt-0.5 uppercase tracking-wider font-medium">
            {item.label}
          </span>

          {/* Divider (skip last) */}
          {idx < items.length - 1 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-5 bg-white/[0.06]" />
          )}
        </div>
      ))}
    </div>
  );
}
