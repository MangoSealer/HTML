# CONTEXT.md

## O que é este projeto

Dashboard pessoal hospedado em `danilosn.work` (GitHub Pages, static only).
Único usuário: o dono do site.
Backend FastAPI separado em `painel.danilosn.work` / `api.danilosn.work` — não está neste repositório.

## Arquitetura

- Zero build system. HTML/CSS/JS direto, sem npm, sem bundler, sem package.json.
- Auth via cookie `session` (httpOnly, lax, `.danilosn.work`), verificado por `auth.js` em todas as páginas protegidas via `GET https://api.danilosn.work/me`.
- Login unificado em `login.html` — `POST https://api.danilosn.work/login`. Um único usuário, um único fluxo de auth.
- Logout via `POST https://api.danilosn.work/logout`, executado pelo botão `.logout-btn` injetado por `auth.js`.
- O painel admin fala com `https://painel.danilosn.work` (Schedule Notify); o leitor de EPUB também usa `painel.danilosn.work` para arquivos/marcadores. Os cookies de sessão valem para todo o domínio `.danilosn.work`.

## Páginas

| Página | Descrição |
|--------|-----------|
| `index.html` | Home — grid de cards para as seções |
| `login.html` | Única página de login do site |
| `admin.html` | Painel admin do Schedule Notify |
| `hub/index.html` | Hub de checklists |
| `hub/*/index.html` | Checklists por categoria (9 listas) |
| `pdf/index.html` | Leitor de PDF via PDF.js |
| `epub/index.html` | Leitor de EPUB via epub.js |
| `jogos/index.html` | Hub de jogos |
| `jogos/*/index.html` | Jogos individuais em iframe/canvas/EmulatorJS |
| `curriculo/index.html` | CV em HTML (iframe do PDF) |

## Arquivos de estilo

| Arquivo | Escopo |
|---------|--------|
| `style/cores.css` | Variáveis CSS globais — fonte da verdade de cores, tokens e fonte (`--font`) |
| `style/admin.css` | Layout e componentes do admin (e tela de login) — importa `cores.css` |
| `style/cards.css` | Grid de cards (index.html, hub/index.html) — importa `cores.css` |
| `style/to-do-geral.css` | Base das páginas de checklist — importa `cores.css` |
| `style/epub_reader.css` | Leitor de EPUB |
| `style/pdf_reader.css` | Leitor de PDF |
| `style/fonte_bonitinha.css` | Fonte padrão do projeto (Roboto Mono) — incluída em todas as páginas |
| `style/interruptor.css` | Toggle de modo escuro/claro das páginas de checklist e do hub de jogos |

O botão `.logout-btn` é estilizado por um `<style>` auto-contido injetado pelo próprio `auth.js`
(usa as variáveis de `cores.css` quando presentes, com fallback embutido) — assim funciona até em
páginas que não importam `cores.css` (epub, pdf, jogos, curriculo).

## Padrões obrigatórios

- **Fonte:** `fonte_bonitinha.css` (Roboto Mono) em todas as páginas; cores/tokens via `--font` de `cores.css`.
- **Tema:** sempre escuro.
- **lang:** sempre `pt-BR`.
- **Paths:** sempre absolutos a partir de `/`.
- **Logout:** botão `.logout-btn` injetado por `auth.js` — não duplicar em HTML.
- **Auth:** `auth.js` deve ser o primeiro `<script>` carregado em toda página protegida.
- **Cores:** nunca hardcode — usar variáveis de `cores.css`.
- **Modals (admin):** nunca usar `alert()`, `confirm()`, `prompt()` — usar as funções de modal de `admin.js`.

## Listas do hub

Cada lista em `hub/*/` tem sua própria cor de header — identidade visual intencional.
As cores ficam num `<style>header{...}</style>` no `<head>` (daily/pessoal/site/reminders/trabalho)
ou no `to-do.css` local da lista (comprar/assistir/livros/testes).
O dropdown "Outras Listas" é hardcoded em cada página — intencional, não componentizar.
`hub/trabalho/` usa Firebase Firestore (config hardcoded no `to-do.js`). As demais usam `localStorage`.

## Pendências conhecidas

- `scripts/admin.js` ainda contém `applyReturnRedirect()` (lê `sessionStorage.epub_return`), hoje inerte:
  o EPUB não grava mais essa chave. Pode ser removido pelo dono se quiser limpar.
- `jogos/pokemao/index.html` está vazio e não é linkado — candidato a remoção.
- `site_auth.py` no backend foi esvaziado mas ainda existe — pode ser deletado pelo dono do projeto.

## Fora do escopo deste repositório

- Backend FastAPI (pasta separada, deploy no Oracle Cloud via Oracle CLI).
- Schedule Notify (bot WhatsApp) — o `admin.html` é apenas o painel de controle.
- `meu-painel.html` é um WIP cru — não refatorar/redesenhar sem pedido explícito.
