import { useTranslation } from '../i18n'
import { PagePlaceholder } from './PagePlaceholder'

export function HomePage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.home')} /> }
export function VehiclesPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.vehicles')} /> }
export function VehicleDetailsPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.vehicleDetails')} /> }
export function AboutPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.about')} /> }
export function ContactPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.contact')} /> }
export function CheckoutPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.checkout')} /> }
export function BookingPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.booking')} /> }