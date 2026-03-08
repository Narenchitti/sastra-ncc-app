'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  async function clientAction(formData: FormData) {
    const res = await loginAction(formData);
    
    if (res.success && res.user) {
      localStorage.setItem('user', JSON.stringify(res.user));
      if (res.user.role === 'ANO') router.push('/dashboard/ano');
      else router.push('/dashboard/cadet');
    } else {
      setError(res.message || 'Login Failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <img src="/assets/images/ncc-logo.png" alt="NCC" className="h-16 mx-auto mb-4" />
          <h1 className="font-heading text-3xl font-bold text-ncc-navy">Welcome Back</h1>
          <p className="text-gray-500 text-sm">Sign in to access your dashboard</p>
        </div>

        <form action={clientAction} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <input name="email" type="email" className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-ncc-red" required placeholder="cadet@sastra.edu" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input name="password" type="password" className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-ncc-red" required placeholder="password" />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" className="w-full bg-ncc-navy text-white text-lg font-bold py-3 rounded-lg hover:bg-ncc-red transition-colors">LOGIN</button>
        </form>
      </div>
    </div>
  );
}
