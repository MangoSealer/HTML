const backendUrl = "https://painel.danilosn.work";
let state = {
  users: [],
  reminders: [],
  channels: [],
  groups: [],
  stats: {},
  operations: {
    status: null,
    calendar: null,
    oracle: null,
    gateway: null,
    logs: {}
  },
  section: "dashboard"
};

const sectionMeta = {
  dashboard: ["Dashboard", "Visão geral do backend e integrações."],
  users: ["Usuários", "Gerencie Usuários e bloqueios."],
  reminders: ["Lembretes", "Edite ou remova lembretes."],
  channels: ["Canais", "Gerencie canais customizados."],
  groups: ["Grupos", "Gerencie macro-tags de canais."],
  operations: ["Operações", "Status técnico, logs e ações seguras da infraestrutura."],
  danger: ["Zona de perigo", "Operações destrutivas."]
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function toDatetimeLocalValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function splitTags(value) {
  return String(value || "")
    .split(",")
    .map(normalizeTag)
    .filter(Boolean);
}

function normalizeTag(value) {
  return String(value || "").trim().toLowerCase().replaceAll("@", "");
}

function matchesFilter(values, filter) {
  if (!filter) return true;
  return values
    .filter(value => value !== null && value !== undefined)
    .map(value => String(value).toLowerCase())
    .some(value => value.includes(filter));
}

function openFormModal(title, fields, onSubmit) {
  const root = document.getElementById("modal-root");

  const fieldsHtml = fields.map(field => {
    const value = escapeHtml(field.value ?? "");
    const label = escapeHtml(field.label);
    const id = `modal-field-${field.name}`;

    if (field.type === "textarea") {
      return `
        <div class="field">
          <label for="${id}">${label}</label>
          <textarea id="${id}" data-name="${escapeHtml(field.name)}">${value}</textarea>
        </div>
      `;
    }

    if (field.type === "datetime-local") {
      return `
        <div class="field">
          <label for="${id}">${label}</label>
          <input id="${id}" data-name="${escapeHtml(field.name)}" type="datetime-local" value="${value}" />
        </div>
      `;
    }

    if (field.type === "select") {
      const options = (field.options || []).map(option => `
        <option value="${escapeHtml(option.value)}" ${String(option.value) === String(field.value) ? "selected" : ""}>
          ${escapeHtml(option.label)}
        </option>
      `).join("");

      return `
        <div class="field">
          <label for="${id}">${label}</label>
          <select id="${id}" data-name="${escapeHtml(field.name)}">${options}</select>
        </div>
      `;
    }

    return `
      <div class="field">
        <label for="${id}">${label}</label>
        <input id="${id}" data-name="${escapeHtml(field.name)}" value="${value}" />
      </div>
    `;
  }).join("");

  root.innerHTML = `
    <div class="modal-backdrop">
      <form class="modal" id="modal-form">
        <h3>${escapeHtml(title)}</h3>
        <div class="modal-grid">${fieldsHtml}</div>
        <div class="modal-actions">
          <button type="button" class="ghost" id="modal-cancel">Cancelar</button>
          <button type="submit">Salvar</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById("modal-cancel").addEventListener("click", closeModal);

  document.getElementById("modal-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;

    const values = {};
    root.querySelectorAll("[data-name]").forEach(input => {
      values[input.dataset.name] = input.value;
    });

    await onSubmit(values);
    if (root.querySelector("#modal-form") === form) {
      closeModal();
    }
  });
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

function openConfirmModal(title, message, confirmLabel, onConfirm) {
  const root = document.getElementById("modal-root");

  root.innerHTML = `
<div class="modal-backdrop">
  <div class="modal">
    <h3>${escapeHtml(title)}</h3>
    <p style="color: var(--muted); line-height: 1.5; margin: 0 0 16px;">${escapeHtml(message)}</p>
    <div class="modal-actions">
      <button type="button" class="ghost" id="confirm-cancel">Cancelar</button>
      <button type="button" class="danger" id="confirm-ok">${escapeHtml(confirmLabel || "Confirmar")}</button>
    </div>
  </div>
</div>
  `;

  document.getElementById("confirm-cancel").addEventListener("click", closeModal);
  document.getElementById("confirm-ok").addEventListener("click", async () => {
    await onConfirm();
    closeModal();
  });
}

function showModalMessage(title, message) {
  const root = document.getElementById("modal-root");

  root.innerHTML = `
<div class="modal-backdrop">
  <div class="modal">
    <h3>${escapeHtml(title)}</h3>
    <p style="color: var(--muted); line-height: 1.5; margin: 0 0 16px;">${escapeHtml(message)}</p>
    <div class="modal-actions">
      <button type="button" id="message-ok">OK</button>
    </div>
  </div>
</div>
  `;

  document.getElementById("message-ok").addEventListener("click", closeModal);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${backendUrl}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Erro na requisição.");
  }

  return data;
}

async function login(username, password) {
  return apiRequest("/admin/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

async function logout() {
  try {
    await apiRequest("/admin/api/logout", { method: "POST" });
  } finally {
    document.getElementById("app").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
  }
}

async function loadAll() {
  const data = await apiRequest("/admin/api/bootstrap");
  state.users = data.users || [];
  state.reminders = data.reminders || [];
  state.channels = data.channels || [];
  state.groups = data.groups || [];
  state.stats = data.stats || {};

  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  renderDashboard();
  renderUsers();
  renderReminders();
  renderChannels();
  renderGroups();
  loadLogs();
}

async function loadStatusOnly() {
  if (document.getElementById("app").classList.contains("hidden")) return;

  try {
    const data = await apiRequest("/admin/api/status");
    state.stats = data || {};
    renderDashboard();
  } catch (error) {
    console.warn(error);
  }
}

async function loadLogs() {
  if (!document.getElementById("logs-box")) return;

  try {
    const data = await apiRequest("/admin/api/logs?lines=160");
    const box = document.getElementById("logs-box");
    box.textContent = data.logs || "";
    box.scrollTop = box.scrollHeight;
  } catch (error) {
    document.getElementById("logs-box").textContent = error.message;
  }
}

function formatOperationPayload(data) {
  if (typeof data === "string") return data;
  return JSON.stringify(data || {}, null, 2);
}

function getFirstValue(source, keys) {
  if (!source) return undefined;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

function truthyFlag(value) {
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}

function statusPill(value, okText = "OK", badText = "Erro") {
  if (value && typeof value === "object") {
    value = getFirstValue(value, ["ok", "running", "healthy", "status"]);
  }
  if (value === undefined || value === null) return `<span class="status-pill warn">Indefinido</span>`;
  const ok = truthyFlag(value) || String(value).toLowerCase() === "ok" || String(value).toLowerCase() === "running";
  return `<span class="status-pill ${ok ? "ok" : "bad"}">${ok ? okText : badText}</span>`;
}

function formatStatusText(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function renderOperationsStatus() {
  const status = state.operations.status || {};
  const gateway = state.operations.gateway || {};
  const calendarResponse = state.operations.calendar || {};
  const calendar = calendarResponse.calendar || calendarResponse;
  const oracle = state.operations.oracle || {};

  const backendOk = status && (
    status.cpu !== undefined ||
    status.ram !== undefined ||
    status.ram_percent !== undefined ||
    status.disk !== undefined ||
    status.disk_percent !== undefined
  );

  const gatewayOk = gateway.status === "sucesso" || gateway.ok === true || gateway.http_status;

  const calendarOk = calendar.ok === true || calendar.valid === true;

  const oracleOk = oracle.ok === true || oracle.status === "sucesso";

  const cpu = status.cpu ?? "-";
  const ram = status.ram_percent ?? status.ram ?? "-";
  const disk = status.disk_percent ?? status.disk ?? "-";

  document.getElementById("op-status-backend").innerHTML = backendOk
    ? `<span class="status-pill ok">Online</span>`
    : `<span class="status-pill bad">Erro</span>`;

  document.getElementById("op-status-gateway").innerHTML = gatewayOk
    ? `<span class="status-pill ok">Online</span>`
    : `<span class="status-pill bad">Erro</span>`;

  document.getElementById("op-status-resources").textContent = `CPU ${cpu}% · RAM ${ram}% · Disco ${disk}%`;

  document.getElementById("op-status-calendar").innerHTML = calendarOk
    ? `<span class="status-pill ok">OK</span>`
    : `<span class="status-pill bad">Erro</span>`;

  document.getElementById("op-status-oracle").innerHTML = oracleOk
    ? `<span class="status-pill ok">Ativo</span>`
    : `<span class="status-pill bad">Erro</span>`;

  document.getElementById("op-calendar-message").textContent =
    calendar.message || calendar.error || calendarResponse.error || "Status do Calendar carregado.";

  document.getElementById("op-service-down-btn").disabled = false;
  document.getElementById("op-vps-shutdown-btn").disabled = false;
}

async function loadOperationsStatus() {
  if (!document.getElementById("op-status-backend")) return;

  const [statusResult, calendarResult, oracleResult, gatewayResult] = await Promise.allSettled([
    apiRequest("/admin/api/status"),
    apiRequest("/admin/api/operations/calendar/status"),
    apiRequest("/admin/api/operations/oracle-arm-loop/status"),
    apiRequest("/admin/api/operations/gateway/status")
  ]);

  state.operations.status = statusResult.status === "fulfilled" ? statusResult.value : {};
  state.operations.calendar = calendarResult.status === "fulfilled" ? calendarResult.value : { ok: false, message: calendarResult.reason.message };
  state.operations.oracle = oracleResult.status === "fulfilled" ? oracleResult.value : { ok: false, message: oracleResult.reason.message };
  state.operations.gateway = gatewayResult.status === "fulfilled" ? gatewayResult.value : { ok: false, message: gatewayResult.reason.message };
  renderOperationsStatus();
}
async function loadCalendarStatus() {
  try {
    state.operations.calendar = await apiRequest("/admin/api/operations/calendar/status");
    renderOperationsStatus();
    setOperationResult("Status do Google Calendar", state.operations.calendar);
  } catch (error) {
    setOperationResult("Erro ao consultar Google Calendar", { error: error.message });
  }
}

async function loadOracleStatus() {
  try {
    state.operations.oracle = await apiRequest("/admin/api/operations/oracle-arm-loop/status");
    renderOperationsStatus();
    setOperationResult("Status do Oracle ARM Loop", state.operations.oracle);
  } catch (error) {
    setOperationResult("Erro ao consultar Oracle ARM Loop", { error: error.message });
  }
}

async function loadOperationLog(kind) {
  const configs = {
    backend: ["/admin/api/logs?lines=160", "op-log-backend"],
    gateway: ["/admin/api/operations/gateway/logs?lines=100", "op-log-gateway"],
    nginx: ["/admin/api/operations/nginx/logs?lines=100", "op-log-nginx"],
    oracle: ["/admin/api/operations/oracle-arm-loop/logs?lines=100", "op-log-oracle"]
  };
  const config = configs[kind];
  if (!config) return;

  const [path, elementId] = config;
  const box = document.getElementById(elementId);
  if (!box) return;

  try {
    const data = await apiRequest(path);
    box.textContent = data.logs || data.output || data.stdout || formatOperationPayload(data);
    box.scrollTop = box.scrollHeight;
  } catch (error) {
    box.textContent = error.message;
  }
}

async function loadOperationLogs() {
  if (state.section !== "operations") return;
  await Promise.all([
    loadOperationLog("backend"),
    loadOperationLog("gateway"),
    loadOperationLog("nginx"),
    loadOperationLog("oracle")
  ]);
}

function setOperationResult(title, data) {
  const box = document.getElementById("operations-result");
  if (!box) return;
  box.textContent = `${title}\n\n${formatOperationPayload(data)}`;
  box.scrollTop = 0;
}

function clearOperationResult() {
  const box = document.getElementById("operations-result");
  if (box) box.textContent = "Nenhuma operação executada nesta sessão.";
}

function confirmOperation(title, options, onConfirm) {
  const strongText = options.strongText;

  if (!strongText) {
    openConfirmModal(title, `Deseja executar "${title}"?`, "Executar", onConfirm);
    return;
  }

  const fields = [
    { name: "confirmation", label: `Digite ${strongText} para confirmar`, value: "" }
  ];

  if (options.doubleConfirm) {
    fields.push({ name: "confirmation_again", label: `Digite ${strongText} novamente`, value: "" });
  }

  openFormModal(title, fields, async values => {
    if (values.confirmation !== strongText || (options.doubleConfirm && values.confirmation_again !== strongText)) {
      showModalMessage("Confirmação inválida", `Digite ${strongText} exatamente para executar esta operação.`);
      return;
    }

    await onConfirm();
  });
}

async function runOperation(title, path, requestOptions = { method: "POST" }, options = {}) {
  confirmOperation(title, options, async () => {
    try {
      const method = String(requestOptions.method || "POST").toUpperCase();
      const finalOptions = { ...requestOptions };

      if (!finalOptions.body && method !== "GET" && method !== "DELETE") {
        finalOptions.body = JSON.stringify({
          confirm: options.destructive ? options.strongText : true
        });
      }

      const data = await apiRequest(path, finalOptions);
      setOperationResult(title, data);
      await loadOperationsStatus();
    } catch (error) {
      setOperationResult(`${title} falhou`, { error: error.message });
    }
  });
}

function renderDashboard() {
  const s = state.stats;
  const calendarOk = s.calendar && s.calendar.ok;

  document.getElementById("m-cpu").textContent = s.cpu !== undefined ? `${s.cpu}%` : "-";
  document.getElementById("m-ram").textContent = s.ram_percent !== undefined ? `${s.ram_percent}%` : "-";
  document.getElementById("m-disk").textContent = s.disk_percent !== undefined ? `${s.disk_percent}%` : "-";
  document.getElementById("m-calendar").innerHTML = s.calendar
    ? `<span class="status-pill ${calendarOk ? "ok" : "bad"}">${calendarOk ? "OK" : "Erro"}</span>`
    : "-";
  document.getElementById("m-users").textContent = s.total_users ?? state.users.length;
  document.getElementById("m-reminders").textContent = s.total_reminders ?? state.reminders.length;
  document.getElementById("m-channels").textContent = s.total_channels ?? state.channels.length;
  document.getElementById("m-groups").textContent = s.total_channel_groups ?? state.groups.length;
}

function renderUsers() {
  const filter = document.getElementById("filter-users").value.trim().toLowerCase();
  const rows = state.users
    .filter(user => matchesFilter([user.id, user.phone, user.active ? "ativo" : "bloqueado"], filter))
    .map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${escapeHtml(user.phone)}</td>
        <td><span class="status-pill ${user.active ? "ok" : "bad"}">${user.active ? "Ativo" : "Bloqueado"}</span></td>
        <td>${formatDate(user.created_at)}</td>
        <td>
          <button onclick="toggleUser(${user.id})">${user.active ? "Bloquear" : "Desbloquear"}</button>
          <button class="danger" onclick="deleteUser(${user.id})">Excluir</button>
        </td>
      </tr>
    `)
    .join("");

  document.getElementById("users-body").innerHTML = rows || `<tr><td colspan="5">Nenhum Usuário encontrado.</td></tr>`;
}

function renderReminders() {
  const filter = document.getElementById("filter-reminders").value.trim().toLowerCase();

  const grouped = new Map();

  state.reminders.forEach(item => {
    const dateKey = item.remind_at || "";
    const typeKey = item.recurrence_type || "";
    const sentKey = item.sent ? "1" : "0";
    const key = [
      item.user_id,
      item.description,
      dateKey,
      typeKey,
      sentKey
    ].join("||");

    if (!grouped.has(key)) {
      grouped.set(key, {
        ids: [],
        user_id: item.user_id,
        description: item.description,
        remind_at: item.remind_at,
        recurrence_type: item.recurrence_type,
        sent: item.sent,
        channels: [],
        raw: []
      });
    }

    const group = grouped.get(key);
    group.ids.push(item.id);
    group.channels.push(item.display_tag || item.source_tag || item.channel_tag);
    group.raw.push(item);
  });

  const rows = Array.from(grouped.values())
    .filter(item => matchesFilter([
      item.ids.join(", "),
      item.user_id,
      item.description,
      item.channels.join(", "),
      item.recurrence_type,
      item.sent ? "enviado" : "pendente"
    ], filter))
    .map(item => {
      const idsText = item.ids.join(", ");
      const channelsText = Array.from(new Set(item.channels))
        .map(channel => `@${escapeHtml(channel)}`)
        .join(", ");

      const firstId = item.ids[0];

      return `
    <tr>
      <td>${idsText}</td>
      <td>${item.user_id}</td>
      <td>${escapeHtml(item.description)}</td>
      <td>${formatDate(item.remind_at)}</td>
      <td>${channelsText}</td>
      <td>${escapeHtml(item.recurrence_type || "único")}</td>
      <td><span class="status-pill ${item.sent ? "ok" : "warn"}">${item.sent ? "Sim" : "Não"}</span></td>
      <td>
        <button onclick="editReminder(${firstId})">Editar</button>
        <button class="danger" onclick="deleteReminder(${firstId})">Excluir</button>
      </td>
    </tr>
  `;
    })
    .join("");

  document.getElementById("reminders-body").innerHTML = rows || `<tr><td colspan="8">Nenhum lembrete encontrado.</td></tr>`;
}

function renderChannels() {
  const filter = document.getElementById("filter-channels").value.trim().toLowerCase();
  const rows = state.channels
    .filter(channel => matchesFilter([channel.id, channel.user_id, channel.tag, channel.type, channel.target, channel.enabled], filter))
    .map(channel => `
      <tr>
        <td>${channel.id}</td>
        <td>${channel.user_id}</td>
        <td>@${escapeHtml(channel.tag)}</td>
        <td>${escapeHtml(channel.type)}</td>
        <td>${escapeHtml(channel.target)}</td>
        <td><span class="status-pill ${channel.enabled ? "ok" : "bad"}">${channel.enabled ? "Sim" : "Não"}</span></td>
        <td>
          <button onclick="editChannel(${channel.id})">Editar</button>
          <button class="danger" onclick="deleteChannel(${channel.id})">Excluir</button>
        </td>
      </tr>
    `)
    .join("");

  document.getElementById("channels-body").innerHTML = rows || `<tr><td colspan="7">Nenhum canal encontrado.</td></tr>`;
}

function renderGroups() {
  const filter = document.getElementById("filter-groups").value.trim().toLowerCase();
  const rows = state.groups
    .filter(group => matchesFilter([group.id, group.user_id, group.tag, (group.targets || []).join(" ")], filter))
    .map(group => `
      <tr>
        <td>${group.id}</td>
        <td>${group.user_id}</td>
        <td>@${escapeHtml(group.tag)}</td>
        <td>${(group.targets || []).map(target => "@" + escapeHtml(target)).join(", ")}</td>
        <td>
          <button onclick="editGroup(${group.id})">Editar</button>
          <button class="danger" onclick="deleteGroup(${group.id})">Excluir</button>
        </td>
      </tr>
    `)
    .join("");

  document.getElementById("groups-body").innerHTML = rows || `<tr><td colspan="5">Nenhum grupo encontrado.</td></tr>`;
}

async function toggleUser(id) {
  openConfirmModal(
    "Alterar status do usuário",
    "Deseja alterar o status deste usuário?",
    "Alterar",
    async () => {
      await apiRequest(`/admin/api/usuarios/${id}/toggle-active`, { method: "PUT" });
      await loadAll();
    }
  );
}

async function deleteUser(id) {
  openConfirmModal(
    "Excluir usuário",
    "Deseja excluir este usuário e todos os dados relacionados?",
    "Excluir",
    async () => {
      await apiRequest(`/admin/api/usuarios/${id}`, { method: "DELETE" });
      await loadAll();
    }
  );
}

async function createReminder() {
  const defaultDate = new Date();
  defaultDate.setHours(defaultDate.getHours() + 1);
  defaultDate.setMinutes(0, 0, 0);

  openFormModal("Criar lembrete", [
    { name: "user_id", label: "ID do usuário", value: "" },
    { name: "description", label: "Texto", type: "textarea", value: "" },
    { name: "remind_at", label: "Data e hora", type: "datetime-local", value: toDatetimeLocalValue(defaultDate) },
    { name: "channel_tags", label: "Canais/tags separados por vírgula", value: "whatsapp" },
    {
      name: "recurrence_type",
      label: "Tipo",
      type: "select",
      value: "",
      options: [
        { value: "", label: "Único" },
        { value: "daily", label: "Diário" },
        { value: "business_days", label: "Dias úteis" },
        { value: "weekly", label: "Semanal" },
        { value: "monthly", label: "Mensal" },
        { value: "yearly", label: "Anual" },
        { value: "task", label: "Tarefa" },
        { value: "countdown", label: "Countdown" }
      ]
    },
    { name: "recurrence_value", label: "Valor da recorrência", value: "" }
  ], async values => {
    let recurrenceValue = values.recurrence_value.trim() || null;

    if (["", "daily", "business_days", "task", "countdown"].includes(values.recurrence_type)) {
      recurrenceValue = null;
    }

    if (values.recurrence_type === "weekly" && !/^[0-6]$/.test(values.recurrence_value.trim())) {
      showModalMessage("Valor inválido", "Para semanal, use 0=seg, 1=ter, 2=qua, 3=qui, 4=sex, 5=sab, 6=dom.");
      return;
    }

    if (values.recurrence_type === "monthly" && !/^([1-9]|[12][0-9]|3[01])$/.test(values.recurrence_value.trim())) {
      showModalMessage("Valor inválido", "Para mensal, informe o dia do mês. Ex: 5");
      return;
    }

    if (values.recurrence_type === "yearly" && !/^\d{2}\/\d{2}$/.test(values.recurrence_value.trim())) {
      showModalMessage("Valor inválido", "Para anual, use DD/MM. Ex: 12/10");
      return;
    }

    const remindAt = values.recurrence_type === "task"
      ? `${new Date().getFullYear() + 20}-01-01T00:00`
      : values.remind_at;

    await apiRequest("/admin/api/lembretes", {
      method: "POST",
      body: JSON.stringify({
        user_id: Number(values.user_id),
        description: values.description.trim(),
        remind_at: remindAt,
        channel_tags: splitTags(values.channel_tags || "whatsapp"),
        recurrence_type: values.recurrence_type || null,
        recurrence_value: recurrenceValue
      })
    });

    await loadAll();
  });

  const recurrenceTypeInput = document.getElementById("modal-field-recurrence_type");
  const remindAtInput = document.getElementById("modal-field-remind_at");
  const remindAtWrapper = remindAtInput.closest(".field");
  const recurrenceValueInput = document.getElementById("modal-field-recurrence_value");
  const recurrenceValueWrapper = recurrenceValueInput.closest(".field");
  const recurrenceValueLabel = recurrenceValueWrapper.querySelector("label");

  function updateRecurrenceValueField() {
    const type = recurrenceTypeInput.value;

    if (type === "task") {
      remindAtWrapper.style.display = "none";
    } else {
      remindAtWrapper.style.display = "grid";
    }

    if (["", "daily", "business_days", "task", "countdown"].includes(type)) {
      recurrenceValueWrapper.style.display = "none";
      recurrenceValueInput.value = "";
      return;
    }

    recurrenceValueWrapper.style.display = "grid";

    if (type === "weekly") {
      recurrenceValueLabel.textContent = "Dia da semana: 0=seg, 1=ter, 2=qua, 3=qui, 4=sex, 5=sab, 6=dom";
      recurrenceValueInput.placeholder = "0";
    } else if (type === "monthly") {
      recurrenceValueLabel.textContent = "Dia do mês";
      recurrenceValueInput.placeholder = "5";
    } else if (type === "yearly") {
      recurrenceValueLabel.textContent = "Dia/mês";
      recurrenceValueInput.placeholder = "12/10";
    }
  }

  recurrenceTypeInput.addEventListener("change", updateRecurrenceValueField);
  updateRecurrenceValueField();
}

async function editReminder(id) {
  const item = state.reminders.find(reminder => reminder.id === id);
  if (!item) return;

  openFormModal("Editar lembrete", [
    { name: "description", label: "Texto", type: "textarea", value: item.description },
    { name: "channel_tag", label: "Canal real", value: item.channel_tag || "whatsapp" }
  ], async values => {
    await apiRequest(`/admin/api/lembretes/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        description: values.description.trim(),
        channel_tag: normalizeTag(values.channel_tag)
      })
    });

    await loadAll();
  });
}

async function deleteReminder(id) {
  openConfirmModal(
    "Excluir lembrete",
    "Deseja excluir este lembrete?",
    "Excluir",
    async () => {
      await apiRequest(`/admin/api/lembretes/${id}`, { method: "DELETE" });
      await loadAll();
    }
  );
}

async function createChannel() {
  openFormModal("Criar canal", [
    { name: "user_id", label: "ID do Usuário", value: "" },
    { name: "tag", label: "Tag do canal", value: "" },
    {
      name: "type",
      label: "Tipo",
      type: "select",
      value: "email",
      options: [
        { value: "email", label: "Email" },
        { value: "whatsapp", label: "WhatsApp" }
      ]
    },
    { name: "target", label: "Destino", value: "" }
  ], async values => {
    await apiRequest("/admin/api/canais", {
      method: "POST",
      body: JSON.stringify({
        user_id: Number(values.user_id),
        tag: normalizeTag(values.tag),
        type: values.type.trim().toLowerCase(),
        target: values.target.trim()
      })
    });

    await loadAll();
  });
}

async function editChannel(id) {
  const channel = state.channels.find(item => item.id === id);
  if (!channel) return;

  openFormModal("Editar canal", [
    { name: "tag", label: "Tag do canal", value: channel.tag },
    {
      name: "type",
      label: "Tipo",
      type: "select",
      value: channel.type,
      options: [
        { value: "email", label: "Email" },
        { value: "whatsapp", label: "WhatsApp" }
      ]
    },
    { name: "target", label: "Destino", value: channel.target },
    {
      name: "enabled",
      label: "Ativo",
      type: "select",
      value: channel.enabled ? "sim" : "nao",
      options: [
        { value: "sim", label: "Sim" },
        { value: "nao", label: "Não" }
      ]
    }
  ], async values => {
    await apiRequest(`/admin/api/canais/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        tag: normalizeTag(values.tag),
        type: values.type.trim().toLowerCase(),
        target: values.target.trim(),
        enabled: values.enabled === "sim"
      })
    });

    await loadAll();
  });
}

async function deleteChannel(id) {
  openConfirmModal(
    "Excluir canal",
    "Deseja excluir este canal?",
    "Excluir",
    async () => {
      await apiRequest(`/admin/api/canais/${id}`, { method: "DELETE" });
      await loadAll();
    }
  );
}

async function createGroup() {
  openFormModal("Criar grupo", [
    { name: "user_id", label: "ID do Usuário", value: "" },
    { name: "tag", label: "Tag do grupo", value: "" },
    { name: "targets", label: "Canais separados por vírgula", value: "whatsapp, email" }
  ], async values => {
    const targets = values.targets.split(",").map(normalizeTag).filter(Boolean);

    await apiRequest("/admin/api/grupos", {
      method: "POST",
      body: JSON.stringify({
        user_id: Number(values.user_id),
        tag: normalizeTag(values.tag),
        targets
      })
    });

    await loadAll();
  });
}

async function editGroup(id) {
  const group = state.groups.find(item => item.id === id);
  if (!group) return;

  openFormModal("Editar grupo", [
    { name: "tag", label: "Tag do grupo", value: group.tag },
    { name: "targets", label: "Canais separados por vírgula", value: (group.targets || []).join(", ") }
  ], async values => {
    const targets = values.targets.split(",").map(normalizeTag).filter(Boolean);

    await apiRequest(`/admin/api/grupos/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        tag: normalizeTag(values.tag),
        targets
      })
    });

    await loadAll();
  });
}

async function deleteGroup(id) {
  openConfirmModal(
    "Excluir grupo",
    "Deseja excluir este grupo?",
    "Excluir",
    async () => {
      await apiRequest(`/admin/api/grupos/${id}`, { method: "DELETE" });
      await loadAll();
    }
  );
}

async function clearData(scope) {
  const labels = {
    sent_reminders: "excluir lembretes enviados",
    all_reminders: "excluir todos os lembretes",
    all_data: "excluir lembretes, canais e grupos"
  };

  openFormModal("Confirmar limpeza", [
    {
      name: "confirmation",
      label: `Digite CONFIRMAR para ${labels[scope]}`,
      value: ""
    }
  ], async values => {
    if (values.confirmation !== "CONFIRMAR") {
      showModalMessage("Confirmação inválida", "Digite CONFIRMAR para executar esta ação.");
      return;
    }

    await apiRequest("/admin/api/clear", {
      method: "POST",
      body: JSON.stringify({ scope })
    });

    await loadAll();
  });
}
function switchSection(section) {
  state.section = section;

  document.querySelectorAll("[id^='section-']").forEach(element => {
    element.classList.add("hidden");
  });

  document.getElementById(`section-${section}`).classList.remove("hidden");

  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.section === section);
  });

  const [title, subtitle] = sectionMeta[section] || sectionMeta.dashboard;
  document.getElementById("section-title").textContent = title;
  document.getElementById("section-subtitle").textContent = subtitle;

  if (section === "operations") {
    loadOperationsStatus();
    loadOperationLogs();
  }
}

document.querySelectorAll(".nav-button").forEach(button => {
  button.addEventListener("click", () => switchSection(button.dataset.section));
});

document.getElementById("login-form").addEventListener("submit", async event => {
  event.preventDefault();

  const message = document.getElementById("login-message");
  message.textContent = "";

  try {
    await login(
      document.getElementById("username").value.trim(),
      document.getElementById("password").value
    );

    await loadAll();
  } catch (error) {
    message.textContent = error.message || "Falha no login.";
  }
});

loadAll().catch(() => {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
});

setInterval(loadStatusOnly, 3000);
setInterval(() => {
  if (state.section === "operations") loadOperationsStatus();
}, 10000);

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.tagName === "INPUT") {
    const form = e.target.closest("form");
    if (form) {
      const inputs = Array.from(form.querySelectorAll("input:not([type='hidden']), select, textarea"));
      const index = inputs.indexOf(e.target);
      if (index > -1 && index < inputs.length - 1) {
        e.preventDefault();
        inputs[index + 1].focus();
      }
    } else {
      e.target.blur();
    }
  }
});
