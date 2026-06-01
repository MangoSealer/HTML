# CLAUDE.md

Este arquivo orienta o Claude Code ao trabalhar neste repositório.

## Regras fundamentais

- Zero build system. Não sugira npm, bundler, ou qualquer etapa de compilação.
- Tema sempre escuro. Nunca adicione estilos claros fora do toggle de modo claro das listas.
- Fonte padrão: `fonte_bonitinha.css` (Roboto Mono). Não use Arial, Inter, ou qualquer outra fonte.
- Paths sempre absolutos a partir de `/`.
- `lang="pt-BR"` em todo `<html>`.
- Cores sempre via variáveis de `cores.css`. Nunca hardcode valores de cor.
- `auth.js` deve ser o primeiro script em toda página protegida.

## Para contexto completo do projeto, leia `CONTEXT.md`.

## Regras específicas por área

### admin.html / scripts/admin.js
- Nunca usar `alert()`, `confirm()`, `prompt()`. Usar as funções de modal existentes
  (`openFormModal()`, `openConfirmModal()`, `showModalMessage()`).
- Inputs, selects e textareas sempre com fundo escuro.
- Não implementar: reenviar lembrete, duplicar lembrete.
- Prioridade de exibição de canal: `item.display_tag || item.source_tag || item.channel_tag`
- Base do backend admin: `https://painel.danilosn.work`. Não invente endpoints —
  a lista completa está em `api_operacoes.md` / `user-panel-api.md`.

### hub/*/
- A cor do header de cada lista é intencional. Não padronizar.
- O dropdown "Outras Listas" é hardcoded em 9 arquivos — intencional.
- `hub/trabalho/` usa Firestore. Não mover a config do Firebase.
- Não alterar a lógica de nenhum `to-do.js`.

### auth / login
- Auth unificado: cookie `session`, validado por `auth.js` via `GET https://api.danilosn.work/me`.
- Login único em `login.html` (`POST /login`); logout via `POST /logout` pelo `.logout-btn` do `auth.js`.
- Não recriar telas de login inline em páginas protegidas.

### CORS / fetch
Todas as chamadas ao backend precisam de `credentials: "include"`.
Frontend: `danilosn.work` / Backend: `painel.danilosn.work` e `api.danilosn.work`.
