'use client';

import { useState } from 'react';
import type { Friend } from '@/lib/types';
import type { FriendRequest } from '@/lib/redux/modules/friendRequests/friendRequests';
import Tooltip from '@/components/Tooltip/Tooltip';

type Tab = 'online' | 'all' | 'pending';

type UserStatus = 'online' | 'away' | 'busy' | 'offline';

interface Props {
  friends: Friend[];
  currentUserId: number;
  onlineUsers: Map<string, UserStatus>;
  pendingRequests: FriendRequest[];
  onClose: () => void;
  onMessage: (friend: Friend) => void;
  onUnfriend: (friendId: number) => void;
  onAcceptRequest: (requestId: number) => void;
  onDeclineRequest: (requestId: number) => void;
}

export default function FriendsModal({
  friends,
  onlineUsers,
  pendingRequests,
  onClose,
  onMessage,
  onUnfriend,
  onAcceptRequest,
  onDeclineRequest,
}: Props) {
  const [tab, setTab] = useState<Tab>('online');
  const [search, setSearch] = useState('');

  const actualFriends = friends.filter(f => f.isFriend && f.friendId !== null);

  const isOnline = (f: Friend) => {
    const status = onlineUsers.get(f.username);
    return status === 'online' || status === 'away' || status === 'busy';
  };

  const filtered = actualFriends
    .filter(f => tab === 'online' ? isOnline(f) : true)
    .filter(f => f.username.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (f: Friend) => {
    const s = onlineUsers.get(f.username);
    if (s === 'online') return 'bg-green-500';
    if (s === 'away') return 'bg-yellow-500';
    if (s === 'busy') return 'bg-red-500';
    return 'bg-gray-500';
  };

  const statusLabel = (f: Friend) => {
    const s = onlineUsers.get(f.username);
    if (s === 'online') return 'Online';
    if (s === 'away') return 'Away';
    if (s === 'busy') return 'Do Not Disturb';
    return 'Offline';
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'online', label: 'Online', count: actualFriends.filter(isOnline).length },
    { id: 'all', label: 'All Friends', count: actualFriends.length },
    { id: 'pending', label: 'Pending', count: pendingRequests.length },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-lg flex-col rounded-lg bg-gray-800 shadow-xl overflow-hidden"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
          <h2 className="text-lg font-bold text-white">Friends</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-700 px-4 pt-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-t px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-b-2 border-yellow-400 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  t.id === 'pending' ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-300'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        {tab !== 'pending' && (
          <div className="px-4 pt-3">
            <input
              type="text"
              placeholder="Search friends…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded bg-gray-700 px-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400 placeholder-gray-500"
            />
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {tab === 'pending' ? (
            pendingRequests.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No pending friend requests</p>
            ) : (
              pendingRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-gray-700">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 ring-1 ring-gray-600 text-sm font-bold text-white">
                    {req.senderImageUrl
                      ? <img src={req.senderImageUrl} alt={req.senderUsername} className="h-full w-full object-cover" loading="eager" />
                      : req.senderUsername[0]?.toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{req.senderUsername}</p>
                    <p className="text-xs text-gray-400">Incoming friend request</p>
                  </div>
                  <Tooltip text="Accept">
                    <button
                      onClick={() => onAcceptRequest(req.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-green-400 hover:bg-green-600 hover:text-white transition-colors"
                    >
                      ✓
                    </button>
                  </Tooltip>
                  <Tooltip text="Decline">
                    <button
                      onClick={() => onDeclineRequest(req.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-gray-400 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </Tooltip>
                </div>
              ))
            )
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              {tab === 'online' ? 'No friends online' : 'No friends yet'}
            </p>
          ) : (
            filtered.map(f => (
              <div key={f.id} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-gray-700 group">
                {/* Avatar + status dot */}
                <div className="relative flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-900 ring-1 ring-gray-600 text-sm font-bold text-white">
                    {f.imageUrl
                      ? <img src={f.imageUrl} alt={f.username} className="h-full w-full object-cover" loading="eager" />
                      : f.username[0]?.toUpperCase()
                    }
                  </div>
                  <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-gray-800 ${statusColor(f)}`} />
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{f.username}</p>
                  <p className="text-xs text-gray-400">{statusLabel(f)}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip text="Message">
                    <button
                      onClick={() => { onMessage(f); onClose(); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-yellow-500 hover:text-gray-900 transition-colors"
                    >
                      💬
                    </button>
                  </Tooltip>
                  <Tooltip text="Remove Friend">
                    <button
                      onClick={() => onUnfriend(f.friendId!)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </div>

        {tab !== 'pending' && (
          <div className="border-t border-gray-700 px-5 py-2.5">
            <p className="text-xs text-gray-500">
              {tab === 'online'
                ? `${actualFriends.filter(isOnline).length} online`
                : `${actualFriends.length} friend${actualFriends.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
