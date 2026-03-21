'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { CMSLayout } from '@/components/cms';

export default function CMSPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (user?.role === 'super_admin' || user?.role === 'admin') {
      setAuthorized(true);
    } else {
      router.push('/dashboard');
    }
  }, [user, token, router]);

  if (!authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <CMSLayout />;
}
