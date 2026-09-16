# 🤖 Projeto de Automação Desktop

Este projeto é um robô criado em Python para automatizar tarefas locais no Windows. Ele utiliza Programação Orientada a Objetos para simplificar o controle do teclado, do mouse, o foco em janelas e a interação com elementos visuais na tela através de reconhecimento de imagens.

---

## 🛠️ Pré-requisitos

* **Linguagem:** Python na versão **3.11.9** (versão utilizada e testada no projeto).
* **Sistema Operacional:** Windows.
* **Aviso:** Certifique-se de marcar a opção **"Add Python to PATH"** durante a instalação do Python no Windows.

---

## ⚙️ Iniciar o Studio no Linux

Execute da raiz do projeto (`automacao-desktop-python`):

```bash
python3 -m venv backend/venv
source backend/venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m backend.workspace_api list
cd frontend
npm ci
RPA_PYTHON="$VIRTUAL_ENV/bin/python" npm run dev
```

Abra http://localhost:3000. Não é necessário iniciar um servidor Python separado:
as rotas do Next.js chamam `backend.workspace_api` para salvar e carregar o workspace.
O comando `list` verifica a persistência e termina após imprimir JSON.

Se estiver dentro de `backend`, use `python3 -m venv venv` e
`source venv/bin/activate`. Usar `backend/venv` nessa pasta cria um ambiente
aninhado em `backend/backend/venv`. Você pode usar o ambiente já criado indicando
seu executável em `RPA_PYTHON`.

Para ações web, instale o navegador com `python -m playwright install chromium`.

## 🚀 Demonstração desktop no Windows

`index.py` executa uma demonstração de Calculadora/Spotify destinada ao Windows;
ele não inicia o backend do Studio. Execute-o dentro de `backend`, com o ambiente
ativado, somente quando os programas e as imagens de referência estiverem preparados:

```powershell
python index.py
```

A demonstração depende de `Win+R` e do suporte de foco de janela do PyAutoGUI no
Windows. No Linux ela é interrompida antes de enviar teclas. Os erros de captura
no Wayland pertencem à automação desktop; salvar/carregar fluxos não usa captura
de tela. Instalar uma ferramenta de captura não resolve o foco de janela desta
demonstração.

---

## 📁 Estrutura do Projeto

* index.py: Demonstração desktop legada para Windows; não inicia um servidor.
* utils/bot_desktop.py: A classe principal (BotDesktop) que abstrai a complexidade do PyAutoGUI e contém os métodos como clicar em imagens, focar janelas e apertar teclas.
* images/: Pasta recomendada para armazenar os recortes de tela (ex: idioma.png) que o robô usará como referência de clique.

## Executor do Studio

Instale `requirements.txt` e, para ações web, execute `python -m playwright install chromium` no host. Exporte o JSON no Studio (extraia o ZIP quando houver sub-rotinas) e execute:

```sh
python backend/run_workflow.py caminho/fluxo.rpa.json
```

- `web.create_browser` abre uma sessão/aba; o campo Navegador das ações web referencia o ID dessa etapa. Selecionar elemento usa um seletor CSS na aba referenciada.
- `http.request` disponibiliza `status`, `headers` e `body`. O modal de valores permite acessar caminhos como `body.items.0.total` em ações posteriores.
- Loop executa a sub-rotina selecionada N vezes e fornece `index` a partir de zero. Decisão compara os valores e executa a sub-rotina verdadeira ou falsa; o ramo falso é opcional.
- Seções organizam o desenho, sem alterar a sequência de execução. Excluir uma seção preserva seus filhos; excluir ações reconecta a sequência.
- Salvar/Autosalvamento sincronizam o workspace pelo Python em `backend/database/`, com AST e dados visuais no mesmo documento. Ao abrir o Studio, a API retorna o conteúdo desse banco. Rascunhos podem estar incompletos. Exportar JSON valida e gera o contrato executável; a rota `/api/salvar-fluxo` continua aceitando contratos validados.
- O executor imprime os resultados ao terminar. Drivers de desktop exigem sessão gráfica; focar janela depende do suporte do PyAutoGUI no Windows. OCR requer Tesseract instalado. A seleção de elemento é por CSS, sem um inspetor visual de páginas externas.

Testes sem efeitos no desktop: `python -m unittest discover -s backend/tests -v`.

## Backend hexagonal do Studio

A implementação inicial segue a etapa 2 de `CODEX.md`:

- `src/domain/entities/workflow.py`: entidades Workflow/Step e validação da sequência, sem frameworks ou drivers.
- `src/domain/ports/`: contratos de repositório e automação.
- `src/domain/services/workflow_executor.py`: sequência, bypass, expressões e chamadas de subrotinas.
- `src/application/mappers/`: conversão do grafo visual para AST e reconstrução do editor a partir do contrato gravado.
- `src/application/use_cases/`: salvar workspace, validar, executar fluxo e subrotina usando portas.
- `src/infra/persistence/`: repositório JSON; gravações individuais usam substituição atômica e o índice do workspace é atualizado por último.
- `src/infra/desktop/`: adaptador do driver host existente, com dependências de GUI carregadas sob demanda.
- `database/workflows`, `subroutines`, `schedules`, `assets`: banco local temporário.

O diretório de agendamento e os pacotes de OCR/web/scheduler estão preparados para
os próximos adaptadores. O daemon/agendador e SQLite ainda não foram implementados.
As ações web/OCR existentes são atendidas pelo driver host.

Execute os comandos abaixo da raiz do projeto:

```sh
python3 -m backend.workspace_api list
python3 -m backend.execute_saved_workflow wf_identificador
python3 -m unittest discover -s backend/tests -v
```

O frontend envia JSON para `python3 -m backend.workspace_api save` pela entrada
padrão e recebe a resposta pela saída padrão. `RPA_PYTHON` configura o executável;
`RPA_DATABASE_DIR` configura o banco usado pela API Next.js.

Fluxos vazios e ações incompletas são rascunhos persistíveis. Executar uma automação
real requer configurar suas ações e instalar os drivers do host. Salvar não executa
as ações. Imagens e o workspace inteiro são preservados para recarregar no editor.
