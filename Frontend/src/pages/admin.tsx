import { useTranslation } from '../i18n'
import { PagePlaceholder } from './PagePlaceholder'

export function DashboardPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.dashboard')} /> }
export function FleetPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.fleet')} /> }
export function BookingsPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.bookings')} /> }
export function ApprovalsPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.approvals')} /> }
export function HandoverPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.handover')} /> }
export function TimelinePage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.timeline')} /> }
export function DriversPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.drivers')} /> }
export function MechanicsPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.mechanics')} /> }
export function MyTripsPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.myTrips')} /> }
export function IncidentsPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.incidents')} /> }
export function StaffPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.staff')} /> }
export function AuditPage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.audit')} /> }
export function ProfilePage() { const { t } = useTranslation(); return <PagePlaceholder title={t('page.profile')} /> }