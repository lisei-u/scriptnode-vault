const API_URL = 'https://scriptnode-vault.onrender.com';
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));
let allTasks = [];

// Експортуємо функції для HTML
window.login = login;
window.logout = logout;
window.addTask = addTask;
window.filterTasks = filterTasks;
window.toggleTaskStatus = toggleTaskStatus;

window.onload = () => {
    if (authToken) {
        initApp();
    } else {
        // Якщо не авторизовані, ховаємо додаток і показуємо вхід
        document.getElementById('app-section').style.display = 'none';
        document.getElementById('auth-section').style.display = 'block';
    }
};

async function login(username, password) {
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            location.reload();
        } else alert(data.error);
    } catch (e) { alert("Сервер не відповідає. Спробуйте через хвилину."); }
}

function initApp() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    if (currentUser && currentUser.role === 'admin') {
        document.getElementById('admin-panel').style.display = 'block';
    }
    loadTasks();
}

async function loadTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error("Помилка авторизації");
        allTasks = await res.json();
        renderTasks(allTasks);
    } catch (e) { 
        console.error("Помилка:", e);
        document.getElementById('task-list').innerHTML = `<p style="color:red; text-align:center;">Помилка завантаження. Перевірте з'єднання.</p>`;
    }
}

async function toggleTaskStatus(taskId) {
    const task = allTasks.find(t => t._id === taskId);
    const codeValue = document.getElementById(`code-${taskId}`).value;
    const statusDiv = document.getElementById(`status-${taskId}`);
    const card = document.querySelector(`[data-id="${taskId}"]`);

    // Очищуємо старі повідомлення
    statusDiv.className = "status-message";
    statusDiv.innerHTML = "";

    if (card.classList.contains('completed')) {
        await sendStatus(taskId, 'uncomplete', codeValue);
        return;
    }

    try {
        const funcNameMatch = codeValue.match(/function\s+([a-zA-Z0-9_]+)/);
        if (!funcNameMatch) throw new Error("Ви не оголосили функцію через 'function назва()'");

        const funcName = funcNameMatch[1];
        const fullCode = `${codeValue}\nreturn ${funcName}(${task.testArgs || ''});`;

        const runner = new Function(fullCode);
        const userResult = runner();

        let expected;
        try { expected = JSON.parse(task.expectedValue); } 
        catch { expected = task.expectedValue; }

        if (JSON.stringify(userResult) === JSON.stringify(expected)) {
            // УСПІХ
            statusDiv.classList.add('success');
            statusDiv.innerHTML = `🚀 ГЕНІАЛЬНО! Результат: ${JSON.stringify(userResult)}`;
            await sendStatus(taskId, 'complete', codeValue);
        } else {
            // ПОМИЛКА РЕЗУЛЬТАТУ
            statusDiv.classList.add('error');
            statusDiv.innerHTML = `❌ Спробуй ще раз.<br>Отримано: <b>${JSON.stringify(userResult)}</b><br>Очікували: <b>${JSON.stringify(expected)}</b>`;
        }
    } catch (e) {
        // ПОМИЛКА КОДУ
        statusDiv.classList.add('error');
        statusDiv.innerHTML = `⚠️ Помилка у коді:<br>${e.message}`;
    }
};

async function sendStatus(taskId, action, solution) {
    await fetch(`${API_URL}/tasks/${taskId}/${action}`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ solution })
    });
    loadTasks();
}

async function addTask() {
    const taskData = {
        title: document.getElementById('task-title').value,
        category: document.getElementById('task-category').value,
        desc: document.getElementById('task-desc').value,
        explanation: document.getElementById('task-explanation').value,
        testArgs: document.getElementById('task-test-args').value, // НОВЕ ПОЛЕ
        expectedValue: document.getElementById('task-expected').value
    };

    const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify(taskData)
    });

    if (res.ok) {
        alert("Місія додана успішно!");
        location.reload(); 
    }
}

function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.setAttribute('data-id', task._id);
        card.className = `task-card ${task.isCompleted ? 'completed' : ''}`;
        
        const initialContent = task.solution || task.explanation || '';

        card.innerHTML = `
            <h3>${task.title} <span class="badge">${task.category}</span></h3>
            <p>${task.desc}</p>
            
            <textarea id="code-${task._id}" class="code-editor" 
                      placeholder="function ...">${initialContent}</textarea>
            
            <div id="status-${task._id}" class="status-message"></div>

            <button class="action-btn" onclick="toggleTaskStatus('${task._id}')">
                ${task.isCompleted ? '↩️ Скасувати' : '✅ Перевірити та зберегти'}
            </button>
        `;
        list.appendChild(card);
        
        // Налаштовуємо Tab та дужки для кожного поля
        setupCodeEditor(document.getElementById(`code-${task._id}`));
    });
}

function logout() {
    localStorage.clear();
    location.reload();
}

function filterTasks() {
    const q = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.task-card').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(q) ? 'block' : 'none';
    });
}

function setupCodeEditor(el) {
    el.addEventListener('keydown', function(e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const value = this.value;
        const selectedText = value.substring(start, end);

        // 1. Відступ клавішею Tab
        if (e.key === 'Tab') {
            e.preventDefault();
            this.value = value.substring(0, start) + "    " + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
        }

        // 2. Автозакриття та Огортання (Дужки та Лапки)
        const pairs = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            "'": "'",
            '`': '`'
        };

        if (pairs[e.key]) {
            e.preventDefault();
            const closingChar = pairs[e.key];
            
            // Якщо текст виділено - огортаємо його
            if (start !== end) {
                this.value = value.substring(0, start) + e.key + selectedText + closingChar + value.substring(end);
                this.selectionStart = start + 1;
                this.selectionEnd = end + 1;
            } else {
                // Якщо просто натиснули - ставимо пару і курсор посередині
                this.value = value.substring(0, start) + e.key + closingChar + value.substring(end);
                this.selectionStart = this.selectionEnd = start + 1;
            }
        }
    });
}