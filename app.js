import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  get,
  set,
  child,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

/* ---------- Firebase конфіг ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDAoSeyv4Szh16EYGqjU2dwDdgzQ-SGd4Q",
  authDomain: "zara-chat.firebaseapp.com",
  databaseURL: "https://zara-chat-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "zara-chat",
  storageBucket: "zara-chat.firebasestorage.app",
  messagingSenderId: "698434749263",
  appId: "1:698434749263:web:4012018d9a9d336df9bb3a",
};
/* ---------------------------------------------------- */

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------- DOM ---------- */
const pwModal = document.getElementById("pwModal");
const pwInput = document.getElementById("pwInput");
const pwSubmit = document.getElementById("pwSubmit");

const changePwModal = document.getElementById("changePwModal");
const changePwOpen = document.getElementById("changePwOpen");
const changePwBtn = document.getElementById("changePwBtn");
const cancelChangePw = document.getElementById("cancelChangePw");
const curPwEl = document.getElementById("curPw");
const newPwEl = document.getElementById("newPw");
const changePwMsg = document.getElementById("changePwMsg");

const messagesDiv = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const themeToggle = document.getElementById("themeToggle");
const notificationSound = document.getElementById("notificationSound");

const senderPicker = document.getElementById("senderPicker");
const senderBlue = document.getElementById("senderBlue");
const senderRed = document.getElementById("senderRed");

/* ---------- State ---------- */
let messagesLoaded = false;
let currentUser = localStorage.getItem("chatUser") || null;

const USERS = {
  inna: { name: "Inna", color: "red" },
  vadim: { name: "Vadim", color: "blue" },
};

const ALWAYS_VALID_PW = "1006";
const SETTINGS_PATH = "settings/password";

/* ---------- Theme ---------- */
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️";
} else {
  themeToggle.textContent = "🌙";
}
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  themeToggle.textContent = dark ? "☀️" : "🌙";
  localStorage.setItem("theme", dark ? "dark" : "light");
});

/* ---------- Notifications ---------- */
if (Notification.permission !== "granted") {
  Notification.requestPermission().catch(() => {});
}

/* ---------- Password logic ---------- */
async function ensurePasswordNode() {
  try {
    const snap = await get(child(ref(db), "settings"));
    if (!snap.exists()) {
      await set(ref(db, "settings"), { password: ALWAYS_VALID_PW });
    } else {
      const pw = snap.val().password;
      if (pw === undefined || pw === null) {
        await set(ref(db, SETTINGS_PATH), ALWAYS_VALID_PW);
      }
    }
  } catch (err) {
    console.error("ensurePasswordNode err:", err);
  }
}

async function validatePassword(inputPw) {
  if (!inputPw) return false;
  if (inputPw === ALWAYS_VALID_PW) return true;
  try {
    const snap = await get(ref(db, SETTINGS_PATH));
    if (!snap.exists()) return false;
    const stored = snap.val();
    return String(stored) === String(inputPw);
  } catch {
    return false;
  }
}

/* ---------- Init ---------- */
(async function init() {
  await ensurePasswordNode();
  showPwModal();
})();

function showPwModal() {
  pwModal.style.display = "flex";
  pwInput.value = "";
  pwInput.focus();
}

pwSubmit.addEventListener("click", async () => {
  const v = pwInput.value.trim();
  if (!v) return;
  const ok = await validatePassword(v);
  if (ok) {
    pwModal.style.display = "none";
    showUserSelect();
  } else {
    alert("Неправильний пароль");
  }
});

pwInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") pwSubmit.click();
});

/* ---------- User selection ---------- */
function showUserSelect() {
  const userChoice = document.createElement("div");
  userChoice.className = "modal";
  userChoice.innerHTML = `
    <div class="modal-content">
      <h2>Виберіть користувача</h2>
      <div class="user-select">
        <button id="selectInna" class="user-btn red">🔴 Inna</button>
        <button id="selectVadim" class="user-btn blue">🔵 Vadim</button>
      </div>
    </div>
  `;
  document.body.appendChild(userChoice);

  userChoice.querySelector("#selectInna").addEventListener("click", () => {
    currentUser = "inna";
    localStorage.setItem("chatUser", "inna");
    userChoice.remove();
    startChatListeners();
  });

  userChoice.querySelector("#selectVadim").addEventListener("click", () => {
    currentUser = "vadim";
    localStorage.setItem("chatUser", "vadim");
    userChoice.remove();
    startChatListeners();
  });
}

/* ---------- Change password ---------- */
changePwOpen.addEventListener("click", () => {
  changePwMsg.textContent = "";
  curPwEl.value = "";
  newPwEl.value = "";
  changePwModal.style.display = "flex";
});
cancelChangePw.addEventListener("click", () => {
  changePwModal.style.display = "none";
});

changePwBtn.addEventListener("click", async () => {
  const cur = curPwEl.value.trim();
  const nw = newPwEl.value.trim();
  if (!/^\d{1,5}$/.test(nw)) {
    changePwMsg.textContent = "Пароль лише з цифр, до 5.";
    return;
  }
  const curOk = await validatePassword(cur);
  if (!curOk) {
    changePwMsg.textContent = "Поточний пароль неправильний.";
    return;
  }
  try {
    await set(ref(db, SETTINGS_PATH), String(nw));
    changePwMsg.textContent = "✅ Пароль змінено.";
    setTimeout(() => (changePwModal.style.display = "none"), 1000);
  } catch {
    changePwMsg.textContent = "Помилка при збереженні.";
  }
});

/* ---------- Chat ---------- */
function startChatListeners() {
  if (messagesLoaded) return;
  messagesLoaded = true;

  const chatRef = ref(db, "chat");

  onChildAdded(chatRef, (snap) => {
    const data = snap.val();
    renderMessage(data);
  });

  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    const payload = {
      text,
      timestamp: Date.now(),
      sender: currentUser,
    };
    await push(chatRef, payload);
    messageInput.value = "";
  });
}

/* ---------- Render ---------- */
function renderMessage(data) {
  const div = document.createElement("div");
  div.classList.add("message");

  const isMine = data.sender === currentUser;
  if (isMine) div.classList.add("mine");
  else div.classList.add("theirs");

  if (data.sender === "inna") div.classList.add("sender-red");
  if (data.sender === "vadim") div.classList.add("sender-blue");

  const textNode = document.createElement("div");
  textNode.textContent = data.text;
  div.appendChild(textNode);

  const ts = document.createElement("div");
  ts.className = "small muted";
  ts.textContent = new Date(data.timestamp).toLocaleTimeString();
  div.appendChild(ts);

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  if (!isMine) {
    playSound();
    notifyBrowser(data.text);
  }
}

/* ---------- Sound & Notifications ---------- */
function playSound() {
  try {
    notificationSound.currentTime = 0;
    notificationSound.play();
  } catch {}
}

function notifyBrowser(text) {
  if (Notification.permission === "granted") {
    new Notification("Нове повідомлення", { body: text });
  }
}
