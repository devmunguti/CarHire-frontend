import { useState } from 'react'
import { Check, ChevronDown, Play, Quote } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Modal } from '../../components/ui/overlays'
import { company } from '../../config/company'
import { APP_PROMO } from '../home/homeConfig'
import { rentalQuestions, testimonials } from './aboutConfig'
import { t, useTranslation } from '../../i18n'

const features = [
  { title: 'about.feature.choice', copy: 'about.feature.choiceCopy' },
  { title: 'about.feature.support', copy: 'about.feature.supportCopy' },
  { title: 'about.feature.freedom', copy: 'about.feature.freedomCopy' },
  { title: 'about.feature.flexibility', copy: 'about.feature.flexibilityCopy' },
]

const memoryChecklist = [
  'about.memory.car',
  'about.memory.booking',
  'about.memory.support',
  'about.memory.freedom',
]

function PageHeading() {
  return <header className="story-heading">
    <h1>{t('about.title')}</h1>
    <nav aria-label={t('about.breadcrumb.label')}><ol><li><Link to="/">{t('about.breadcrumb.home')}</Link></li><li aria-current="page">{t('about.title')}</li></ol></nav>
  </header>
}

function AboutVideo() {
  const [open, setOpen] = useState(false)
  const videoUrl = import.meta.env.VITE_ABOUT_VIDEO_URL ?? ''
  if (!videoUrl) return null
  return <>
    <section aria-label={t('about.video.label')} className="about-video">
      <button aria-label={t('about.video.play')} className="about-video__play" onClick={() => setOpen(true)} type="button"><Play aria-hidden="true" fill="currentColor" size={26} /></button>
    </section>
    <Modal onClose={() => setOpen(false)} open={open} title={t('about.video.title')}>
      <div className="about-video__embed"><iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen src={videoUrl} title={t('about.video.iframeTitle')} /></div>
    </Modal>
  </>
}

export function AboutPage() {
  useTranslation()
  const [openQuestion, setOpenQuestion] = useState<number | null>(0)

  return <div className="story-page about-page">
    <PageHeading />
    <section aria-labelledby="about-features-title" className="about-features story-width">
      <h2 id="about-features-title">{t('about.features.title')}</h2>
      <div className="about-features__grid">
        {features.map((feature) => <article key={feature.title}><h3>{t(feature.title)}</h3><p>{t(feature.copy)}</p></article>)}
      </div>
    </section>

    <div className="story-width"><AboutVideo /></div>

    <section aria-label={t('about.stats.label')} className="about-stats story-width">
      <article><strong>{company.stats.customers}</strong><span>{t('about.stats.customers')}</span></article>
      <article><strong>{company.stats.cars}</strong><span>{t('about.stats.cars')}</span></article>
      <article><strong>{company.stats.years}</strong><span>{t('about.stats.years')}</span></article>
    </section>

    <section aria-labelledby="about-memories-title" className="about-memories story-width">
      <div className="about-memories__copy">
        <h2 id="about-memories-title">{t('about.memories.title')}</h2>
        <p>{t('about.memories.copy')}</p>
        <ul>{memoryChecklist.map((item) => <li key={item}><span><Check aria-hidden="true" size={14} /></span>{t(item)}</li>)}</ul>
      </div>
      <div aria-label={t('about.image.travel')} className="story-image story-image--memories" role="img" />
    </section>

    {APP_PROMO && <section aria-labelledby="about-app-title" className="about-app story-width">
      <div><p className="eyebrow">Gari Poa</p><h2 id="about-app-title">{t('about.app.title')}</h2><p>{t('about.app.copy')}</p><div className="about-app__badges"><a href="#app-store">{t('footer.appStore')}</a><a href="#google-play">{t('footer.googlePlay')}</a></div></div>
      <div aria-label={t('about.image.app')} className="about-app__phone" role="img" />
    </section>}

    {testimonials.length > 0 && <section aria-labelledby="about-reviews-title" className="about-reviews story-width">
      <h2 id="about-reviews-title">{t('about.reviews.title')}</h2>
      <div className="about-reviews__grid">{testimonials.map((review) => <article className="review-card" key={review.id}>
        <div className="review-card__quote"><Quote aria-hidden="true" size={25} /><blockquote>{review.quote}</blockquote></div>
        <footer><span aria-label={review.avatar} className="review-card__avatar" role="img" /><div><span>{review.company}</span><strong>{review.name}</strong></div></footer>
      </article>)}</div>
    </section>}

    <section aria-labelledby="about-faq-title" className="about-faq story-width">
      <h2 id="about-faq-title">{t('about.faq.title')}</h2>
      <div className="about-faq__list">{rentalQuestions.map(({ question, answer }, index) => {
        const expanded = openQuestion === index
        const answerId = `rental-answer-${index}`
        return <article className="about-faq__item" key={question}>
          <h3><button aria-controls={answerId} aria-expanded={expanded} onClick={() => setOpenQuestion(expanded ? null : index)} type="button">{t(question)}<ChevronDown aria-hidden="true" className={expanded ? 'is-open' : ''} size={19} /></button></h3>
          {expanded && <div className="about-faq__answer" id={answerId} role="region"><p>{t(answer)}</p></div>}
        </article>
      })}</div>
    </section>

    <section aria-labelledby="about-cta-title" className="about-cta story-width">
      <div><h2 id="about-cta-title">{t('about.cta.title')}</h2><a href={`tel:${company.phone.replace(/\D/g, '')}`}>{company.phone}</a><p>{t('about.cta.copy')}</p><Link className="about-cta__button" to="/vehicles">{t('about.cta.book')}</Link></div>
      <div aria-label={t('about.image.car')} className="about-cta__car" role="img" />
    </section>
  </div>
}
