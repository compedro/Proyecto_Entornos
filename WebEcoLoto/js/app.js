"use strict";

const KEYS = {
  users: "ecoloto_users",
  currentUserDni: "ecoloto_current_user_dni",
  settings: "ecoloto_settings"
};

const DEFAULT_SETTINGS = {
  theme: "green",
  fontSize: "16",
  language: "es"
};

const DNI_REGEX = /^\d{8}[a-zA-Z]$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d][\d\s-]{7,}$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function getUsers() {
  return JSON.parse(localStorage.getItem(KEYS.users) || "[]");
}

function setUsers(users) {
  localStorage.setItem(KEYS.users, JSON.stringify(users));
}

function getCurrentUser() {
  const dni = localStorage.getItem(KEYS.currentUserDni);
  if (!dni) return null;
  return getUsers().find((u) => u.dni === dni) || null;
}

function setCurrentUserDni(dni) {
  localStorage.setItem(KEYS.currentUserDni, dni);
}

function updateCurrentUser(updatedUser) {
  const users = getUsers().map((user) => (user.dni === updatedUser.dni ? updatedUser : user));
  setUsers(users);
}

function makeParticipation() {
  const num = Math.floor(10000 + Math.random() * 90000);
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${num}-${letter}`;
}

function addNotification(user, text) {
  user.notifications = user.notifications || [];
  user.notifications.unshift({
    text,
    date: new Date().toLocaleString("es-ES")
  });
}

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(KEYS.settings) || "{}")) };
}

function applySettings() {
  const settings = getSettings();
  document.body.classList.remove("theme-blue", "theme-orange");
  if (settings.theme === "blue") document.body.classList.add("theme-blue");
  if (settings.theme === "orange") document.body.classList.add("theme-orange");
  document.documentElement.style.fontSize = `${settings.fontSize}px`;
  document.documentElement.lang = settings.language || "es";
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function getFieldMessageEl(field) {
  const id = `${field.id || field.name}-error`;
  let msg = document.getElementById(id);
  if (!msg) {
    msg = document.createElement("small");
    msg.id = id;
    msg.className = "field-error";
    field.insertAdjacentElement("afterend", msg);
  }
  return msg;
}

function markFieldError(field, message) {
  const msg = getFieldMessageEl(field);
  field.classList.add("input-error");
  msg.textContent = message;
}

function clearFieldError(field) {
  const msg = getFieldMessageEl(field);
  field.classList.remove("input-error");
  msg.textContent = "";
}

function validateDni(value) {
  return DNI_REGEX.test((value || "").trim());
}

function validateContact(value) {
  const text = (value || "").trim();
  if (!text) return { ok: false, message: "Este campo es obligatorio." };

  const hasLetters = /[a-zA-Z]/.test(text);
  if (hasLetters || text.includes("@") || text.includes(".")) {
    if (text.includes("gmail.com") && !text.includes("@")) {
      return { ok: false, message: "Formato incorrecto: en el correo falta el simbolo @." };
    }
    if (!EMAIL_REGEX.test(text)) {
      return { ok: false, message: "Formato incorrecto: escribe un correo valido." };
    }
    return { ok: true, message: "" };
  }

  if (!PHONE_REGEX.test(text)) {
    return { ok: false, message: "Formato incorrecto: escribe un telefono valido." };
  }
  return { ok: true, message: "" };
}

function validatePassword(value) {
  const text = (value || "").trim();
  if (!text) return { ok: false, message: "Este campo es obligatorio." };
  if (!STRONG_PASSWORD_REGEX.test(text)) {
    return {
      ok: false,
      message:
        "Contrasena no valida: minimo 8 caracteres, 1 mayuscula, 1 minuscula, 1 numero y 1 simbolo."
    };
  }
  return { ok: true, message: "" };
}

function validateField(field, formType) {
  if (field.disabled || field.readOnly) return true;
  const value = (field.value || "").trim();
  const isRequired = field.hasAttribute("required");

  if (isRequired && !value) {
    markFieldError(field, "Este campo es obligatorio.");
    return false;
  }

  if (!value) {
    clearFieldError(field);
    return true;
  }

  if (field.name === "dni") {
    if (!validateDni(value)) {
      markFieldError(field, "Formato incorrecto: DNI valido (8 numeros y 1 letra).");
      return false;
    }
  }

  if (field.name === "contact" || field.name === "channel") {
    const result = validateContact(value);
    if (!result.ok) {
      markFieldError(field, result.message);
      return false;
    }
  }

  if (field.name === "password" && formType === "register") {
    const result = validatePassword(value);
    if (!result.ok) {
      markFieldError(field, result.message);
      return false;
    }
  }

  if (field.name === "confirmPassword") {
    const pass = field.form?.elements?.password?.value || "";
    if (value !== pass) {
      markFieldError(field, "La contrasena no coincide.");
      return false;
    }
  }

  if (formType === "login" && field.name === "password" && value.length < 1) {
    markFieldError(field, "Este campo es obligatorio.");
    return false;
  }

  clearFieldError(field);
  return true;
}

function attachValidation(form, formType) {
  if (!form) return;
  form.noValidate = true;

  const fields = Array.from(form.querySelectorAll("input, select, textarea")).filter(
    (f) => !f.readOnly && f.type !== "hidden"
  );

  fields.forEach((field) => {
    if (!field.hasAttribute("required")) field.setAttribute("required", "required");
    getFieldMessageEl(field);

    field.addEventListener("blur", () => {
      validateField(field, formType);
    });

    field.addEventListener("input", () => {
      validateField(field, formType);
    });
  });
}

function validateForm(form, formType) {
  const fields = Array.from(form.querySelectorAll("input, select, textarea")).filter(
    (f) => !f.readOnly && f.type !== "hidden"
  );
  let valid = true;
  fields.forEach((field) => {
    const ok = validateField(field, formType);
    if (!ok) valid = false;
  });
  return valid;
}

function securePages() {
  const secure = document.body.dataset.secure === "true";
  if (!secure) return;
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  setText("topParticipation", user.participation);
  setText("topUser", user.username);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(KEYS.currentUserDni);
      window.location.href = "login.html";
    });
  }
}

function bindRegister() {
  const form = document.getElementById("registroForm");
  if (!form) return;
  attachValidation(form, "register");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const errorEl = document.getElementById("registroError");
    if (errorEl) errorEl.textContent = "";

    if (!validateForm(form, "register")) return;

    const data = Object.fromEntries(new FormData(form).entries());

    const users = getUsers();
    const dniExists = users.some((u) => u.dni === data.dni);
    const usernameExists = users.some((u) => u.username.toLowerCase() === data.username.toLowerCase());
    if (dniExists || usernameExists) {
      if (errorEl) errorEl.textContent = "Ya existe un usuario con ese DNI o nombre de usuario.";
      return;
    }

    const user = {
      dni: data.dni.trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      username: data.username.trim(),
      password: data.password,
      contact: data.contact.trim(),
      locality: data.locality.trim(),
      postalCode: data.postalCode.trim(),
      address: {
        roadType: data.roadType,
        roadName: data.roadName.trim(),
        number: data.number.trim(),
        floor: data.floor.trim()
      },
      participation: makeParticipation(),
      notifications: []
    };

    addNotification(user, "Cuenta creada correctamente. Tu numero de participacion ya esta activo.");
    users.push(user);
    setUsers(users);
    setCurrentUserDni(user.dni);
    window.location.href = "panel.html";
  });
}

function bindLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;
  attachValidation(form, "login");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const errorEl = document.getElementById("loginError");
    if (errorEl) errorEl.textContent = "";

    if (!validateForm(form, "login")) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const user = getUsers().find((u) => u.dni === data.dni && u.password === data.password);
    if (!user) {
      if (errorEl) errorEl.textContent = "DNI o contrasena incorrectos.";
      return;
    }

    setCurrentUserDni(user.dni);
    window.location.href = "panel.html";
  });
}

function bindRecover() {
  const form = document.getElementById("recoverForm");
  if (!form) return;
  attachValidation(form, "recover");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateForm(form, "recover")) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const message = document.getElementById("recoverMessage");
    if (message) {
      message.textContent = `Se ha enviado un enlace de recuperacion a: ${data.channel}`;
    }
    form.reset();
  });
}

function loadPanel() {
  const user = getCurrentUser();
  if (!user) return;

  setText("helloUser", user.username);
  setText("panelParticipation", user.participation);

  const weeklyInfo = document.getElementById("weeklyWinner");
  if (weeklyInfo) {
    weeklyInfo.textContent =
      "Ganador semanal: 23/04/2026 - Calle Real 18, Coslada. Bolsa seleccionada a nivel nacional: 47.";
  }
}

function loadProfile() {
  const form = document.getElementById("perfilForm");
  const user = getCurrentUser();
  if (!form || !user) return;
  attachValidation(form, "profile");

  form.elements.dni.value = user.dni;
  form.elements.firstName.value = user.firstName;
  form.elements.lastName.value = user.lastName;
  form.elements.username.value = user.username;
  form.elements.contact.value = user.contact;
  form.elements.locality.value = user.locality;
  form.elements.postalCode.value = user.postalCode;
  form.elements.roadType.value = user.address.roadType;
  form.elements.roadName.value = user.address.roadName;
  form.elements.number.value = user.address.number;
  form.elements.floor.value = user.address.floor;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateForm(form, "profile")) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const updated = {
      ...user,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      username: data.username.trim(),
      contact: data.contact.trim(),
      locality: data.locality.trim(),
      postalCode: data.postalCode.trim(),
      address: {
        roadType: data.roadType,
        roadName: data.roadName.trim(),
        number: data.number.trim(),
        floor: data.floor.trim()
      }
    };
    addNotification(updated, "Perfil actualizado.");
    updateCurrentUser(updated);
    setText("perfilOk", "Datos guardados correctamente.");
  });
}

function loadSettings() {
  const form = document.getElementById("settingsForm");
  if (!form) return;
  attachValidation(form, "settings");

  const settings = getSettings();
  form.elements.theme.value = settings.theme;
  form.elements.fontSize.value = settings.fontSize;
  form.elements.language.value = settings.language;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateForm(form, "settings")) return;
    const data = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem(KEYS.settings, JSON.stringify(data));
    applySettings();
    setText("settingsOk", "Configuracion guardada.");
  });
}

function loadNotifications() {
  const wrap = document.getElementById("userNotifications");
  const user = getCurrentUser();
  if (!wrap || !user) return;
  wrap.innerHTML = "";

  const fixed = document.createElement("div");
  fixed.className = "notice";
  fixed.innerHTML =
    "<strong>Actualizacion semanal:</strong> El jueves se cruza el numero de bolsa con los 2 ultimos digitos del premio ONCE.";
  wrap.appendChild(fixed);

  (user.notifications || []).forEach((n) => {
    const item = document.createElement("div");
    item.className = "notice";
    item.innerHTML = `<strong>${n.date}</strong><br>${n.text}`;
    wrap.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applySettings();
  securePages();
  bindRegister();
  bindLogin();
  bindRecover();
  loadPanel();
  loadProfile();
  loadSettings();
  loadNotifications();
});
