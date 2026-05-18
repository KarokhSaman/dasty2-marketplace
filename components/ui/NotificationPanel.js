"use client";
import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
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

export default function NotificationPanel({ notifications, sellerId, label, onClose }) {
  const markAllRead = useMutation(api.notifications.markAllRead);
  const panelRef = useRef();

  // Mark all as read the moment the panel opens
  useEffect(() => {
    if (notifications?.some((n) => !n.read)) {
      markAllRead({ sellerId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click outside → close
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const sorted = [...(notifications ?? [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div
      ref={panelRef}
      className="absolute top-full end-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden flex flex-col"
      style={{ width: "min(320px, calc(100vw - 1rem))" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-72 divide-y divide-gray-50">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-300">
            <svg className="w-9 h-9 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm text-gray-400">No notifications</p>
          </div>
        ) : (
          sorted.map((n) => (
            <div
              key={n._id}
              className={`px-4 py-3 flex gap-3 items-start ${!n.read ? "bg-rose-50" : "hover:bg-gray-50"}`}
            >
              <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? "bg-rose-500" : "bg-gray-200"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
