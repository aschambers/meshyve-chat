'use client';

import { useEffect, useRef, useState } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import axios from 'axios';
import dayjs from 'dayjs';
import { getSocket } from '@/lib/socket';
import type { ForwardedFrom } from '@/lib/types';
import UserProfileModal from '@/components/UserProfileModal/UserProfileModal';
import MessageContextMenu, {
  trackEmojiUsage,
} from '@/components/MessageContextMenu/MessageContextMenu';
import ForwardModal from '@/components/ForwardModal/ForwardModal';

interface Message {
  id: number;
  username: string;
  message: string;
  userId: number;
  friendId: number;
  updatedAt: string;
  nameColor?: string | null;
  reactions?: Record<string, number[]> | null;
  forwardedFrom?: ForwardedFrom | null;
}

interface Props {
  userId: number;
  username: string;
  friendUsername: string;
  currentUserImageUrl?: string | null;
  friendId: number | null;
  groupId: string;
  isFriend?: boolean;
  incomingRequest?: { id: number; senderId: number } | null;
  onEditProfile?: () => void;
  nameColor?: string | null;
  onAddFriend?: () => void;
  onAcceptRequest?: (requestId: number) => void;
  onUnfriend?: () => void;
  onNavigateToChannel?: (
    serverId: number,
    chatroomId: number,
    chatroomName: string,
    serverName: string,
    messageId?: number
  ) => void;
  onNavigateToDM?: (groupId: string, messageId?: number) => void;
  scrollToMessageId?: number | null;
  onScrollHandled?: () => void;
}

function friendRoom(groupId: string) {
  const base = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';
  return `${base}/friends/${groupId}`;
}

export default function ChatroomFriend({
  userId,
  username,
  friendUsername,
  currentUserImageUrl,
  friendId,
  groupId,
  isFriend = false,
  incomingRequest,
  onEditProfile,
  nameColor,
  onAddFriend,
  onAcceptRequest,
  onUnfriend,
  onNavigateToChannel,
  onNavigateToDM,
  scrollToMessageId,
  onScrollHandled,
}: Props) {
  const socket = getSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [hover, setHover] = useState('');
  const [messageMenu, setMessageMenu] = useState(false);
  const [menuFlip, setMenuFlip] = useState(false);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<number | null>(null);
  const [profileTarget, setProfileTarget] = useState<{ userId: number; username: string } | null>(
    null
  );
  const [friendImageUrl, setFriendImageUrl] = useState<string | null>(null);

  const [mobileMenu, setMobileMenu] = useState(false);
  const [forwardItem, setForwardItem] = useState<{ text: string; id: number } | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<number | null>(null);
  const socketIdRef = useRef<string>('');
  const prevMessageCountRef = useRef<number>(0);
  const isTouchRef = useRef(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  const playPing = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(260, ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.52);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.75);
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(35, ctx.currentTime);
      lfoGain.gain.setValueAtTime(45, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.48);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.78);
      lfo.start();
      osc.start();
      lfo.stop(ctx.currentTime + 0.78);
      osc.stop(ctx.currentTime + 0.78);
      osc.onended = () => ctx.close();
    } catch {}
  };
  const prevGroupIdRef = useRef<string>(groupId);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(navigator.maxTouchPoints > 0);
  }, []);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [friendReqStatus, setFriendReqStatus] = useState<'none' | 'sent' | 'incoming' | 'friends'>(
    isFriend ? 'friends' : 'none'
  );
  const [friendReqId, setFriendReqId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const effectiveFriendId = friendId ?? userId;
  const isPersonal = effectiveFriendId === userId;

  // Fetch friend's avatar
  useEffect(() => {
    if (!isPersonal && friendId) {
      axios
        .get(`/api/v1/users?userId=${friendId}`)
        .then((r) => setFriendImageUrl(r.data?.imageUrl ?? null))
        .catch(() => {});
    }
  }, [friendId, isPersonal]);

  // Sync when an incoming request arrives or is accepted/declined
  useEffect(() => {
    if (isPersonal || isFriend) return;
    if (incomingRequest) {
      setFriendReqStatus('incoming');
      setFriendReqId(incomingRequest.id);
    } else if (friendReqStatus === 'incoming') {
      // Request was accepted or declined — re-check
      setFriendReqStatus('none');
      setFriendReqId(null);
    }
  }, [incomingRequest?.id, isPersonal, isFriend]);

  // Sync friendReqStatus when isFriend prop changes (e.g. after remove/accept propagates)
  useEffect(() => {
    if (isPersonal) return;
    if (isFriend) {
      setFriendReqStatus('friends');
    } else {
      // Re-check the actual request status now that they're no longer friends
      if (!friendId) return;
      axios
        .get(`/api/v1/friend-requests?senderId=${userId}&receiverId=${friendId}`)
        .then((r) => {
          const req = r.data;
          if (!req || req.status === 'accepted' || req.status === 'removed') {
            setFriendReqStatus('none');
          } else if (req.senderId === userId) {
            setFriendReqId(req.id);
            setFriendReqStatus('sent');
          } else {
            setFriendReqId(req.id);
            setFriendReqStatus('incoming');
          }
        })
        .catch(() => setFriendReqStatus('none'));
    }
  }, [isFriend, isPersonal, userId, friendId]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!menuRef.current || !menuRef.current.contains(e.target as Node)) {
        setMessageMenu(false);
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // Escape key to cancel edit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !messageMenu) {
        setEditingMessage(null);
        setNewMessage('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [messageMenu]);

  const handleMessages = (data: Message[]) => {
    setMessageMenu(false);
    setEditMessage(null);
    setEditingMessage(null);
    setNewMessage('');
    const reversed = [...data].reverse();
    const prev = prevMessageCountRef.current;
    if (prev > 0 && reversed.length > prev) {
      const newest = reversed[reversed.length - 1];
      if (newest.userId !== userId) playPing();
    }
    prevMessageCountRef.current = reversed.length;
    setMessages(reversed);
  };

  useEffect(() => {
    if (scrollToMessageId) setPendingScrollId(scrollToMessageId);
  }, [scrollToMessageId]);

  useEffect(() => {
    if (pendingScrollId) return;
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!pendingScrollId || !messages.length) return;
    const target = document.querySelector(`[data-msgid="${pendingScrollId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPendingScrollId(null);
      onScrollHandled?.();
    }
  }, [messages, pendingScrollId]);

  // Socket listeners
  useEffect(() => {
    socket.on('RECEIVE_PRIVATE_MESSAGES', handleMessages);
    socket.on('RECEIVE_PERSONAL_MESSAGES', handleMessages);

    return () => {
      socket.off('RECEIVE_PRIVATE_MESSAGES', handleMessages);
      socket.off('RECEIVE_PERSONAL_MESSAGES', handleMessages);
    };
  }, [socket]);

  // Join room on mount and when groupId changes
  useEffect(() => {
    prevMessageCountRef.current = 0;
    const room = friendRoom(groupId);
    const prevRoom = friendRoom(prevGroupIdRef.current);

    const emitJoin = () => {
      socketIdRef.current = socket.id ?? '';
      const data = {
        socketId: socket.id,
        userId,
        friendId: effectiveFriendId,
        room,
        previousRoom: prevRoom,
      };
      if (isPersonal) {
        socket.emit('GET_PERSONAL_MESSAGES', data);
      } else {
        socket.emit('GET_PRIVATE_MESSAGES', data);
      }
      prevGroupIdRef.current = groupId;
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.once('connect', () => {
        socketIdRef.current = socket.id ?? '';
        emitJoin();
      });
    }

    return () => {
      socket.emit('LEAVE_CHATROOMS', { room });
    };
  }, [socket, groupId, userId, effectiveFriendId, isPersonal]);

  const sendMessage = () => {
    if (!message.trim()) return;
    const data = {
      username,
      message,
      userId,
      friendId: effectiveFriendId,
      room: friendRoom(groupId),
      previousRoom: friendRoom(groupId),
      nameColor,
    };
    if (isPersonal) {
      socket.emit('SEND_PERSONAL_MESSAGE', data);
    } else {
      socket.emit('SEND_PRIVATE_MESSAGE', data);
    }
    setMessage('');
  };

  const sendEditedMessage = () => {
    if (!editingMessage) return;
    socket.emit('EDIT_USER_MESSAGE', {
      socketId: socketIdRef.current,
      message: newMessage,
      userId,
      friendId: effectiveFriendId,
      messageId: editingMessage.id,
      room: friendRoom(groupId),
    });
  };

  const deleteUserMessage = (msg?: Message) => {
    const target = msg ?? editMessage;
    if (!target) return;
    socket.emit('DELETE_USER_MESSAGE', {
      socketId: socketIdRef.current,
      userId,
      friendId: effectiveFriendId,
      messageId: target.id,
      room: friendRoom(groupId),
    });
  };

  const handleEmojiClick = (emojiData: { native: string }) => {
    setMessage((prev) => prev + emojiData.native);
  };

  const sendReaction = (messageId: number, emoji: string) => {
    const isSelf = friendId === null || friendId === userId;
    socket.emit('REACT_USER_MESSAGE', {
      messageId,
      emoji,
      userId,
      friendId: friendId ?? userId,
      isSelf,
      room: friendRoom(groupId),
      socketId: socketIdRef.current,
    });
    setReactionPickerMessageId(null);
  };

  const handleReactionPick = (emojiData: { native: string }) => {
    if (reactionPickerMessageId !== null) {
      trackEmojiUsage(emojiData.native);
      sendReaction(reactionPickerMessageId, emojiData.native);
    }
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) => m.message.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const handleNavigateForwarded = (fw: ForwardedFrom) => {
    if (fw.type === 'channel' && fw.chatroomId && fw.serverId && fw.chatroomName && fw.serverName) {
      onNavigateToChannel?.(
        fw.serverId,
        fw.chatroomId,
        fw.chatroomName,
        fw.serverName,
        fw.messageId
      );
    } else if (fw.type === 'dm' && fw.groupId) {
      onNavigateToDM?.(fw.groupId, fw.messageId);
    }
  };

  const highlight = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(
      new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    );
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-400/40 text-white rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Mobile overlay to cancel editing by tapping outside */}
      {editingMessage && (
        <div
          className="fixed inset-0 z-[1]"
          onMouseDown={() => {
            setEditingMessage(null);
            setNewMessage('');
          }}
          onTouchStart={() => {
            setEditingMessage(null);
            setNewMessage('');
          }}
        />
      )}

      {/* Top bar */}
      <div className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-gray-600 px-4">
        <span className="text-gray-400">@</span>
        <span className="flex-1 font-semibold">{friendUsername}</span>
        {!isPersonal && friendReqStatus === 'friends' && (
          <button
            onClick={() => {
              onUnfriend?.();
              setFriendReqStatus('none');
            }}
            className="rounded px-2 py-0.5 text-xs font-medium bg-gray-600 hover:bg-red-600 text-gray-300 hover:text-white transition-colors"
          >
            Remove Friend
          </button>
        )}
        {!isPersonal &&
          friendReqStatus !== 'friends' &&
          (friendReqStatus === 'none' ? (
            <button
              onClick={() => {
                if (onAddFriend) onAddFriend();
                setFriendReqStatus('sent');
              }}
              className="rounded px-2 py-0.5 text-xs font-medium bg-yellow-500 hover:bg-yellow-600 text-gray-900 transition-colors"
            >
              Add Friend
            </button>
          ) : friendReqStatus === 'sent' ? (
            <span className="rounded px-2 py-0.5 text-xs font-medium bg-gray-600 text-gray-300 cursor-default">
              Pending
            </span>
          ) : friendReqStatus === 'incoming' ? (
            <button
              onClick={() => {
                if (friendReqId !== null && onAcceptRequest) onAcceptRequest(friendReqId);
                setFriendReqStatus('friends');
              }}
              className="rounded px-2 py-0.5 text-xs font-medium bg-green-600 hover:bg-green-500 text-white transition-colors"
            >
              Accept
            </button>
          ) : null)}
        {showSearch ? (
          <input
            ref={searchInputRef}
            autoFocus
            type="text"
            placeholder="Search messages…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowSearch(false);
                setSearchQuery('');
              }
            }}
            className="w-40 rounded bg-gray-700 px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400"
          />
        ) : null}
        <button
          onClick={() => {
            setShowSearch((v) => !v);
            if (showSearch) setSearchQuery('');
          }}
          className={`flex items-center justify-center text-lg leading-none translate-y-0.5 ${showSearch ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}
          title={showSearch ? 'Close search' : 'Search messages'}
        >
          🔍
        </button>
      </div>

      {/* Search result count */}
      {searchQuery.trim() && (
        <div className="border-b border-gray-700 px-4 py-1 text-xs text-gray-400">
          {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''} for &quot;
          {searchQuery}&quot;
        </div>
      )}

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col justify-end p-4">
          {filteredMessages.map((item, index) => {
            const msgKey = `message${index}`;
            const isSelf = item.userId === userId;
            const senderImage = isSelf ? (currentUserImageUrl ?? null) : friendImageUrl;
            return (
              <div
                key={index}
                id={msgKey}
                data-msgid={item.id}
                className="mb-2 select-none md:select-text"
                onMouseEnter={() => {
                  if (isTouchRef.current) return;
                  if (!editingMessage && !messageMenu) setHover(msgKey);
                }}
                onMouseLeave={() => {
                  if (!messageMenu) setHover('');
                }}
                onTouchStart={(e) => {
                  isTouchRef.current = true;
                  touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                  longPressRef.current = setTimeout(() => {
                    setEditMessage(item);
                    setMobileMenu(true);
                  }, 500);
                }}
                onTouchMove={(e) => {
                  const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
                  const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
                  if (dx > 8 || dy > 8) {
                    if (longPressRef.current) {
                      clearTimeout(longPressRef.current);
                      longPressRef.current = null;
                    }
                  }
                }}
                onTouchEnd={() => {
                  if (longPressRef.current) {
                    clearTimeout(longPressRef.current);
                    longPressRef.current = null;
                  }
                }}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 mt-1 h-9 w-9 rounded-full bg-gray-900 ring-1 ring-gray-600 overflow-hidden flex items-center justify-center text-sm font-bold text-white cursor-pointer"
                    onClick={() =>
                      setProfileTarget({ userId: item.userId, username: item.username })
                    }
                  >
                    {senderImage ? (
                      <img
                        src={senderImage}
                        alt={item.username}
                        className="h-full w-full object-cover"
                        loading="eager"
                      />
                    ) : (
                      item.username[0]?.toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-semibold cursor-pointer hover:underline"
                        style={{
                          color: (item.userId === userId ? nameColor : item.nameColor) || '#fde047',
                        }}
                        onClick={() =>
                          setProfileTarget({ userId: item.userId, username: item.username })
                        }
                      >
                        {item.username}
                      </span>
                      <span className="text-xs text-gray-400">
                        {dayjs(item.updatedAt).format('MM/DD/YYYY')}
                      </span>
                      {hover === msgKey && (
                        <div className="ml-auto relative flex items-center gap-1">
                          <button
                            className="text-gray-400 hover:text-white"
                            onClick={() =>
                              setReactionPickerMessageId((id) => (id === item.id ? null : item.id))
                            }
                          >
                            😊
                          </button>
                          <button
                            className="text-gray-400 hover:text-white"
                            onClick={() => {
                              setForwardItem({ text: item.message, id: item.id });
                              setHover('');
                            }}
                            title="Forward"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="15 17 20 12 15 7" />
                              <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                            </svg>
                          </button>
                          <button
                            className="text-gray-400 hover:text-white px-1 text-lg leading-none"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuFlip(window.innerHeight - rect.bottom < 220);
                              setEditMessage(item);
                              setMessageMenu((m) => !m);
                            }}
                          >
                            ···
                          </button>
                          {messageMenu && editMessage?.id === item.id && (
                            <div
                              ref={menuRef}
                              className={`absolute right-0 z-50 w-52 rounded-md bg-gray-800 border border-gray-600 shadow-xl py-1 select-none ${menuFlip ? 'bottom-7' : 'top-7'}`}
                            >
                              {isSelf && (
                                <button
                                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-white hover:bg-gray-700"
                                  onClick={() => {
                                    setEditingMessage(editMessage!);
                                    setNewMessage(editMessage!.message);
                                    setHover('');
                                    setEditMessage(null);
                                    setMessageMenu(false);
                                  }}
                                >
                                  Edit Message
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 text-gray-400"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                className="flex w-full items-center justify-between px-3 py-2 text-sm text-white hover:bg-gray-700"
                                onClick={() => {
                                  setForwardItem({ text: item.message, id: item.id });
                                  setMessageMenu(false);
                                  setEditMessage(null);
                                }}
                              >
                                Forward
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 text-gray-400"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="15 17 20 12 15 7" />
                                  <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                                </svg>
                              </button>
                              <button
                                className="flex w-full items-center justify-between px-3 py-2 text-sm text-white hover:bg-gray-700"
                                onClick={() => {
                                  navigator.clipboard.writeText(item.message);
                                  setMessageMenu(false);
                                  setEditMessage(null);
                                }}
                              >
                                Copy Text
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 text-gray-400"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              </button>
                              {isSelf && (
                                <button
                                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-red-400 hover:bg-gray-700"
                                  onClick={() => {
                                    deleteUserMessage(item);
                                    setMessageMenu(false);
                                    setEditMessage(null);
                                  }}
                                >
                                  Delete Message
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message body or edit input */}
                    {editingMessage?.id === item.id ? (
                      <div className="relative z-[2]">
                        <input
                          className="mt-1 w-full rounded bg-gray-600 px-2 py-1 text-sm"
                          value={newMessage}
                          enterKeyHint="go"
                          onChange={(e) => {
                            if (e.target.value.length < 500) setNewMessage(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) sendEditedMessage();
                          }}
                          onBlur={() => {
                            setEditingMessage(null);
                            setNewMessage('');
                          }}
                        />
                        <p className="text-xs text-gray-400">
                          <span className="hidden md:inline">escape to cancel • </span>enter to save
                        </p>
                      </div>
                    ) : (
                      <>
                        {item.forwardedFrom && (
                          <button
                            onClick={() => handleNavigateForwarded(item.forwardedFrom!)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-yellow-400 mt-0.5 mb-1 transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="15 17 20 12 15 7" />
                              <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                            </svg>
                            <span>
                              {item.forwardedFrom.type === 'channel'
                                ? `Forwarded from #${item.forwardedFrom.chatroomName} in ${item.forwardedFrom.serverName}`
                                : `Forwarded from @${item.forwardedFrom.username}`}
                            </span>
                          </button>
                        )}
                        {/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(
                          item.message
                        ) ? (
                          <img
                            src={item.message}
                            alt="uploaded"
                            className="mt-1 max-w-xs max-h-64 rounded-lg object-contain"
                          />
                        ) : (
                          <p className="text-sm text-gray-200 whitespace-pre-wrap">{highlight(item.message)}</p>
                        )}
                        {item.reactions && Object.keys(item.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(item.reactions).map(([emoji, userIds]) => (
                              <button
                                key={emoji}
                                onClick={() => sendReaction(item.id, emoji)}
                                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                  userIds.includes(userId)
                                    ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300'
                                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-400'
                                }`}
                              >
                                {emoji} {userIds.length}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reaction picker */}
      {reactionPickerMessageId !== null && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setReactionPickerMessageId(null)} />
          <div className="absolute bottom-16 right-2 z-20">
            <Picker data={data} onEmojiSelect={handleReactionPick} theme="dark" />
          </div>
        </>
      )}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div ref={menuRef} className="border-t border-gray-600">
          <Picker data={data} onEmojiSelect={handleEmojiClick} theme="dark" />
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 border-t border-gray-600 px-3 h-14">
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append('file', file);
            const res = await fetch('/api/v1/upload', { method: 'POST', body: form });
            const { url } = await res.json();
            if (!url) return;
            const isSelf = friendId === null || friendId === userId;
            if (isSelf) {
              socket.emit('SEND_PERSONAL_MESSAGE', {
                username,
                message: url,
                userId,
                friendId: userId,
                room: friendRoom(groupId),
                nameColor,
              });
            } else {
              socket.emit('SEND_PRIVATE_MESSAGE', {
                username,
                message: url,
                userId,
                friendId,
                room: friendRoom(groupId),
                nameColor,
              });
            }
            e.target.value = '';
          }}
        />
        <div className="relative">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-500 hover:text-white text-lg font-bold leading-none transition-colors select-none"
            onClick={() => setShowPlusMenu((p) => !p)}
          >
            +
          </button>
          {showPlusMenu && (
            <div className="absolute bottom-10 left-0 z-50 w-44 rounded-lg bg-gray-900 py-1 shadow-xl border border-gray-700">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                onClick={() => {
                  setShowPlusMenu(false);
                  fileInputRef.current?.click();
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload a File
              </button>
            </div>
          )}
        </div>
        <textarea
          enterKeyHint={isMobile ? 'enter' : 'send'}
          rows={1}
          className="flex-1 rounded bg-gray-600 px-3 py-2 text-sm outline-none resize-none leading-5"
          placeholder="Send a message!"
          value={message}
          onChange={(e) => {
            if (e.target.value.length < 500) setMessage(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        {message && isMobile ? (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow hover:opacity-90 transition-opacity"
            onClick={sendMessage}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        ) : (
          <button
            className="text-gray-400 hover:text-white"
            onClick={() => setShowEmojiPicker((p) => !p)}
          >
            😊
          </button>
        )}
      </div>
      {mobileMenu && editMessage && (
        <MessageContextMenu
          isSelf={editMessage.userId === userId}
          onReact={(emoji) => sendReaction(editMessage.id, emoji)}
          onMoreReact={() => setReactionPickerMessageId(editMessage.id)}
          onEdit={() => {
            setEditingMessage(editMessage);
            setNewMessage(editMessage.message);
            setHover('');
          }}
          onDelete={() => {
            deleteUserMessage();
            setMobileMenu(false);
          }}
          onCopy={() => navigator.clipboard.writeText(editMessage.message)}
          onForward={() => setForwardItem({ text: editMessage.message, id: editMessage.id })}
          onClose={() => {
            setMobileMenu(false);
            setEditMessage(null);
          }}
        />
      )}
      {forwardItem !== null && (
        <ForwardModal
          messageText={forwardItem.text}
          userId={userId}
          username={username}
          nameColor={nameColor}
          sourceContext={
            {
              type: 'dm',
              groupId,
              username: friendUsername,
              messageId: forwardItem.id,
            } as ForwardedFrom
          }
          onNavigateToChannel={onNavigateToChannel}
          onNavigateToDM={onNavigateToDM}
          onClose={() => setForwardItem(null)}
        />
      )}
      {profileTarget && (
        <UserProfileModal
          userId={profileTarget.userId}
          username={profileTarget.username}
          isSelf={Number(profileTarget.userId) === Number(userId)}
          onClose={() => setProfileTarget(null)}
          onEditProfile={onEditProfile}
          currentUserId={userId}
          onAddFriend={onAddFriend}
          onAcceptRequest={onAcceptRequest}
          onUnfriend={onUnfriend}
        />
      )}
    </div>
  );
}
