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
    const isCompleted = document.querySelector(`[data-id="${taskId}"]`).classList.contains('completed');

    if (isCompleted) {
        await sendStatus(taskId, 'uncomplete', codeValue);
        return;
    }

    if (task.expectedValue) {
        try {
            const userFunc = new Function(codeValue);
            const userResult = userFunc();
            
            let expected;
            try { expected = JSON.parse(task.expectedValue); } 
            catch { expected = task.expectedValue; }

            if (JSON.stringify(userResult) === JSON.stringify(expected)) {
                alert(`🚀 Вірно!`);
                await sendStatus(taskId, 'complete', codeValue);
            } else {
                alert(`❌ Невірно.\nОтримано: ${JSON.stringify(userResult)}\nОчікували: ${JSON.stringify(expected)}`);
            }
        } catch (e) { alert("⚠️ Помилка в коді: " + e.message); }
    } else {
        await sendStatus(taskId, 'complete', codeValue);
    }
}

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
        alert("Місія додана!");
        loadTasks();
    }
}

function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.setAttribute('data-id', task._id);
        card.className = `task-card ${task.isCompleted ? 'completed' : ''}`;
        card.innerHTML = `
            <h3>${task.title} <span class="badge">${task.category}</span></h3>
            <p>${task.desc}</p>
            
            ${task.explanation ? `
                <details style="margin-bottom: 10px; cursor: pointer; color: #ffcc00;">
                    <summary>💡 Підказка</summary>
                    <div style="padding: 10px; background: #222; border-radius: 4px; margin-top: 5px; color: #ccc;">
                        ${task.explanation}
                    </div>
                </details>
            ` : ''}

            <div style="font-size: 0.8em; color: #888; margin-bottom: 5px;">⚠️ Використовуйте <code>return</code> для результату</div>
            <textarea id="code-${task._id}" class="code-editor" placeholder="return ...">${task.solution || ''}</textarea>
            
            <button class="action-btn" onclick="toggleTaskStatus('${task._id}')">
                ${task.isCompleted ? '↩️ Скасувати' : '✅ Перевірити та зберегти'}
            </button>
        `;
        list.appendChild(card);
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