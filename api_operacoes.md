# API Operações — Schedule Notify Admin

Base URL: `https://painel.danilosn.work`

Todas as chamadas devem usar `credentials: "include"`.

## Logs

`GET /admin/api/operations/gateway/logs?lines=100`

Retorna logs recentes do gateway WhatsApp.

`GET /admin/api/operations/nginx/logs?lines=100`

Retorna logs recentes do Nginx.

`GET /admin/api/operations/oracle-arm-loop/logs?lines=100`

Retorna logs recentes do Oracle ARM Loop.

## Backend e gateway

`POST /admin/api/operations/backend/restart`

Reinicia o backend.

`POST /admin/api/operations/gateway/restart`

Reinicia o gateway WhatsApp.

## Resumo, clima e WhatsApp

`POST /admin/api/operations/daily-summary`

Dispara manualmente o Resumo do Dia.

`GET /admin/api/operations/weather`

Testa retorno do clima/Open-Meteo.

`POST /admin/api/operations/test-admin-message`

Envia mensagem teste para `ADMIN_PHONE`.

## Google Calendar

`GET /admin/api/operations/calendar/status`

Consulta status atual do Google Calendar.

`POST /admin/api/operations/calendar/token-check`

Força verificação do token do Google Calendar.

## Backups

`POST /admin/api/operations/backup/project`

Cria backup do projeto.

`POST /admin/api/operations/backup/database`

Cria backup do banco SQLite.

`POST /admin/api/operations/backup/chat-zip`

Cria ZIP seguro para enviar em chat.

`DELETE /admin/api/operations/backup/chat-zip`

Remove ZIP temporário da VPS.

## Nginx

`POST /admin/api/operations/nginx/test`

Testa configuração do Nginx.

`POST /admin/api/operations/nginx/reload`

Recarrega o Nginx.

## Oracle ARM Loop

`GET /admin/api/operations/oracle-arm-loop/status`

Consulta status do serviço.

`POST /admin/api/operations/oracle-arm-loop/restart`

Reinicia o serviço.

`POST /admin/api/operations/oracle-arm-loop/stop`

Para o serviço.

`POST /admin/api/operations/oracle-arm-loop/start`

Inicia o serviço.

## Operações destrutivas

Estas operações devem exigir confirmação forte no front.

`POST /admin/api/operations/service/down`

Confirmação exigida: `DERRUBAR SERVICO`.

`POST /admin/api/operations/vps/shutdown`

Confirmação exigida: `DESLIGAR VPS`.

O front deve deixar claro que desligar a VPS derruba site e SSH até religar pelo painel da Contabo.