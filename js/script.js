const loginSection = document.getElementById("login-section");
const managerSection = document.getElementById("manager-section");
const masterKeyInput = document.getElementById("master-key-input");
const loginBtn = document.getElementById("login-btn");
const loginMessage = document.getElementById("login-message");
const passwordsList = document.getElementById("passwords-list");
const addFormContainer = document.getElementById("add-form-container");
const addPasswordBtn = document.getElementById("add-new-password-btn");
const closeAddFormBtn = document.getElementById("close-add-form-btn");
const serviceInput = document.getElementById("service-input");
const usernameInput = document.getElementById("username-input");
const passwordInput = document.getElementById("password-input");
const tagInput = document.getElementById("tag-input");
const saveBtn = document.getElementById("save-btn");
const searchInput = document.getElementById("search-input");
const importFile = document.getElementById("import-file");
const importMessage = document.getElementById("import-message");
const exportBtn = document.getElementById("export-btn");
const selectAllCheckbox = document.getElementById("select-all-checkbox");
const modalOverlay = document.getElementById("modal");
const modalMessage = document.getElementById("modal-message");
const modalCloseBtn = document.getElementById("modal-close-btn");
const togglePasswordFormBtn = document.getElementById("toggle-password-form");

const DB_NAME = "PasswordManagerDB";
const DB_VERSION = 1;
const STORE_NAME = "passwords";
const salt = "password-manager-salt";
let masterKey = "";
let db = null;

function showMessage(element, text, isError = false) {
  element.textContent = text;
  element.style.color = isError ? "#ef4444" : "#22c55e";
}

function showModal(message) {
  modalMessage.textContent = message;
  modalOverlay.classList.remove("hidden");
}

function encrypt(text, key) {
  return CryptoJS.AES.encrypt(text, key).toString();
}

function decrypt(ciphertext, key) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

function initDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Error al abrir la base de datos", event.target.error);
      reject(event.target.error);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        objectStore.createIndex("service", "service", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
  });
}

async function loadPasswords() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject("Database not initialized");
      return;
    }

    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = (event) => {
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      try {
        const encryptedData = event.target.result;
        const decryptedPasswords = encryptedData.map((p) => {
          return {
            id: p.id,
            service: decrypt(p.service, masterKey),
            username: decrypt(p.username, masterKey),
            password: p.password, // Mantener encriptada
            tag: decrypt(p.tag, masterKey),
          };
        });
        resolve(decryptedPasswords);
      } catch (e) {
        reject(e);
      }
    };
  });
}

async function savePasswordToDb(passwordObj) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const encryptedObj = {
      service: encrypt(passwordObj.service, masterKey),
      username: encrypt(passwordObj.username, masterKey),
      password: encrypt(passwordObj.password, masterKey),
      tag: encrypt(passwordObj.tag, masterKey),
    };

    const request = store.put(encryptedObj);

    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deletePasswordFromDb(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = () => resolve();
  });
}

let passwords = [];

async function renderPasswords(filter = "") {
  passwordsList.innerHTML = "";

  if (!db) {
    await initDb();
  }

  try {
    passwords = await loadPasswords();
  } catch (e) {
    showModal("Error al cargar las contraseñas. Clave incorrecta.");
    return;
  }

  const filteredPasswords = passwords.filter(
    (p) =>
      p.service.toLowerCase().includes(filter.toLowerCase()) ||
      p.username.toLowerCase().includes(filter.toLowerCase()) ||
      p.tag.toLowerCase().includes(filter.toLowerCase())
  );

  if (filteredPasswords.length === 0 && filter === "") {
    passwordsList.innerHTML =
      '<p class="description">Aún no tienes contraseñas guardadas.</p>';
    return;
  } else if (filteredPasswords.length === 0) {
    passwordsList.innerHTML =
      '<p class="description">No se encontraron contraseñas que coincidan con la búsqueda.</p>';
    return;
  }

  filteredPasswords.forEach((p) => {
    const item = document.createElement("div");
    item.classList.add("password-item");
    item.dataset.id = p.id;
    item.innerHTML = `
            <div class="password-content">
                <div class="password-title">
                    <input type="checkbox" class="password-checkbox" data-id="${p.id}">
                    ${p.service}
                    <span class="tag tag-blue">${p.tag}</span>
                </div>
                <p>Usuario: ${p.username}</p>
                <p>Contraseña: <span class="password-text" data-password="${p.password}">•••••••••</span></p>
            </div>
            <div class="actions">
                <button class="action-btn copy-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-sm">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v2.25A2.25 2.25 0 0113.5 22.5h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25m-1.5-6H5.25A2.25 2.25 0 003 12v4.5m-1.5 0v-2.25A2.25 2.25 0 015.25 9h5.25m-1.5 6H5.25m-3-1.5h18A2.25 2.25 0 0122.5 13.5v-2.25m-1.5 0H12.75m-6 0h-1.5m1.5 0h1.5m-3 0h3m-1.5 0h1.5m-1.5 0h1.5" />
                    </svg>
                </button>
                <button class="action-btn toggle-password-display-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-sm">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.575 3.01 9.963 7.823a1.012 1.012 0 010 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.575-3.01-9.963-7.823z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
                <button class="action-btn delete-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-sm">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9.229L14.5 17.75l-.24.5a2.25 2.25 0 01-2.25 2.25H11.5a2.25 2.25 0 01-2.25-2.25l-.24-.5-1.5-8.521m9-5a2.25 2.25 0 00-2.25-2.25H8.25A2.25 2.25 0 006 4.5v1.5a2.25 2.25 0 012.25 2.25h8.5a2.25 2.25 0 012.25-2.25V4.5a2.25 2.25 0 00-2.25-2.25h-5.25a2.25 2.25 0 00-2.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25H3.75a2.25 2.25 0 00-2.25 2.25v.75" />
                    </svg>
                </button>
            </div>
        `;
    passwordsList.appendChild(item);
  });
  updateExportButtonState();
}

function updateExportButtonState() {
  const anyChecked =
    document.querySelectorAll(".password-checkbox:checked").length > 0;
  exportBtn.disabled = !anyChecked;
}

loginBtn.addEventListener("click", async () => {
  const enteredKey = masterKeyInput.value.trim();
  if (!enteredKey) {
    showMessage(loginMessage, "La clave maestra no puede estar vacía.", true);
    return;
  }

  masterKey = CryptoJS.PBKDF2(enteredKey, salt, {
    keySize: 256 / 32,
    iterations: 1000,
  }).toString();

  try {
    await initDb();
    await loadPasswords();
    loginSection.classList.add("hidden");
    managerSection.classList.remove("hidden");
    renderPasswords();
  } catch (e) {
    showMessage(
      loginMessage,
      "Clave maestra incorrecta o error de base de datos.",
      true
    );
  }
});

addPasswordBtn.addEventListener("click", () => {
  addFormContainer.classList.remove("hidden");
  addPasswordBtn.classList.add("hidden");
});

closeAddFormBtn.addEventListener("click", () => {
  addFormContainer.classList.add("hidden");
  addPasswordBtn.classList.remove("hidden");
  serviceInput.value = "";
  usernameInput.value = "";
  passwordInput.value = "";
  tagInput.value = "";
});

saveBtn.addEventListener("click", async () => {
  const service = serviceInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const tag = tagInput.value.trim() || "personal";

  if (!service || !username || !password) {
    showModal("Por favor, rellena todos los campos.");
    return;
  }

  const passwordObj = { service, username, password, tag };
  await savePasswordToDb(passwordObj);

  renderPasswords(searchInput.value);

  serviceInput.value = "";
  usernameInput.value = "";
  passwordInput.value = "";
  tagInput.value = "";
  addFormContainer.classList.add("hidden");
  addPasswordBtn.classList.remove("hidden");
});

passwordsList.addEventListener("click", async (e) => {
  const item = e.target.closest(".password-item");
  if (!item) return;

  const id = parseInt(item.dataset.id);

  if (e.target.closest(".delete-btn")) {
    await deletePasswordFromDb(id);
    renderPasswords(searchInput.value);
  } else if (e.target.closest(".copy-btn")) {
    const encryptedPassword = passwords.find((p) => p.id === id).password;
    const decryptedPassword = decrypt(encryptedPassword, masterKey);
    const el = document.createElement("textarea");
    el.value = decryptedPassword;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showModal("¡Contraseña copiada al portapapeles!");
  } else if (e.target.closest(".toggle-password-display-btn")) {
    const passwordSpan = item.querySelector(".password-text");
    const isVisible = passwordSpan.dataset.visible === "true";
    if (isVisible) {
      passwordSpan.textContent = "•••••••••";
      passwordSpan.dataset.visible = "false";
    } else {
      const encryptedPassword = passwordSpan.dataset.password;
      const decryptedPassword = decrypt(encryptedPassword, masterKey);
      passwordSpan.textContent = decryptedPassword;
      passwordSpan.dataset.visible = "true";
    }
  }
});

passwordsList.addEventListener("change", (e) => {
  if (e.target.classList.contains("password-checkbox")) {
    const item = e.target.closest(".password-item");
    if (e.target.checked) {
      item.classList.add("selected");
    } else {
      item.classList.remove("selected");
    }
    updateExportButtonState();
    const allCheckboxes = document.querySelectorAll(".password-checkbox");
    const allSelected =
      allCheckboxes.length > 0 &&
      Array.from(allCheckboxes).every((cb) => cb.checked);
    selectAllCheckbox.checked = allSelected;
  }
});

selectAllCheckbox.addEventListener("change", (e) => {
  const isChecked = e.target.checked;
  document.querySelectorAll(".password-checkbox").forEach((checkbox) => {
    checkbox.checked = isChecked;
    const item = checkbox.closest(".password-item");
    if (isChecked) {
      item.classList.add("selected");
    } else {
      item.classList.remove("selected");
    }
  });
  updateExportButtonState();
});

searchInput.addEventListener("input", (e) => {
  renderPasswords(e.target.value);
});

togglePasswordFormBtn.addEventListener("click", () => {
  const currentType = passwordInput.type;
  passwordInput.type = currentType === "password" ? "text" : "password";
});

importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (event) {
    try {
      const encryptedData = event.target.result;
      const decryptedData = decrypt(encryptedData, masterKey);
      const importedPasswords = JSON.parse(decryptedData);
      if (Array.isArray(importedPasswords)) {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        store.clear();

        for (const p of importedPasswords) {
          await savePasswordToDb(p);
        }

        renderPasswords(searchInput.value);
        showMessage(importMessage, "Archivo importado con éxito!");
      } else {
        showMessage(importMessage, "Formato de archivo incorrecto.", true);
      }
    } catch (error) {
      showMessage(
        importMessage,
        "Error al procesar el archivo o clave incorrecta.",
        true
      );
    }
  };
  reader.readAsText(file);
});

exportBtn.addEventListener("click", async () => {
  const selectedPasswords = Array.from(
    document.querySelectorAll(".password-checkbox:checked")
  ).map((cb) => {
    const id = parseInt(cb.dataset.id);
    return passwords.find((p) => p.id === id);
  });

  const dataStr = JSON.stringify(selectedPasswords);
  const encryptedData = encrypt(dataStr, masterKey);
  const blob = new Blob([encryptedData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "passwords.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

modalCloseBtn.addEventListener("click", () => {
  modalOverlay.classList.add("hidden");
});

document.addEventListener("DOMContentLoaded", () => {
  const cryptoScript = document.createElement("script");
  cryptoScript.src =
    "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js";
  document.head.appendChild(cryptoScript);
});
