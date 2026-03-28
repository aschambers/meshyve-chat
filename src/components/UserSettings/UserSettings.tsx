'use client';

import { useRef, useState, useEffect } from 'react';
import { useDragToClose } from '@/lib/useDragToClose';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/redux/store';
import { userUpdate } from '@/lib/redux/modules/users/users';
import { JWTPayload } from '@/lib/auth';

interface Props {
  user: JWTPayload;
  onClose: () => void;
  onLogout?: () => void;
  onSaved: (updated: {
    username?: string;
    email?: string;
    imageUrl?: string;
    nameColor?: string | null;
    description?: string | null;
  }) => void;
}

interface NotificationSettings {
  messageNotifications: boolean;
  friendRequestNotifications: boolean;
  serverNotifications: boolean;
  soundEnabled: boolean;
}

interface PrivacySettings {
  showOnlineStatus: boolean;
  allowFriendRequests: boolean;
  allowDirectMessages: boolean;
}

const defaultNotifications: NotificationSettings = {
  messageNotifications: true,
  friendRequestNotifications: true,
  serverNotifications: true,
  soundEnabled: true,
};

const defaultPrivacy: PrivacySettings = {
  showOnlineStatus: true,
  allowFriendRequests: true,
  allowDirectMessages: true,
};

function hexToLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1),
    l2 = hexToLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
const BG = '#1f2937';
const isReadable = (color: string) => contrastRatio(color, BG) >= 3;

type Tab = 'profile' | 'notifications' | 'privacy';

export default function UserSettings({ user, onClose, onLogout, onSaved }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('profile');

  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [imagePreview, setImagePreview] = useState(user.imageUrl ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [nameColor, setNameColor] = useState<string>(user.nameColor ?? '');
  const [description, setDescription] = useState<string>(user.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { containerRef, dragStyle, handleTouchStart, handleTouchMove, handleTouchEnd } =
    useDragToClose(onClose);

  const storageKey = `user_settings_${user.id}`;

  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacy);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.notifications)
          setNotifications({
            ...defaultNotifications,
            ...parsed.notifications,
          });
        if (parsed.privacy) setPrivacy({ ...defaultPrivacy, ...parsed.privacy });
      }
    } catch {}
  }, [storageKey]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleSaveProfile = async () => {
    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters.');
      return;
    }
    if (nameColor && !isReadable(nameColor)) {
      setError('Color does not have enough contrast to be readable.');
      return;
    }
    setSaving(true);
    setError('');
    const formData = new FormData();
    formData.append('userId', String(user.id));
    formData.append('username', username.trim());
    formData.append('email', email.trim());
    if (imageFile) formData.append('imageUrl', imageFile);
    formData.append('nameColor', nameColor);
    formData.append('description', description);

    const result = await dispatch(userUpdate(formData));
    setSaving(false);
    if (userUpdate.fulfilled.match(result)) {
      console.log(nameColor);
      onSaved({
        username: username.trim(),
        email: email.trim(),
        imageUrl: imagePreview || undefined,
        nameColor: nameColor || null,
        description: description || null,
      });
      onClose();
    } else {
      setError('Failed to save changes.');
    }
  };

  const handleSaveNotifications = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem(storageKey, JSON.stringify({ ...parsed, notifications }));
    } catch {}
    onClose();
  };

  const handleSavePrivacy = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem(storageKey, JSON.stringify({ ...parsed, privacy }));
    } catch {}
    onClose();
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors ${checked ? 'bg-yellow-500' : 'bg-gray-600'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'privacy', label: 'Privacy' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="flex flex-col w-full h-[80dvh] rounded-t-2xl sm:w-[90vw] sm:max-w-md sm:max-h-[90vh] sm:rounded-lg sm:h-auto bg-gray-800 shadow-xl overflow-hidden"
        style={dragStyle}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-gray-600" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h2 className="text-lg font-bold text-white">User Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setError('');
              }}
              className={`mr-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === t.id
                  ? 'border-yellow-400 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Profile Tab */}
          {tab === 'profile' && (
            <>
              <div className="mb-5 flex items-center gap-4">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gray-900 ring-2 ring-gray-600 text-xl font-bold text-white hover:opacity-80"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    username[0]?.toUpperCase()
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-sm text-yellow-300 hover:underline"
                >
                  Change avatar
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      if (e.target.value.length <= 32) setUsername(e.target.value);
                    }}
                    className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Name Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={nameColor || '#fde047'}
                      onChange={(e) => setNameColor(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <span
                      className="font-semibold text-sm"
                      style={{ color: nameColor || '#fde047' }}
                    >
                      {username || 'Preview'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNameColor('')}
                      className="ml-auto text-xs text-gray-400 hover:text-gray-200"
                    >
                      Reset to default
                    </button>
                  </div>
                  {nameColor && !isReadable(nameColor) && (
                    <p className="mt-1 text-xs text-yellow-400">
                      This color may be hard to read on the dark background.
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => {
                      if (e.target.value.length <= 190) setDescription(e.target.value);
                    }}
                    rows={3}
                    placeholder="Tell others a bit about yourself…"
                    className="w-full resize-none rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-500"
                  />
                  <p className="mt-0.5 text-right text-xs text-gray-500">
                    {description.length}/190
                  </p>
                </div>
              </div>

              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded bg-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="rounded bg-yellow-500 px-4 py-2 text-sm text-gray-900 hover:bg-yellow-600 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </>
          )}

          {/* Notifications Tab */}
          {tab === 'notifications' && (
            <>
              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Messages
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">Message Notifications</p>
                        <p className="text-xs text-gray-400">
                          Get notified when you receive new messages
                        </p>
                      </div>
                      <Toggle
                        checked={notifications.messageNotifications}
                        onChange={(v) =>
                          setNotifications((n) => ({
                            ...n,
                            messageNotifications: v,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">Sound Effects</p>
                        <p className="text-xs text-gray-400">Play sounds for incoming messages</p>
                      </div>
                      <Toggle
                        checked={notifications.soundEnabled}
                        onChange={(v) => setNotifications((n) => ({ ...n, soundEnabled: v }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Social
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">Friend Requests</p>
                        <p className="text-xs text-gray-400">
                          Get notified about new friend requests
                        </p>
                      </div>
                      <Toggle
                        checked={notifications.friendRequestNotifications}
                        onChange={(v) =>
                          setNotifications((n) => ({
                            ...n,
                            friendRequestNotifications: v,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">Server Activity</p>
                        <p className="text-xs text-gray-400">Get notified about server events</p>
                      </div>
                      <Toggle
                        checked={notifications.serverNotifications}
                        onChange={(v) =>
                          setNotifications((n) => ({
                            ...n,
                            serverNotifications: v,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded bg-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotifications}
                  className="rounded bg-yellow-500 px-4 py-2 text-sm text-gray-900 hover:bg-yellow-600"
                >
                  Save Changes
                </button>
              </div>
            </>
          )}

          {/* Privacy Tab */}
          {tab === 'privacy' && (
            <>
              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Visibility
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">Online Status</p>
                        <p className="text-xs text-gray-400">Show others when you're online</p>
                      </div>
                      <Toggle
                        checked={privacy.showOnlineStatus}
                        onChange={(v) => setPrivacy((p) => ({ ...p, showOnlineStatus: v }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Interactions
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">Friend Requests</p>
                        <p className="text-xs text-gray-400">
                          Allow others to send you friend requests
                        </p>
                      </div>
                      <Toggle
                        checked={privacy.allowFriendRequests}
                        onChange={(v) => setPrivacy((p) => ({ ...p, allowFriendRequests: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">Direct Messages</p>
                        <p className="text-xs text-gray-400">
                          Allow others to send you direct messages
                        </p>
                      </div>
                      <Toggle
                        checked={privacy.allowDirectMessages}
                        onChange={(v) => setPrivacy((p) => ({ ...p, allowDirectMessages: v }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded bg-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePrivacy}
                  className="rounded bg-yellow-500 px-4 py-2 text-sm text-gray-900 hover:bg-yellow-600"
                >
                  Save Changes
                </button>
              </div>
            </>
          )}
        </div>
        <div className="border-t border-gray-700 px-6 py-3 flex items-center justify-between text-xs text-gray-500">
          {onLogout ? (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors"
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </button>
          ) : (
            <span />
          )}
          <div>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300"
            >
              Terms of Service
            </a>{' '}
            ·{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
