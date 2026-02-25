const API_URL = 'https://scriptnode-vault.onrender.com';
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));
let allTasks = [];

window.onload = () => {
    if (authToken) initApp();
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
    } catch (e) { alert("Сервер не відповідає"); }
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
    const res = await fetch(`${API_URL}/tasks`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    allTasks = await res.json();
    renderTasks(allTasks);
}

// ПЕРЕВІРКА ТА ЗБЕРЕЖЕННЯ
window.toggleTaskStatus = async function(taskId) {
    const task = allTasks.find(t => t._id === taskId);
    const codeValue = document.getElementById(`code-${taskId}`).value;
    const card = document.querySelector(`[data-id="${taskId}"]`);
    const isCompleted = card.classList.contains('completed');

    // Якщо ми скасовуємо виконання (uncomplete)
    if (isCompleted) {
        await sendStatus(taskId, 'uncomplete', codeValue);
        return;
    }

    // Якщо в задачі є очікувана відповідь - перевіряємо код
    if (task.expectedValue) {
        try {
            const userFunc = new Function(codeValue);
            const result = userFunc();
            
            // Порівнюємо через JSON.stringify, щоб працювали масиви [1,2] та об'єкти {a:1}
            // Ми також пропускаємо через JSON.parse очікуване значення, щоб воно стало об'єктом перед порівнянням
            
            let expectedParsed;
            try {
                // Намагаємось розпарсити очікуване значення (якщо це масив або об'єкт)
                expectedParsed = JSON.parse(task.expectedValue);
            } catch (e) {
                // Якщо це просто рядок (напр. Hello), лишаємо як рядок
                expectedParsed = task.expectedValue;
            }

            const isCorrect = JSON.stringify(result) === JSON.stringify(expectedParsed);

            if (isCorrect) {
                alert(`🚀 Вірно! Результат: ${JSON.stringify(result)}`);
                await sendStatus(taskId, 'complete', codeValue);
            } else {
                alert(`❌ Невірно.\nОтримано: ${JSON.stringify(result)}\nОчікували: ${JSON.stringify(expectedParsed)}`);
            }
        } catch (e) {
            alert("⚠️ Помилка у твоєму коді: " + e.message);
        }
    } else {
        // Якщо перевірка не задана, просто зберігаємо прогрес
        await sendStatus(taskId, 'complete', codeValue);
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
        const txt = card.innerText.toLowerCase();
        card.style.display = txt.includes(q) ? 'block' : 'none';
    });
}