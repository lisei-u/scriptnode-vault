// const API_URL = 'https://scriptnode-vault.onrender.com';
// let authToken = localStorage.getItem('token');
// let currentUser = JSON.parse(localStorage.getItem('user'));
// let allTasks = [];

// // Експортуємо функції для HTML
// window.login = login;
// window.logout = logout;
// window.addTask = addTask;
// window.filterTasks = filterTasks;
// window.toggleTaskStatus = toggleTaskStatus;

// window.onload = () => {
//     if (authToken) {
//         initApp();
//     } else {
//         // Якщо не авторизовані, ховаємо додаток і показуємо вхід
//         document.getElementById('app-section').style.display = 'none';
//         document.getElementById('auth-section').style.display = 'block';
//     }
// };

// async function login(username, password) {
//     try {
//         const res = await fetch(`${API_URL}/login`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ username, password })
//         });
//         const data = await res.json();
//         if (res.ok) {
//             localStorage.setItem('token', data.token);
//             localStorage.setItem('user', JSON.stringify(data.user));
//             location.reload();
//         } else alert(data.error);
//     } catch (e) { alert("Сервер не відповідає. Спробуйте через хвилину."); }
// }

// function initApp() {
//     document.getElementById('auth-section').style.display = 'none';
//     document.getElementById('app-section').style.display = 'block';
//     if (currentUser && currentUser.role === 'admin') {
//         document.getElementById('admin-panel').style.display = 'block';
//     }
//     loadTasks();
// }

// async function loadTasks() {
//     try {
//         const res = await fetch(`${API_URL}/tasks`, {
//             headers: { 'Authorization': `Bearer ${authToken}` }
//         });
//         if (!res.ok) throw new Error("Помилка авторизації");
//         allTasks = await res.json();
//         renderTasks(allTasks);
//     } catch (e) { 
//         console.error("Помилка:", e);
//         document.getElementById('task-list').innerHTML = `<p style="color:red; text-align:center;">Помилка завантаження. Перевірте з'єднання.</p>`;
//     }
// }

// async function toggleTaskStatus(taskId) {
//     const task = allTasks.find(t => t._id === taskId);
//     const codeValue = document.getElementById(`code-${taskId}`).value;
//     const statusDiv = document.getElementById(`status-${taskId}`);
//     const card = document.querySelector(`[data-id="${taskId}"]`);

//     statusDiv.style.display = "block";
//     statusDiv.className = "status-message";
//     statusDiv.innerHTML = "⏳ Тестування...";

//     if (card.classList.contains('completed')) {
//         await sendStatus(taskId, 'uncomplete', codeValue);
//         statusDiv.style.display = "none";
//         return;
//     }

//     try {
//         const funcNameMatch = codeValue.match(/function\s+([a-zA-Z0-9_]+)/);
//         if (!funcNameMatch) throw new Error("Ви не оголосили функцію через 'function назва()'");
//         const funcName = funcNameMatch[1];

//         // РОЗДІЛЯЄМО ТЕСТИ (використовуємо ";" як роздільник)
//         const testInputs = task.testArgs.split(';').map(s => s.trim());
//         const expectedOutputs = task.expectedValue.split(';').map(s => s.trim());

//         let passedCount = 0;
//         let errorDetail = "";

//         for (let i = 0; i < testInputs.length; i++) {
//             const currentInput = testInputs[i];
//             const currentExpectedRaw = expectedOutputs[i];

//             // Динамічне виконання для кожного тесту
//             const fullCode = `${codeValue}\nreturn ${funcName}(${currentInput});`;
//             const runner = new Function(fullCode);
//             const userResult = runner();

//             // Парсимо очікуване значення
//             let expected;
//             try { expected = JSON.parse(currentExpectedRaw); } 
//             catch { expected = currentExpectedRaw; }

//             // Порівняння
//             if (JSON.stringify(userResult) === JSON.stringify(expected)) {
//                 passedCount++;
//             } else {
//                 errorDetail = `❌ Тест №${i+1} провалено!<br>Аргументи: <code>(${currentInput})</code><br>Очікували: <b>${JSON.stringify(expected)}</b><br>Отримано: <b style="color:#ff4136">${JSON.stringify(userResult)}</b>`;
//                 break; // Зупиняємося на першій помилці
//             }
//         }

//         if (passedCount === testInputs.length) {
//             statusDiv.className = "status-message success";
//             statusDiv.innerHTML = `🚀 ГЕНІАЛЬНО! Всі тести (${passedCount}/${testInputs.length}) пройдено.`;
//             await sendStatus(taskId, 'complete', codeValue);
//         } else {
//             statusDiv.className = "status-message error";
//             statusDiv.innerHTML = errorDetail;
//         }

//     } catch (e) {
//         statusDiv.className = "status-message error";
//         statusDiv.innerHTML = `⚠️ Помилка виконання:<br>${e.message}`;
//     }
// };

// async function sendStatus(taskId, action, solution) {
//     await fetch(`${API_URL}/tasks/${taskId}/${action}`, {
//         method: 'POST',
//         headers: { 
//             'Authorization': `Bearer ${authToken}`,
//             'Content-Type': 'application/json' 
//         },
//         body: JSON.stringify({ solution })
//     });
//     loadTasks();
// }

// async function addTask() {
//     const taskData = {
//         title: document.getElementById('task-title').value,
//         category: document.getElementById('task-category').value,
//         desc: document.getElementById('task-desc').value,
//         explanation: document.getElementById('task-explanation').value,
//         testArgs: document.getElementById('task-test-args').value, // НОВЕ ПОЛЕ
//         expectedValue: document.getElementById('task-expected').value
//     };

//     const res = await fetch(`${API_URL}/tasks`, {
//         method: 'POST',
//         headers: { 
//             'Authorization': `Bearer ${authToken}`,
//             'Content-Type': 'application/json' 
//         },
//         body: JSON.stringify(taskData)
//     });

//     if (res.ok) {
//         alert("Місія додана успішно!");
//         location.reload(); 
//     }
// }

// function renderTasks(tasks) {
//     const list = document.getElementById('task-list');
//     list.innerHTML = '';
//     tasks.forEach(task => {
//         const card = document.createElement('div');
//         card.setAttribute('data-id', task._id);
//         card.className = `task-card ${task.isCompleted ? 'completed' : ''}`;
        
//         const initialContent = task.solution || task.explanation || '';

//         card.innerHTML = `
//             <h3>${task.title} <span class="badge">${task.category}</span></h3>
//             <p>${task.desc}</p>
            
//             <textarea id="code-${task._id}" class="code-editor" 
//                       placeholder="function ...">${initialContent}</textarea>
            
//             <div id="status-${task._id}" class="status-message"></div>

//             <button class="action-btn" onclick="toggleTaskStatus('${task._id}')">
//                 ${task.isCompleted ? '↩️ Скасувати' : '✅ Перевірити та зберегти'}
//             </button>
//         `;
//         list.appendChild(card);
        
//         // Налаштовуємо Tab та дужки для кожного поля
//         setupCodeEditor(document.getElementById(`code-${task._id}`));
//     });
// }

// function logout() {
//     localStorage.clear();
//     location.reload();
// }

// function filterTasks() {
//     const q = document.getElementById('search-input').value.toLowerCase();
//     document.querySelectorAll('.task-card').forEach(card => {
//         card.style.display = card.innerText.toLowerCase().includes(q) ? 'block' : 'none';
//     });
// }

// function setupCodeEditor(el) {
//     el.addEventListener('keydown', function(e) {
//         const start = this.selectionStart;
//         const end = this.selectionEnd;
//         const value = this.value;
//         const selectedText = value.substring(start, end);

//         // 1. Відступ клавішею Tab
//         if (e.key === 'Tab') {
//             e.preventDefault();
//             this.value = value.substring(0, start) + "    " + value.substring(end);
//             this.selectionStart = this.selectionEnd = start + 4;
//         }

//         // 2. Автозакриття та Огортання (Дужки та Лапки)
//         const pairs = {
//             '(': ')',
//             '[': ']',
//             '{': '}',
//             '"': '"',
//             "'": "'",
//             '`': '`'
//         };

//         if (pairs[e.key]) {
//             e.preventDefault();
//             const closingChar = pairs[e.key];
            
//             // Якщо текст виділено - огортаємо його
//             if (start !== end) {
//                 this.value = value.substring(0, start) + e.key + selectedText + closingChar + value.substring(end);
//                 this.selectionStart = start + 1;
//                 this.selectionEnd = end + 1;
//             } else {
//                 // Якщо просто натиснули - ставимо пару і курсор посередині
//                 this.value = value.substring(0, start) + e.key + closingChar + value.substring(end);
//                 this.selectionStart = this.selectionEnd = start + 1;
//             }
//         }
//     });
// }
Тепер бачу проблему! Стара версія використовує **інший сервер** (`https://scriptnode-vault.onrender.com`) і має свою схему БД з `completedTasks` як масив об'єктів.

Проблема в тому, що **нова версія (Brawl Code)** змінила формат `completedTasks` в базі даних, і тепер стара версія не працює.

**Рішення**: Оновити модель User на сервері старої версії (Render), щоб вона підтримувала гнучкий формат. Ось виправлений `server.js`:
Action: file_editor create /app/old-version/scriptnode-vault-master/server.js --file-text "require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// --- НАЛАШТУВАННЯ ---
const MONGO_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Налаштування CORS - важливо, щоб це було ПЕРЕД маршрутами
app.use(cors({
    origin: ['https://lisei-u.github.io', 'http://127.0.0.1:5500', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- ПІДКЛЮЧЕННЯ ДО БД ---
if (!MONGO_URI) {
    console.error(\"❌ Помилка: MONGO_URI не знайдено!\");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// --- МОДЕЛІ ---
const taskSchema = new mongoose.Schema({
    title: String,
    category: String,
    desc: String,
    explanation: String,
    difficulty: Number,
    testArgs: String,
    expectedValue: String,
    // Нові поля для сумісності з Brawl Code
    block: { type: Number, default: 1 },
    order: { type: Number, default: 1 }
});
const Task = mongoose.model('Task', taskSchema);

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    // ГНУЧКИЙ ТИП для сумісності з обома версіями
    completedTasks: { type: mongoose.Schema.Types.Mixed, default: [] },
    // Нові поля для Brawl Code (опціональні)
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    currentBlock: { type: Number, default: 1 },
    avatar: { type: Number, default: 1 },
    savedSolutions: { type: Map, of: String, default: {} },
    lastPlayDate: { type: Date, default: null },
    streak: { type: Number, default: 0 },
    calendar: [{ type: Date }]
}, { strict: false });
const User = mongoose.model('User', userSchema);

// --- MIDDLEWARE ---
const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) throw new Error();
        
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) throw new Error();
        req.user = user;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Будь ласка, авторизуйтесь.' });
    }
};

// --- МАРШРУТИ АВТОРИЗАЦІЇ ---
app.post('/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 8);
        const user = new User({ username, password: hashedPassword, role: role || 'user' });
        await user.save();
        res.status(201).send({ message: \"Успішна реєстрація\" });
    } catch (e) {
        res.status(400).send({ error: \"Цей логін вже зайнятий або дані невірні\" });
    }
});

app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
            return res.status(400).send({ error: 'Невірний логін або пароль' });
        }
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
        res.send({ user: { username: user.username, role: user.role }, token });
    } catch (e) {
        res.status(500).send({ error: \"Помилка сервера\" });
    }
});

// --- ДОПОМІЖНА ФУНКЦІЯ для нормалізації completedTasks ---
function normalizeCompletedTasks(completedTasks) {
    if (!completedTasks || !Array.isArray(completedTasks)) return [];
    
    return completedTasks.map(item => {
        // Якщо це об'єкт з taskId (старий формат) - повертаємо як є
        if (typeof item === 'object' && item.taskId) {
            return item;
        }
        // Якщо це рядок (новий формат) - конвертуємо в об'єкт
        if (typeof item === 'string') {
            return { taskId: item, solution: '' };
        }
        return item;
    });
}

// --- МАРШРУТИ ЗАДАЧ ---
app.get('/tasks', auth, async (req, res) => {
    try {
        const tasks = await Task.find({}).lean();
        const user = await User.findById(req.user.id);

        // Нормалізуємо completedTasks
        const normalizedTasks = normalizeCompletedTasks(user.completedTasks);

        const tasksWithProgress = tasks.map(task => {
            const userTask = normalizedTasks.find(t => {
                const taskIdStr = t.taskId ? t.taskId.toString() : t.toString();
                return taskIdStr === task._id.toString();
            });
            return {
                ...task,
                isCompleted: !!userTask,
                solution: userTask && userTask.solution ? userTask.solution : \"\"
            };
        });

        res.send(tasksWithProgress);
    } catch (e) {
        console.error('Get tasks error:', e);
        res.status(500).send({ error: e.message });
    }
});

app.post('/tasks', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send({ error: 'Немає прав адміна' });
    try {
        const task = new Task(req.body);
        await task.save();
        res.status(201).send(task);
    } catch (e) {
        res.status(400).send({ error: \"Помилка при створенні\" });
    }
});

app.post('/tasks/:id/complete', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const { solution } = req.body;
        const taskId = req.params.id;
        
        // Нормалізуємо існуючі дані
        if (!Array.isArray(user.completedTasks)) {
            user.completedTasks = [];
        }
        
        // Шукаємо чи є вже таке завдання
        const taskIndex = user.completedTasks.findIndex(t => {
            if (typeof t === 'object' && t.taskId) {
                return t.taskId.toString() === taskId;
            }
            if (typeof t === 'string') {
                return t === taskId;
            }
            return false;
        });

        if (taskIndex > -1) {
            // Оновлюємо solution
            if (typeof user.completedTasks[taskIndex] === 'object') {
                user.completedTasks[taskIndex].solution = solution;
            } else {
                user.completedTasks[taskIndex] = { taskId, solution };
            }
        } else {
            // Додаємо нове
            user.completedTasks.push({ taskId, solution });
        }

        user.markModified('completedTasks');
        await user.save();
        res.send({ message: \"Прогрес збережено\" });
    } catch (e) {
        console.error('Complete task error:', e);
        res.status(500).send({ error: e.message });
    }
});

app.post('/tasks/:id/uncomplete', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (Array.isArray(user.completedTasks)) {
            user.completedTasks = user.completedTasks.filter(t => {
                if (typeof t === 'object' && t.taskId) {
                    return t.taskId.toString() !== req.params.id;
                }
                if (typeof t === 'string') {
                    return t !== req.params.id;
                }
                return true;
            });
        }
        
        user.markModified('completedTasks');
        await user.save();
        res.send({ message: \"Статус скасовано\" });
    } catch (e) {
        console.error('Uncomplete task error:', e);
        res.status(500).send({ error: e.message });
    }
});

// --- ЗАПУСК ---
app.listen(PORT, () => {
    console.log(`🚀 Сервер працює на порту ${PORT}`);
});
"
Observation: Overwrite successful: /app/old-version/scriptnode-vault-master/server.js