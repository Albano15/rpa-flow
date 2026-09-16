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
  await page.locator(".edge-add").nth(1).click();
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

test("exclusão reconecta; valores, tópicos e sincronização manual", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".action-node")).toHaveCount(3);
  await page.locator(".action-node").nth(1).click();
  await page.keyboard.press("Delete");
  await expect(page.locator(".action-node")).toHaveCount(2);
  await expect(page.locator(".edge-add")).toHaveCount(3);
  await page.locator(".action-node").first().click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Renomear" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Ativar / inativar" }).click();
  await expect(page.locator(".action-node").first()).toContainText("Inativo");
  await page.getByRole("button", { name: /Adicionar etapa/ }).click();
  await expect(
    page.getByRole("dialog").getByText("RPA Web", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Pegar valor/ })
    .click();
  await page.getByRole("button", { name: "Definir valor…" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Tipo", { exact: true })
    .selectOption("money");
  await page
    .getByRole("dialog")
    .getByLabel("Valor", { exact: true })
    .fill("1.234,56");
  await page.getByRole("button", { name: "Usar valor" }).click();
  await expect(
    page.getByRole("button", { name: "1234.56", exact: true }),
  ).toBeVisible();
  let payload: unknown;
  await page.route("/api/workspace", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { success: true } });
  });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByText("Sincronizado com backend", { exact: true }),
  ).toBeVisible();
  expect(payload).toHaveProperty("workflow.nodes");
  await page.getByLabel("Nome da etapa", { exact: true }).fill("Valor editado");
  await expect(
    page.getByText("Alterações não sincronizadas", { exact: true }),
  ).toBeVisible();
  const automatic = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/workspace") && request.method() === "POST",
  );
  await page.getByLabel("Autosalvamento", { exact: true }).check();
  expect(
    (await automatic).postDataJSON().workflow.nodes.at(-1).data.customLabel,
  ).toBe("Valor editado");
  await expect(
    page.getByText("Sincronizado com backend", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("início, fim e sub-rotinas permanecem alinhados com conexões retas", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByLabel("Início do fluxo", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Fim do fluxo", { exact: true })).toBeVisible();
  await page.locator(".add-step").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Sub-rotina Reutilize/ })
    .click();
  await expect(page.locator(".action-node")).toHaveCount(4);
  await expect(page.locator(".react-flow__edge")).toHaveCount(5);
  await expect(page.locator(".react-flow__edge").last()).toHaveAttribute(
    "data-id",
    /__flow_end__/,
  );
  const paths = await page
    .locator(".react-flow__edge-path")
    .evaluateAll((elements) => elements.map((el) => el.getAttribute("d")!));
  for (const path of paths) {
    expect(path).not.toMatch(/[CQ]/);
    const numbers = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    expect(numbers[0]).toBeCloseTo(numbers[2], 2);
    expect(numbers[3]).toBeGreaterThan(numbers[1]);
  }
  const centers = await page
    .locator(".action-node, .terminal-node")
    .evaluateAll((elements) =>
      elements.map((el) => {
        const b = el.getBoundingClientRect();
        return b.x + b.width / 2;
      }),
    );
  expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(1);
  await page.screenshot({ path: "/tmp/flowbot-linear.png" });
});

test("seção cresce automaticamente e arrastar uma etapa define apenas sua posição na sequência", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".action-node")).toHaveCount(3);
  await page.locator(".add-step").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Seção — organizar/ })
    .click();
  const section = page.locator(".scope-node");
  await expect(section).toBeVisible();
  const before = await section.boundingBox();
  await section.getByTitle("Adicionar dentro da seção").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Sub-rotina Reutilize/ })
    .click();
  await expect(page.locator(".action-node")).toHaveCount(4);
  await expect
    .poll(async () => (await section.boundingBox())!.height)
    .toBeGreaterThan(before!.height);
  const handle = page
    .locator(".action-node")
    .first()
    .getByTitle("Arrastar para reordenar ou mover para seção");
  await handle.dragTo(section, { targetPosition: { x: 10, y: 75 } });
  await expect
    .poll(async () =>
      page.locator(".action-node").evaluateAll((elements) => {
        const section = document
          .querySelector(".scope-node")!
          .getBoundingClientRect();
        return elements.filter((el) => {
          const b = el.getBoundingClientRect();
          return b.top >= section.top && b.bottom <= section.bottom;
        }).length;
      }),
    )
    .toBe(2);
  await section.getByTitle("Minimizar seção").click();
  await expect(page.locator(".action-node")).toHaveCount(2);
  await section.getByTitle("Expandir seção").click();
  await expect(page.locator(".action-node")).toHaveCount(4);
  await page.screenshot({ path: "/tmp/flowbot-linear-section.png" });
});
