'use client';

import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/redux/store';
import { inviteCreate, inviteEmailCreate } from '@/lib/redux/modules/invites/invites';

interface Props {
  serverId: number;
  onClose: () => void;
}

export default function InviteModal({ serverId, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const backdropRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<'main' | 'settings'>('main');
  const [instantFormat, setInstantFormat] = useState(true);
  const [expires, setExpires] = useState('24');
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    if (instantFormat) {
      const result = await dispatch(inviteCreate({ serverId, expires: Number(expires) }));
      if (inviteCreate.fulfilled.match(result)) {
        setInviteCode((result.payload as { code: string }).code);
      }
    } else {
      await dispatch(inviteEmailCreate({ serverId, expires: Number(expires), email }));
      setInviteCode('sent');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="w-full max-w-sm rounded-lg bg-gray-800 p-6 shadow-xl">

        {view === 'settings' ? (
          <>
            <h2 className="mb-4 text-lg font-bold text-white">Invite Settings</h2>

            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-300">Instant invite code</span>
              <button
                onClick={() => setInstantFormat(v => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${instantFormat ? 'bg-indigo-600' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${instantFormat ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="mb-5">
              <label className="mb-1 block text-sm text-gray-300">Expires after</label>
              <select
                value={expires}
                onChange={e => setExpires(e.target.value)}
                className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white"
              >
                <option value="24">24 Hours</option>
                <option value="12">12 Hours</option>
                <option value="6">6 Hours</option>
                <option value="3">3 Hours</option>
                <option value="2">2 Hours</option>
                <option value="1">1 Hour</option>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setView('main')}
                className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {inviteCode === 'sent' ? 'Invite Sent!' : inviteCode ? 'Invite Code' : instantFormat ? 'Create Instant Invite' : 'Send Personal Invite'}
              </h2>
              <button onClick={() => setView('settings')} className="text-gray-400 hover:text-white" title="Settings">
                ⚙
              </button>
            </div>

            {!inviteCode && instantFormat && (
              <p className="mb-4 text-sm text-gray-400">
                Generate a code anyone can use to join this server (expires in {expires}h).
              </p>
            )}

            {!inviteCode && !instantFormat && (
              <div className="mb-4">
                <label className="mb-1 block text-sm text-gray-300">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {inviteCode && inviteCode !== 'sent' && (
              <div className="mb-4 flex gap-2">
                <input
                  readOnly
                  value={inviteCode}
                  className="flex-1 rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            )}

            {inviteCode === 'sent' && (
              <p className="mb-4 text-sm text-green-400">Invite email has been sent!</p>
            )}

            <div className="flex justify-between">
              <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
              {!inviteCode && (
                <button
                  onClick={handleCreate}
                  disabled={loading || (!instantFormat && !email.trim())}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Creating…' : 'Create'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
