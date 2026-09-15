import { expect, test } from "@playwright/test";
test("editor: propriedades, inserção, histórico, exportação e persistência", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".action-node")).toHaveCount(3);
  await page.locator(".action-node").first().click();
  await expect(
    page.getByText("Caminho do executável", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Nome da etapa", { exact: true })
    .fill("Abrir ERP de teste");
  await expect(page.locator(".action-node").first()).toContainText(
    "Abrir ERP de teste",
  );
  await page.locator(".action-node").first().getByRole("switch").click();
  await expect(page.locator(".action-node").first()).toContainText("Inativo");
  await page.locator(".edge-add").first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Aguardar Tempo/ })
    .click();
  await expect(page.locator(".action-node")).toHaveCount(4);
  await page.getByTitle("Desfazer (Ctrl+Z)").click();
  await expect(page.locator(".action-node")).toHaveCount(3);
  await page.getByTitle("Refazer (Ctrl+Y)").click();
  await expect(page.locator(".action-node")).toHaveCount(4);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.rpa\.json$/);
  const stream = await file.createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  const ast = JSON.parse(text);
  expect(ast.nodes).toHaveLength(4);
  expect(ast.nodes[0].enabled).toBe(false);
  expect(ast.nodes[0].name).toBe("Abrir ERP de teste");
  expect(ast.nodes[0].next_node_id).toBe(ast.nodes[1].id);
  await expect(page.getByText("Salvo neste navegador")).toBeVisible();
  await page.reload();
  await expect(page.locator(".action-node")).toHaveCount(4);
  await page.getByTitle("Alternar tema").click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.screenshot({ path: "/tmp/flowbot-dark.png" });
  expect(errors).toEqual([]);
});
test("agrupamento e captura por upload com recorte", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".action-node")).toHaveCount(3);
  await page.locator(".action-node").nth(0).click();
  await page
    .locator(".action-node")
    .nth(1)
    .click({ modifiers: ["Shift"] });
  await page.getByTitle("Agrupar seleção").click();
  await expect(page.locator(".scope-node")).toHaveCount(1);
  await page.getByTitle("Minimizar seção").click();
  await expect(page.locator(".action-node")).toHaveCount(1);
  await page.getByTitle("Expandir seção").click();
  await expect(page.locator(".action-node")).toHaveCount(3);
  await page.getByRole("button", { name: /Adicionar etapa/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Clicar em Imagem/ })
    .click();
  await page.getByRole("button", { name: "Capturar ou enviar imagem" }).click();
  await page
    .getByRole("dialog")
    .locator("input[type=file]")
    .setInputFiles({
      name: "template.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NAAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
  await expect(page.getByAltText("Imagem para recortar")).toBeVisible();
  await page.getByRole("button", { name: "Usar recorte" }).click();
  await expect(page.getByAltText("Template capturado")).toBeVisible();
  await page.screenshot({ path: "/tmp/flowbot-light.png" });
});
