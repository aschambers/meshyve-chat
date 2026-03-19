'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/redux/store';
import { userLogin } from '@/lib/redux/modules/users/users';
import { useAppSelector } from '@/lib/redux/store';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { error, isLoading, notVerified } = useAppSelector(s => s.user);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const result = await dispatch(userLogin({ email, password }));
    if (userLogin.fulfilled.match(result)) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-sm rounded-lg bg-gray-800 p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-white">Sign in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded bg-gray-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded bg-gray-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">Invalid email or password.</p>}
          {notVerified && (
            <p className="text-sm text-yellow-400">
              Account not verified.{' '}
              <Link href="/verification" className="underline">Resend email</Link>
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded bg-indigo-600 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          No account?{' '}
          <Link href="/signup" className="text-indigo-400 hover:underline">Sign up</Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/reset-password" className="text-gray-400 hover:underline text-xs">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}
