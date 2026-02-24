require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
require('dotenv').config();
const MONGO_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
// --- НАЛАШТУВАННЯ ---
app.use(express.json());
app.use(cors()); // Дозволяє фронтенду звертатися до сервера


// --- ПІДКЛЮЧЕННЯ ДО БД ---
// Заміни <password> та <dbname> на свої дані з MongoDB Atlas
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ База даних підключена'))
    .catch(err => console.error('❌ Помилка підключення до БД:', err));

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
    // Тут ми зберігаємо прогрес: ID задачі + написаний код
    completedTasks: [{
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        solution: String
    }]
});
const User = mongoose.model('User', userSchema);

// --- MIDDLEWARE ---
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
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
        res.status(400).send({ error: "Цей логін вже зайнятий" });
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

// 1. Отримати всі задачі (з відмітками про виконання та кодом)
app.get('/tasks', auth, async (req, res) => {
    try {
        const tasks = await Task.find({}).lean();
        const user = await User.findById(req.user.id);

        const tasksWithProgress = tasks.map(task => {
            const userTask = user.completedTasks.find(t => t.taskId && t.taskId.toString() === task._id.toString());
            return {
                ...task,
                isCompleted: !!userTask,
                solution: userTask ? userTask.solution : "" // Віддаємо збережений код на фронтенд
            };
        });

        res.send(tasksWithProgress);
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

// 2. Створити задачу (тільки Адмін)
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

// 3. Відмітити як виконану + зберегти код
app.post('/tasks/:id/complete', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const { solution } = req.body;
        const taskId = req.params.id;

        const taskIndex = user.completedTasks.findIndex(t => t.taskId && t.taskId.toString() === taskId);

        if (taskIndex > -1) {
            // Оновлюємо існуючий код
            user.completedTasks[taskIndex].solution = solution;
        } else {
            // Додаємо новий запис
            user.completedTasks.push({ taskId, solution });
        }

        await user.save();
        res.send({ message: "Прогрес збережено" });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

// 4. Скасувати виконання
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
// Заміни запуск сервера в самому низу:
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => {
    console.log(`🚀 Сервер працює на порту ${PORT}`);
});

// Заміни підключення до БД на це:
const mongoURI = process.env.MONGODB_URI || 'твій_локальний_url_якщо_є';
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB error:', err));