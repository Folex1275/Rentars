'use client';

import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';
import type { UserRole } from '@/types/roles';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, requiredRoles, fallback }: RoleGuardProps) {
  const router = useRouter();
  const userRole = useUserRole();

  if (!userRole) {
    router.push('/login');
    return null;
  }

  if (!requiredRoles.includes(userRole)) {
    return fallback || <div className="p-4 text-red-600">Access denied</div>;
  }

  return <>{children}</>;
}
