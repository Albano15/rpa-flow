# Flowbot Studio

Editor visual de automações desktop com Next.js, React Flow v12, TypeScript,
Tailwind, Radix UI, Lucide, Zustand, Immer e zundo.

## Executar

```bash
npm ci
npm run dev
```

Abra http://localhost:3000. O exemplo inicial tem três etapas conectadas e pode ser editado.

## Verificar

```bash
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

## Editor

- Nove ações do catálogo desktop, com configurações, validação, identificação,
  notas, cores, bypass e política de tentativas.
- Clique em **Ações**, arraste para o canvas ou use **Ctrl/Cmd+K**.
  O `+` de uma conexão insere uma etapa e refaz as duas ligações atomicamente.
- **Shift+clique** seleciona múltiplas etapas. **Agrupar** cria uma seção
  nomeada; é possível mudar sua cor, minimizar, expandir e arrastar ações para dentro.
- **Ctrl/Cmd+Z**, **Ctrl+Y** ou **Cmd+Shift+Z** controlam o histórico.
  **D** alterna ações selecionadas. Arrastes geram uma entrada no histórico.
- Arraste com o botão central/direito para navegar. Use minimapa, zoom e
  **Organizar** (Dagre) para reorganizar o fluxo.
- Pastas e subpastas, arquivos `.rpa.json`/`.sub.json`, duplicação, renomeação,
  exclusão, abas e movimentação de arquivos por arraste.
- Configure uma sub-rotina e dê clique duplo no nó para abrir seu arquivo.
- Templates por captura de tela ou upload, recorte por arraste ou coordenadas,
  preview e identificação SHA-256. Captura depende de HTTPS/localhost,
  suporte do navegador e autorização de compartilhamento do usuário.
- Variáveis globais em JSON e saídas OCR/sub-rotinas disponíveis no painel de contexto.

## Persistência e contrato

`CODEX.md`, seção 3, é a referência do exportador. O AST é validado com Zod e
ordenado pelas conexões; o último `next_node_id` é `null`. Ações inativas continuam
no AST com `enabled: false`. Seções são exportadas separadamente.

O contrato desta fase representa uma única sequência: ciclos, bifurcações,
convergências e ações desconectadas impedem a exportação. Sub-rotinas ausentes ou
recursivas e templates sem arquivo também impedem a exportação.

Os nomes da seção 3 prevalecem sobre os aliases do catálogo: `timeout_sec`,
`image_asset`, `region`, `subroutine_id` e `inputs`. Campos adicionais do catálogo
usam `duration_ms`, `interval_sec`, `delay_ms`, `click_type`, `outputs` e
`retry_policy` nos respectivos nós.

**Exportar JSON** baixa `.rpa.json`/`.sub.json`. Quando há templates ou sub-rotinas,
baixa um ZIP contendo o mesmo AST, `assets/<sha256>.png` e `subroutines/`.
O pacote deve ser extraído preservando os caminhos relativos antes do uso no host.
A importação aceita o AST JSON; templates de arquivos importados devem ser enviados
novamente pelo inspetor de imagem.

O workspace completo (posições, notas, tags, cores, arquivos, pastas e imagens)
é salvo no `localStorage` deste navegador. Isso não é sincronização corporativa
nem gravação direta em uma pasta do computador. Falhas de quota são exibidas.
O AST de execução não inclui notas ou coordenadas do editor, pois esses campos
não fazem parte da seção 3. A rota legada `/api/salvar-fluxo` agora aceita apenas
AST válido e salva em `database/workflows/<workflow_id>.rpa.json`.

## Organização

- `src/components/canvas`: canvas, nós, seções e conexões.
- `src/components/sidebar`: explorador, catálogo e propriedades.
- `src/components/modals`: captura/recorte, variáveis e diálogo Radix.
- `src/stores`: operações atômicas e histórico do workspace.
- `src/types`: catálogo tipado, validação e importação/exportação do contrato.
- `src/lib/files.ts`: downloads, assets e dependências de sub-rotinas.

Referências técnicas: [React Flow – subflows](https://reactflow.dev/learn/layouting/sub-flows)
e [zundo](https://github.com/charkour/zundo).

