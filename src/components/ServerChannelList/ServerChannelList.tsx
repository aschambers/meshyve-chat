'use client';

import { useState, useRef, useEffect } from 'react';
import { useDragToClose } from '@/lib/useDragToClose';
import { useDispatch } from 'react-redux';
import { AppDispatch, useAppSelector } from '@/lib/redux/store';
import {
  createChatroom,
  updateChatroom,
  reorderChatrooms,
  deleteChatroom,
} from '@/lib/redux/modules/chatrooms/chatrooms';
import {
  categoryCreate,
  categoryUpdate,
  categoryDelete,
} from '@/lib/redux/modules/categories/categories';
import type { Chatroom, Category, ServerUser } from '@/lib/types';
import InviteModal from '@/components/InviteModal/InviteModal';
import Tooltip from '@/components/Tooltip/Tooltip';

interface Props {
  serverId: number;
  serverName: string;
  serverImageUrl?: string | null;
  isAdmin: boolean;
  userId: number;
  serverUserList: ServerUser[];
  activeChatroomId: number | null;
  voiceParticipants: Record<number, string[]>;
  currentUsername: string;
  voiceMuted: boolean;
  voiceDeafened: boolean;
  voiceDeafenedUsers: Record<string, boolean>;
  onVoiceMuteToggle: () => void;
  onVoiceDeafenToggle: () => void;
  onSelectChatroom: (chatroom: Chatroom) => void;
  onJoinVoice: (chatroom: Chatroom) => void;
  onOpenVoiceChat: (chatroom: Chatroom) => void;
  onOpenSettings: () => void;
  onLeaveServer: () => void;
  dismissFormsToken?: number;
}

interface DropIndicator {
  chatroomId: number;
  before: boolean;
}

export default function ServerChannelList({
  serverId,
  serverName,
  serverImageUrl,
  isAdmin,
  userId,
  serverUserList,
  activeChatroomId,
  voiceParticipants,
  currentUsername,
  voiceMuted,
  voiceDeafened,
  voiceDeafenedUsers,
  onVoiceMuteToggle,
  onVoiceDeafenToggle,
  onSelectChatroom,
  onJoinVoice,
  onOpenVoiceChat,
  onOpenSettings,
  onLeaveServer,
  dismissFormsToken,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { chatrooms } = useAppSelector((s) => s.chatroom);
  const { categories } = useAppSelector((s) => s.category);

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const sheet = useDragToClose(() => setShowMobileSheet(false));
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text');
  const [channelPrivate, setChannelPrivate] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryPrivate, setCategoryPrivate] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<number | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{
    type: 'channel' | 'category';
    id: number;
    name: string;
    isPrivate: boolean;
    allowedUserIds: number[];
  } | null>(null);

  const isOwner = serverUserList.find((u) => u.userId === userId)?.type === 'owner';

  useEffect(() => {
    setShowCreateChannel(false);
    setShowCreateCategory(false);
  }, [serverId, dismissFormsToken]);

  const draggedChatroom = useRef<Chatroom | null>(null);

  const sortedChatrooms = [...chatrooms].sort((a, b) => {
    const pa = a.position ?? 999999;
    const pb = b.position ?? 999999;
    return pa !== pb ? pa - pb : a.id - b.id;
  });

  const toggleCollapse = (categoryId: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(categoryId) ? next.delete(categoryId) : next.add(categoryId);
      return next;
    });
  };

  const handleCreateChannel = async () => {
    if (channelName.trim().length < 2) return;
    await dispatch(
      createChatroom({
        name: channelName.trim(),
        serverId,
        type: channelType,
        categoryId: null,
        isPrivate: channelPrivate,
      })
    );
    setChannelName('');
    setChannelType('text');
    setChannelPrivate(false);
    setShowCreateChannel(false);
  };

  const handleTogglePrivate = (chatroomId: number, isPrivate: boolean) => {
    dispatch(updateChatroom({ chatroomId, isPrivate: !isPrivate }));
  };

  const handleToggleCategoryPrivate = (categoryId: number, isPrivate: boolean) => {
    dispatch(categoryUpdate({ categoryId, isPrivate: !isPrivate }));
  };

  const handleSaveInvite = () => {
    if (!inviteTarget) return;
    if (inviteTarget.type === 'channel') {
      dispatch(
        updateChatroom({
          chatroomId: inviteTarget.id,
          isPrivate: inviteTarget.isPrivate,
          allowedUserIds: inviteTarget.allowedUserIds,
        })
      );
    } else {
      dispatch(
        categoryUpdate({
          categoryId: inviteTarget.id,
          isPrivate: inviteTarget.isPrivate,
          allowedUserIds: inviteTarget.allowedUserIds,
        })
      );
    }
    setInviteTarget(null);
  };

  const handleSlowmode = (chatroomId: number, seconds: number) => {
    dispatch(updateChatroom({ chatroomId, slowmode: seconds }));
  };

  const handleCreateCategory = async () => {
    if (categoryName.trim().length < 2) return;
    await dispatch(
      categoryCreate({
        name: categoryName.trim(),
        serverId,
        order: categories.length + 1,
        visible: true,
        isPrivate: categoryPrivate,
      })
    );
    setCategoryName('');
    setCategoryPrivate(false);
    setShowCreateCategory(false);
  };

  const onDragStart = (chatroom: Chatroom) => {
    draggedChatroom.current = chatroom;
  };

  const onDragEnd = () => {
    draggedChatroom.current = null;
    setDropIndicator(null);
  };

  const onDragOverChatroom = (e: React.DragEvent, chatroom: Chatroom) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setDropIndicator({ chatroomId: chatroom.id, before });
  };

  const onDropOnChatroom = (e: React.DragEvent, targetChatroom: Chatroom) => {
    e.preventDefault();
    e.stopPropagation();
    const dragged = draggedChatroom.current;
    if (!dragged || dragged.id === targetChatroom.id) {
      setDropIndicator(null);
      return;
    }

    const targetCategoryId = targetChatroom.categoryId ?? null;
    const targetCatChatrooms = sortedChatrooms.filter((c) => c.categoryId === targetCategoryId);
    const before = dropIndicator?.chatroomId === targetChatroom.id ? dropIndicator.before : true;

    if ((dragged.categoryId ?? null) !== targetCategoryId) {
      // Moving to a different category: update categoryId first (optimistic in redux),
      // then reorder the destination category
      dispatch(updateChatroom({ chatroomId: dragged.id, categoryId: targetCategoryId }));
      const withoutDragged = targetCatChatrooms.filter((c) => c.id !== dragged.id);
      const targetIdx = withoutDragged.findIndex((c) => c.id === targetChatroom.id);
      const insertIdx = before ? targetIdx : targetIdx + 1;
      const reordered = [...withoutDragged];
      reordered.splice(insertIdx < 0 ? reordered.length : insertIdx, 0, dragged);
      dispatch(reorderChatrooms(reordered.map((c) => c.id)));
    } else {
      // Same category: reorder only
      const withoutDragged = targetCatChatrooms.filter((c) => c.id !== dragged.id);
      const targetIdx = withoutDragged.findIndex((c) => c.id === targetChatroom.id);
      const insertIdx = before ? targetIdx : targetIdx + 1;
      const reordered = [...withoutDragged];
      reordered.splice(insertIdx < 0 ? reordered.length : insertIdx, 0, dragged);
      dispatch(reorderChatrooms(reordered.map((c) => c.id)));
    }

    draggedChatroom.current = null;
    setDropIndicator(null);
  };

  // Drop onto empty category zone (no chatrooms yet, or dropped on the container itself)
  const onDropOnCategory = (targetCategoryId: number | null, e: React.DragEvent) => {
    e.preventDefault();
    const dragged = draggedChatroom.current;
    if (!dragged) return;
    if ((dragged.categoryId ?? null) === targetCategoryId) return;
    dispatch(updateChatroom({ chatroomId: dragged.id, categoryId: targetCategoryId }));
    draggedChatroom.current = null;
    setDropIndicator(null);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const canSee = (isPrivate: boolean | undefined, allowedUserIds: number[] | undefined) =>
    isAdmin || !isPrivate || (allowedUserIds ?? []).includes(userId);

  const visibleChatrooms = sortedChatrooms.filter((c) => canSee(c.isPrivate, c.allowedUserIds));
  const visibleCategories = (categories as Category[]).filter((cat) =>
    canSee(cat.isPrivate, cat.allowedUserIds)
  );
  const uncategorized = visibleChatrooms.filter((c) => c.categoryId == null);

  return (
    <div className="flex flex-col h-full">
      {/* Server header */}
      <div
        className={`relative px-4 py-3 ${serverName ? 'border-b border-gray-600' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <div
            className="flex flex-1 min-w-0 items-center gap-1 cursor-pointer"
            onClick={() => {
              setShowCreateChannel(false);
              setShowCreateCategory(false);
              if (window.innerWidth < 768) {
                setShowMobileSheet(true);
              } else {
                setShowMenu((v) => !v);
              }
            }}
          >
            <p className="truncate text-sm font-bold">{serverName}</p>
            {isAdmin && (
              <span className="hidden md:inline text-gray-400 hover:text-white">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </div>
          <button
            onClick={() => setShowMobileSheet(true)}
            className="md:hidden flex-shrink-0 text-gray-400 hover:text-white p-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {showMenu && (
          <div className="absolute left-0 right-0 top-full z-50 bg-gray-900 shadow-lg rounded-b-lg py-1">
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowCreateChannel(false);
                    setShowCreateCategory(false);
                    onOpenSettings();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Server Settings
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowInviteModal(true);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Invite People
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowCreateChannel(true);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  + Create Channel
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowCreateCategory(true);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  + Create Category
                </button>
              </>
            )}
            {!isOwner && (
              <button
                onClick={() => {
                  setShowMenu(false);
                  setConfirmLeave(true);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
              >
                Leave Server
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create channel inline form */}
      {showCreateChannel && (
        <div className="border-b border-gray-600 px-3 py-3 bg-gray-800">
          <p className="mb-2 text-xs font-bold uppercase text-gray-400">Create Channel</p>
          <input
            autoFocus
            type="text"
            placeholder="channel-name"
            value={channelName}
            onChange={(e) => {
              if (e.target.value.length <= 24) setChannelName(e.target.value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
            className="mb-2 w-full rounded bg-gray-700 px-2 py-1 text-sm text-white outline-none"
          />
          <div className="mb-2 flex gap-3 text-xs text-gray-300">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={channelType === 'text'}
                onChange={() => setChannelType('text')}
              />{' '}
              Text
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={channelType === 'voice'}
                onChange={() => setChannelType('voice')}
              />{' '}
              Voice
            </label>
          </div>
          <label className="mb-2 flex items-center gap-2 cursor-pointer text-xs text-gray-300">
            <input
              type="checkbox"
              checked={channelPrivate}
              onChange={(e) => setChannelPrivate(e.target.checked)}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Private channel (admins only)
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateChannel(false)}
              className="flex-1 rounded bg-gray-700 py-1 text-xs text-gray-300 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateChannel}
              className="flex-1 rounded bg-yellow-500 py-1 text-xs text-gray-900 hover:bg-yellow-600"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Create category inline form */}
      {showCreateCategory && (
        <div className="border-b border-gray-600 px-3 py-3 bg-gray-800">
          <p className="mb-2 text-xs font-bold uppercase text-gray-400">Create Category</p>
          <input
            autoFocus
            type="text"
            placeholder="Category name"
            value={categoryName}
            onChange={(e) => {
              if (e.target.value.length <= 24) setCategoryName(e.target.value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
            className="mb-2 w-full rounded bg-gray-700 px-2 py-1 text-sm text-white outline-none"
          />
          <label className="mb-2 flex items-center gap-2 cursor-pointer text-xs text-gray-300">
            <input
              type="checkbox"
              checked={categoryPrivate}
              onChange={(e) => setCategoryPrivate(e.target.checked)}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Private category (admins only)
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowCreateCategory(false);
                setCategoryPrivate(false);
              }}
              className="flex-1 rounded bg-gray-700 py-1 text-xs text-gray-300 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCategory}
              className="flex-1 rounded bg-yellow-500 py-1 text-xs text-gray-900 hover:bg-yellow-600"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Uncategorized drop zone */}
        <div
          onDrop={(e) => onDropOnCategory(null, e)}
          onDragOver={onDragOver}
          className="min-h-[4px]"
        >
          {uncategorized.map((c) => (
            <ChannelRow
              key={c.id}
              chatroom={c}
              active={activeChatroomId === c.id}
              onSelect={(c) => {
                setShowCreateChannel(false);
                setShowCreateCategory(false);
                onSelectChatroom(c);
              }}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOverChatroom}
              onDrop={onDropOnChatroom}
              showLineBefore={dropIndicator?.chatroomId === c.id && dropIndicator.before}
              showLineAfter={dropIndicator?.chatroomId === c.id && !dropIndicator.before}
              isAdmin={isAdmin}
              onDelete={(id) => setConfirmDeleteId(id)}
              onSlowmode={handleSlowmode}
              onTogglePrivate={handleTogglePrivate}
              onInvite={(c) =>
                setInviteTarget({
                  type: 'channel',
                  id: c.id,
                  name: c.name,
                  isPrivate: !!c.isPrivate,
                  allowedUserIds: c.allowedUserIds ?? [],
                })
              }
              voiceParticipants={voiceParticipants[c.id] ?? []}
              serverUserList={serverUserList}
              onJoinVoice={onJoinVoice}
              onOpenVoiceChat={onOpenVoiceChat}
              currentUsername={currentUsername}
              voiceMuted={voiceMuted}
              voiceDeafened={voiceDeafened}
              voiceDeafenedUsers={voiceDeafenedUsers}
              onVoiceMuteToggle={onVoiceMuteToggle}
              onVoiceDeafenToggle={onVoiceDeafenToggle}
            />
          ))}
        </div>

        {/* Categories */}
        {visibleCategories.map((cat: Category) => {
          const catChatrooms = visibleChatrooms.filter((c) => c.categoryId === cat.id);
          const isCollapsed = collapsed.has(cat.id);
          return (
            <div key={cat.id} className="group/cat mt-2">
              <div className="flex items-center">
                <button
                  onClick={() => toggleCollapse(cat.id)}
                  className="flex flex-1 items-center gap-1 px-2 py-0.5 text-left text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-gray-200"
                >
                  <span className="text-[0.625rem]">{isCollapsed ? '▶' : '▼'}</span>
                  {cat.name}
                </button>
                {isAdmin && (
                  <div className="flex items-center pr-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                    <Tooltip text={cat.isPrivate ? 'Make public' : 'Make private'}>
                      <button
                        onClick={() => handleToggleCategoryPrivate(cat.id, !!cat.isPrivate)}
                        className={`px-1 text-xs ${cat.isPrivate ? 'text-indigo-400' : 'text-gray-500 hover:text-indigo-400'}`}
                      >
                        🔒
                      </button>
                    </Tooltip>
                    {cat.isPrivate && (
                      <Tooltip text="Manage access">
                        <button
                          onClick={() =>
                            setInviteTarget({
                              type: 'category',
                              id: cat.id,
                              name: cat.name,
                              isPrivate: !!cat.isPrivate,
                              allowedUserIds: cat.allowedUserIds ?? [],
                            })
                          }
                          className="px-1 text-xs text-gray-500 hover:text-yellow-400"
                        >
                          👥
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip text="Delete category">
                      <button
                        onClick={() => setConfirmDeleteCategoryId(cat.id)}
                        className="px-1 text-xs text-gray-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div
                  onDrop={(e) => onDropOnCategory(cat.id, e)}
                  onDragOver={onDragOver}
                  className="min-h-[4px]"
                >
                  {catChatrooms.map((c) => (
                    <ChannelRow
                      key={c.id}
                      chatroom={c}
                      active={activeChatroomId === c.id}
                      onSelect={(c) => {
                        setShowCreateChannel(false);
                        setShowCreateCategory(false);
                        onSelectChatroom(c);
                      }}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onDragOver={onDragOverChatroom}
                      onDrop={onDropOnChatroom}
                      showLineBefore={dropIndicator?.chatroomId === c.id && dropIndicator.before}
                      showLineAfter={dropIndicator?.chatroomId === c.id && !dropIndicator.before}
                      isAdmin={isAdmin}
                      onDelete={(id) => setConfirmDeleteId(id)}
                      onSlowmode={handleSlowmode}
                      onTogglePrivate={handleTogglePrivate}
                      onInvite={(c) =>
                        setInviteTarget({
                          type: 'channel',
                          id: c.id,
                          name: c.name,
                          isPrivate: !!c.isPrivate,
                          allowedUserIds: c.allowedUserIds ?? [],
                        })
                      }
                      voiceParticipants={voiceParticipants[c.id] ?? []}
                      serverUserList={serverUserList}
                      onJoinVoice={onJoinVoice}
                      onOpenVoiceChat={onOpenVoiceChat}
                      currentUsername={currentUsername}
                      voiceMuted={voiceMuted}
                      voiceDeafened={voiceDeafened}
                      voiceDeafenedUsers={voiceDeafenedUsers}
                      onVoiceMuteToggle={onVoiceMuteToggle}
                      onVoiceDeafenToggle={onVoiceDeafenToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile bottom sheet */}
      {showMobileSheet && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
          onClick={() => setShowMobileSheet(false)}
        >
          <div
            ref={sheet.containerRef}
            className="rounded-t-2xl bg-gray-800 pb-8 h-[80dvh] overflow-y-auto"
            style={sheet.dragStyle}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={sheet.handleTouchStart}
            onTouchMove={sheet.handleTouchMove}
            onTouchEnd={sheet.handleTouchEnd}
          >
            {/* Sheet handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-600" />
            </div>
            {/* Server info header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-700">
              {serverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={serverImageUrl}
                  alt={serverName}
                  className="h-12 w-12 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-gray-600 flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {serverName?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-white truncate">{serverName}</p>
                <p className="text-xs text-gray-400">
                  {serverUserList.length} {serverUserList.length === 1 ? 'Member' : 'Members'}
                </p>
              </div>
            </div>
            {/* Actions */}
            <div className="px-4 pt-3 flex flex-col gap-1">
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setShowMobileSheet(false);
                      setShowInviteModal(true);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700 rounded-lg"
                  >
                    Invite People
                  </button>
                  <button
                    onClick={() => {
                      setShowMobileSheet(false);
                      setShowCreateChannel(false);
                      setShowCreateCategory(false);
                      onOpenSettings();
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700 rounded-lg"
                  >
                    Server Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowMobileSheet(false);
                      setShowCreateChannel(true);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700 rounded-lg"
                  >
                    Create Channel
                  </button>
                  <button
                    onClick={() => {
                      setShowMobileSheet(false);
                      setShowCreateCategory(true);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700 rounded-lg"
                  >
                    Create Category
                  </button>
                </>
              )}
              {!isOwner && (
                <button
                  onClick={() => {
                    setShowMobileSheet(false);
                    setConfirmLeave(true);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-gray-700 rounded-lg"
                >
                  Leave Server
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave server confirmation modal */}
      {confirmLeave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-[5%] sm:px-0"
          onClick={() => setConfirmLeave(false)}
        >
          <div
            className="w-72 rounded-lg bg-gray-800 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-bold text-white">Leave Server</h3>
            <p className="mb-5 text-sm text-gray-300">
              Are you sure you want to leave{' '}
              <span className="font-semibold text-white">{serverName}</span>? You'll need an invite
              to rejoin.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLeave(false)}
                className="flex-1 rounded bg-gray-600 py-2 text-sm text-gray-200 hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmLeave(false);
                  onLeaveServer();
                }}
                className="flex-1 rounded bg-red-600 py-2 text-sm text-white hover:bg-red-700"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-[5%] sm:px-0"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-72 rounded-lg bg-gray-800 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-bold text-white">Delete Channel</h3>
            <p className="mb-5 text-sm text-gray-300">
              Are you sure you want to delete this channel? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded bg-gray-600 py-2 text-sm text-gray-200 hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  dispatch(deleteChatroom({ chatroomId: confirmDeleteId }));
                  setConfirmDeleteId(null);
                }}
                className="flex-1 rounded bg-red-600 py-2 text-sm text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete category confirmation modal */}
      {confirmDeleteCategoryId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-[5%] sm:px-0"
          onClick={() => setConfirmDeleteCategoryId(null)}
        >
          <div
            className="w-72 rounded-lg bg-gray-800 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-bold text-white">Delete Category</h3>
            <p className="mb-5 text-sm text-gray-300">
              Are you sure you want to delete this category? Channels inside will become
              uncategorized.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteCategoryId(null)}
                className="flex-1 rounded bg-gray-600 py-2 text-sm text-gray-200 hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  dispatch(categoryDelete(confirmDeleteCategoryId));
                  setConfirmDeleteCategoryId(null);
                }}
                className="flex-1 rounded bg-red-600 py-2 text-sm text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <InviteModal serverId={serverId} onClose={() => setShowInviteModal(false)} />
      )}

      {/* Private access modal */}
      {inviteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-[5%] sm:px-0"
          onClick={() => setInviteTarget(null)}
        >
          <div
            className="w-80 rounded-lg bg-gray-800 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-base font-bold text-white">Manage Access</h3>
            <p className="mb-4 flex items-center gap-1.5 text-xs text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {inviteTarget.name} — select who can see this {inviteTarget.type}
            </p>
            <div className="mb-4 max-h-60 overflow-y-auto space-y-1">
              {serverUserList
                .filter((u) => !['owner', 'admin'].includes(u.type))
                .map((u) => {
                  const allowed = inviteTarget.allowedUserIds.includes(u.userId);
                  return (
                    <label
                      key={u.userId}
                      className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={allowed}
                        onChange={() => {
                          const next = allowed
                            ? inviteTarget.allowedUserIds.filter((id) => id !== u.userId)
                            : [...inviteTarget.allowedUserIds, u.userId];
                          setInviteTarget({ ...inviteTarget, allowedUserIds: next });
                        }}
                      />
                      <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                        {u.imageUrl ? (
                          <img
                            src={u.imageUrl}
                            className="h-full w-full object-cover"
                            alt=""
                            loading="eager"
                          />
                        ) : (
                          u.username[0]?.toUpperCase()
                        )}
                      </div>
                      <span className="text-sm text-gray-200">{u.username}</span>
                      <span className="ml-auto text-xs text-gray-500">{u.type}</span>
                    </label>
                  );
                })}
            </div>
            <p className="mb-3 text-xs text-gray-500">Admins and owners always have access.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setInviteTarget(null)}
                className="flex-1 rounded bg-gray-600 py-2 text-sm text-gray-200 hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInvite}
                className="flex-1 rounded bg-yellow-500 py-2 text-sm font-semibold text-gray-900 hover:bg-yellow-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SLOWMODE_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
];

function ChannelRow({
  chatroom,
  active,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  showLineBefore,
  showLineAfter,
  isAdmin,
  onDelete,
  onSlowmode,
  onTogglePrivate,
  onInvite,
  voiceParticipants,
  serverUserList,
  onJoinVoice,
  onOpenVoiceChat,
  currentUsername,
  voiceMuted,
  voiceDeafened,
  voiceDeafenedUsers,
  onVoiceMuteToggle,
  onVoiceDeafenToggle,
}: {
  chatroom: Chatroom;
  active: boolean;
  onSelect: (c: Chatroom) => void;
  onDragStart: (c: Chatroom) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, c: Chatroom) => void;
  onDrop: (e: React.DragEvent, c: Chatroom) => void;
  showLineBefore: boolean;
  showLineAfter: boolean;
  isAdmin: boolean;
  onDelete: (id: number) => void;
  onSlowmode: (id: number, seconds: number) => void;
  onTogglePrivate: (id: number, isPrivate: boolean) => void;
  onInvite: (c: Chatroom) => void;
  voiceParticipants: string[];
  serverUserList: ServerUser[];
  onJoinVoice: (c: Chatroom) => void;
  onOpenVoiceChat: (c: Chatroom) => void;
  currentUsername: string;
  voiceMuted: boolean;
  voiceDeafened: boolean;
  voiceDeafenedUsers: Record<string, boolean>;
  onVoiceMuteToggle: () => void;
  onVoiceDeafenToggle: () => void;
}) {
  const [showSlowmode, setShowSlowmode] = useState(false);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

  return (
    <div className="relative group">
      {showLineBefore && (
        <div className="absolute top-0 left-2 right-2 h-0.5 bg-yellow-300 z-10 rounded" />
      )}
      <div
        draggable
        onDragStart={() => onDragStart(chatroom)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, chatroom)}
        onDrop={(e) => onDrop(e, chatroom)}
        onClick={() => (chatroom.type === 'voice' ? onJoinVoice(chatroom) : onSelect(chatroom))}
        className={`relative flex cursor-pointer items-center gap-1 overflow-hidden px-3 py-1 text-sm hover:bg-gray-600 ${active ? 'bg-gray-600 text-white' : 'text-gray-300'}`}
      >
        <span className="flex w-4 flex-shrink-0 items-center justify-center text-gray-400">
          {chatroom.type === 'voice' ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            '#'
          )}
        </span>
        <span className="flex-1 truncate min-w-0">{chatroom.name}</span>
        {/* Persistent icons (always visible) */}
        {(chatroom.slowmode ?? 0) > 0 && (
          <span className="flex-shrink-0 text-xs text-yellow-400" title="Slowmode enabled">
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
        )}
        {chatroom.isPrivate && (
          <span className="flex-shrink-0 text-gray-400">
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
        )}
        {/* Admin hover icons — overlay from the right */}
        {isAdmin && (
          <div
            className="absolute right-0 top-0 bottom-0 hidden group-hover:flex items-center pl-6 pr-1"
            style={{
              background: active
                ? 'linear-gradient(to right, transparent, #4b5563 28%)'
                : 'linear-gradient(to right, transparent, #374151 28%)',
            }}
          >
            <Tooltip text="Channel access">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInvite(chatroom);
                }}
                className="flex items-center px-1 text-gray-400 hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip text="Slowmode">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setPopupPos({ top: rect.bottom + 4, left: rect.left });
                  setShowSlowmode((v) => !v);
                }}
                className="flex items-center text-gray-400 hover:text-white px-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>
            </Tooltip>
            {chatroom.type === 'voice' && (
              <Tooltip text="Open chat">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenVoiceChat(chatroom);
                  }}
                  className="flex items-center px-1 text-gray-400 hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5"
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
            <Tooltip text="Delete channel">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chatroom.id);
                }}
                className="flex items-center px-1 text-gray-400 hover:text-red-400"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {showSlowmode && popupPos && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowSlowmode(false)} />
          <div
            className="fixed z-30 w-40 rounded bg-gray-900 border border-gray-600 p-2 text-xs shadow-xl"
            style={{ top: popupPos.top, left: popupPos.left }}
          >
            <p className="mb-1.5 font-semibold text-gray-400 uppercase tracking-wide">Slowmode</p>
            <div className="flex flex-wrap gap-1">
              {SLOWMODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSlowmode(chatroom.id, opt.value);
                    setShowSlowmode(false);
                  }}
                  className={`rounded px-2 py-0.5 ${(chatroom.slowmode ?? 0) === opt.value ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {showLineAfter && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-yellow-300 z-10 rounded" />
      )}

      {chatroom.type === 'voice' && voiceParticipants.length > 0 && (
        <div className="pb-1">
          {[...voiceParticipants]
            .sort((a, b) => a.localeCompare(b))
            .map((uname) => {
              const member = serverUserList.find((u) => u.username === uname);
              return (
                <div key={uname} className="flex items-center gap-1.5 pl-8 pr-3 py-0.5">
                  <div className="h-5 w-5 flex-shrink-0 overflow-hidden rounded-full bg-gray-600 border border-gray-400 flex items-center justify-center text-[0.5625rem] font-bold text-white">
                    {member?.imageUrl ? (
                      <img
                        src={member.imageUrl}
                        className="h-full w-full object-cover"
                        alt=""
                        loading="eager"
                      />
                    ) : (
                      uname[0]?.toUpperCase()
                    )}
                  </div>
                  <span className="flex-1 truncate text-xs text-gray-400">{uname}</span>
                  {uname === currentUsername ? (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVoiceMuteToggle();
                        }}
                        title={voiceMuted || voiceDeafened ? 'Unmute' : 'Mute'}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`flex-shrink-0 w-2.5 h-2.5 ${voiceMuted || voiceDeafened ? 'text-red-400' : 'text-green-400'}`}
                        >
                          {voiceMuted || voiceDeafened ? (
                            <>
                              <line x1="1" y1="1" x2="23" y2="23" />
                              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </>
                          ) : (
                            <>
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </>
                          )}
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVoiceDeafenToggle();
                        }}
                        title={voiceDeafened ? 'Undeafen' : 'Deafen'}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`flex-shrink-0 w-2.5 h-2.5 ${voiceDeafened ? 'text-red-400' : 'text-green-400'}`}
                        >
                          {voiceDeafened ? (
                            <>
                              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </>
                          ) : (
                            <>
                              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`flex-shrink-0 w-2.5 h-2.5 ${voiceDeafenedUsers[uname] ? 'text-red-400' : 'text-green-400'}`}
                      >
                        {voiceDeafenedUsers[uname] ? (
                          <>
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                          </>
                        ) : (
                          <>
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                          </>
                        )}
                      </svg>
                      {voiceDeafenedUsers[uname] && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-red-400 flex-shrink-0 w-2.5 h-2.5"
                        >
                          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
