import { useTranslation } from 'react-i18next';

export default function DocsRoute() {
  const { t } = useTranslation();

  return <h1>{t('pages.docs.title')}</h1>;
}
