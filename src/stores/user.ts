import { create, type StateCreator } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandCookiesStorage } from '@/libs/storage';

type UserState = {
  user: AuthModel.TAuthenticationResponse | null;
  setCredentials: (user: AuthModel.TAuthenticationResponse) => void;
  removeCredentials: () => void;
  setHasHydrated: (state: boolean) => void;
  hasHydrated: boolean;
};

const userStoreSlice: StateCreator<UserState> = (set) => ({
  user: null,
  hasHydrated: false,
  setCredentials: (user) => {
    set({ user });
  },
  removeCredentials: () => {
    set({ user: null });
  },
  setHasHydrated: (state) => {
    set({ hasHydrated: state });
  },
});

const persistedUserStore = persist<UserState>(userStoreSlice, {
  name: 'user',
  storage: createJSONStorage(() => zustandCookiesStorage),
  onRehydrateStorage: () => {
    return (state, err) => {
      if (!err) {
        state?.setHasHydrated(true);
      }
    };
  },
});

export const useUserStore = create(persistedUserStore);
