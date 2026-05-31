'use client';

import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';

export default function DashboardSelector() {
  const router = useRouter();
  const role = useUserRole();

  if (!role) {
    router.push('/login');
    return null;
  }

  if (role === 'host') {
    router.push('/dashboard/host');
  } else if (role === 'tenant') {
    router.push('/dashboard/tenant');
  } else if (role === 'admin') {
    router.push('/dashboard/admin');
  }

  return null;
}
