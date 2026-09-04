import { useTranslation } from 'react-i18next';

export default function ImprintRoute() {
  const { t } = useTranslation();

  return <h1>{t('pages.imprint.title')}</h1>;
}
