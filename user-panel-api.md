# API do Painel do Usuario

Este documento orienta o Codex/front-end sobre como consumir os endpoints atuais do painel do usuario.

## Onde ficam os endpoints

- Painel admin: `backend/admin.py`
- API admin: rotas sob `/admin/api/*`
- Telas HTML admin legadas: rotas sob `/admin/*`
- Painel do usuario atual: `backend/user_panel.py`
- API do usuario: rotas sob `/api/painel/*`
- Registro das rotas no app: `backend/main.py`, via `app.include_router(user_router)`

## Autenticacao

Todas as rotas `/api/painel/*`, exceto logout sem estado, esperam usuario autenticado por um destes meios:

- Header: `Authorization: Bearer <token>`
- Cookie: `user_session=<token>`

O token e o mesmo JWT gerado pelo magic link enviado no WhatsApp pelo comando:

```text
painel
```

Resposta comum quando o token estiver ausente, expirado ou invalido:

```json
{
  "error": "Nao autorizado"
}
```

Status HTTP: `401`.

## Bootstrap

### `GET /api/painel/dados`

Carrega os dados principais do painel em uma unica chamada.

Resposta:

```json
{
  "user": {
    "id": 1,
    "phone": "5511999999999",
    "active": true
  },
  "reminders": [],
  "channels": [],
  "groups": []
}
```

Use este endpoint para hidratar a primeira tela. Depois, use os endpoints especificos para atualizar partes da UI.

### `GET /api/painel/status`

Retorna contadores simples do usuario logado.

```json
{
  "status": "sucesso",
  "user": {
    "id": 1,
    "phone": "5511999999999",
    "active": true
  },
  "stats": {
    "pending_reminders": 5,
    "active_channels": 2,
    "channel_groups": 1
  }
}
```

## Lembretes

### Modelo de lembrete

```json
{
  "id": 123,
  "description": "reuniao",
  "remind_at": "2026-05-17T18:00:00",
  "channel_tag": "email",
  "source_tag": "trabalho",
  "display_tag": "trabalho",
  "recurrence_type": null,
  "recurrence_value": null,
  "sent": false,
  "created_at": "2026-05-17T12:00:00"
}
```

Na UI, exiba o canal assim:

```js
reminder.display_tag || reminder.channel_tag
```

### `GET /api/painel/lembretes`

Lista lembretes do usuario.

Query params opcionais:

- `status`: `pendentes`, `enviados` ou `todos`
- `tipo`: `todos`, `unicos`, `recorrentes`, `countdown`, `tasks`

Exemplos:

```http
GET /api/painel/lembretes
GET /api/painel/lembretes?tipo=unicos
GET /api/painel/lembretes?tipo=recorrentes
GET /api/painel/lembretes?tipo=countdown
GET /api/painel/lembretes?tipo=tasks
GET /api/painel/lembretes?status=todos
```

Resposta:

```json
{
  "reminders": []
}
```

### `GET /api/painel/lembretes/{reminder_id}`

Detalha um lembrete do usuario logado.

Resposta:

```json
{
  "reminder": {}
}
```

### `POST /api/painel/lembretes`

Cria lembrete por campos estruturados.

Body:

```json
{
  "description": "consulta",
  "remind_at": "2026-05-17T15:30",
  "channel_tags": ["whatsapp"],
  "recurrence_type": null,
  "recurrence_value": null
}
```

Notas:

- `remind_at` aceita ISO local sem timezone ou ISO com timezone.
- Se vier sem timezone, o backend assume `TIMEZONE` do projeto.
- `channel_tags` aceita tags oficiais, canais customizados ou grupos.
- Quando uma tag expande para multiplos canais, a resposta retorna multiplos lembretes.

Resposta:

```json
{
  "status": "sucesso",
  "reminders": [],
  "warnings": []
}
```

### `POST /api/painel/lembretes/parse`

Cria lembrete usando a mesma sintaxe do WhatsApp.

Body:

```json
{
  "text": "10m tomar agua @whatsapp"
}
```

Tambem aceita exemplos como:

```text
15:30 reuniao
25/05 09:00 consulta
repetir semanal seg 19:00 academia
countdown 25/12 Natal
task comprar filtro
```

Resposta:

```json
{
  "status": "sucesso",
  "parsed": {},
  "reminders": [],
  "warnings": []
}
```

### `PUT /api/painel/lembretes/{reminder_id}`

Atualiza campos do lembrete.

Body parcial aceito:

```json
{
  "description": "novo texto",
  "remind_at": "2026-05-17T16:00",
  "channel_tag": "whatsapp",
  "recurrence_type": null,
  "recurrence_value": null
}
```

Resposta:

```json
{
  "status": "sucesso",
  "reminder": {}
}
```

### `DELETE /api/painel/lembretes/{reminder_id}`

Remove lembrete do usuario logado.

Resposta:

```json
{
  "status": "sucesso"
}
```

## Canais

### Modelo de canal

```json
{
  "id": 10,
  "tag": "trabalho",
  "type": "email",
  "channel_type": "email",
  "target": "email@exemplo.com",
  "enabled": true,
  "created_at": "2026-05-17T12:00:00"
}
```

O campo `channel_type` existe por compatibilidade com o front atual. Prefira `type` no codigo novo.

### `GET /api/painel/canais`

Lista canais do usuario.

### `GET /api/painel/canais/{channel_id}`

Detalha um canal.

### `POST /api/painel/canais`

Cria canal.

Body:

```json
{
  "tag": "trabalho",
  "type": "email",
  "target": "email@exemplo.com"
}
```

Tambem aceita `channel_type` no lugar de `type`.

Tipos aceitos:

- `email`
- `whatsapp`

Resposta:

```json
{
  "status": "sucesso",
  "channel": {}
}
```

### `PUT /api/painel/canais/{channel_id}`

Atualiza canal.

Body parcial aceito:

```json
{
  "tag": "trabalho",
  "type": "email",
  "target": "novo@email.com",
  "enabled": true
}
```

### `DELETE /api/painel/canais/{channel_id}`

Remove canal do usuario.

## Grupos

### Modelo de grupo

```json
{
  "id": 5,
  "tag": "trabalho",
  "targets": ["email", "agenda"],
  "created_at": "2026-05-17T12:00:00"
}
```

### `GET /api/painel/grupos`

Lista grupos do usuario.

### `GET /api/painel/grupos/{group_id}`

Detalha grupo.

### `POST /api/painel/grupos`

Cria grupo.

Body:

```json
{
  "tag": "trabalho",
  "targets": ["email", "agenda"]
}
```

Regras:

- `tag` nao pode ser canal reservado.
- `tag` nao pode colidir com canal customizado existente.
- `targets` nao pode conter `todos`.
- targets customizados precisam existir.
- targets oficiais como `whatsapp`, `email` e `agenda` sao aceitos.

### `PUT /api/painel/grupos/{group_id}`

Atualiza grupo.

Body:

```json
{
  "tag": "trabalho",
  "targets": ["email", "agenda"]
}
```

### `DELETE /api/painel/grupos/{group_id}`

Remove grupo.

## Logout

### `POST /api/painel/logout`

Remove o cookie `user_session`.

Resposta:

```json
{
  "status": "sucesso"
}
```

## Tratamento de erros no front

Formato padrao:

```json
{
  "error": "Mensagem de erro"
}
```

Algumas criacoes de lembrete podem retornar:

```json
{
  "error": "Nao foi possivel criar lembrete em nenhum canal.",
  "details": []
}
```

O front deve:

- tratar `401` redirecionando para tela de login/magic link expirado;
- exibir `error` como mensagem principal;
- exibir `details` quando existir;
- apos criar/editar/deletar, atualizar apenas a lista afetada ou recarregar `/api/painel/dados`.
