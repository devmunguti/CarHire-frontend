import { expect, test } from '@playwright/test'

test('guest completes a held booking with a mocked M-Pesa payment on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/checkout/booking-01')
  await expect(page.getByRole('heading', { name: 'Complete your booking' })).toBeVisible()

  await page.getByLabel('Full name').fill('Amina Njeri')
  await page.getByLabel('Phone number').fill('712345681')
  await page.getByLabel('Email address').fill('amina@example.ke')
  await page.getByLabel('National ID or passport').fill('12345678')
  await page.getByRole('button', { name: /Continue/ }).click()
  await expect(page.getByRole('heading', { name: 'Terms and rental rules' })).toBeVisible()
  await page.getByLabel('I agree to the booking terms and privacy notice.').check()
  await page.getByLabel('I have read and agree to the rental rules.').check()
  await page.getByRole('button', { name: /Continue/ }).click()
  await expect(page.getByRole('heading', { name: 'Payment method' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue to M-Pesa' }).click()
  await page.getByRole('button', { name: 'Send payment request' }).click()
  await expect(page.getByRole('heading', { name: 'Check your phone' })).toBeVisible()
  await expect(page).toHaveURL(/\/booking\/[^/]+\/confirmation\?token=/, { timeout: 12_000 })
  await expect(page.getByText('Payment confirmed', { exact: true })).toBeVisible()
  await expect(page.getByText(/Amount paid:/)).toBeVisible()

  const dimensions = await page.locator('body').evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
})
