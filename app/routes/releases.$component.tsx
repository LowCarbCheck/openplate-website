import { useTranslation } from 'react-i18next';

export default function ReleasesRoute() {
  const { t } = useTranslation();

  return <h1>{t('pages.releases.title')}</h1>;
}
