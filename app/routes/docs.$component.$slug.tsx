import { useTranslation } from 'react-i18next';

export default function DocsPageRoute() {
  const { t } = useTranslation();

  return <h1>{t('pages.docsPage.title')}</h1>;
}
