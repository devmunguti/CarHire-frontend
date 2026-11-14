import { Activity, CarFront, ClipboardList, Gauge, LogOut, Moon, Sun, Users, Wrench } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import type { Permission } from '../../hooks/useCan'
import { roleHasPermission } from '../../hooks/useCan'
import { getRoleLandingPath } from '../../hooks/roleLanding'
import { useAuth } from '../../hooks/AuthContext'
import { IconButton } from '../ui'
import { t } from '../../i18n'

const staffLinks: { to: string; key: string; icon: typeof Gauge; end?: boolean; permission: Permission }[] = [
  { to: '/admin', key: 'page.dashboard', icon: Gauge, end: true, permission: 'dashboard:view' },
  { to: '/admin/vehicles', key: 'page.fleet', icon: CarFront, permission: 'vehicles:read' },
  { to: '/admin/bookings', key: 'page.bookings', icon: ClipboardList, permission: 'bookings:create' },
  { to: '/admin/approvals', key: 'page.approvals', icon: ClipboardList, permission: 'approvals:offline' },
  { to: '/admin/handover', key: 'page.handover', icon: CarFront, permission: 'handover:manage' },
  { to: '/admin/timeline', key: 'page.timeline', icon: Activity, permission: 'timeline:view' },
  { to: '/admin/drivers', key: 'page.drivers', icon: Users, permission: 'drivers:assign' },
  { to: '/admin/mechanics', key: 'page.mechanics', icon: Wrench, permission: 'mechanics:read' },
  { to: '/admin/my-trips', key: 'page.myTrips', icon: CarFront, permission: 'trips:read-own' },
  { to: '/admin/incidents', key: 'page.incidents', icon: Wrench, permission: 'incidents:manage' },
  { to: '/admin/staff', key: 'page.staff', icon: Users, permission: 'staff:manage' },
  { to: '/admin/audit', key: 'page.audit', icon: Activity, permission: 'audit:read' },
]

export function StaffLayout() {
  const { role, logout } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  const visibleLinks = staffLinks.filter(({ permission }) => roleHasPermission(role, permission))

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
  }

  async function signOut() {
    await logout().catch(() => undefined)
    navigate('/login', { replace: true })
  }

  return (
    <div className="staff-layout">
      <aside className="staff-sidebar">
        <Link aria-label={t('admin.brand')} className="brand" to={role ? getRoleLandingPath(role) : '/admin'}>
          <span className="brand__mark"><CarFront aria-hidden="true" size={23} /></span>
          <span className="brand__name">AutoHire <b>KE</b></span>
        </Link>
        <nav aria-label={t('admin.navigation')} className="staff-nav">
          {visibleLinks.map(({ to, key, icon: Icon, end }) => <NavLink end={end} key={to} to={to}><Icon aria-hidden="true" size={18} /><span>{t(key)}</span></NavLink>)}
        </nav>
        <button className="staff-logout" onClick={() => void signOut()} type="button"><LogOut aria-hidden="true" size={18} />{t('admin.logout')}</button>
      </aside>
      <div className="staff-main"><header className="staff-topbar"><span>{t('admin.overview')}</span><div className="staff-topbar__tools"><span className="staff-user">{t('admin.staffLabel')}</span><IconButton icon={theme === 'light' ? <Moon size={18} /> : <Sun size={18} />} label={t(theme === 'light' ? 'styleguide.dark' : 'styleguide.light')} onClick={toggleTheme} /></div></header><main className="staff-content"><Outlet /></main></div>
    </div>
  )
}