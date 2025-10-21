// TODO: Вставити сюди вашу конфігурацію Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDAoSeyv4Szh16EYGqjU2dwDdgzQ-SGd4Q",
    authDomain: "zara-chat.firebaseapp.com",
    databaseURL: "https://zara-chat-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "zara-chat",
    storageBucket: "zara-chat.firebasestorage.app",
    messagingSenderId: "698434749263",
    appId: "1:698434749263:web:4012018d9a9d336df9bb3a"
  };
// Ініціалізація Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Елементи
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

let lastMessageKey = null;

// Слухаємо нові повідомлення
db.ref('chat').on('child_added', snapshot => {
  const data = snapshot.val();
  const key = snapshot.key;
  addMessageToUI(data.text, key !== lastMessageKey);
  lastMessageKey = key;

  // Сповіщення при новому повідомленні
  if (Notification.permission === 'granted') {
    new Notification('Нове повідомлення', { body: data.text });
  }
});

// Додавання повідомлення
messageForm.addEventListener('submit', evt => {
  evt.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  db.ref('chat').push({ text, timestamp: Date.now() });
  messageInput.value = '';
});

// Додавати в UI
function addMessageToUI(text, isOther) {
  const div = document.createElement('div');
  div.classList.add('message');
  if (isOther) div.classList.add('other');
  div.textContent = text;
  messagesDiv.append(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Попросити дозвіл на сповіщення
if (Notification.permission !== 'granted') {
  Notification.requestPermission();
}
