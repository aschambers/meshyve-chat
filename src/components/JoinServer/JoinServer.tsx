'use client';

import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch, useAppSelector } from '@/lib/redux/store';
import { inviteVerification } from '@/lib/redux/modules/invites/invites';

interface Props {
  userId: number;
  email: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JoinServer({ userId, email, onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useAppSelector(s => s.invite);
  const [code, setCode] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleJoin = async () => {
    if (!code.trim()) return;
    const result = await dispatch(inviteVerification({ userId, code, email }));
    if (inviteVerification.fulfilled.match(result)) {
      onSuccess();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-xl">
        <h1 className="mb-2 text-xl font-bold text-white">Join a server</h1>
        <p className="mb-4 text-sm text-gray-400">
          Enter an invite code below to join an existing server.
        </p>

        <input
          type="text"
          placeholder="Enter an invite code"
          value={code}
          onChange={e => setCode(e.target.value)}
          className="mb-4 w-full rounded bg-gray-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {error && <p className="mb-3 text-sm text-red-400">Invalid or expired invite code.</p>}

        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">
            ← Back
          </button>
          <button
            onClick={handleJoin}
            disabled={isLoading || !code.trim()}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? 'Joining…' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}
