import { useTranslation } from 'react-i18next';

export default function HomeRoute() {
  const { t } = useTranslation();

  return <h1>{t('pages.home.title')}</h1>;
}
