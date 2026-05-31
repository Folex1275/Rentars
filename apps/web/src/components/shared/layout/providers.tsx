'use client';

import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/hooks/auth/use-auth';
import { StellarProvider } from '@/hooks/stellar/use-stellar';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <StellarProvider network="testnet">{children}</StellarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
