import { useTranslation } from 'react-i18next';

export default function InferenceRoute() {
  const { t } = useTranslation();

  return <h1>{t('pages.inference.title')}</h1>;
}
