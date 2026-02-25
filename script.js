const API_URL = 'https://scriptnode-vault.onrender.com';
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));

// 1. ПЕРЕВІРКА ПРИ ЗАВАНТАЖЕННІ
window.onload = () => {
    if (!authToken) {
        // Замість prompt краще показувати приховану форму входу
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('app-section').style.display = 'none';
    } else {
        initApp();
    }
};

function initApp() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    
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
            initApp(); // Перемикаємо інтерфейс без перезавантаження
        } else {
            alert('❌ Помилка: ' + (data.error || 'Невірні дані'));
        }
    } catch (err) {
        alert('🌐 Сервер недоступний. Перевірте статус на Render.');
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

        if (res.status === 401) return logout();

        const tasks = await res.json();
        if (Array.isArray(tasks)) {
            renderTasks(tasks);
        }
    } catch (err) {
        console.error("Помилка завантаження:", err);
    }
}

// 5. ДОДАВАННЯ ЗАДАЧІ (Адмін)
async function addTask() {
    const taskData = {
        title: document.getElementById('task-title').value,
        category: document.getElementById('task-category').value,
        desc: document.getElementById('task-desc').value,
        explanation: document.getElementById('task-explanation').value // ПОЛЕ ПОЯСНЕННЯ
    };

    if (!taskData.title || !taskData.desc) return alert("Заповніть назву та опис!");

    const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(taskData)
    });

    if (res.ok) {
        alert('✅ Задача успішно додана!');
        // Очищуємо поля
        ['task-title', 'task-category', 'task-desc', 'task-explanation'].forEach(id => document.getElementById(id).value = '');
        loadTasks();
    } else {
        alert('🚫 Помилка створення. Перевірте права.');
    }
}

// 6. TOGGLE ТА ЗБЕРЕЖЕННЯ
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
            loadTasks(); 
        }
    } catch (err) {
        console.error("Помилка:", err);
    }
}

// 7. ВІДОБРАЖЕННЯ КАРТОК (З поясненням!)
function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.setAttribute('data-id', task._id);
        card.className = `task-card ${task.isCompleted ? 'completed' : ''}`;
        
        card.innerHTML = `
            <div class="task-header">
                <h3>${task.title} <span class="badge">${task.category}</span></h3>
            </div>
            <div class="task-body">
                <p class="task-desc">${task.desc}</p>
                
                ${task.explanation ? `
                <div class="explanation-container">
                    <details>
                        <summary>💡 Підказка та пояснення</summary>
                        <div class="explanation-content">
                            ${task.explanation}
                        </div>
                    </details>
                </div>` : ''}

                <div class="code-container">
                    <textarea id="code-${task._id}" class="code-editor" 
                        placeholder="Напиши свій код тут...">${task.solution || ''}</textarea>
                </div>
            </div>
            <div class="task-actions">
                <button class="action-btn" onclick="toggleTaskStatus('${task._id}')">
                    ${task.isCompleted ? '↩️ Скасувати' : '✅ Виконати та зберегти'}
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}

function checkAdminUI() {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = (currentUser && currentUser.role === 'admin') ? 'block' : 'none';
    }
}