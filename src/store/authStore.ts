import { create } from 'zustand';
import type { Profile } from '@/types/database';

interface AuthStore {
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
