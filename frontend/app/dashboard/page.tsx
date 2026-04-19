'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService, DecodedToken } from '@/lib/auth';

// Generic protected page wrapper — redirects to /login if not authenticated
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading dashboard...</p>
        <p className="text-slate-400 text-xs mt-1">Dashboard UI will be built in Step 2</p>
      </div>
    </div>
  );
}
