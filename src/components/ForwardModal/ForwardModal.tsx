'use client';

import { useState, useEffect } from 'react';
import { useDragToClose } from '@/lib/useDragToClose';
import { useAppSelector } from '@/lib/redux/store';
import { getSocket } from '@/lib/socket';
import axios from 'axios';
import type { Chatroom, Friend, ForwardedFrom } from '@/lib/types';

interface Props {
  messageText: string;
  userId: number;
  username: string;
  nameColor?: string | null;
  currentChatroomId?: number | null;
  isAdmin?: boolean;
  sourceContext?: ForwardedFrom;
  onNavigateToChannel?: (
    serverId: number,
    chatroomId: number,
    chatroomName: string,
    serverName: string
  ) => void;
  onNavigateToDM?: (groupId: string) => void;
  onClose: () => void;
}

const BASE = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';

export default function ForwardModal({
  messageText,
  userId,
  username,
  nameColor,
  currentChatroomId,
  isAdmin,
  sourceContext,
  onNavigateToChannel,
  onNavigateToDM,
  onClose,
}: Props) {
  const socket = getSocket();
  const servers = useAppSelector((s) => s.server.servers);
  const friends = useAppSelector((s) => s.friend.friends).filter(
    (f) => f.friendId !== null && f.friendId !== userId
  );

  const { containerRef, dragStyle, handleTouchStart, handleTouchMove, handleTouchEnd } =
    useDragToClose(onClose);
  const [serverChannels, setServerChannels] = useState<Record<number, Chatroom[]>>({});
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    servers.forEach((server) => {
      axios
        .get('/api/v1/chatrooms', { params: { serverId: server.serverId } })
        .then((res) => {
          const textOnly = (res.data as Chatroom[]).filter(
            (c) => c.type === 'text' || c.type === 'voice'
          );
          setServerChannels((prev) => ({ ...prev, [server.serverId]: textOnly }));
        })
        .catch(() => {});
    });
  }, [servers]);

  const fullMessage = note.trim() ? `${note.trim()}\n\n${messageText}` : messageText;

  const forwardToChannel = (
    serverId: number,
    chatroomId: number,
    channelName: string,
    serverName: string
  ) => {
    if (sending) return;
    setSending(true);
    socket.emit('CHATROOM_MESSAGE', {
      username,
      message: fullMessage,
      userId,
      chatroomId,
      room: `${BASE}/chatroom/${serverId}/${chatroomId}`,
      nameColor,
      forwardedFrom: sourceContext ?? null,
    });
    onNavigateToChannel?.(serverId, chatroomId, channelName, serverName);
    onClose();
  };

  const forwardToFriend = (friend: Friend) => {
    if (sending) return;
    setSending(true);
    socket.emit('SEND_PRIVATE_MESSAGE', {
      username,
      message: fullMessage,
      userId,
      friendId: friend.friendId!,
      room: `${BASE}/friends/${friend.groupId}`,
      previousRoom: `${BASE}/friends/${friend.groupId}`,
      nameColor,
      forwardedFrom: sourceContext ?? null,
    });
    onNavigateToDM?.(friend.groupId);
    onClose();
  };

  const q = search.toLowerCase();
  const filteredFriends = friends.filter((f) => f.username.toLowerCase().includes(q));
  const filteredServers = servers
    .map((server) => ({
      server,
      channels: (serverChannels[server.serverId] ?? []).filter(
        (c) =>
          c.id !== currentChatroomId &&
          (!c.isPrivate || isAdmin) &&
          (!q || c.name.toLowerCase().includes(q) || server.name.toLowerCase().includes(q))
      ),
    }))
    .filter(({ channels }) => channels.length > 0);

  const empty = filteredFriends.length === 0 && filteredServers.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="w-full h-[80dvh] rounded-t-2xl sm:h-auto sm:rounded-xl sm:max-w-sm bg-gray-800 shadow-xl overflow-hidden"
        style={dragStyle}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-600" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h3 className="font-semibold text-white">Forward Message</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">
            ✕
          </button>
        </div>

        <>
          {/* Original message preview */}
          <div className="mx-4 mt-3 rounded-lg border-l-2 border-gray-500 bg-gray-700/60 px-3 py-2 text-sm text-gray-300 line-clamp-2">
            {messageText}
          </div>

          {/* Note field */}
          <div className="px-4 pt-2">
            <textarea
              placeholder="Add a comment… (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full resize-none rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400 placeholder-gray-500"
            />
          </div>

          {/* Search */}
          <div className="px-4 pt-1">
            <input
              type="text"
              placeholder="Search destinations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400 placeholder-gray-500"
            />
          </div>

          {/* Destination list */}
          <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-4">
            {filteredFriends.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Direct Messages
                </p>
                <div className="space-y-0.5">
                  {filteredFriends.map((f) => (
                    <button
                      key={f.id}
                      disabled={sending}
                      onClick={() => forwardToFriend(f)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center text-xs font-bold text-white">
                        {f.imageUrl ? (
                          <img
                            src={f.imageUrl}
                            alt={f.username}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          f.username[0]?.toUpperCase()
                        )}
                      </div>
                      <span className="text-sm text-white">{f.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredServers.map(({ server, channels }) => (
              <div key={server.serverId}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {server.name}
                </p>
                <div className="space-y-0.5">
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      disabled={sending}
                      onClick={() => forwardToChannel(server.serverId, ch.id, ch.name, server.name)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {ch.type === 'voice' ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-gray-400 flex-shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                      ) : (
                        <span className="text-gray-400 text-sm font-medium">#</span>
                      )}
                      <span className="text-sm text-white">{ch.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {empty && (
              <p className="py-6 text-center text-sm text-gray-500">No destinations found</p>
            )}
          </div>
        </>
      </div>
    </div>
  );
}
