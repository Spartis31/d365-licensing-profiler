import { useTranslation } from 'react-i18next';
import type { LicenceRequirement } from '../types';

export function LicenceTag({ licence, attach = false }: { licence: LicenceRequirement; attach?: boolean }) {
  const { t } = useTranslation();
  if (!licence) return <span className="tag tag-none">{t('licences.none')}</span>;
  const label = attach ? t(`licencesAttach.${licence}`) : t(`licences.${licence}`);
  return <span className={`tag tag-lic-${licence}${attach ? ' tag-attach' : ''}`}>{label}</span>;
}
