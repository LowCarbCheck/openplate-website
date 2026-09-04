import { useTranslation } from 'react-i18next';

export default function PrivacyRoute() {
  const { t } = useTranslation();

  return <h1>{t('pages.privacy.title')}</h1>;
}
