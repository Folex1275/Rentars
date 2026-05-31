'use client';

import { RoleGuard } from '@/components/guards/RoleGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard requiredRoles={['host', 'tenant', 'admin']}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </div>
    </RoleGuard>
  );
}
