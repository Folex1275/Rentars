export type UserRole = 'host' | 'tenant' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}
