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
    origin: ['https://lisei-u.github.io', 'http://127.0.0.1:5500'], // Додав локалку для тестів
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
    difficulty: Number
});
const Task = mongoose.model('Task', taskSchema);

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    completedTasks: [{
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        solution: String
    }]
});
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

// --- МАРШРУТИ ЗАДАЧ ---
app.get('/tasks', auth, async (req, res) => {
    try {
        const tasks = await Task.find({}).lean();
        const user = await User.findById(req.user.id);

        const tasksWithProgress = tasks.map(task => {
            const userTask = user.completedTasks.find(t => t.taskId && t.taskId.toString() === task._id.toString());
            return {
                ...task,
                isCompleted: !!userTask,
                solution: userTask ? userTask.solution : ""
            };
        });

        res.send(tasksWithProgress);
    } catch (e) {
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
        const taskIndex = user.completedTasks.findIndex(t => t.taskId && t.taskId.toString() === taskId);

        if (taskIndex > -1) {
            user.completedTasks[taskIndex].solution = solution;
        } else {
            user.completedTasks.push({ taskId, solution });
        }

        await user.save();
        res.send({ message: "Прогрес збережено" });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

app.post('/tasks/:id/uncomplete', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.completedTasks = user.completedTasks.filter(t => t.taskId && t.taskId.toString() !== req.params.id);
        await user.save();
        res.send({ message: "Статус скасовано" });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

// --- ЗАПУСК ---
app.listen(PORT, () => {
    console.log(`🚀 Сервер працює на порту ${PORT}`);
});