"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

interface StorageStatsData {
  vectors: number;
  docs_count: number;
  faiss_size_kb: number;
}

function fmt(n: number): string { return n.toLocaleString("en-US"); }

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
      } catch (err) { console.error("Failed to fetch storage stats:", err); }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (!stats) return null;

  const items = [
    { value: fmt(stats.vectors), label: "Vectors" },
    { value: fmt(stats.docs_count), label: "Docs" },
    { value: `${fmt(stats.faiss_size_kb)} KB`, label: "Index" },
  ];

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-col items-center flex-1 relative">
          <span className="text-xs font-medium text-gray-700 tabular-nums">{item.value}</span>
          <span className="text-[10px] text-gray-400 mt-0.5">{item.label}</span>
          {idx < items.length - 1 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-5 bg-gray-200" />
          )}
        </div>
      ))}
    </div>
  );
}
