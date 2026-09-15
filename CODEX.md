# CODEX - Diretrizes Arquiteturais e de Implementação: RPA Web & Desktop

> **Documento Oficial de Engenharia de Software para Agentes de IA / Codex**  
> **Versão:** 1.0.0 | **Padrão:** TDD, DDD, Clean/Hexagonal Architecture  
> **Escopo:** Frontend Visual Flowchart (Foco Atual) & Backend Autônomo com Contrato de Execução

---

## 1. Visão Geral do Projeto

O projeto é uma plataforma profissional de **RPA (Robotic Process Automation)** híbrida (Web & Desktop), composta por:
1. **Frontend Web**: Construtor visual de fluxogramas intuitivo, moderno e de alta precisão para modelar automações, gerenciar sub-rotinas, inspecionar variáveis e configurar disparadores.
2. **Backend Engine (Host)**: Executor autônomo headless/agendado rodando localmente na máquina host, implementado em Python seguindo **DDD**, **TDD** e **Arquitetura Hexagonal (Ports & Adapters)**.
3. **Mecanismo de Persistência Híbrido**: Inicialmente simulado em uma pasta `database/` (arquivos JSON/SQLite flat-file), preparado para transição desacoplada para banco relacional em `infrastructure/`.
4. **Contrato de Execução (AST / Workflow Definition)**: Especificação JSON padronizada e determinística gerada pelo Frontend e consumida pelo Executor do Backend.

---

## 2. Frontend: Especificação Técnica e de UX/UI

### 2.1 Stack Tecnológica Recomendada
* **Core Framework**: React 18+ ou Next.js (SPA mode / Vite React TS).
* **Flowchart / Canvas Engine**: `@xyflow/react` (React Flow v12+) — biblioteca padrão da indústria para graph editors de altíssima performance e customização.
* **Estilização**: Tailwind CSS + Radix UI / Shadcn UI (estilo visual limpo, corporativo, dark/light mode, paleta moderna).
* **Gerenciamento de Estado do Fluxo**: Zustand + Immer (performance com re-render cirúrgico, suporte a histórico Undo/Redo com `zundo`).
* **Validação de Schemas**: Zod (para validação em tempo real dos nós e geração do contrato JSON).
* **Ícones**: Lucide React.

---

### 2.2 Requisitos de UX & Funcionalidades do Canvas

1. **Agrupamento em Seções / Escopos (Containers / Scopes)**:
   * Criação de nós do tipo "Group/Scope Node" que encapsulam múltiplos nós filhos.
   * Capacidade de **minimizar (collapse)** e **expandir (expand)** seções visuais para despoluir fluxos gigantes.
   * Cálculo automático de bounding box para acomodar nós filhos arrastados para dentro.

2. **Ativação / Inativação de Ações (Toggle Bypass)**:
   * Cada nó possui um toggle visual (ou atalho de teclado `Space`/`D`) para ativar/inativar.
   * Nós inativos ficam visualmente esmaecidos (grayscale/opacity: 40%) e com badge `INATIVO`.
   * No AST gerado para o backend, nós inativos recebem `enabled: false` (o executor faz bypass automático sem quebrar a cadeia).

3. **Inserção Ágil de Etapas (Add Before / After)**:
   * Botões de `+` inteligentes sobre as arestas de conexão (edges) e nos nós.
   * Menu radial ou Popover de inserção rápida com filtro de busca (Action Palette / Cmd+K).
   * Inserir um nó entre A e B quebra a conexão `A -> B` e a reconecta como `A -> Novo -> B` automaticamente.

4. **Identificação e Debugging**:
   * Cada nó possui um `id` imutável curto (ex: `step_d8a1f`) e um campo editável `customLabel` (ex: `Abrir ERP Totvs`).
   * Campo de notas/comentários e tag de cor para categorização visual.
   * Exibição clara de status de validação no próprio nó (ex: alerta vermelho se campo obrigatório estiver vazio).

5. **Ferramenta de Captura de Telas (Screen Snip Integrado)**:
   * O frontend fornece um modal de captura com:
     * *Opção A*: Snipping Tool integrada via API nativa do navegador (`navigator.mediaDevices.getDisplayMedia`) permitindo selecionar a tela e recortar a região alvo.
     * *Opção B*: Upload de imagem de template com ferramenta de crop embutida (Cropper.js / canvas nativo).
   * Armazenamento do print recortado na pasta de assets com hash determinístico e preview miniatura direto no nó de "Clicar em Imagem" ou "Aguardar Imagem".

6. **Gerenciamento de Automações & Sub-rotinas (File Explorer Sidebar)**:
   * Painel lateral retrátil em árvore (Tree View):
     * Pastas, subpastas, fluxos principais (`.rpa.json`) e sub-rotinas (`.sub.json`).
     * Sistema de tags (ex: `#financeiro`, `#faturamento`, `#desktop`).
     * Duplicar, renomear, mover e exportar/importar fluxos.
   * **Sub-rotinas como Funções de Primeira Classe**:
     * Nós especiais `Subroutine Node` que recebem argumentos (`inputs: { [key: string]: any }`) e devolvem saídas (`outputs: { [key: string]: any }`).
     * Clique duplo no nó de sub-rotina abre o fluxo filho em uma nova aba do canvas.

7. **Recursos Adicionais de Produtividade**:
   * **Auto-layout**: Botão para reorganizar automaticamente nós horizontais ou verticais usando Dagre/ELK.
   * **Mini-mapa Interativo** com zoom fit e navegação rápida.
   * **Painel de Variáveis e Contexto**: Inspetor lateral que lista variáveis globais e variáveis de runtime disponíveis para interpolação nos campos (ex: `{{caminho_arquivo}}`).
   * **Undo / Redo (Ctrl+Z / Ctrl+Y)** com histórico granular.

---

### 2.3 Catálogo de Ações Desktop (Fase 1 - MVP)

| Ação | Tipo | Parâmetros de Configuração | Saídas / Variáveis Geradas |
| :--- | :--- | :--- | :--- |
| **Abrir Programa** | `desktop.open_app` | Caminho do executável (`path`), argumentos CLI (`args`), diretório de trabalho (`cwd`), aguardar janela (`wait_window: bool`, `timeout: int`) | `process_id`, `window_handle` |
| **Clicar em Imagem** | `desktop.click_image` | Template de imagem (`image_asset_id`), confiança (`confidence: 0.7-1.0`), botão (`left/right/double`), offset (`dx`, `dy`), timeout (`int`) | `found: bool`, `point_x`, `point_y` |
| **Clicar em Coordenada** | `desktop.click_coordinate` | Posição X (`x`), Posição Y (`y`), botão (`left/right/middle`), tipo de clique (`single/double`), delay antes do clique | N/A |
| **Aguardar Tempo** | `desktop.wait_delay` | Duração (`duration_ms` ou `seconds`) | N/A |
| **Aguardar Imagem** | `desktop.wait_image` | Template de imagem (`image_asset_id`), confiança (`confidence`), timeout máximo (`timeout_sec`), checar a cada (`interval_sec`) | `found: bool`, `elapsed_time` |
| **Escrever Texto** | `desktop.type_text` | Texto ou expressão dinâmica (`text`), intervalo entre teclas (`interval_sec`), suporte a caracteres especiais (`write_method: typewrite/paste`) | N/A |
| **Apertar Tecla** | `desktop.press_key` | Tecla (`keys`: ex: `tab`, `enter`, `backspace`, `f5`, `esc`), modificadores (`modifiers`: `ctrl`, `alt`, `shift`), repetições (`repeat_count`) | N/A |
| **Extrair Texto (OCR)** | `desktop.ocr_extract` | Região da tela (`bbox: {x, y, width, height}`), idioma (`lang: por/eng`), pré-processamento de imagem (`grayscale, binarize, threshold`), regex de filtro | `extracted_text`, `confidence` |
| **Sub-rotina** | `flow.subroutine` | ID da sub-rotina alvo (`target_workflow_id`), mapeamento de entradas (`input_mapping: { param: value }`), mapeamento de saídas (`output_mapping: { var: return_key }`) | Retornos mapeados para o escopo pai |

---

## 3. Contrato de Execução Frontend <-> Backend (Schema AST)

O backend executa os fluxos de maneira autônoma com base em um arquivo de especificação declarativa (JSON Schema).

```json
{
  "$schema": "https://rpa-platform.local/schemas/workflow.v1.json",
  "workflow_id": "wf_financeiro_emissao_nfe",
  "name": "Emissão de Nota Fiscal Desktop",
  "version": "1.0.0",
  "description": "Abre o sistema desktop de faturamento, clica no botão emitir e extrai o protocolo via OCR.",
  "metadata": {
    "author": "Engenharia RPA",
    "created_at": "2026-09-14T20:00:00Z",
    "updated_at": "2026-09-14T21:30:00Z"
  },
  "variables": {
    "numero_pedido": "98421",
    "sistema_path": "C:\\Totvs\\Faturamento.exe"
  },
  "nodes": [
    {
      "id": "node_open_01",
      "name": "Abrir ERP Faturamento",
      "type": "desktop.open_app",
      "enabled": true,
      "config": {
        "path": "{{sistema_path}}",
        "args": ["--mode=batch"],
        "wait_window": true,
        "timeout_sec": 30
      },
      "retry_policy": {
        "max_attempts": 3,
        "delay_seconds": 2
      },
      "next_node_id": "node_wait_login"
    },
    {
      "id": "node_wait_login",
      "name": "Aguardar Tela de Login",
      "type": "desktop.wait_image",
      "enabled": true,
      "config": {
        "image_asset": "assets/login_button.png",
        "confidence": 0.85,
        "timeout_sec": 20
      },
      "next_node_id": "node_ocr_protocol"
    },
    {
      "id": "node_ocr_protocol",
      "name": "Extrair Protocolo OCR",
      "type": "desktop.ocr_extract",
      "enabled": true,
      "config": {
        "region": { "x": 450, "y": 280, "width": 200, "height": 40 },
        "lang": "por",
        "regex_filter": "\\d{9}"
      },
      "outputs": {
        "extracted_text": "context.protocolo_gerado"
      },
      "next_node_id": "node_sub_notify"
    },
    {
      "id": "node_sub_notify",
      "name": "Notificar Conclusão",
      "type": "flow.subroutine",
      "enabled": true,
      "config": {
        "subroutine_id": "sub_enviar_email_status",
        "inputs": {
          "destinatario": "financeiro@empresa.com",
          "protocolo": "{{context.protocolo_gerado}}"
        }
      },
      "next_node_id": null
    }
  ],
  "sections": [
    {
      "id": "section_login",
      "label": "Etapa de Autenticação",
      "node_ids": ["node_open_01", "node_wait_login"],
      "collapsed": false
    }
  ]
}
```

---

## 4. Backend: Diretrizes Arquiteturais (Hexagonal + DDD + TDD)

### 4.1 Princípios Fundamentais
* **Isolamento de Domínio**: Nenhuma dependência externa (frameworks, PyAutoGUI, Playwright, bancos de dados) dentro do diretório `domain`.
* **Test-Driven Development (TDD)**: Escreva testes unitários antes de qualquer implementação. Todos os nós e casos de uso devem ser cobertos com mocks de portas.
* **Execução Autônoma (Headless / Agendador)**: O backend opera como um daemon/serviço que monitora agendamentos (`SchedulerPort`) ou escuta comandos locais via arquivo/IPC, carregando o JSON do workflow e executando-o.

---

### 4.2 Estrutura de Pastas do Backend

```text
backend/
├── database/                    # MOCK TEMPORÁRIO (Será movido para infra/persistence)
│   ├── workflows/               # JSONs das automações salvas
│   ├── subroutines/             # JSONs das sub-rotinas
│   ├── schedules/               # Agendamentos locais (cron/interval)
│   └── assets/                  # Imagens e templates para matching/OCR
│
├── src/
│   ├── domain/                  # CORE DO DOMÍNIO (Zero dependências externas)
│   │   ├── entities/            # Workflow, Step, Subroutine, ExecutionContext, Schedule
│   │   ├── value_objects/       # Coordinate, ImageTemplate, RetryPolicy, StepId, ActionType
│   │   ├── ports/               # Interfaces / Contratos
│   │   │   ├── desktop_port.py  # IDesktopAutomationDriver
│   │   │   ├── web_port.py      # IWebAutomationDriver
│   │   │   ├── workflow_repo.py # IWorkflowRepository
│   │   │   ├── ocr_port.py      # IOCRDriver
│   │   │   └── scheduler_port.py# ISchedulerService
│   │   ├── exceptions/          # StepExecutionError, ImageNotFoundException, etc.
│   │   └── services/            # Validador de grafo, resolvedor de expressões
│   │
│   ├── application/             # CASOS DE USO (Orquestração de Regras de Negócio)
│   │   ├── use_cases/
│   │   │   ├── execute_workflow_use_case.py
│   │   │   ├── execute_subroutine_use_case.py
│   │   │   ├── validate_workflow_use_case.py
│   │   │   └── schedule_workflow_use_case.py
│   │   ├── dtos/                # WorkflowExecutionDTO, StepResultDTO
│   │   └── mappers/             # Mapeadores de JSON AST para Entidades de Domínio
│   │
│   └── infra/                   # ADAPTERS & IMPLEMENTAÇÕES TÉCNICAS
│       ├── desktop/             # Adapter PyAutoGUI + OpenCV + Pynput
│       │   └── pyautogui_driver.py
│       ├── ocr/                 # Adapter Tesseract / EasyOCR
│       │   └── tesseract_ocr_driver.py
│       ├── web/                 # Adapter Playwright (navegação isolada)
│       │   └── playwright_driver.py
│       ├── persistence/         # Repositórios (Primeiro Mock JSON, depois DB Real)
│       │   ├── mock_file_workflow_repository.py
│       │   └── sqlite_workflow_repository.py (futuro)
│       └── scheduler/           # APScheduler / Cron nativo do SO
│           └── apscheduler_service.py
│
└── tests/                       # SUÍTE DE TESTES (TDD Obrigatório)
    ├── domain/                  # Testes unitários puros das entidades e validação do grafo
    ├── application/             # Testes dos casos de uso mockando as portas
    └── infra/                   # Testes de integração dos adapters (PyAutoGUI, Repo, etc.)
```

---

### 4.3 Drivers e Tecnologias do Backend
* **Automação Desktop**: `pyautogui` + `opencv-python` (para template matching com precisão configurável) + `pynput` (caso precise de escuta de teclado/mouse de baixo nível).
* **OCR**: `pytesseract` com Tesseract-OCR instalado no host, com pré-processamento via `Pillow` / `OpenCV` (conversão em escala de cinza, limiarização adaptativa/binarização).
* **Automação Web**: `playwright` (Python async/sync API) rodando em contexto isolado com browser context reutilizável.
* **Agendamento**: `APScheduler` rodando em background thread ou processo dedicado.

---

## 5. Diretrizes de Implementação Passo a Passo para o Codex

### Etapa 1: Frontend First (Foco Imediato)
1. Configure a aplicação React + TypeScript + Tailwind + `@xyflow/react`.
2. Crie os nós customizados (`CustomNodes`):
   - Design moderno com header colorido pelo tipo de ação, ícone indicador, badge com o Step ID e switch de Ativo/Inativo.
   - Ponto de entrada (Handle de Input) no topo e ponto de saída (Handle de Output) na base.
   - Botão flutuante para adicionar etapa antes ou depois.
3. Implemente a funcionalidade de **Seções Agrupadas (Scopes)** com recolhimento e expansão visual.
4. Crie o painel de propriedades lateral (Sidebar Property Inspector) que carrega os parâmetros de acordo com o nó selecionado.
5. Crie o sistema de captura de tela (Screen Snip Modal) para recortar templates para as ações `click_image` e `wait_image`.
6. Crie a árvore de arquivos e sub-rotinas (File Explorer) com suporte a múltiplos arquivos.
7. Implemente o exportador de JSON que gera a especificação compatível com o schema definido acima.

### Etapa 2: Backend (Preparação para Fase 2)
1. Escreva os testes unitários (`tests/domain/`) modelando as entidades `Workflow`, `Step` e `ExecutionContext`.
2. Implemente as portas e o caso de uso `ExecuteWorkflowUseCase` com execução sequencial e resolução de dependências.
3. Implemente o `MockFileWorkflowRepository` lendo e gravando na pasta `database/`.
4. Crie o `PyAutoGUIDriver` implementando `IDesktopAutomationDriver` com testes isolados por mocks.

---
