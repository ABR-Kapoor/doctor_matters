import { create } from 'zustand';

interface ProfileState {
  name: string;
  imageUrl: string;
  email: string;
  isVerified: boolean;
  verificationRequested: boolean;
  isLoaded: boolean;
  setProfile: (profile: Partial<ProfileState>) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  name: '',
  imageUrl: '',
  email: '',
  isVerified: false,
  verificationRequested: false,
  isLoaded: false,
  setProfile: (profile) => set((state) => ({ 
    ...state, 
    ...profile,
    isLoaded: true
  })),
}));
