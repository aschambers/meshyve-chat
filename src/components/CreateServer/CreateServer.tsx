'use client';

import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch, useAppSelector } from '@/lib/redux/store';
import { createServer, resetServerValues } from '@/lib/redux/modules/servers/servers';

interface Props {
  userId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateServer({ userId, onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useAppSelector(s => s.server);

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => { dispatch(resetServerValues()); };
  }, [dispatch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const formData = new FormData();
    formData.append('name', name);
    formData.append('userId', String(userId));
    formData.append('public', 'false');
    if (file) formData.append('imageUrl', file);
    const result = await dispatch(createServer(formData));
    if (createServer.fulfilled.match(result)) {
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
        <h1 className="mb-2 text-xl font-bold text-white">Create your server</h1>
        <p className="mb-4 text-sm text-gray-400">
          Creating a server will allow you to set up chatrooms and channels to communicate with others.
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-gray-300">Server Name</label>
          <input
            type="text"
            placeholder="Enter a server name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded bg-gray-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-gray-300">Server Icon (optional)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gray-700 hover:bg-gray-600"
          >
            {imageUrl
              ? <img src={imageUrl} alt="server icon" className="h-full w-full object-cover" />
              : <span className="text-xs text-gray-400">Upload</span>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {error && <p className="mb-3 text-sm text-red-400">There was an error creating the server.</p>}

        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">
            ← Back
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading || !name.trim()}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
