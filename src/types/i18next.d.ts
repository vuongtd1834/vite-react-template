import type { defaultNS, resources } from '@/constants/i18n';

declare module 'i18next' {
  type CustomTypeOptions = {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['ja'];
  };
}
