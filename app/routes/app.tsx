import { useTranslation } from 'react-i18next';

export default function AppRoute() {
  const { t } = useTranslation();

  return <h1>{t('pages.app.title')}</h1>;
}
