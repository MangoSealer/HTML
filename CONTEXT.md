# CONTEXT — Schedule Notify Frontend

Este arquivo serve como contexto para o Codex CLI trabalhar no front-end do projeto **Schedule Notify** sem precisar ler o backend inteiro.

O objetivo é economizar contexto/tokens e evitar que o Codex invente endpoints, regras ou estruturas inexistentes.

## 1. Visão geral do projeto

Schedule Notify é um bot pessoal de lembretes via WhatsApp.

Não tratar como SaaS.

Fluxo principal:

```text
WhatsApp → wa-gateway → backend → SQLite → scheduler → WhatsApp / Email / Google Calendar
```

Serviços principais no backend/VPS:

```text
schedule-notify-backend
wa-gateway
```

Backend/API:

```text
https://painel.danilosn.work
```

Site/front principal:

```text
https://danilosn.work
```

O front atual é HTML estático. O arquivo principal em uso para o admin é:

```text
admin.html
```

O painel user ainda está cru e **não deve ser refatorado agora**. A prioridade atual é finalizar 100% o painel admin.

## 2. Regra de prioridade

Trabalhar primeiro no painel admin.

Não mexer no painel user, exceto se for explicitamente solicitado.

Ordem desejada:

```text
1. Fechar painel admin 100%.
2. Depois refatorar painel user.
```

## 3. Backend/API admin

Base URL:

```javascript
const backendUrl = "https://painel.danilosn.work";
```

Todas as chamadas admin devem usar:

```javascript
credentials: "include"
```

A autenticação admin usa cookie:

```text
admin_token
```

Endpoints usados pelo admin:

```http
POST /admin/api/login
POST /admin/api/logout
GET /admin/api/bootstrap
GET /admin/api/status
GET /admin/api/logs?lines=160
GET /admin/api/usuarios
GET /admin/api/usuarios/{user_id}
PUT /admin/api/usuarios/{user_id}/toggle-active
DELETE /admin/api/usuarios/{user_id}
GET /admin/api/lembretes
GET /admin/api/lembretes/{reminder_id}
POST /admin/api/lembretes
PUT /admin/api/lembretes/{reminder_id}
DELETE /admin/api/lembretes/{reminder_id}
GET /admin/api/canais
GET /admin/api/canais/{channel_id}
POST /admin/api/canais
PUT /admin/api/canais/{channel_id}
DELETE /admin/api/canais/{channel_id}
GET /admin/api/grupos
GET /admin/api/grupos/{group_id}
POST /admin/api/grupos
PUT /admin/api/grupos/{group_id}
DELETE /admin/api/grupos/{group_id}
POST /admin/api/clear
```

Escopos de `/admin/api/clear`:

```text
sent_reminders
all_reminders
all_data
```

Não testar `all_data` em produção sem autorização explícita.

## 4. Modelos retornados pela API

### User

Campos relevantes:

```text
id
phone
active
created_at
```

### Reminder

Campos relevantes:

```text
id
user_id
description
remind_at
sent
channel_tag
source_tag
display_tag
recurrence_type
recurrence_value
created_at
```

Para exibir canal de lembrete, usar esta prioridade:

```javascript
item.display_tag || item.source_tag || item.channel_tag
```

### Channel

Campos relevantes:

```text
id
user_id
tag
type
target
enabled
created_at
```

Tipos aceitos:

```text
email
whatsapp
```

### ChannelGroup

Campos relevantes:

```text
id
user_id
tag
targets
created_at
```

### Bootstrap

`GET /admin/api/bootstrap` retorna:

```json
{
  "status": "sucesso",
  "stats": {},
  "users": [],
  "reminders": [],
  "channels": [],
  "groups": []
}
```

### Stats

Campos esperados:

```text
cpu
ram_percent
ram_used_gb
ram_total_gb
disk_percent
disk_used_gb
disk_total_gb
total_users
total_reminders
total_channels
total_channel_groups
calendar
```

`calendar` tem formato parecido com:

```json
{
  "ok": true,
  "message": "Token do Google Calendar válido."
}
```

## 5. Regras de negócio do admin

### Tema

O painel admin deve usar tema escuro.

Paleta base atual:

```css
:root {
  --bg: #0f172a;
  --card: #111827;
  --text: #e5e7eb;
  --muted: #9ca3af;
  --border: #263244;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --danger: #dc2626;
  --danger-hover: #b91c1c;
  --warning: #f59e0b;
  --success: #22c55e;
  --shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  --radius: 14px;
}
```

Inputs, selects e textareas devem usar fundo escuro.

Evitar campos brancos em modais.

Status pills devem combinar com tema escuro.

### Agrupamento de lembretes multi-canais

Quando múltiplos registros representam o mesmo lembrete em canais diferentes, a UI deve agrupar visualmente em uma única linha.

Chave de agrupamento recomendada:

```javascript
[
  item.user_id,
  item.description,
  item.remind_at || "",
  item.recurrence_type || "",
  item.sent ? "1" : "0"
].join("||")
```

Os canais devem ser reunidos em uma lista sem duplicação.

No admin, se ainda não houver endpoints para editar/excluir múltiplos IDs de uma vez, os botões podem atuar inicialmente no primeiro ID do grupo, mas isso deve ser tratado com cuidado.

### Tarefas

Tarefas usam:

```text
recurrence_type = "task"
```

Como o banco exige `remind_at`, a tarefa deve usar uma data distante no futuro.

No front, ao criar `Tarefa`, não exigir que o usuário escolha data/hora.

Comportamento esperado no modal:

```text
- Tipo = Tarefa: esconder campo Data e hora.
- Ao salvar: enviar remind_at automaticamente como 01/01 daqui a 20 anos.
```

Exemplo:

```javascript
const remindAt = values.recurrence_type === "task"
  ? `${new Date().getFullYear() + 20}-01-01T00:00`
  : values.remind_at;
```

### Countdown

Countdown deve ir para:

```text
WhatsApp + Google Calendar
```

No backend, isso é tratado criando canais `whatsapp` e `agenda`.

### Recorrências

Valores aceitos em `recurrence_type`:

```text
null ou ""       → único
daily            → diário
business_days    → dias úteis
weekly           → semanal
monthly          → mensal
yearly           → anual
task             → tarefa
countdown        → contagem regressiva
```

Valores de `recurrence_value`:

```text
weekly: 0=seg, 1=ter, 2=qua, 3=qui, 4=sex, 5=sab, 6=dom
monthly: dia do mês, ex: 5
yearly: DD/MM, ex: 12/10
daily, business_days, task, countdown, único: null
```

No modal:

```text
- Único, diário, dias úteis, task e countdown: esconder recurrence_value.
- Semanal: mostrar ajuda dos números da semana.
- Mensal: mostrar exemplo de dia do mês.
- Anual: mostrar exemplo DD/MM.
```

### Reenviar / duplicar

Não implementar reenviar lembrete.

Não implementar duplicar lembrete.

Isso não é necessário nem no admin nem no painel user.

### Modais

Evitar `prompt()`, `confirm()` e `alert()`.

Usar modais internos.

Se existirem funções como:

```javascript
openFormModal()
openConfirmModal()
showModalMessage()
```

preferir reaproveitá-las.

## 6. Painel user

O painel user está cru.

Não refatorar agora.

Ele será tratado somente depois que o painel admin estiver 100% fechado.

## 7. `/admin/headless`

Existe uma tela experimental no backend:

```text
https://painel.danilosn.work/admin/headless
```

Ela serve apenas como referência/protótipo funcional da API.

Não gastar tempo polindo essa tela.

O admin definitivo deve ficar no site principal, em `admin.html`.

## 8. CORS e cookies

Como o front roda em:

```text
https://danilosn.work
```

e o backend em:

```text
https://painel.danilosn.work
```

as chamadas precisam de:

```javascript
credentials: "include"
```

Se aparecer `Failed to fetch`, verificar primeiro:

```text
CORS
cookies
preflight OPTIONS
backend fora do ar
```

Não assumir que o erro está no HTML antes de verificar CORS/backend.

## 9. Operações futuras no painel admin

Não criar terminal SSH completo no site por padrão.

Preferir um painel de operações seguras com botões pré-definidos e endpoints específicos no backend.

Itens planejados para revisão futura:

```text
- Criar segundo dashboard detalhado de infraestrutura.
- Mover logs atuais para o dashboard técnico.
- Ver logs recentes do gateway WhatsApp.
- Reiniciar backend.
- Reiniciar gateway WhatsApp.
- Rodar Resumo do Dia manualmente.
- Testar clima/Open-Meteo.
- Enviar mensagem teste para ADMIN_PHONE.
- Ver status do Google Calendar.
- Verificar token do Google Calendar.
- Criar backup do projeto.
- Criar backup do banco SQLite.
- Criar ZIP seguro para chat.
- Remover ZIP temporário da VPS.
- Testar configuração do Nginx.
- Recarregar Nginx.
- Ver últimas linhas do log do Nginx.
- Ver status do Oracle ARM Loop.
- Ver logs do Oracle ARM Loop.
- Reiniciar Oracle ARM Loop.
- Parar Oracle ARM Loop.
- Iniciar Oracle ARM Loop.
- Derrubar todo o serviço com confirmação forte.
- Desligar VPS com confirmação dupla e aviso de perda de acesso ao site/SSH.
```

## 10. Teste de CORS no terminal

```bash
curl -i -X OPTIONS "https://painel.danilosn.work/admin/api/login" \
  -H "Origin: https://danilosn.work" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Esperado:

```text
access-control-allow-origin: https://danilosn.work
access-control-allow-credentials: true
```

## 11. Instruções para o Codex

Ao trabalhar neste repo:

```text
1. Ler este arquivo antes de alterar código.
2. Alterar somente o front, salvo instrução explícita.
3. Não inventar endpoints.
4. Não mexer no painel user.
5. Não implementar reenviar/duplicar lembrete.
6. Manter tema escuro.
7. Evitar prompt(), confirm() e alert().
8. Usar modais internos.
9. Preservar chamadas com credentials: "include".
10. Se houver dúvida sobre comportamento do backend, pedir o contrato/trecho do backend em vez de assumir.
```

Arquivos principais esperados no front:

```text
admin.html
CONTEXT.md
```

Se for criar documentação adicional para o Codex, usar pasta:

```text
_docs-context/
```

Mas este `CONTEXT.md` deve ser suficiente para a maioria das alterações no admin.
