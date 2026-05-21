"use client";
import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationPanel({ notifications, sellerId, label, onClose, bellRef }) {
  const markAllRead = useMutation(api.notifications.markAllRead);
  const panelRef    = useRef();

  useEffect(() => {
    if (notifications?.some(n => !n.read)) markAllRead({ sellerId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handler(e) {
      // Ignore clicks on the bell — the bell's onClick handles toggling
      if (bellRef?.current?.contains(e.target)) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, bellRef]);

  const sorted = [...(notifications ?? [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 15);
  const unread = sorted.filter(n => !n.read).length;

  return (
    <div
      ref={panelRef}
      className="absolute top-full end-0 mt-2 z-50 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col"
      style={{ width: 260, maxHeight: 300 }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-gray-800">{label}</p>
          {unread > 0 && (
            <span className="text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full leading-none">
              {unread}
            </span>
          )}
        </div>
        <button onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-300">
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <p className="text-xs text-gray-400">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sorted.map(n => {
              const inner = (
                <>
                  <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${!n.read ? "bg-rose-500" : "bg-gray-300"}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] leading-snug text-gray-700">{n.message}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</p>
                      {n.url && <span className="text-[10px] text-rose-500 font-semibold">View →</span>}
                    </div>
                  </div>
                </>
              );
              const cls = `w-full text-start px-3 py-2.5 flex gap-2.5 items-start transition-colors ${
                !n.read ? "bg-rose-50/70 hover:bg-rose-100/60" : "hover:bg-gray-50"
              }`;
              return n.url ? (
                <Link key={n._id} href={n.url} onClick={onClose} className={cls}>
                  {inner}
                </Link>
              ) : (
                <div key={n._id} className={cls}>{inner}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
