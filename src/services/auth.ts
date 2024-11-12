import { apiWithOutAuth } from '@/utils/api';

export function login(payload: { email: string; password: string }) {
  return apiWithOutAuth.post('/login', payload);
}
