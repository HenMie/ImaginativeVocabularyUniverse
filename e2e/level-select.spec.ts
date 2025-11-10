import { expect, test } from '@playwright/test'

test('关卡列表正常显示', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '脑洞外语词场' })).toBeVisible()
  await expect(page.getByText('拖动词块，为外语学习分组')).toBeVisible()
})

