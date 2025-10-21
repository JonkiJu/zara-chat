import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDAoSeyv4Szh16EYGqjU2dwDdgzQ-SGd4Q",
  authDomain: "zara-chat.firebaseapp.com",
  databaseURL: "https://zara-chat-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "zara-chat",
  storageBucket: "zara-chat.firebasestorage.app",
  messagingSenderId: "698434749263",
  appId: "1:698434749263:web:4012018d9a9d336df9bb3a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const messagesDiv = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const themeToggle = document.getElementById("themeToggle");
const sound = document.getElementById("notificationSound");

// випадковий ідентифікатор для визначення "свого" користувача
const userId = Math.random().toString(36).substring(2, 10);

// Тема збереження
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️";
}

// Перемикання теми
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  themeToggle.textContent = dark ? "☀️" : "🌙";
  localStorage.setItem("theme", dark ? "dark" : "light");
});

// Прослуховування нових повідомлень
onChildAdded(ref(db, "chat"), (snapshot) => {
  const data = snapshot.val();
  const isMine = data.userId === userId;
  addMessageToUI(data.text, isMine);
  if (!isMine) {
    sound.play();
    notifyUser(data.text);
  }
});

// Надсилання
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  push(ref(db, "chat"), { text, timestamp: Date.now(), userId });
  messageInput.value = "";
});

// Додавання повідомлення
function addMessageToUI(text, isMine) {
  const div = document.createElement("div");
  div.classList.add("message", isMine ? "user" : "other");
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Сповіщення браузера
function notifyUser(text) {
  if (Notification.permission === "granted") {
    new Notification("Нове повідомлення", { body: text });
  }
}

if (Notification.permission !== "granted") {
  Notification.requestPermission();
}
