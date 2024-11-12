import Cookies from 'js-cookie';
import type { StateStorage } from 'zustand/middleware';

export const zustandCookiesStorage: StateStorage = {
  getItem: (name: string) => {
    return Cookies.get(name) ?? null;
  },
  setItem: (name: string, value: string) => {
    Cookies.set(name, value, { expires: 365 * 1000 });
  },
  removeItem: (name: string) => {
    Cookies.remove(name);
  },
};
