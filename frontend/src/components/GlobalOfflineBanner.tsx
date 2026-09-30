"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

export default function GlobalOfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => {
      setIsOffline(false);
      setWasOffline(true);
      const timer = setTimeout(() => setWasOffline(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleManualRetry = () => {
    setIsRetrying(true);
    if (navigator.onLine) {
      window.location.reload();
    } else {
      setTimeout(() => {
        setIsRetrying(false);
      }, 800);
    }
  };

  if (!isOffline && !wasOffline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[99999] pointer-events-none flex justify-center p-3 animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl border transition-all duration-300 max-w-[92vw] sm:max-w-md ${
          isOffline
            ? "bg-[#0A0F1D]/95 border-red-500/40 text-white shadow-red-950/40"
            : "bg-[#0A0F1D]/95 border-[#00D96B]/40 text-white shadow-emerald-950/40"
        }`}
      >
        {isOffline ? (
          <>
            <div className="w-7 h-7 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight">No Connection</p>
              <p className="text-[10px] text-slate-400 truncate">
                Check network to sync updates
              </p>
            </div>
            <button
              onClick={handleManualRetry}
              disabled={isRetrying}
              className="px-2.5 py-1 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[11px] font-semibold flex items-center gap-1 border border-red-500/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`}
              />
              <span>Retry</span>
            </button>
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-full bg-[#00D96B]/15 border border-[#00D96B]/30 flex items-center justify-center shrink-0">
              <Wifi className="w-3.5 h-3.5 text-[#00D96B]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#00D96B] leading-tight">
                Connection Restored
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                Syncing with DOON Riders cloud...
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
