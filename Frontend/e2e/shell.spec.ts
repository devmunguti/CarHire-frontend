import { expect, test } from '@playwright/test'

test('public shell fits desktop width and shows primary routes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Vehicles', exact: true }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  const dimensions = await page.locator('body').evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
})

test('mobile navigation opens and footer remains within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'About Us' }).click()
  await expect(page.getByRole('heading', { name: 'About Us' })).toBeVisible()
  const dimensions = await page.locator('body').evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
})

test('styleguide exposes all primitives and switches to dark theme', async ({ page }) => {
  await page.goto('/styleguide')
  await expect(page.getByRole('heading', { name: 'Component styleguide' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Form controls' })).toBeVisible()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Light', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})