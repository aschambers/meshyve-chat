"use client";

import { useEffect, useRef, useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import dayjs from "dayjs";
import { getSocket } from "@/lib/socket";
import type { ServerUser, Message } from "@/lib/types";
import UserProfileModal from "@/components/UserProfileModal/UserProfileModal";
import Tooltip from "@/components/Tooltip/Tooltip";

type UserStatus = "online" | "away" | "busy" | "offline";

const STATUS_COLOR: Record<UserStatus, string> = {
  online: "bg-green-500",
  away: "bg-yellow-400",
  busy: "bg-red-500",
  offline: "bg-gray-500",
};

interface Props {
  userId: number;
  username: string;
  currentUserImageUrl?: string | null;
  activeChatroom: string;
  activeChatroomId: number;
  activeChatroomType: string;
  serverId: number;
  isAdmin: boolean;
  serverUserList: ServerUser[];
  onlineUsers: Map<string, UserStatus>;
  onStartDM: (user: ServerUser) => void;
  onEditProfile?: () => void;
  nameColor?: string | null;
  onAddFriend?: (userId: number) => void;
  onAcceptRequest?: (requestId: number) => void;
  onUnfriend?: (userId: number) => void;
  serverImageUrl?: string | null;
  serverName?: string;
}

interface ProfileTarget {
  userId: number;
  username: string;
  imageUrl?: string | null;
  serverJoinedAt?: string;
}

function formatMessageTime(dateStr: string): string {
  const d = dayjs(dateStr);
  const today = dayjs().startOf("day");
  const yesterday = today.subtract(1, "day");
  if (d.isAfter(today)) return d.format("h:mm A");
  if (d.isAfter(yesterday)) return `Yesterday at ${d.format("h:mm A")}`;
  return d.format("MM/DD/YYYY, h:mm A");
}

function roomKey(serverId: number, chatroomId: number) {
  const base = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
  return `${base}/chatroom/${serverId}/${chatroomId}`;
}

export default function Chatroom({
  userId,
  username,
  currentUserImageUrl,
  activeChatroom,
  activeChatroomId,
  activeChatroomType,
  serverId,
  isAdmin,
  serverUserList: serverUserListProp,
  onlineUsers,
  onStartDM,
  onEditProfile,
  nameColor,
  onAddFriend,
  onAcceptRequest,
  onUnfriend,
  serverImageUrl,
  serverName,
}: Props) {
  const socket = getSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [profileTarget, setProfileTarget] = useState<ProfileTarget | null>(
    null,
  );
  const [serverUserList, setServerUserList] =
    useState<ServerUser[]>(serverUserListProp);
  useEffect(() => {
    setServerUserList(serverUserListProp);
  }, [serverUserListProp]);
  const [localOnlineUsers, setLocalOnlineUsers] =
    useState<Map<string, UserStatus>>(onlineUsers);
  const [message, setMessage] = useState("");
  const [hover, setHover] = useState("");
  const [messageMenu, setMessageMenu] = useState(false);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<number | null>(null);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [threadCounts, setThreadCounts] = useState<Record<number, number>>({});
  const [threadMessage, setThreadMessage] = useState("");
  const [threadHover, setThreadHover] = useState("");
  const [threadEditingMessage, setThreadEditingMessage] = useState<Message | null>(null);
  const [threadEditMessage, setThreadEditMessage] = useState<Message | null>(null);
  const [threadMessageMenu, setThreadMessageMenu] = useState(false);
  const [threadNewMessage, setThreadNewMessage] = useState("");
  const activeThreadRef = useRef<Message | null>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const openThreadRef = useRef<(msg: Message) => void>(() => {});
  const [isNewThread, setIsNewThread] = useState(false);
  const [newThreadDraft, setNewThreadDraft] = useState("");
  const [newThreadPrivate, setNewThreadPrivate] = useState(false);
  const [slowmodeCooldown, setSlowmodeCooldown] = useState(0);
  const slowmodeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const [showMobileMembers, setShowMobileMembers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [sideUserModalOpen, setSideUserModalOpen] = useState(false);
  const [rightClickedUser, setRightClickedUser] = useState<Message | null>(
    null,
  );
  const [sideRightClickedUser, setSideRightClickedUser] =
    useState<ServerUser | null>(null);
  const [confirmModerating, setConfirmModerating] = useState<{ action: 'kick' | 'ban'; user: ServerUser } | null>(null);
  const [myConnection] = useState<RTCPeerConnection | null>(null);

  const prevMessageCountRef = useRef<number>(0);

  const playPing = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      // LFO creates the rapid buzz wobble
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Buzzy square wave bee sound
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(260, ctx.currentTime + 0.3);
      // Comical cartoon zip upward
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.52);
      // Then drop down like a deflated bee
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.75);

      // Fast wobble for the buzz character
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(35, ctx.currentTime);
      lfoGain.gain.setValueAtTime(45, ctx.currentTime);

      // Amplitude envelope
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

  const socketIdRef = useRef<string>("");
  const previousRoomRef = useRef<string>("");
  const currentRoomRef = useRef<string>("");
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevChatroomIdRef = useRef<number>(activeChatroomId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync serverUserList from props
  useEffect(() => {
    setServerUserList(serverUserListProp);
  }, [serverUserListProp]);

  // Sync onlineUsers from props and listen for live updates
  useEffect(() => {
    setLocalOnlineUsers(onlineUsers);
  }, [onlineUsers]);

  useEffect(() => {
    const handleUsers = (
      data: { userId: number; username: string; status: string }[],
    ) => {
      const map = new Map<string, UserStatus>();
      data.forEach((u) => {
        if (u.status !== "offline") map.set(u.username, u.status as UserStatus);
      });
      setLocalOnlineUsers(map);
    };
    socket.on("RECEIVE_USERS", handleUsers);
    socket.emit("GET_USERS");
    return () => {
      socket.off("RECEIVE_USERS", handleUsers);
    };
  }, [socket]);

  // Scroll to bottom when messages change
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Scroll thread to bottom when thread messages change
  useEffect(() => {
    const el = threadScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [threadMessages]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMessageMenu(false);
        setUserModalOpen(false);
        setSideUserModalOpen(false);
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  // Escape key to cancel edit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !messageMenu) {
        setEditingMessage(null);
        setNewMessage("");
        setIsNewThread(false);
        setNewThreadDraft("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [messageMenu]);

  // Socket event listeners
  useEffect(() => {
    const handleMessages = (data: Message[]) => {
      setMessageMenu(false);
      setEditMessage(null);
      setEditingMessage(null);
      setNewMessage("");
      const reversed = [...data].reverse();
      const prev = prevMessageCountRef.current;
      if (prev > 0 && reversed.length > prev) {
        const newest = reversed[reversed.length - 1];
        if (newest.userId !== userId) playPing();
      }
      prevMessageCountRef.current = reversed.length;
      setMessages(reversed);
    };

    const handleServerList = (data: ServerUser[]) => {
      const idx = data.findIndex((u) => u.username === username);
      if (idx < 0) {
        // user was kicked — parent should handle navigation
      } else {
        setServerUserList(data);
        setUserModalOpen(false);
        setSideUserModalOpen(false);
        setRightClickedUser(null);
        setSideRightClickedUser(null);
      }
    };

    const handleIceCandidate = async (data: {
      candidate: RTCIceCandidateInit;
    }) => {
      if (myConnection) {
        await myConnection
          .addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch(console.error);
      }
    };

    const handleOffer = async (data: { desc: RTCSessionDescriptionInit }) => {
      if (!myConnection) return;
      try {
        await myConnection.setRemoteDescription(data.desc);
        const answer = await myConnection.createAnswer();
        await myConnection.setLocalDescription(answer);
        socket.emit("SEND_ANSWER", {
          desc: answer,
          username,
          room: roomKey(serverId, activeChatroomId),
        });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    };

    const handleAnswer = async (data: { desc: RTCSessionDescriptionInit }) => {
      if (!myConnection) return;
      try {
        await myConnection.setRemoteDescription(data.desc);
      } catch (err) {
        console.error("Error handling answer:", err);
      }
    };

    const handleSlowmodeError = ({ remaining }: { remaining: number }) => {
      setSlowmodeCooldown(remaining);
      if (slowmodeTimer.current) clearInterval(slowmodeTimer.current);
      slowmodeTimer.current = setInterval(() => {
        setSlowmodeCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(slowmodeTimer.current!);
            slowmodeTimer.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleThreadMessages = (data: Message[]) => setThreadMessages([...data].reverse());
    const handleThreadCounts = (data: Record<number, number>) => setThreadCounts(data);

    socket.on("RECEIVE_CHATROOM_MESSAGES", handleMessages);
    socket.on("RECEIVE_SERVER_LIST", handleServerList);
    socket.on("RECEIVE_ICE_CANDIDATE", handleIceCandidate);
    socket.on("RECEIVE_OFFER", handleOffer);
    socket.on("RECEIVE_ANSWER", handleAnswer);
    socket.on("SLOWMODE_ERROR", handleSlowmodeError);
    socket.on("RECEIVE_THREAD_MESSAGES", handleThreadMessages);
    socket.on("RECEIVE_THREAD_COUNTS", handleThreadCounts);

    return () => {
      socket.off("RECEIVE_CHATROOM_MESSAGES", handleMessages);
      socket.off("RECEIVE_SERVER_LIST", handleServerList);
      socket.off("RECEIVE_ICE_CANDIDATE", handleIceCandidate);
      socket.off("RECEIVE_OFFER", handleOffer);
      socket.off("RECEIVE_ANSWER", handleAnswer);
      socket.off("SLOWMODE_ERROR", handleSlowmodeError);
      socket.off("RECEIVE_THREAD_MESSAGES", handleThreadMessages);
      socket.off("RECEIVE_THREAD_COUNTS", handleThreadCounts);
      if (slowmodeTimer.current) clearInterval(slowmodeTimer.current);
    };
  }, [socket, username, myConnection, serverId, activeChatroomId]);

  // Join chatroom on mount and when activeChatroomId changes
  useEffect(() => {
    setMessages([]);
    setActiveThread(null);
    setThreadMessages([]);
    setThreadCounts({});
    prevMessageCountRef.current = 0;

    const room = roomKey(serverId, activeChatroomId);
    currentRoomRef.current = room;
    const prevRoom = previousRoomRef.current;

    const emitJoin = () => {
      socketIdRef.current = socket.id ?? "";
      socket.emit("GET_CHATROOM_MESSAGES", {
        socketId: socket.id,
        chatroomId: activeChatroomId,
        serverId,
        previousRoom: prevRoom || room,
        room,
      });
      previousRoomRef.current = room;
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.once("connect", () => {
        socketIdRef.current = socket.id ?? "";
        emitJoin();
      });
    }

    prevChatroomIdRef.current = activeChatroomId;

    return () => {
      socket.emit("LEAVE_CHATROOMS", { room });
    };
  }, [socket, activeChatroomId, serverId]);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit("CHATROOM_MESSAGE", {
      username,
      message,
      userId,
      chatroomId: activeChatroomId,
      room: roomKey(serverId, activeChatroomId),
      nameColor,
    });
    setMessage("");
  };

  const sendEditedMessage = () => {
    if (!editingMessage) return;
    socket.emit("EDIT_CHATROOM_MESSAGE", {
      username,
      message: newMessage,
      userId,
      chatroomId: activeChatroomId,
      messageId: editingMessage.id,
      room: roomKey(serverId, activeChatroomId),
    });
  };

  const deleteChatroomMessage = () => {
    if (!editMessage) return;
    socket.emit("DELETE_CHATROOM_MESSAGE", {
      username,
      userId,
      chatroomId: activeChatroomId,
      messageId: editMessage.id,
      room: roomKey(serverId, activeChatroomId),
    });
  };

  const kickUser = (user: ServerUser) => {
    socket.emit("KICK_SERVER_USER", {
      serverId,
      chatroomId: activeChatroomId,
      type: "user",
      userId: user.userId,
      room: roomKey(serverId, activeChatroomId),
    });
  };

  const banUser = (user: ServerUser) => {
    socket.emit("BAN_SERVER_USER", {
      serverId,
      chatroomId: activeChatroomId,
      type: "user",
      userId: user.userId,
      room: roomKey(serverId, activeChatroomId),
    });
  };

  const startCall = async () => {
    if (!myConnection) return;
    try {
      const offer = await myConnection.createOffer({
        offerToReceiveAudio: true,
      });
      await myConnection.setLocalDescription(offer);
      socket.emit("SEND_OFFER", {
        desc: offer,
        username,
        room: roomKey(serverId, activeChatroomId),
      });
    } catch (err) {
      console.error("Error starting call:", err);
    }
  };

  const handleEmojiClick = (emojiData: { native: string }) => {
    setMessage((prev) => prev + emojiData.native);
  };

  const sendReaction = (messageId: number, emoji: string) => {
    const socket = getSocket();
    socket.emit('REACT_CHATROOM_MESSAGE', {
      messageId,
      emoji,
      userId,
      chatroomId: activeChatroomId,
      room: currentRoomRef.current,
    });
    setReactionPickerMessageId(null);
  };

  const handleReactionPick = (emojiData: { native: string }) => {
    if (reactionPickerMessageId !== null) sendReaction(reactionPickerMessageId, emojiData.native);
  };

  const scrollToMessage = (messageId: number) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index === -1) return;
    const el = document.getElementById(`message${index}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('bg-yellow-400/10');
    setTimeout(() => el.classList.remove('bg-yellow-400/10'), 1500);
    setShowPinnedPanel(false);
  };

  const togglePin = (messageId: number) => {
    socket.emit('PIN_MESSAGE', {
      messageId,
      chatroomId: activeChatroomId,
      room: currentRoomRef.current,
    });
  };

  function threadRoomKey(messageId: number) {
    const base = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
    return `${base}/thread/${messageId}`;
  }

  const openThread = (msg: Message) => {
    if (activeThreadRef.current && activeThreadRef.current.id !== msg.id) {
      socket.emit("LEAVE_CHATROOMS", { room: threadRoomKey(activeThreadRef.current.id) });
    }
    activeThreadRef.current = msg;
    setActiveThread(msg);
    setThreadMessages([]);
    socket.emit("GET_THREAD_MESSAGES", {
      parentId: msg.id,
      room: threadRoomKey(msg.id),
      socketId: socketIdRef.current,
      userId,
    });
  };
  openThreadRef.current = openThread;

  const closeThread = () => {
    if (activeThreadRef.current) {
      socket.emit("LEAVE_CHATROOMS", { room: threadRoomKey(activeThreadRef.current.id) });
    }
    activeThreadRef.current = null;
    setActiveThread(null);
    setThreadMessages([]);
  };

  const createThread = () => {
    setShowPlusMenu(false);
    setIsNewThread(true);
  };

  const submitNewThread = () => {
    if (!newThreadDraft.trim()) return;
    socket.emit('CREATE_THREAD', {
      username,
      message: newThreadDraft,
      userId,
      chatroomId: activeChatroomId,
      room: currentRoomRef.current,
      nameColor,
      isPrivate: newThreadPrivate,
    }, (newMsg: Message) => {
      setNewThreadDraft('');
      setNewThreadPrivate(false);
      setIsNewThread(false);
      openThread(newMsg);
    });
  };

  const sendThreadMessage = () => {
    if (!threadMessage.trim() || !activeThreadRef.current) return;
    socket.emit("SEND_THREAD_MESSAGE", {
      parentId: activeThreadRef.current.id,
      chatroomId: activeChatroomId,
      username,
      message: threadMessage,
      userId,
      nameColor: nameColor ?? null,
      room: threadRoomKey(activeThreadRef.current.id),
      chatroomRoom: currentRoomRef.current,
    });
    setThreadMessage("");
  };

  const USER_ROLES = ["owner", "admin", "moderator", "voice", "user"] as const;
  const ROLE_LABELS: Record<string, string> = {
    owner: "Room Owners",
    admin: "Administrators",
    moderator: "Moderators",
    voice: "Voice",
    user: "Users",
  };

  const filteredUsers = serverUserList.filter((u) =>
    u.username.toLowerCase().includes(filterQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Audio elements for WebRTC */}
      <div id="audioElements" className="hidden" />

      {/* Chat area */}
      <div className="relative flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex h-12 items-center gap-2 border-b border-gray-600 px-4 font-semibold">
          <span className="cursor-pointer text-gray-400" onClick={startCall}>
            {activeChatroomType === "text" ? "#" : "🔊"}
          </span>
          <span className="flex-1 cursor-pointer" onClick={startCall}>
            {activeChatroom}
          </span>
          <Tooltip text="Pinned messages" position="bottom">
            <button
              onClick={() => setShowPinnedPanel((v) => !v)}
              className={`flex items-center justify-center h-8 w-8 rounded hover:bg-gray-600 text-lg ${showPinnedPanel ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}
            >
              📌
            </button>
          </Tooltip>
          <Tooltip text="Members" position="bottom">
            <button
              onClick={() => setShowMobileMembers((v) => !v)}
              className="md:hidden flex items-center justify-center h-8 w-8 rounded bg-gray-600 hover:bg-gray-500 text-white"
            >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            </button>
          </Tooltip>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col justify-end p-4">
            {messages.map((item, index) => {
              const canModerate =
                isAdmin &&
                serverUserList.some(
                  (u) =>
                    u.username === item.username &&
                    u.type !== "owner" &&
                    u.type !== "admin" &&
                    u.username !== username,
                );
              const msgKey = `message${index}`;
              const senderImage =
                item.username === username
                  ? (currentUserImageUrl ??
                    serverUserList.find((u) => u.username === item.username)
                      ?.imageUrl ??
                    null)
                  : (serverUserList.find((u) => u.username === item.username)
                      ?.imageUrl ?? null);
              return (
                <div
                  key={index}
                  id={msgKey}
                  className={`group mb-2 rounded px-2 -mx-2 transition-colors ${activeThread?.id === item.id ? "border-l-2 border-yellow-400 pl-3 bg-yellow-400/5" : userId === item.userId || canModerate ? "hover:bg-white/5" : ""}`}
                  onMouseEnter={() => {
                    if (!editingMessage && !messageMenu) setHover(msgKey);
                  }}
                  onMouseLeave={() => setHover("")}
                >
                  <div className="flex gap-3 items-start">
                    {/* Avatar */}
                    <div
                      className="flex-shrink-0 mt-1 h-9 w-9 rounded-full bg-gray-900 ring-1 ring-gray-600 overflow-hidden flex items-center justify-center text-sm font-bold text-white cursor-pointer"
                      onClick={() => {
                        const su = serverUserList.find(
                          (u) => u.username === item.username,
                        );
                        setProfileTarget({
                          userId: item.userId,
                          username: item.username,
                          serverJoinedAt: su?.joinedAt,
                        });
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setRightClickedUser(item);
                        setUserModalOpen(true);
                        setMessageMenu(false);
                        setEditingMessage(null);
                      }}
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
                        {item.isPinned && (
                          <span className="text-xs text-yellow-400" title="Pinned">📌</span>
                        )}
                        <span
                          className="font-semibold cursor-pointer hover:underline"
                          style={{
                            color:
                              serverUserList.find(
                                (u) => u.username === item.username,
                              )?.nameColor ||
                              item.nameColor ||
                              "#fde047",
                          }}
                          onClick={() => {
                            const su = serverUserList.find(
                              (u) => u.username === item.username,
                            );
                            setProfileTarget({
                              userId: item.userId,
                              username: item.username,
                              serverJoinedAt: su?.joinedAt,
                            });
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setRightClickedUser(item);
                            setUserModalOpen(true);
                            setMessageMenu(false);
                            setEditingMessage(null);
                          }}
                        >
                          {item.username}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatMessageTime(item.updatedAt)}
                        </span>
                      </div>

                      {/* Message menu */}
                      {messageMenu && editMessage?.id === item.id && (
                        <div
                          ref={menuRef}
                          className="mt-1 flex gap-3 rounded bg-gray-700 p-2 text-sm"
                        >
                          <button
                            onClick={() => {
                              setMessageMenu(false);
                              setEditMessage(null);
                            }}
                          >
                            ✕
                          </button>
                          {item.userId === userId && (
                            <button
                              className="hover:text-yellow-400"
                              onClick={() => {
                                setEditingMessage(editMessage);
                                setNewMessage(editMessage!.message);
                                setHover("");
                                setEditMessage(null);
                                setMessageMenu(false);
                              }}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            className="hover:text-red-400"
                            onClick={deleteChatroomMessage}
                          >
                            Delete
                          </button>
                        </div>
                      )}

                      {/* User context modal */}
                      {userModalOpen && rightClickedUser?.id === item.id && (
                        <div
                          ref={menuRef}
                          className="mt-1 rounded bg-gray-700 p-2 text-sm"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            className="float-right"
                            onClick={() => setUserModalOpen(false)}
                          >
                            ✕
                          </button>
                          <p
                            className="cursor-pointer hover:text-yellow-300"
                            onClick={() => {
                              const u = serverUserList.find(
                                (u) => u.username === item.username,
                              );
                              if (u) {
                                onStartDM(u);
                                setUserModalOpen(false);
                              }
                            }}
                          >
                            Send Message
                          </p>
                          {canModerate && (
                            <>
                              <p
                                className="cursor-pointer hover:text-yellow-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const u = serverUserList.find(u => u.username === item.username);
                                  if (u) { setUserModalOpen(false); setConfirmModerating({ action: 'kick', user: u }); }
                                }}
                              >
                                Kick {item.username}
                              </p>
                              <p
                                className="cursor-pointer hover:text-red-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const u = serverUserList.find(u => u.username === item.username);
                                  if (u) { setUserModalOpen(false); setConfirmModerating({ action: 'ban', user: u }); }
                                }}
                              >
                                Ban {item.username}
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {/* Message body or edit input */}
                      {editingMessage?.id === item.id ? (
                        <div>
                          <input
                            className="mt-1 w-full rounded bg-gray-600 px-2 py-1 text-sm"
                            value={newMessage}
                            onChange={(e) => {
                              if (e.target.value.length < 500)
                                setNewMessage(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey)
                                sendEditedMessage();
                            }}
                          />
                          <p className="text-xs text-gray-400">
                            escape to cancel • enter to save
                          </p>
                        </div>
                      ) : (
                        <>
                          {/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(item.message) ? (
                            <img src={item.message} alt="uploaded" className="mt-1 max-w-xs max-h-64 rounded-lg object-contain" />
                          ) : (
                            <p className="text-sm text-gray-200">{item.message}</p>
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
                              <div className="relative group">
                                <button
                                  onClick={() => setReactionPickerMessageId(id => id === item.id ? null : item.id)}
                                  className="flex items-center text-xs px-2 py-0.5 rounded-full border border-gray-600 bg-gray-700 hover:border-gray-400 transition-colors"
                                  style={{ filter: 'grayscale(1)', opacity: 0.6 }}
                                >
                                  😊
                                </button>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                  Add reaction
                                </span>
                              </div>
                            </div>
                          )}
                          {threadCounts[item.id] > 0 && (
                            <div
                              onClick={() => openThread(item)}
                              className="mt-2 flex max-w-sm cursor-pointer items-center gap-2 rounded border border-gray-600 bg-gray-700/40 px-3 py-2 transition-colors hover:border-indigo-500/50 hover:bg-gray-700"
                            >
                              <span className="flex-shrink-0 text-sm">🧵</span>
                              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-indigo-400">
                                {item.message.length > 50 ? item.message.slice(0, 50) + "…" : item.message}
                              </p>
                              <span className="flex-shrink-0 text-xs text-gray-400">
                                {threadCounts[item.id]} {threadCounts[item.id] === 1 ? "reply" : "replies"} ›
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Hover action buttons */}
                    {hover === msgKey && (
                      <div className="self-start flex items-center gap-1 flex-shrink-0">
                        {isAdmin && (
                          <Tooltip text={item.isPinned ? 'Unpin message' : 'Pin message'}>
                            <button
                              className={`px-1 text-sm ${item.isPinned ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
                              onClick={() => togglePin(item.id)}
                            >
                              📌
                            </button>
                          </Tooltip>
                        )}
                        <Tooltip text="React">
                          <button
                            className="text-gray-400 hover:text-white px-1"
                            onClick={() => setReactionPickerMessageId(id => id === item.id ? null : item.id)}
                          >
                            😊
                          </button>
                        </Tooltip>
                        <Tooltip text="Open thread">
                          <button
                            className="text-gray-400 hover:text-white px-1"
                            onClick={() => openThread(item)}
                          >
                            💬
                          </button>
                        </Tooltip>
                        {(userId === item.userId || canModerate) && (
                          <button
                            className="text-gray-400 hover:text-white px-1"
                            onClick={() => {
                              setEditMessage(item);
                              setMessageMenu(true);
                            }}
                          >
                            ···
                          </button>
                        )}
                      </div>
                    )}
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
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 md:left-2 md:translate-x-0">
              <Picker data={data} onEmojiSelect={handleReactionPick} theme="dark" />
            </div>
          </>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowEmojiPicker(false)}
            />
            <div
              ref={menuRef}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 md:left-2 md:translate-x-0"
            >
              <Picker data={data} onEmojiSelect={handleEmojiClick} theme="dark" />
            </div>
          </>
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
              socket.emit('CHATROOM_MESSAGE', {
                username,
                message: url,
                userId,
                chatroomId: activeChatroomId,
                room: currentRoomRef.current,
                nameColor,
              });
              e.target.value = '';
            }}
          />
          <div className="relative" ref={plusMenuRef}>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-500 hover:text-white text-lg font-bold leading-none transition-colors"
              onClick={() => setShowPlusMenu(p => !p)}
            >
              +
            </button>
            {showPlusMenu && (
              <div className="absolute bottom-10 left-0 z-50 w-44 rounded-lg bg-gray-900 py-1 shadow-xl border border-gray-700">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                  onClick={() => { setShowPlusMenu(false); fileInputRef.current?.click(); }}
                >
                  📁 Upload a File
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                  onClick={createThread}
                >
                  💬 Create Thread
                </button>
              </div>
            )}
          </div>
          <input
            ref={messageInputRef}
            className="flex-1 rounded bg-gray-600 px-3 py-2 text-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={
              slowmodeCooldown > 0
                ? `Slowmode — wait ${slowmodeCooldown}s`
                : "Send a message!"
            }
            value={message}
            disabled={slowmodeCooldown > 0}
            onChange={(e) => {
              if (e.target.value.length < 500) setMessage(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) sendMessage();
            }}
          />
          <button
            className="text-gray-400 hover:text-white"
            onClick={() => setShowEmojiPicker((p) => !p)}
          >
            😊
          </button>
        </div>
      </div>

      {/* Pinned messages panel */}
      {showPinnedPanel && (
        <div className="fixed inset-0 z-50 flex flex-col border-l border-gray-600 bg-gray-800 md:static md:inset-auto md:z-auto md:w-72 md:flex-shrink-0">
          <div className="flex h-12 items-center justify-between border-b border-gray-600 px-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📌</span>
              <div>
                <p className="text-sm font-semibold leading-tight">Pinned Messages</p>
                <p className="text-xs text-gray-400 leading-tight">#{activeChatroom}</p>
              </div>
            </div>
            <button onClick={() => setShowPinnedPanel(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.filter(m => m.isPinned).length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-4">No pinned messages yet.</p>
            ) : (
              messages.filter(m => m.isPinned).map(m => (
                <div key={m.id} className="rounded border border-gray-600 bg-gray-700/50 p-3 cursor-pointer hover:border-yellow-400/50 hover:bg-gray-700 transition-colors" onClick={() => scrollToMessage(m.id)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: serverUserList.find(u => u.username === m.username)?.nameColor || m.nameColor || '#fde047' }}>
                      {m.username}
                    </span>
                    <span className="text-xs text-gray-500">{formatMessageTime(m.createdAt)}</span>
                  </div>
                  {/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(m.message) ? (
                    <img src={m.message} alt="uploaded" className="max-w-full max-h-32 rounded object-contain" />
                  ) : (
                    <p className="text-sm text-gray-200 break-words">{m.message}</p>
                  )}
                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); togglePin(m.id); }}
                      className="mt-2 text-xs text-gray-500 hover:text-red-400"
                    >
                      Unpin
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* New Thread panel */}
      {isNewThread && !activeThread && (
        <div className="fixed inset-0 z-50 flex flex-col border-l border-gray-600 bg-gray-800 md:static md:inset-auto md:z-auto md:w-72 md:flex-shrink-0">
          <div className="flex h-12 items-center justify-between border-b border-gray-600 px-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🧵</span>
              <div>
                <p className="text-sm font-semibold leading-tight">New Thread</p>
                <p className="text-xs text-gray-400 leading-tight">#{activeChatroom}</p>
              </div>
            </div>
            <button onClick={() => { setIsNewThread(false); setNewThreadDraft(""); setNewThreadPrivate(false); }} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="flex flex-col gap-3 p-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-400">Opening Message</label>
              <textarea
                autoFocus
                className="w-full resize-none rounded bg-gray-600 px-3 py-2 text-sm outline-none"
                placeholder="What's this thread about?"
                rows={5}
                value={newThreadDraft}
                onChange={(e) => { if (e.target.value.length < 500) setNewThreadDraft(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitNewThread(); } }}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded bg-gray-700/50 px-3 py-2">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-200">Private Thread</p>
                <p className="text-xs text-gray-400">Only you can see this thread</p>
              </div>
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${newThreadPrivate ? "bg-yellow-500" : "bg-gray-600"}`}
                onClick={() => setNewThreadPrivate(p => !p)}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${newThreadPrivate ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </label>
            <button
              className="w-full rounded bg-yellow-500 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-yellow-600 disabled:opacity-40"
              disabled={!newThreadDraft.trim()}
              onClick={submitNewThread}
            >
              Start Thread
            </button>
          </div>
        </div>
      )}

      {/* Thread panel */}
      {activeThread && (
        <div className="fixed inset-0 z-50 flex flex-col border-l border-gray-600 bg-gray-800 md:static md:inset-auto md:z-auto md:w-72 md:flex-shrink-0">
          <div className="flex h-12 items-center justify-between border-b border-gray-600 px-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🧵</span>
              <div>
                <p className="text-sm font-semibold leading-tight">Thread</p>
                <p className="text-xs text-gray-400 leading-tight">#{activeChatroom}</p>
              </div>
            </div>
            <button onClick={closeThread} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="border-b-2 border-indigo-500/40 bg-indigo-500/5 p-3">
            <span className="text-xs font-semibold" style={{ color: serverUserList.find(u => u.username === activeThread.username)?.nameColor || activeThread.nameColor || "#fde047" }}>
              {activeThread.username}
            </span>
            <p className="mt-1 text-sm text-gray-200">{activeThread.message}</p>
            <span className="text-xs text-gray-500">{formatMessageTime(activeThread.updatedAt)}</span>
          </div>
          <div ref={threadScrollRef} className="flex-1 overflow-y-auto p-3">
            {threadMessages.length === 0 && (
              <p className="text-center text-xs text-gray-500 mt-4">No replies yet</p>
            )}
            {threadMessages.map((msg, i) => {
              const tKey = `thread${i}`;
              const canEdit = msg.userId === userId || isAdmin;
              return (
                <div
                  key={i}
                  className={`mb-3 rounded px-2 py-1 -mx-2 ${threadHover === tKey ? "bg-gray-700/50" : ""}`}
                  onMouseEnter={() => { if (!threadEditingMessage && !threadMessageMenu) setThreadHover(tKey); }}
                  onMouseLeave={() => setThreadHover("")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: serverUserList.find(u => u.username === msg.username)?.nameColor || msg.nameColor || "#fde047" }}>
                      {msg.username}
                    </span>
                    <span className="text-xs text-gray-400">{formatMessageTime(msg.updatedAt)}</span>
                    {threadHover === tKey && canEdit && (
                      <button
                        className="ml-auto text-gray-400 hover:text-white text-xs px-1"
                        onClick={() => { setThreadEditMessage(msg); setThreadMessageMenu(true); }}
                      >
                        ···
                      </button>
                    )}
                  </div>

                  {threadMessageMenu && threadEditMessage?.id === msg.id && (
                    <div className="mt-1 flex gap-3 rounded bg-gray-700 p-2 text-xs">
                      <button onClick={() => { setThreadMessageMenu(false); setThreadEditMessage(null); }}>✕</button>
                      {msg.userId === userId && (
                        <button
                          className="hover:text-yellow-400"
                          onClick={() => {
                            setThreadEditingMessage(msg);
                            setThreadNewMessage(msg.message);
                            setThreadHover("");
                            setThreadEditMessage(null);
                            setThreadMessageMenu(false);
                          }}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="hover:text-red-400"
                        onClick={() => {
                          if (!activeThreadRef.current) return;
                          socket.emit("DELETE_THREAD_MESSAGE", {
                            messageId: msg.id,
                            parentId: activeThreadRef.current.id,
                            chatroomId: activeChatroomId,
                            room: threadRoomKey(activeThreadRef.current.id),
                            chatroomRoom: currentRoomRef.current,
                          });
                          setThreadMessageMenu(false);
                          setThreadEditMessage(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}

                  {threadEditingMessage?.id === msg.id ? (
                    <div>
                      <input
                        className="mt-1 w-full rounded bg-gray-600 px-2 py-1 text-sm"
                        value={threadNewMessage}
                        onChange={e => { if (e.target.value.length < 500) setThreadNewMessage(e.target.value); }}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            if (!activeThreadRef.current || !threadNewMessage.trim()) return;
                            socket.emit("EDIT_THREAD_MESSAGE", {
                              messageId: msg.id,
                              message: threadNewMessage,
                              parentId: activeThreadRef.current.id,
                              room: threadRoomKey(activeThreadRef.current.id),
                            });
                            setThreadEditingMessage(null);
                            setThreadNewMessage("");
                          }
                          if (e.key === "Escape") { setThreadEditingMessage(null); setThreadNewMessage(""); }
                        }}
                        autoFocus
                      />
                      <p className="text-xs text-gray-400">escape to cancel • enter to save</p>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-sm text-gray-200">{msg.message}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 border-t border-gray-600 px-3 h-14">
            <input
              className="flex-1 rounded bg-gray-600 px-3 py-2 text-sm outline-none"
              placeholder="Reply in thread…"
              value={threadMessage}
              onChange={e => { if (e.target.value.length < 500) setThreadMessage(e.target.value); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) sendThreadMessage(); }}
            />
          </div>
        </div>
      )}

      {/* Right sidebar — user list */}
      <div
        className={`${showMobileMembers ? "fixed inset-0 z-40" : "hidden"} md:static md:block w-full md:w-48 overflow-y-auto border-l border-gray-600 bg-gray-700 p-3`}
        onClick={() => setShowEmojiPicker(false)}
      >
        <div className="flex items-center justify-between mb-3 md:hidden">
          <span className="text-sm font-semibold">Members</span>
          <button
            onClick={() => setShowMobileMembers(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <input
          className="mb-3 w-full rounded bg-gray-600 px-2 py-1 text-xs"
          placeholder="Filter users"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
        />
        {USER_ROLES.map((role) => {
          const usersOfRole = filteredUsers.filter((u) => u.type === role);
          if (usersOfRole.length === 0) return null;
          return (
            <div key={role} className="mb-3">
              <p className="mb-1 text-xs font-bold text-gray-400">
                {ROLE_LABELS[role]} — {usersOfRole.length}
              </p>
              {usersOfRole.map((user, i) => {
                const canMod =
                  isAdmin &&
                  user.username !== username &&
                  role !== "owner" &&
                  role !== "admin";
                return (
                  <div
                    key={i}
                    className="mb-1 flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-600"
                    onClick={() =>
                      setProfileTarget({
                        userId: user.userId,
                        username: user.username,
                        imageUrl: user.imageUrl,
                        serverJoinedAt: user.joinedAt,
                      })
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSideRightClickedUser(user);
                      setSideUserModalOpen(true);
                    }}
                  >
                    <div className="relative">
                      <div className="h-7 w-7 overflow-hidden rounded-full bg-gray-900 ring-1 ring-gray-600 text-xs text-white flex items-center justify-center">
                        {(() => {
                          const img =
                            user.username === username
                              ? (currentUserImageUrl ?? user.imageUrl)
                              : user.imageUrl;
                          return img ? (
                            <img
                              src={img}
                              alt={user.username}
                              className="h-full w-full object-cover"
                              loading="eager"
                            />
                          ) : (
                            user.username[0]?.toUpperCase()
                          );
                        })()}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-gray-700 ${STATUS_COLOR[localOnlineUsers.get(user.username) ?? "offline"]}`}
                      />
                    </div>
                    <span
                      className="truncate text-xs"
                      style={{ color: user.nameColor || "#fde047" }}
                    >
                      {user.username}
                    </span>
                    {sideUserModalOpen &&
                      sideRightClickedUser?.username === user.username && (
                        <div
                          ref={menuRef}
                          className="absolute z-10 rounded bg-gray-800 p-2 shadow-lg text-xs"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            className="float-right"
                            onClick={() => setSideUserModalOpen(false)}
                          >
                            ✕
                          </button>
                          <p
                            className="cursor-pointer hover:text-yellow-300"
                            onClick={() => {
                              onStartDM(user);
                              setSideUserModalOpen(false);
                            }}
                          >
                            Send Message
                          </p>
                          {canMod && (
                            <>
                              <p
                                className="cursor-pointer hover:text-yellow-400"
                                onClick={(e) => { e.stopPropagation(); setSideUserModalOpen(false); setConfirmModerating({ action: 'kick', user }); }}
                              >
                                Kick {user.username}
                              </p>
                              <p
                                className="cursor-pointer hover:text-red-400"
                                onClick={(e) => { e.stopPropagation(); setSideUserModalOpen(false); setConfirmModerating({ action: 'ban', user }); }}
                              >
                                Ban {user.username}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {profileTarget && (
        <UserProfileModal
          userId={profileTarget.userId}
          username={profileTarget.username}
          imageUrl={profileTarget.imageUrl}
          status={localOnlineUsers.get(profileTarget.username)}
          isSelf={Number(profileTarget.userId) === Number(userId)}
          currentUserId={userId}
          serverJoinedAt={profileTarget.serverJoinedAt}
          onClose={() => setProfileTarget(null)}
          onAddFriend={Number(profileTarget.userId) !== Number(userId) ? () => onAddFriend?.(profileTarget.userId) : undefined}
          onAcceptRequest={Number(profileTarget.userId) !== Number(userId) ? onAcceptRequest : undefined}
          onUnfriend={Number(profileTarget.userId) !== Number(userId) ? () => onUnfriend?.(profileTarget.userId) : undefined}
          serverImageUrl={serverImageUrl}
          serverName={serverName}
          onSendMessage={
            Number(profileTarget.userId) !== Number(userId)
              ? () => {
                  const u = serverUserList.find(
                    (u) => u.userId === profileTarget.userId,
                  );
                  if (u) onStartDM(u);
                }
              : undefined
          }
          onEditProfile={onEditProfile}
        />
      )}

      {confirmModerating && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4" onClick={() => setConfirmModerating(null)}>
          <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-gray-800 p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-1 text-base font-bold text-white">
              {confirmModerating.action === 'kick' ? 'Kick' : 'Ban'} {confirmModerating.user.username}?
            </h3>
            <p className="mb-6 text-sm text-gray-400">
              {confirmModerating.action === 'kick'
                ? `${confirmModerating.user.username} will be removed from the server but can rejoin with an invite.`
                : `${confirmModerating.user.username} will be permanently banned and cannot rejoin.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModerating(null)}
                className="flex-1 rounded-lg bg-gray-700 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModerating.action === 'kick') kickUser(confirmModerating.user);
                  else banUser(confirmModerating.user);
                  setConfirmModerating(null);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white ${confirmModerating.action === 'kick' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {confirmModerating.action === 'kick' ? 'Kick' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
