'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { AppDispatch, useAppSelector } from '@/lib/redux/store';
import { userVerification, sendEmail } from '@/lib/redux/modules/users/users';

export default function VerificationPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const params = useSearchParams();
  const { error, isLoading, success, already } = useAppSelector(s => s.user);

  const called = useRef(false);
  const token = params.get('token');
  const email = params.get('email');
  const [resendEmail, setResendEmail] = useState(email ?? '');

  useEffect(() => {
    if (token && email && !called.current) {
      called.current = true;
      dispatch(userVerification({ token, email }));
    }
  }, [token, email, dispatch]);

  useEffect(() => {
    if (success || already) {
      const t = setTimeout(() => router.push('/login'), 3000);
      return () => clearTimeout(t);
    }
  }, [success, already, router]);

  if (success || already) {
    return (
      <div className="w-full">
        <div className="rounded-lg bg-gray-800 p-8 text-center text-white shadow-lg">
          <h2 className="text-xl font-bold text-green-400">
            {already ? 'Already verified!' : 'Account verified!'}
          </h2>
          <p className="mt-2 text-gray-300">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="mx-auto w-full max-w-sm rounded-lg bg-gray-800 p-8 shadow-lg">
          <h2 className="mb-2 text-lg font-bold text-red-400">Verification failed</h2>
          <p className="mb-4 text-sm text-gray-300">The link may have expired. Enter your email to resend.</p>
          <input
            type="email"
            value={resendEmail}
            onChange={e => setResendEmail(e.target.value)}
            className="mb-3 w-full rounded bg-gray-700 px-3 py-2 text-white"
            placeholder="your@email.com"
          />
          <button
            onClick={() => dispatch(sendEmail({ email: resendEmail }))}
            className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700"
          >
            Resend verification email
          </button>
          <Link href="/login" className="mt-3 block text-center text-sm text-gray-400 hover:underline">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-white">
        {isLoading ? 'Verifying your account…' : 'Loading…'}
      </div>
    </div>
  );
}
