'use client';

import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import dayjs from 'dayjs';
import { getSocket } from '@/lib/socket';

interface Message {
  id: number;
  username: string;
  message: string;
  userId: number;
  friendId: number;
  updatedAt: string;
}

interface Props {
  userId: number;
  username: string;
  friendId: number | null;
  groupId: string;
}

function friendRoom(groupId: string) {
  const base = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';
  return `${base}/friends/${groupId}`;
}

export default function ChatroomFriend({ userId, username, friendId, groupId }: Props) {
  const socket = getSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [hover, setHover] = useState('');
  const [messageMenu, setMessageMenu] = useState(false);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const socketIdRef = useRef<string>('');
  const prevGroupIdRef = useRef<string>(groupId);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const effectiveFriendId = friendId ?? userId;
  const isPersonal = effectiveFriendId === userId;

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
    setMessages([...data].reverse());
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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

  const deleteUserMessage = () => {
    if (!editMessage) return;
    socket.emit('DELETE_USER_MESSAGE', {
      socketId: socketIdRef.current,
      userId,
      friendId: effectiveFriendId,
      messageId: editMessage.id,
      room: friendRoom(groupId),
    });
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col justify-end p-4">
        {messages.map((item, index) => {
          const msgKey = `message${index}`;
          return (
            <div
              key={index}
              id={msgKey}
              className="mb-2"
              onMouseEnter={() => {
                if (!editingMessage && !messageMenu && userId === item.userId) {
                  setHover(msgKey);
                }
              }}
              onMouseLeave={() => setHover('')}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-indigo-400">{item.username}</span>
                <span className="text-xs text-gray-400">
                  {dayjs(item.updatedAt).format('MM/DD/YYYY')}
                </span>
                {hover === msgKey && (
                  <button
                    className="ml-auto text-gray-400 hover:text-white"
                    onClick={() => {
                      setEditMessage(item);
                      setMessageMenu(true);
                    }}
                  >
                    ✎
                  </button>
                )}
              </div>

              {/* Message menu */}
              {messageMenu && editMessage?.id === item.id && (
                <div
                  ref={menuRef}
                  className="mt-1 flex gap-3 rounded bg-gray-700 p-2 text-sm"
                >
                  <button onClick={() => { setMessageMenu(false); setEditMessage(null); }}>✕</button>
                  <button
                    className="hover:text-yellow-400"
                    onClick={() => {
                      setEditingMessage(editMessage);
                      setNewMessage(editMessage.message);
                      setHover('');
                      setEditMessage(null);
                      setMessageMenu(false);
                    }}
                  >
                    Edit
                  </button>
                  <button className="hover:text-red-400" onClick={deleteUserMessage}>
                    Delete
                  </button>
                </div>
              )}

              {/* Message body or edit input */}
              {editingMessage?.id === item.id ? (
                <div>
                  <input
                    className="mt-1 w-full rounded bg-gray-600 px-2 py-1 text-sm"
                    value={newMessage}
                    onChange={e => {
                      if (e.target.value.length < 500) setNewMessage(e.target.value);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) sendEditedMessage();
                    }}
                  />
                  <p className="text-xs text-gray-400">escape to cancel • enter to save</p>
                </div>
              ) : (
                <p className="text-sm text-gray-200">{item.message}</p>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div ref={menuRef} className="border-t border-gray-600">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 border-t border-gray-600 p-3">
        <input
          className="flex-1 rounded bg-gray-600 px-3 py-2 text-sm outline-none"
          placeholder="Send a message!"
          value={message}
          onChange={e => {
            if (e.target.value.length < 500) setMessage(e.target.value);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) sendMessage();
          }}
        />
        <button
          className="text-gray-400 hover:text-white"
          onClick={() => setShowEmojiPicker(p => !p)}
        >
          😊
        </button>
      </div>
    </div>
  );
}
