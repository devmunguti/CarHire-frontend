import { useTranslation } from '../i18n'
import { PagePlaceholder } from './PagePlaceholder'

export function VehiclesPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.vehicles')} /> }
export function VehicleDetailsPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.vehicleDetails')} /> }