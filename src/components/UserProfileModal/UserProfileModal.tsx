'use client';

import { useEffect, useState } from 'react';
import { useDragToClose } from '@/lib/useDragToClose';
import axios from 'axios';
import dayjs from 'dayjs';
import Tooltip from '@/components/Tooltip/Tooltip';

type UserStatus = 'online' | 'away' | 'busy' | 'offline';

const STATUS_COLOR: Record<UserStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-400',
  busy: 'bg-red-500',
  offline: 'bg-gray-500',
};

interface UserProfile {
  id: number;
  username: string;
  imageUrl: string | null;
  description: string | null;
  createdAt: string;
}

interface FriendRequestState {
  id: number;
  senderId: number;
  status: string;
}

interface Props {
  userId: number;
  username: string;
  imageUrl?: string | null;
  status?: UserStatus;
  isSelf: boolean;
  serverJoinedAt?: string;
  serverImageUrl?: string | null;
  serverName?: string;
  currentUserId?: number;
  onClose: () => void;
  onSendMessage?: () => void;
  onEditProfile?: () => void;
  onAddFriend?: () => void;
  onAcceptRequest?: (requestId: number) => void;
  onUnfriend?: () => void;
}

export default function UserProfileModal({
  userId,
  username,
  imageUrl: imageUrlProp,
  status,
  isSelf,
  serverJoinedAt,
  serverImageUrl,
  serverName,
  currentUserId,
  onClose,
  onSendMessage,
  onEditProfile,
  onAddFriend,
  onAcceptRequest,
  onUnfriend,
}: Props) {
  const { containerRef, dragStyle, handleTouchStart, handleTouchMove, handleTouchEnd } =
    useDragToClose(onClose);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendRequest, setFriendRequest] = useState<FriendRequestState | null>(null);
  const [localStatus, setLocalStatus] = useState<'pending-sent' | 'accepted' | 'removed' | null>(
    null
  );

  useEffect(() => {
    axios
      .get(`/api/v1/users?userId=${userId}`)
      .then((r) => setProfile(r.data))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!currentUserId || isSelf) return;
    axios
      .get(`/api/v1/friend-requests?senderId=${currentUserId}&receiverId=${userId}`)
      .then((r) => setFriendRequest(r.data ?? null))
      .catch(() => {});
  }, [currentUserId, userId, isSelf]);

  const displayImage = profile?.imageUrl ?? imageUrlProp;
  const memberSince = profile?.createdAt ? dayjs(profile.createdAt).format('MMMM D, YYYY') : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:px-0"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative w-full h-[80dvh] rounded-t-2xl overflow-y-auto sm:h-auto sm:rounded-lg sm:max-w-sm bg-gray-800 shadow-xl"
        style={dragStyle}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-600" />
        </div>
        <button
          onClick={onClose}
          className="absolute top-2 right-3 z-10 text-gray-900/60 hover:text-gray-900 text-xl leading-none"
        >
          ✕
        </button>

        {/* Banner */}
        <div className="h-16 bg-yellow-600 rounded-t-lg" />

        <div className="px-5 pb-5">
          {/* Avatar */}
          <div className="relative -mt-8 mb-3 inline-block">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-900 ring-4 ring-gray-600 text-xl font-bold text-white">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={username}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              ) : (
                username[0]?.toUpperCase()
              )}
            </div>
            {status && (
              <span
                className={`absolute bottom-[1px] right-[1px] h-5 w-5 rounded-full border-2 border-gray-800 ${STATUS_COLOR[status]}`}
              />
            )}
            {isSelf && onEditProfile && (
              <div className="absolute -top-1 -right-0.5 group/pencil z-10">
                <button
                  onClick={() => {
                    onEditProfile();
                    onClose();
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors ring-2 ring-gray-800"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-2.5 h-2.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1a1610"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 group-hover/pencil:opacity-100 transition-none z-50">
                  Edit Profile
                </span>
              </div>
            )}
          </div>

          {/* Username + inline icons */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <h2 className="text-lg font-bold text-white leading-tight">{username}</h2>
            <div className="flex items-center gap-3 mt-1">
              {!isSelf && onSendMessage && (
                <Tooltip text="Send Message">
                  <button
                    onClick={() => {
                      onSendMessage();
                      onClose();
                    }}
                    className="text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </Tooltip>
              )}
              {!isSelf &&
                currentUserId &&
                (() => {
                  const canAdd =
                    localStatus === 'removed' ||
                    (!localStatus &&
                      (!friendRequest ||
                        friendRequest.status === 'declined' ||
                        friendRequest.status === 'removed'));
                  if (!canAdd) return null;
                  return (
                    <Tooltip text="Add Friend">
                      <button
                        onClick={() => {
                          setLocalStatus('pending-sent');
                          onAddFriend?.();
                        }}
                        className="text-gray-400 hover:text-yellow-400 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                      </button>
                    </Tooltip>
                  );
                })()}
            </div>
          </div>

          {/* Friend / profile actions */}
          <div className="flex gap-2">
            {!isSelf &&
              currentUserId &&
              (() => {
                const isAccepted =
                  localStatus === 'accepted' ||
                  (friendRequest?.status === 'accepted' && localStatus !== 'removed');
                const isPendingSent =
                  localStatus === 'pending-sent' ||
                  (friendRequest?.status === 'pending' && friendRequest.senderId === currentUserId);
                const isPendingIncoming =
                  !localStatus &&
                  friendRequest?.status === 'pending' &&
                  friendRequest.senderId !== currentUserId;
                if (isAccepted)
                  return (
                    <button
                      onClick={() => {
                        setLocalStatus('removed');
                        onUnfriend?.();
                      }}
                      className="rounded bg-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      Remove Friend
                    </button>
                  );
                if (isPendingSent)
                  return (
                    <button
                      disabled
                      className="rounded bg-gray-500 px-3 py-1.5 text-sm text-white cursor-not-allowed opacity-70"
                    >
                      Pending
                    </button>
                  );
                if (isPendingIncoming)
                  return (
                    <button
                      onClick={() => {
                        setLocalStatus('accepted');
                        onAcceptRequest?.(friendRequest!.id);
                        onClose();
                      }}
                      className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-500"
                    >
                      Accept
                    </button>
                  );
                return null;
              })()}
          </div>

          {profile?.description && (
            <p className="mt-3 text-sm text-gray-300 leading-relaxed">{profile.description}</p>
          )}

          {(memberSince || serverJoinedAt) && (
            <div className="mt-4 border-t border-gray-700 pt-3 flex items-center gap-2 flex-wrap">
              {memberSince && (
                <div className="flex items-center gap-1.5">
                  <img
                    src="/meshyve-logo.svg"
                    alt="Meshyve"
                    className="h-5 w-5 rounded-full flex-shrink-0"
                  />
                  <p className="text-sm text-gray-200">{memberSince}</p>
                </div>
              )}
              {memberSince && serverJoinedAt && <span className="text-gray-500">·</span>}
              {serverJoinedAt && (
                <div className="flex items-center gap-1.5">
                  {serverImageUrl ? (
                    <img
                      src={serverImageUrl}
                      alt={serverName}
                      className="h-4 w-4 rounded-full object-cover flex-shrink-0"
                    />
                  ) : serverName ? (
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gray-600 text-[0.5625rem] font-bold text-white">
                      {serverName[0].toUpperCase()}
                    </span>
                  ) : null}
                  <p className="text-sm text-gray-200">
                    {dayjs(serverJoinedAt).format('MMMM D, YYYY')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
