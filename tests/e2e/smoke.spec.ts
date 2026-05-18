import { expect, test } from "@playwright/test";

test("landing carrega e mostra CTA de login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /copiloto financeiro/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /entrar com email/i })).toBeVisible();
});

test("login form aparece em /login", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: /receber link/i })).toBeVisible();
});
