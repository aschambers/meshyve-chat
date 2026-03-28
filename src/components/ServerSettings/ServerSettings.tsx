'use client';

import { useEffect, useRef, useState } from 'react';
import { useDragToClose } from '@/lib/useDragToClose';
import { useDispatch } from 'react-redux';
import { AppDispatch, useAppSelector } from '@/lib/redux/store';
import {
  findUserList,
  findUserBans,
  updateUserRole,
  unbanUser,
  deleteServer,
  fetchServerInfo,
  updateServer,
} from '@/lib/redux/modules/servers/servers';
import { findInvites, deleteInvite } from '@/lib/redux/modules/invites/invites';
import { findServer } from '@/lib/redux/modules/servers/servers';
import type { ServerUser } from '@/lib/types';
import dayjs from 'dayjs';

interface Props {
  serverId: number;
  serverName: string;
  currentUsername: string;
  userId: number;
  onClose: () => void;
  onServerDeleted: () => void;
  onServerUpdated?: () => void;
}

type Tab = 'overview' | 'members' | 'bans' | 'invites';

const ROLES = ['owner', 'admin', 'moderator', 'voice', 'user'] as const;

export default function ServerSettings({
  serverId,
  serverName,
  currentUsername,
  userId,
  onClose,
  onServerDeleted,
  onServerUpdated,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { serverUserList, serverUserBans, serverInfo } = useAppSelector((s) => s.server);
  const { invites } = useAppSelector((s) => s.invite);

  const [tab, setTab] = useState<Tab>('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { containerRef, dragStyle, handleTouchStart, handleTouchMove, handleTouchEnd } =
    useDragToClose(onClose);

  // Overview edit state
  const fileRef = useRef<HTMLInputElement>(null);
  const [editName, setEditName] = useState(serverName);
  const [editPublic, setEditPublic] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    dispatch(findUserList(serverId));
    dispatch(findUserBans(serverId));
    dispatch(fetchServerInfo(serverId));
    dispatch(findInvites(serverId));
  }, [dispatch, serverId]);

  // Populate overview fields once serverInfo loads
  useEffect(() => {
    if (serverInfo) {
      setEditName(serverInfo.name);
      setEditPublic(serverInfo.public ?? false);
      setImagePreview(serverInfo.imageUrl ?? '');
    }
  }, [serverInfo]);

  const me = serverUserList.find((u) => u.username === currentUsername);
  const isOwner = me?.type === 'owner';

  const handleRoleChange = (user: ServerUser, newRole: string) => {
    dispatch(
      updateUserRole({
        serverId,
        userId: user.userId,
        username: user.username,
        imageUrl: user.imageUrl ?? null,
        active: user.active ?? true,
        type: newRole,
      })
    );
  };

  const handleUnban = (user: ServerUser) => {
    dispatch(unbanUser({ userId: user.userId, serverId }));
  };

  const handleDeleteServer = async () => {
    await dispatch(deleteServer({ userId, serverId }));
    onServerDeleted();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleSaveOverview = async () => {
    if (editName.trim().length < 2) {
      setSaveError('Server name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    setSaveError('');
    const formData = new FormData();
    formData.append('serverId', String(serverId));
    formData.append('userId', String(userId));
    formData.append('name', editName.trim());
    formData.append('public', String(editPublic));
    if (imageFile) formData.append('imageUrl', imageFile);

    const result = await dispatch(updateServer(formData));
    setSaving(false);
    if (updateServer.fulfilled.match(result)) {
      dispatch(findServer(userId));
      onServerUpdated?.();
    } else {
      setSaveError('Failed to save changes.');
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Members' },
    { id: 'bans', label: 'Bans' },
    { id: 'invites', label: 'Invites' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/60">
      <div
        ref={containerRef}
        className="flex w-full flex-col bg-gray-800 shadow-xl h-[80dvh] rounded-t-2xl sm:rounded-lg sm:max-w-lg sm:max-h-[90vh] sm:h-auto"
        style={dragStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-gray-600" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-600 px-6 py-4">
          <h2 className="font-bold text-white">{serverName} — Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-600">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSaveError('');
              }}
              className={`px-5 py-2 text-sm capitalize ${tab === t.id ? 'border-b-2 border-yellow-400 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Overview */}
          {tab === 'overview' && (
            <div>
              {/* Server icon */}
              <div className="mb-5 flex items-center gap-4">
                <div
                  onClick={() => isOwner && fileRef.current?.click()}
                  className={`flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-yellow-500 text-2xl font-bold text-gray-900 ${isOwner ? 'cursor-pointer hover:opacity-80' : ''}`}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="icon" className="h-full w-full object-cover" />
                  ) : (
                    editName[0]?.toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {serverInfo?.name ?? serverName}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="mt-1 text-xs text-yellow-300 hover:underline"
                    >
                      Change icon
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Server Name</label>
                  {isOwner ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => {
                        if (e.target.value.length <= 30) setEditName(e.target.value);
                      }}
                      className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  ) : (
                    <p className="rounded bg-gray-700 px-3 py-2 text-sm text-white">
                      {serverInfo?.name ?? serverName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">Visibility</label>
                  {isOwner ? (
                    <div className="flex gap-3">
                      {['Public', 'Private'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setEditPublic(opt === 'Public')}
                          className={`flex-1 rounded py-2 text-sm ${(opt === 'Public') === editPublic ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded bg-gray-700 px-3 py-2 text-sm text-white">
                      {serverInfo?.public ? 'Public' : 'Private'}
                    </p>
                  )}
                </div>
              </div>

              {saveError && <p className="mt-3 text-sm text-red-400">{saveError}</p>}

              {isOwner && (
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={handleSaveOverview}
                    disabled={saving}
                    className="rounded bg-yellow-500 px-4 py-2 text-sm text-gray-900 hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Members */}
          {tab === 'members' && (
            <div className="space-y-2">
              {serverUserList.map((user, i) => {
                const canEdit =
                  isOwner && user.username !== currentUsername && user.type !== 'owner';
                return (
                  <div key={i} className="flex items-center gap-3 rounded bg-gray-700 px-3 py-2">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 ring-1 ring-gray-600 text-xs font-bold text-white">
                      {user.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt={user.username}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        user.username[0]?.toUpperCase()
                      )}
                    </div>
                    <span className="flex-1 min-w-0 truncate text-sm">{user.username}</span>
                    {canEdit ? (
                      <select
                        value={user.type}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        className="flex-shrink-0 rounded bg-gray-600 px-2 py-1 text-xs text-white"
                      >
                        {ROLES.filter((r) => r !== 'owner').map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400 capitalize">{user.type}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bans */}
          {tab === 'bans' && (
            <div className="space-y-2">
              {(serverUserBans as ServerUser[]).length === 0 && (
                <p className="text-sm text-gray-400">No banned users.</p>
              )}
              {(serverUserBans as ServerUser[]).map((user, i) => (
                <div key={i} className="flex items-center gap-3 rounded bg-gray-700 px-3 py-2">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-600 text-xs font-bold">
                    {user.username[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 min-w-0 truncate text-sm">{user.username}</span>
                  {isOwner && (
                    <button
                      onClick={() => handleUnban(user)}
                      className="flex-shrink-0 rounded bg-yellow-500 px-3 py-1 text-xs text-gray-900 hover:bg-yellow-600"
                    >
                      Unban
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Invites */}
          {tab === 'invites' && (
            <div className="space-y-2">
              {invites.length === 0 && <p className="text-sm text-gray-400">No active invites.</p>}
              {invites.map((invite, i) => (
                <div key={i} className="rounded bg-gray-700 px-3 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-yellow-300">{invite.code}</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => navigator.clipboard.writeText(invite.code)}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => dispatch(deleteInvite({ inviteId: invite.id, serverId }))}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Expires:{' '}
                    {invite.createdAt
                      ? dayjs(invite.createdAt)
                          .add(invite.expires, 'hour')
                          .format('MMM D, YYYY h:mm A')
                      : `in ${invite.expires}h`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete server — owner only */}
        {isOwner && (
          <div className="border-t border-gray-600 p-5">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-red-400">Are you sure? This cannot be undone.</span>
                <button
                  onClick={handleDeleteServer}
                  className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Delete Server
              </button>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
