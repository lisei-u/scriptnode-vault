const API_URL = 'https://scriptnode-vault.onrender.com';
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));

// 1. ПЕРЕВІРКА ПРИ ЗАВАНТАЖЕННІ
window.onload = () => {
    if (!authToken) {
        showLoginSection();
    } else {
        initApp();
    }
};

function initApp() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.style.display = 'block';
    
    checkAdminUI();
    loadTasks();
}

// 2. ЛОГІКА ВХОДУ (LOGIN)
async function login(username, password) {
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        
        if (res.ok && data.token) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            location.reload(); 
        } else {
            alert('Помилка входу: ' + (data.error || 'Невірні дані'));
        }
    } catch (err) {
        alert('Сервер недоступний. Перевірте, чи запущено node server.js');
    }
}

// 3. ВИХІД (LOGOUT)
function logout() {
    localStorage.clear();
    location.reload();
}

// 4. ЗАВАНТАЖЕННЯ ЗАДАЧ
async function loadTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.status === 401) return logout(); // Якщо токен прострочений

        const tasks = await res.json();
        
        if (Array.isArray(tasks)) {
            renderTasks(tasks);
        } else {
            console.error("Очікувався масив задач, але отримано:", tasks);
        }
    } catch (err) {
        console.error("Критична помилка завантаження:", err);
        document.getElementById('task-list').innerHTML = `<p style="color:red">Помилка сервера (500). Видаліть старого користувача в MongoDB і створіть нового.</p>`;
    }
}

// 5. ДОДАВАННЯ НОВОЇ ЗАДАЧІ (Адмін)
async function addTask() {
    const taskData = {
        title: document.getElementById('task-title').value,
        category: document.getElementById('task-category').value,
        desc: document.getElementById('task-desc').value,
        explanation: document.getElementById('task-explanation').value
    };

    if (!taskData.title) return alert("Вкажіть хоча б назву!");

    const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(taskData)
    });

    if (res.ok) {
        alert('Задача додана!');
        loadTasks();
    } else {
        alert('Помилка створення. Перевірте права адміна.');
    }
}

// 6. ТОГЛ СТАТУСУ ТА ЗБЕРЕЖЕННЯ КОДУ
async function toggleTaskStatus(taskId) {
    const card = document.querySelector(`[data-id="${taskId}"]`);
    const isCompleted = card.classList.contains('completed');
    const codeValue = document.getElementById(`code-${taskId}`).value;

    const action = isCompleted ? 'uncomplete' : 'complete';

    try {
        const res = await fetch(`${API_URL}/tasks/${taskId}/${action}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ solution: codeValue })
        });

        if (res.ok) {
            // Замість повного перезавантаження loadTasks() можна просто оновити візуал
            loadTasks(); 
        } else {
            const errData = await res.json();
            alert("Помилка: " + errData.error);
        }
    } catch (err) {
        console.error("Помилка запиту:", err);
    }
}

// 7. ВІДОБРАЖЕННЯ КАРТОК
function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.setAttribute('data-id', task._id);
        card.className = `task-card ${task.isCompleted ? 'completed' : ''}`;
        
        // Використовуємо task.desc або task.description (дивлячись що в базі)
        const description = task.desc || task.description || "Опис відсутній";

        card.innerHTML = `
            <div class="task-header">
                <h3>${task.title} <span class="badge">${task.category}</span></h3>
            </div>
            <div class="task-body">
                <p>${description}</p>
                <div class="code-container">
                    <textarea id="code-${task._id}" class="code-editor" 
                        placeholder="Напиши свій код тут...">${task.solution || ''}</textarea>
                </div>
            </div>
            <div class="task-actions">
                <button class="action-btn" onclick="toggleTaskStatus('${task._id}')">
                    ${task.isCompleted ? '↩️ Скасувати' : '✅ Виконати'}
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}

// 8. ДОПОМІЖНІ ФУНКЦІЇ
function checkAdminUI() {
    if (currentUser && currentUser.role !== 'admin') {
        const form = document.querySelector('.form-container');
        if (form) form.style.display = 'none';
    }
}

function showLoginSection() {
    const user = prompt("Вхід: Логін (Admin або PlayerOne)");
    const pass = prompt("Пароль");
    if (user && pass) login(user, pass);
}

// Пошук
function filterTasks() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const cards = document.querySelectorAll('.task-card');
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(query) ? 'block' : 'none';
    });
}