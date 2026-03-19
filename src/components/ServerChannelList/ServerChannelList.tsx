'use client';

import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch, useAppSelector } from '@/lib/redux/store';
import { createChatroom, updateChatroom, reorderChatrooms } from '@/lib/redux/modules/chatrooms/chatrooms';
import { categoryCreate } from '@/lib/redux/modules/categories/categories';
import type { Chatroom, Category } from '@/lib/types';
import InviteModal from '@/components/InviteModal/InviteModal';

interface Props {
  serverId: number;
  serverName: string;
  isAdmin: boolean;
  activeChatroomId: number | null;
  onSelectChatroom: (chatroom: Chatroom) => void;
  onOpenSettings: () => void;
}

interface DropIndicator {
  chatroomId: number;
  before: boolean;
}

export default function ServerChannelList({ serverId, serverName, isAdmin, activeChatroomId, onSelectChatroom, onOpenSettings }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { chatrooms } = useAppSelector(s => s.chatroom);
  const { categories } = useAppSelector(s => s.category);

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [showMenu, setShowMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text');
  const [categoryName, setCategoryName] = useState('');
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

  const draggedChatroom = useRef<Chatroom | null>(null);

  const sortedChatrooms = [...chatrooms].sort((a, b) => {
    const pa = a.position ?? 999999;
    const pb = b.position ?? 999999;
    return pa !== pb ? pa - pb : a.id - b.id;
  });

  const toggleCollapse = (categoryId: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(categoryId) ? next.delete(categoryId) : next.add(categoryId);
      return next;
    });
  };

  const handleCreateChannel = async () => {
    if (channelName.trim().length < 2) return;
    await dispatch(createChatroom({ name: channelName.trim(), serverId, type: channelType, categoryId: null }));
    setChannelName('');
    setChannelType('text');
    setShowCreateChannel(false);
  };

  const handleCreateCategory = async () => {
    if (categoryName.trim().length < 2) return;
    await dispatch(categoryCreate({ name: categoryName.trim(), serverId, order: categories.length + 1, visible: true }));
    setCategoryName('');
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
    const targetCatChatrooms = sortedChatrooms.filter(c => c.categoryId === targetCategoryId);
    const before = dropIndicator?.chatroomId === targetChatroom.id ? dropIndicator.before : true;

    if ((dragged.categoryId ?? null) !== targetCategoryId) {
      // Moving to a different category: update categoryId first (optimistic in redux),
      // then reorder the destination category
      dispatch(updateChatroom({ chatroomId: dragged.id, categoryId: targetCategoryId }));
      const withoutDragged = targetCatChatrooms.filter(c => c.id !== dragged.id);
      const targetIdx = withoutDragged.findIndex(c => c.id === targetChatroom.id);
      const insertIdx = before ? targetIdx : targetIdx + 1;
      const reordered = [...withoutDragged];
      reordered.splice(insertIdx < 0 ? reordered.length : insertIdx, 0, dragged);
      dispatch(reorderChatrooms(reordered.map(c => c.id)));
    } else {
      // Same category: reorder only
      const withoutDragged = targetCatChatrooms.filter(c => c.id !== dragged.id);
      const targetIdx = withoutDragged.findIndex(c => c.id === targetChatroom.id);
      const insertIdx = before ? targetIdx : targetIdx + 1;
      const reordered = [...withoutDragged];
      reordered.splice(insertIdx < 0 ? reordered.length : insertIdx, 0, dragged);
      dispatch(reorderChatrooms(reordered.map(c => c.id)));
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

  const uncategorized = sortedChatrooms.filter(c => c.categoryId == null);

  return (
    <div className="flex flex-col h-full">
      {/* Server header */}
      <div className="relative border-b border-gray-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-bold">{serverName}</p>
          {isAdmin && (
            <button
              onClick={() => setShowMenu(v => !v)}
              className="text-gray-400 hover:text-white"
              title="Server options"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {showMenu && (
          <div className="absolute left-0 right-0 top-full z-50 bg-gray-900 shadow-lg rounded-b-lg py-1">
            <button
              onClick={() => { setShowMenu(false); onOpenSettings(); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Server Settings
            </button>
            <button
              onClick={() => { setShowMenu(false); setShowInviteModal(true); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Invite People
            </button>
            <button
              onClick={() => { setShowMenu(false); setShowCreateChannel(true); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              + Create Channel
            </button>
            <button
              onClick={() => { setShowMenu(false); setShowCreateCategory(true); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              + Create Category
            </button>
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
            onChange={e => { if (e.target.value.length <= 24) setChannelName(e.target.value); }}
            onKeyDown={e => e.key === 'Enter' && handleCreateChannel()}
            className="mb-2 w-full rounded bg-gray-700 px-2 py-1 text-sm text-white outline-none"
          />
          <div className="mb-2 flex gap-3 text-xs text-gray-300">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="type" checked={channelType === 'text'} onChange={() => setChannelType('text')} /> Text
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="type" checked={channelType === 'voice'} onChange={() => setChannelType('voice')} /> Voice
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreateChannel(false)} className="flex-1 rounded bg-gray-700 py-1 text-xs text-gray-300 hover:bg-gray-600">Cancel</button>
            <button onClick={handleCreateChannel} className="flex-1 rounded bg-indigo-600 py-1 text-xs text-white hover:bg-indigo-700">Create</button>
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
            onChange={e => { if (e.target.value.length <= 24) setCategoryName(e.target.value); }}
            onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
            className="mb-2 w-full rounded bg-gray-700 px-2 py-1 text-sm text-white outline-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowCreateCategory(false)} className="flex-1 rounded bg-gray-700 py-1 text-xs text-gray-300 hover:bg-gray-600">Cancel</button>
            <button onClick={handleCreateCategory} className="flex-1 rounded bg-indigo-600 py-1 text-xs text-white hover:bg-indigo-700">Create</button>
          </div>
        </div>
      )}

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto py-2">

        {/* Uncategorized drop zone */}
        <div
          onDrop={e => onDropOnCategory(null, e)}
          onDragOver={onDragOver}
          className="min-h-[4px]"
        >
          {uncategorized.map(c => (
            <ChannelRow
              key={c.id}
              chatroom={c}
              active={activeChatroomId === c.id}
              onSelect={onSelectChatroom}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOverChatroom}
              onDrop={onDropOnChatroom}
              showLineBefore={dropIndicator?.chatroomId === c.id && dropIndicator.before}
              showLineAfter={dropIndicator?.chatroomId === c.id && !dropIndicator.before}
            />
          ))}
        </div>

        {/* Categories */}
        {categories.map((cat: Category) => {
          const catChatrooms = sortedChatrooms.filter(c => c.categoryId === cat.id);
          const isCollapsed = collapsed.has(cat.id);
          return (
            <div key={cat.id} className="mt-2">
              <button
                onClick={() => toggleCollapse(cat.id)}
                className="flex w-full items-center gap-1 px-2 py-0.5 text-left text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-gray-200"
              >
                <span className="text-[10px]">{isCollapsed ? '▶' : '▼'}</span>
                {cat.name}
              </button>

              {!isCollapsed && (
                <div
                  onDrop={e => onDropOnCategory(cat.id, e)}
                  onDragOver={onDragOver}
                  className="min-h-[4px]"
                >
                  {catChatrooms.map(c => (
                    <ChannelRow
                      key={c.id}
                      chatroom={c}
                      active={activeChatroomId === c.id}
                      onSelect={onSelectChatroom}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onDragOver={onDragOverChatroom}
                      onDrop={onDropOnChatroom}
                      showLineBefore={dropIndicator?.chatroomId === c.id && dropIndicator.before}
                      showLineAfter={dropIndicator?.chatroomId === c.id && !dropIndicator.before}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <InviteModal
          serverId={serverId}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

function ChannelRow({ chatroom, active, onSelect, onDragStart, onDragEnd, onDragOver, onDrop, showLineBefore, showLineAfter }: {
  chatroom: Chatroom;
  active: boolean;
  onSelect: (c: Chatroom) => void;
  onDragStart: (c: Chatroom) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, c: Chatroom) => void;
  onDrop: (e: React.DragEvent, c: Chatroom) => void;
  showLineBefore: boolean;
  showLineAfter: boolean;
}) {
  return (
    <div className="relative">
      {showLineBefore && <div className="absolute top-0 left-2 right-2 h-0.5 bg-indigo-400 z-10 rounded" />}
      <div
        draggable
        onDragStart={() => onDragStart(chatroom)}
        onDragEnd={onDragEnd}
        onDragOver={e => onDragOver(e, chatroom)}
        onDrop={e => onDrop(e, chatroom)}
        onClick={() => onSelect(chatroom)}
        className={`flex cursor-pointer items-center gap-1 px-3 py-1 text-sm hover:bg-gray-600 ${active ? 'bg-gray-600 text-white' : 'text-gray-300'}`}
      >
        <span className="text-gray-400">{chatroom.type === 'voice' ? '🔊' : '#'}</span>
        {chatroom.name}
      </div>
      {showLineAfter && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-400 z-10 rounded" />}
    </div>
  );
}
