require('dotenv').config();
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
    console.error("❌ Помилка: MONGO_URI не знайдено!");
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
        res.status(201).send({ message: "Успішна реєстрація" });
    } catch (e) {
        res.status(400).send({ error: "Цей логін вже зайнятий або дані невірні" });
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
        res.status(500).send({ error: "Помилка сервера" });
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
                solution: userTask && userTask.solution ? userTask.solution : ""
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
        res.status(400).send({ error: "Помилка при створенні" });
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
        res.send({ message: "Прогрес збережено" });
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
        res.send({ message: "Статус скасовано" });
    } catch (e) {
        console.error('Uncomplete task error:', e);
        res.status(500).send({ error: e.message });
    }
});

// --- ЗАПУСК ---
app.listen(PORT, () => {
    console.log(`🚀 Сервер працює на порту ${PORT}`);
});
