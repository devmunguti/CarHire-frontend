import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const path of ['/about', '/contact']) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
}

test('contact form submits to its mocked endpoint', async ({ page }) => {
  await page.goto('/contact')
  await page.getByLabel('Name').fill('Jane Doe')
  await page.getByLabel('Email').fill('jane@example.test')
  await page.getByLabel('Phone').fill('0712 345 678')
  await page.getByRole('textbox', { name: 'Message' }).fill('Please help me plan a trip.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('status')).toContainText('Thanks for reaching out')
})

for (const path of ['/about', '/contact']) {
  test(`${path} fits a 390px viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(pageWidth).toBeLessThanOrEqual(390)
  })
}
