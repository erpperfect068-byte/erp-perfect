import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Smoke — مسارات العملاء / الأمانات / المقاولين', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('العملاء: الصفحة تفتح والجدول أو الحالة الفارغة تظهر', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: 'إدارة العملاء والأسعار' })).toBeVisible();

    const table = page.locator('table');
    const empty = page.getByText('لا يوجد عملاء مسجلين');
    await expect(table.or(empty).first()).toBeVisible({ timeout: 20_000 });

    // لو في صفوف: الاسم primary قابل للضغط ويفتح Drawer
    const rowCount = await page.locator('table tbody tr').count();
    if (rowCount > 0) {
      await page.locator('table tbody tr').first().locator('button').first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByLabel('إغلاق اللوحة').click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  });

  test('الأمانات: الصفحة تحمل بدون خطأ ظاهر', async ({ page }) => {
    await page.goto('/deposits');
    await expect(page.getByText(/أمانات|ودائع/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test('المقاولون: الصفحة تحمل', async ({ page }) => {
    await page.goto('/contractors');
    await expect(page.getByText(/مقاول/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
