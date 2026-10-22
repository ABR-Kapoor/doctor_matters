import { create } from 'zustand';

/**
 * Doctor identity store — holds session identity only.
 * All server data is managed by TanStack Query.
 */
interface UserState {
  uid: string;
  name: string;
  imageUrl: string;
  email: string;
  setUser: (user: Partial<Omit<UserState, 'setUser' | 'clear'>>) => void;
  clear: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  uid: '',
  name: '',
  imageUrl: '',
  email: '',
  setUser: (user) => set((s) => ({ ...s, ...user })),
  clear: () => set({ uid: '', name: '', imageUrl: '', email: '' }),
}));
