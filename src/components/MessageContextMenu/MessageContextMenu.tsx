'use client';

import { useRef, useState, useEffect } from 'react';

const DEFAULT_EMOJIS = ['❤️', '😂', '👀', '🫂', '👍', '😊'];

function resolveEmojis(usage: Record<string, number>): string[] {
  const sorted = Object.entries(usage).sort((a, b) => b[1] - a[1]).map(([e]) => e);
  const top = sorted.slice(0, 6);
  const fill = DEFAULT_EMOJIS.filter(e => !top.includes(e));
  return [...top, ...fill].slice(0, 6);
}

export async function trackEmojiUsage(emoji: string) {
  try {
    await fetch('/api/v1/users/emoji-usage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    });
  } catch {}
}

interface Props {
  isSelf: boolean;
  isAdmin?: boolean;
  canModerate?: boolean;
  isPinned?: boolean;
  onReact: (emoji: string) => void;
  onMoreReact: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy: () => void;
  onPin?: () => void;
  onForward: () => void;
  onClose: () => void;
}

export default function MessageContextMenu({
  isSelf,
  isAdmin,
  canModerate,
  isPinned,
  onReact,
  onMoreReact,
  onEdit,
  onDelete,
  onCopy,
  onPin,
  onForward,
  onClose,
}: Props) {
  const actionClass = 'flex w-full items-center gap-4 px-5 py-4 text-left text-sm text-white active:bg-gray-600 transition-colors';
  const [quickEmojis, setQuickEmojis] = useState<string[]>(DEFAULT_EMOJIS);

  useEffect(() => {
    fetch('/api/v1/users/emoji-usage')
      .then(r => r.json())
      .then(data => {
        if (data.emojiUsage && Object.keys(data.emojiUsage).length > 0) {
          setQuickEmojis(resolveEmojis(data.emojiUsage));
        }
      })
      .catch(() => {});
  }, []);

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dy = Math.max(0, e.touches[0].clientY - startYRef.current);
    setDragY(dy);
  };

  const handleTouchEnd = () => {
    setDragging(false);
    const sheetH = sheetRef.current?.offsetHeight ?? 200;
    if (dragY > sheetH * 0.3) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        ref={sheetRef}
        className="rounded-t-2xl bg-gray-800 pb-8 pt-3 select-none"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.25s ease',
        }}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-600" />

        {/* Quick emoji row */}
        <div className="mb-5 flex justify-center gap-2 px-4">
          {quickEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => { trackEmojiUsage(emoji); onReact(emoji); onClose(); }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-2xl transition-transform active:scale-90"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => { onMoreReact(); onClose(); }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
              <line x1="12" y1="5" x2="12" y2="3"/>
              <line x1="12" y1="3" x2="10" y2="3"/>
              <line x1="12" y1="3" x2="14" y2="3"/>
            </svg>
          </button>
        </div>

        {/* Action list */}
        <div className="mx-3 overflow-hidden rounded-xl bg-gray-700 divide-y divide-gray-600/60">
          <button onClick={() => { onCopy(); onClose(); }} className={actionClass}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy Text
          </button>
          <button onClick={() => { onForward(); onClose(); }} className={actionClass}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 17 20 12 15 7"/>
              <path d="M4 18v-2a4 4 0 0 1 4-4h12"/>
            </svg>
            Forward
          </button>
          {isSelf && onEdit && (
            <button onClick={() => { onEdit(); onClose(); }} className={actionClass}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Message
            </button>
          )}
          {isAdmin && onPin && (
            <button onClick={() => { onPin(); onClose(); }} className={actionClass}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="17" x2="12" y2="22"/>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
              </svg>
              {isPinned ? 'Unpin Message' : 'Pin Message'}
            </button>
          )}
          {(isSelf || canModerate) && onDelete && (
            <button onClick={() => { onDelete(); onClose(); }} className={`${actionClass} text-red-400`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Delete Message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
