import { useTranslation } from 'react-i18next';

export default function SyncRoute() {
  const { t } = useTranslation();

  return <h1>{t('pages.sync.title')}</h1>;
}
