import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation(['common', 'guidance']);
  return <div>{t('guidance_list', { ns: 'guidance' })}</div>;
}
