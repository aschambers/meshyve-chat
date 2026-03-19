'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { AppDispatch, useAppSelector } from '@/lib/redux/store';
import { forgotPassword, resetPassword } from '@/lib/redux/modules/users/users';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const params = useSearchParams();
  const { isLoading, resetPassSuccess, resetPassError, forgotPassSuccess } = useAppSelector(s => s.user);

  const token = params.get('token');
  const email = params.get('email');

  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  if (resetPassSuccess) {
    return (
      <div className="w-full">
        <div className="rounded-lg bg-gray-800 p-8 text-center text-white shadow-lg">
          <h2 className="text-xl font-bold text-green-400">Password reset!</h2>
          <Link href="/login" className="mt-4 block text-indigo-400 hover:underline">Back to login</Link>
        </div>
      </div>
    );
  }

  if (forgotPassSuccess) {
    return (
      <div className="w-full">
        <div className="rounded-lg bg-gray-800 p-8 text-center text-white shadow-lg">
          <h2 className="text-xl font-bold">Check your email</h2>
          <p className="mt-2 text-gray-300">A password reset link has been sent.</p>
          <Link href="/login" className="mt-4 block text-indigo-400 hover:underline">Back to login</Link>
        </div>
      </div>
    );
  }

  // Step 2: user arrived via email link with token
  if (token && email) {
    const handleReset = (e: { preventDefault(): void }) => {
      e.preventDefault();
      if (password !== confirm) { setMismatch(true); return; }
      setMismatch(false);
      dispatch(resetPassword({ token, password }));
    };
    return (
      <div className="w-full">
        <div className="mx-auto w-full max-w-sm rounded-lg bg-gray-800 p-8 shadow-lg">
          <h1 className="mb-6 text-2xl font-bold text-white">Set new password</h1>
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300">New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full rounded bg-gray-700 px-3 py-2 text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full rounded bg-gray-700 px-3 py-2 text-white" />
            </div>
            {mismatch && <p className="text-sm text-red-400">Passwords do not match.</p>}
            {resetPassError && <p className="text-sm text-red-400">Reset failed. Link may have expired.</p>}
            <button type="submit" disabled={isLoading} className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50">
              {isLoading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step 1: enter email to receive reset link
  const handleForgot = (e: { preventDefault(): void }) => {
    e.preventDefault();
    dispatch(forgotPassword({ email: emailInput }));
  };

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-sm rounded-lg bg-gray-800 p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-white">Forgot password</h1>
        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Email</label>
            <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} required className="w-full rounded bg-gray-700 px-3 py-2 text-white" />
          </div>
          <button type="submit" disabled={isLoading} className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <Link href="/login" className="mt-4 block text-center text-sm text-gray-400 hover:underline">Back to login</Link>
      </div>
    </div>
  );
}
