'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { BillingProvider } from './billing-provider';
import { SaveWorkspaceProvider } from './save-workspace-provider';

export default function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider refetchOnWindowFocus><BillingProvider><SaveWorkspaceProvider>{children}</SaveWorkspaceProvider></BillingProvider></SessionProvider>;
}
