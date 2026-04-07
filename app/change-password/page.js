'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981] mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Redirecting to Profile...</p>
      </div>
    </div>
  );
}
