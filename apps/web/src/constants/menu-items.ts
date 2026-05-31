import type { UserRole } from '@/types/roles';

export interface MenuItem {
  label: string;
  href: string;
  roles: UserRole[];
}

export const menuItems: MenuItem[] = [
  { label: 'Home', href: '/', roles: ['host', 'tenant', 'admin'] },
  { label: 'Search', href: '/search', roles: ['host', 'tenant', 'admin'] },
  { label: 'Dashboard', href: '/dashboard', roles: ['host', 'tenant', 'admin'] },
  { label: 'List Property', href: '/list', roles: ['host', 'admin'] },
  { label: 'My Bookings', href: '/bookings', roles: ['tenant', 'admin'] },
  { label: 'My Properties', href: '/properties', roles: ['host', 'admin'] },
];
