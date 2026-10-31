'use client';
import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';
import type { Track } from '@/lib/result-data';
type Draft = { tracks: Track[]; files: Map<string, File> };
const DraftContext = createContext<RefObject<Draft | null> | null>(null);
// Temporary in-memory handoff through client-side sign-in/pricing navigation.
// No local/session storage, server draft or automatic persistence of this handoff.
export function SaveWorkspaceProvider({ children }: { children: ReactNode }) {
  const draft = useRef<Draft | null>(null);
  return <DraftContext.Provider value={draft}>{children}</DraftContext.Provider>;
}
export function useSaveWorkspace() { return useContext(DraftContext)!; }
