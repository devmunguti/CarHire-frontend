import { lazy, Suspense, useState, type FormEvent } from 'react'
import { Clock3, Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { company, openCompanyEmail } from '../../config/company'
import { isMockApiEnabled } from '../../api/config'
import { apiClient } from '../../api/client'
import { isKenyanPhone, normalisePhone } from '../../lib/phone'
import { BLOG } from './contactConfig'
import { t, useTranslation } from '../../i18n'

const ContactBranchMap = lazy(() => import('./ContactBranchMap').then((module) => ({ default: module.ContactBranchMap })))

type ContactField = 'name' | 'email' | 'phone' | 'message'
type ContactValues = Record<ContactField, string>
type ContactErrors = Partial<Record<ContactField, string>>

const emptyValues: ContactValues = { name: '', email: '', phone: '', message: '' }
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const contactEndpoint = isMockApiEnabled
  ? '/contact'
  : `${apiBaseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')}/contact`

const infoItems = [
  { label: 'contact.info.address', value: company.address, icon: MapPin },
  { label: 'contact.info.email', value: 'contact.info.emailValue', icon: Mail },
  { label: 'contact.info.phone', value: company.phone, icon: Phone },
  { label: 'contact.info.hours', value: company.hours, icon: Clock3 },
]

function validate(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {}
  if (values.name.trim().length < 2) errors.name = t('contact.form.nameError')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = t('contact.form.emailError')
  if (!isKenyanPhone(values.phone)) errors.phone = t('contact.form.phoneError')
  if (values.message.trim().length < 10) errors.message = t('contact.form.messageError')
  return errors
}

function ContactForm() {
  useTranslation()
  const [values, setValues] = useState<ContactValues>(emptyValues)
  const [website, setWebsite] = useState('')
  const [errors, setErrors] = useState<ContactErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error' | 'rate-limit'>('idle')

  function update(field: ContactField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setStatus('idle')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (website) return
    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setStatus('sending')
    try {
      const response = await apiClient.fetchRaw(contactEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, name: values.name.trim(), email: values.email.trim(), phone: normalisePhone(values.phone), message: values.message.trim() }),
      })
      if (response.status === 429) {
        setStatus('rate-limit')
        return
      }
      let result: { success?: boolean } | null = null
      if (response.status !== 204) {
        try {
          result = await response.json() as { success?: boolean }
        } catch {
          setStatus('error')
          return
        }
      }
      if (!response.ok || (response.status !== 204 && result?.success !== true)) {
        setStatus('error')
        return
      }
      setValues(emptyValues)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return <section aria-labelledby="contact-form-title" className="contact-form-section" id="contact-form">
    <h2 id="contact-form-title">{t('contact.form.title')}</h2>
    <p>{t('contact.form.copy')}</p>
    <form className="contact-form" noValidate onSubmit={(event) => void submit(event)}>
      <div className="contact-form__row">
        <label>{t('contact.form.name')}<input autoComplete="name" aria-describedby={errors.name ? 'contact-name-error' : undefined} aria-invalid={Boolean(errors.name)} onChange={(event) => update('name', event.target.value)} required value={values.name} />{errors.name && <span className="contact-form__field-error" id="contact-name-error">{errors.name}</span>}</label>
        <label>{t('contact.form.email')}<input autoComplete="email" aria-describedby={errors.email ? 'contact-email-error' : undefined} aria-invalid={Boolean(errors.email)} onChange={(event) => update('email', event.target.value)} required type="email" value={values.email} />{errors.email && <span className="contact-form__field-error" id="contact-email-error">{errors.email}</span>}</label>
      </div>
      <label>{t('contact.info.phone')}<input autoComplete="tel" aria-describedby={errors.phone ? 'contact-phone-error' : undefined} aria-invalid={Boolean(errors.phone)} onChange={(event) => update('phone', event.target.value)} required type="tel" value={values.phone} />{errors.phone && <span className="contact-form__field-error" id="contact-phone-error">{errors.phone}</span>}</label>
      <label>{t('contact.form.message')}<textarea aria-describedby={errors.message ? 'contact-message-error' : undefined} aria-invalid={Boolean(errors.message)} onChange={(event) => update('message', event.target.value)} required rows={5} value={values.message} />{errors.message && <span className="contact-form__field-error" id="contact-message-error">{errors.message}</span>}</label>
      <div aria-hidden="true" className="contact-form__trap"><label htmlFor="contact-company-website">{t('contact.form.honeypot')}</label><input autoComplete="off" id="contact-company-website" name="companyWebsite" onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} value={website} /></div>
      {status === 'success' && <p className="contact-form__status contact-form__status--success" role="status">{t('contact.form.success')}</p>}
      {status === 'error' && <p className="contact-form__status contact-form__status--error" role="alert">{t('contact.form.error')}</p>}
      {status === 'rate-limit' && <p className="contact-form__status contact-form__status--error" role="alert">{t('contact.form.rateLimit')}</p>}
      <button className="contact-form__submit" disabled={status === 'sending'} type="submit">{status === 'sending' ? t('contact.form.sending') : t('contact.form.send')}</button>
    </form>
  </section>
}

function ContactInfo() {
  useTranslation()
  return <section aria-label={t('contact.info.region')} className="contact-info story-width">
    {infoItems.map(({ label, value, icon: Icon }) => <article className="contact-info__item" key={label}>
      <span className="contact-info__icon"><Icon aria-hidden="true" size={22} /></span>
      <div><h2>{t(label)}</h2>{label === 'contact.info.email'
        ? <button className="contact-info__email" onClick={openCompanyEmail} type="button">{t(value)}</button>
            : label === 'contact.info.phone'
              ? <a href={`tel:${company.phone.replace(/\D/g, '')}`}>{value}</a>
              : <p>{value}</p>}
      </div>
    </article>)}
  </section>
}

function BlogPosts() {
  if (!BLOG) return null
  return <section aria-labelledby="contact-blog-title" className="contact-blog story-width"><h2 id="contact-blog-title">{t('contact.blog.title')}</h2></section>
}

export function ContactPage() {
  useTranslation()
  return <div className="story-page contact-page">
    <header className="story-heading">
      <h1>{t('contact.title')}</h1>
      <nav aria-label={t('about.breadcrumb.label')}><ol><li><Link to="/">{t('about.breadcrumb.home')}</Link></li><li aria-current="page">{t('contact.title')}</li></ol></nav>
    </header>

    <section aria-labelledby="contact-book-title" className="contact-book story-width">
      <div className="contact-book__card"><h2 id="contact-book-title">{t('contact.book.title')}</h2><p>{t('contact.book.copy')}</p><Link to="/vehicles">{t('contact.book.browse')}</Link></div>
      <div aria-label={t('contact.image.car')} className="story-image story-image--contact" role="img" />
    </section>

    <ContactInfo />
    <ContactForm />
    <section aria-labelledby="contact-map-title" className="contact-map-section story-width">
      <h2 id="contact-map-title">{t('contact.map.title')}</h2>
      <Suspense fallback={<div aria-busy="true" aria-label={t('contact.map.loading')} className="contact-map" />}>
        <ContactBranchMap />
      </Suspense>
    </section>
    <BlogPosts />

    <section aria-label="Brands available to rent" className="contact-brands story-width">
      <span>Toyota</span><span>Ford</span><span>Mercedes-Benz</span><span>Jeep</span><span>BMW</span><span>Audi</span>
    </section>
  </div>
}
