// Состояние приложения
let state = {
    plans: JSON.parse(localStorage.getItem('korzinka_plans')) || [],
    activePlanId: localStorage.getItem('korzinka_active_id') || null,
    currentItems: [], // Для вкладки "Планирование"
    isShopping: false // Флаг, что мы перешли в режим выполнения
};

// DOM Элементы
const tabs = document.querySelectorAll('.tab');
const views = document.querySelectorAll('.view');
const addInput = document.getElementById('new-item-input');
const addBtn = document.getElementById('add-btn');
const planningList = document.getElementById('planning-list');
const shoppingList = document.getElementById('shopping-list');
const startShoppingBtn = document.getElementById('start-shopping-btn');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const menuBtn = document.getElementById('menu-btn');
const sideMenu = document.getElementById('side-menu');
const closeMenuBtn = document.getElementById('close-menu-btn');
const savedPlansList = document.getElementById('saved-plans-list');

// --- ИНИЦИАЛИЗАЦИЯ И НАВИГАЦИЯ ---

// Переключение вкладок
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        views.forEach(v => v.classList.remove('active'));
        const targetView = tab.id === 'tab-plan' ? 'view-plan' : 'view-shop';
        document.getElementById(targetView).classList.add('active');
    });
});

// --- РАБОТА С ПЛАНИРОВАНИЕМ ---

addBtn.addEventListener('click', addItem);
addInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addItem(); });

function addItem() {
    const text = addInput.value.trim();
    if (!text) return;

    state.currentItems.push({
        id: Date.now().toString(),
        name: text,
        checked: false
    });
    
    addInput.value = '';
    renderPlanningList();
}

function renderPlanningList() {
    planningList.innerHTML = '';
    state.currentItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
            <span class="item-name">${item.name}</span>
            <button class="delete-btn" onclick="deleteItem('${item.id}')">✕</button>
        `;
        planningList.appendChild(li);
    });
}

// Удаление пункта
window.deleteItem = function(id) {
    state.currentItems = state.currentItems.filter(item => item.id !== id);
    renderPlanningList();
};

// Сохранение и переход в магазин
startShoppingBtn.addEventListener('click', () => {
    if (state.currentItems.length === 0) {
        alert('Сначала добавьте продукты!');
        return;
    }

    const newPlan = {
        id: Date.now().toString(),
        name: `План от ${new Date().toLocaleDateString()}`,
        items: [...state.currentItems],
        date: new Date().toLocaleString()
    };

    state.plans.push(newPlan);
    state.activePlanId = newPlan.id;
    state.isShopping = true;
    
    saveToLocalStorage();
    renderShoppingList();
    
    // Переключаем вкладку
    document.getElementById('tab-shop').click();
});

// --- РАБОТА С ВЫПОЛНЕНИЕМ (МАГАЗИН) ---

function renderShoppingList() {
    const activePlan = state.plans.find(p => p.id === state.activePlanId);
    if (!activePlan) return;

    shoppingList.innerHTML = '';
    let checkedCount = 0;

    activePlan.items.forEach(item => {
        if (item.checked) checkedCount++;
        
        const li = document.createElement('li');
        li.className = `list-item ${item.checked ? 'done' : ''}`;
        
        // Используем твои картинки для чекбокса
        const imgSrc = item.checked ? 'images/check_mark.png' : 'images/tick_a_box.png';
        
        li.innerHTML = `
            <img src="${imgSrc}" class="checkbox-img" onclick="toggleCheck('${item.id}')">
            <span class="item-name">${item.name}</span>
        `;
        shoppingList.appendChild(li);
    });

    updateProgress(checkedCount, activePlan.items.length);
}

window.toggleCheck = function(itemId) {
    const activePlan = state.plans.find(p => p.id === state.activePlanId);
    if (!activePlan) return;

    const item = activePlan.items.find(i => i.id === itemId);
    if (item) {
        item.checked = !item.checked;
        saveToLocalStorage();
        renderShoppingList();
    }
};

function updateProgress(checked, total) {
    const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${checked} из ${total} выполнено`;
}

// --- МЕНЮ (СОХРАНЕННЫЕ ПЛАНЫ) ---

menuBtn.addEventListener('click', () => {
    renderSavedPlans();
    sideMenu.classList.remove('hidden');
});

closeMenuBtn.addEventListener('click', () => {
    sideMenu.classList.add('hidden');
});

function renderSavedPlans() {
    savedPlansList.innerHTML = '';
    
    // Показываем от новых к старым
    const reversedPlans = [...state.plans].reverse();
    
    reversedPlans.forEach(plan => {
        const checked = plan.items.filter(i => i.checked).length;
        const total = plan.items.length;
        const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
        
        const li = document.createElement('li');
        li.className = 'plan-item';
        li.innerHTML = `
            <h3>${plan.name}</h3>
            <p>Куплено: ${checked} из ${total} (${percent}%)</p>
            <div class="plan-progress"><div class="plan-progress-bar" style="width: ${percent}%"></div></div>
            <button class="main-btn" style="margin-top: 10px; font-size: 14px; padding: 8px;" onclick="resumePlan('${plan.id}')">Выполнить снова</button>
        `;
        savedPlansList.appendChild(li);
    });
}

// Возобновление или повторение плана
window.resumePlan = function(planId) {
    const plan = state.plans.find(p => p.id === planId);
    if (!plan) return;

    // Если план выполнен не до конца, спрашиваем - продолжить или начать заново?
    const checkedCount = plan.items.filter(i => i.checked).length;
    if (checkedCount > 0 && checkedCount < plan.items.length) {
        if (confirm('Этот план не доделан. Продолжить его или начать заново с нуля?')) {
            // Продолжаем - просто открываем
        } else {
            // Сбрасываем галочки
            plan.items.forEach(i => i.checked = false);
        }
    } else if (checkedCount === plan.items.length) {
        // Если всё куплено - спрашиваем, не хотим ли повторить
        if (confirm('Этот план уже выполнен. Начать заново?')) {
            plan.items.forEach(i => i.checked = false);
        } else {
            return;
        }
    }

    state.activePlanId = plan.id;
    saveToLocalStorage();
    
    sideMenu.classList.add('hidden');
    renderShoppingList();
    document.getElementById('tab-shop').click();
};

// --- СОХРАНЕНИЕ В ПАМЯТЬ ---

function saveToLocalStorage() {
    localStorage.setItem('korzinka_plans', JSON.stringify(state.plans));
    localStorage.setItem('korzinka_active_id', state.activePlanId || '');
}

// Восстановление активного плана при загрузке
function init() {
    const activePlan = state.plans.find(p => p.id === state.activePlanId);
    if (activePlan) {
        renderShoppingList();
    }
}

init();
