'use client';

import { useUserRole } from '@/hooks/useUserRole';

export default function DashboardPage() {
  const role = useUserRole();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-600">Welcome, {role}!</p>
    </div>
  );
}
