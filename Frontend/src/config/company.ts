export const company = {
  name: 'AutoHire KE',
  phone: '+254 700 123 456',
  email: 'hello@autohire.ke',
  address: 'Mombasa Road, Nairobi, Kenya',
  hours: 'Hours to be confirmed',
  stats: { customers: '20k+', cars: '540+', years: '25+' },
  socialLinks: {
    instagram: '',
    facebook: '',
    linkedin: '',
  },
  branch: {
    latitude: -1.3194,
    longitude: 36.8471,
  },
} as const

export function openCompanyEmail() {
  window.location.href = `mailto:${company.email}`
}
