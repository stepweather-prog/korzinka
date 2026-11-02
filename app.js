// Состояние приложения
let state = {
    plans: JSON.parse(localStorage.getItem('korzinka_plans')) || [],
    activePlanId: localStorage.getItem('korzinka_active_id') || null,
    currentItems: [],
    isShopping: false
};

// DOM Элементы
const tabs = document.querySelectorAll('.tab');
const views = document.querySelectorAll('.view');
const addInput = document.getElementById('new-item-input');
const addPriceInput = document.getElementById('new-price-input'); // НОВОЕ
const addBtn = document.getElementById('add-btn');
const planningList = document.getElementById('planning-list');
const shoppingList = document.getElementById('shopping-list');
const startShoppingBtn = document.getElementById('start-shopping-btn');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const totalSumText = document.getElementById('total-sum-text'); // НОВОЕ
const menuBtn = document.getElementById('menu-btn');
const sideMenu = document.getElementById('side-menu');
const closeMenuBtn = document.getElementById('close-menu-btn');
const savedPlansList = document.getElementById('saved-plans-list');

// --- ИНИЦИАЛИЗАЦИЯ И НАВИГАЦИЯ ---

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        views.forEach(v => v.classList.remove('active'));
        const targetView = tab.id === 'tab-plan' ? 'view-plan' : 'view-shop';
        document.getElementById(targetView).classList.add('active');
    });
});

// --- ХЕЛПЕРЫ ---

// Красивое форматирование цены (рубли)
function formatPrice(price) {
    if (!price && price !== 0) return '';
    return new Intl.NumberFormat('ru-RU', { 
        style: 'currency', 
        currency: 'RUB', 
        maximumFractionDigits: 2 
    }).format(price);
}

// --- РАБОТА С ПЛАНИРОВАНИЕМ ---

addBtn.addEventListener('click', addItem);
addInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addItem(); });
addPriceInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addItem(); }); // НОВОЕ

function addItem() {
    const text = addInput.value.trim();
    const priceValue = addPriceInput.value.trim();
    if (!text) return;

    // Парсим цену: если пусто - null, иначе число
    const price = priceValue === '' ? null : parseFloat(priceValue);

    state.currentItems.push({
        id: Date.now().toString(),
        name: text,
        price: isNaN(price) ? null : price, // НОВОЕ
        checked: false
    });
    
    addInput.value = '';
    addPriceInput.value = ''; // Очищаем поле цены
    addInput.focus(); // Возвращаем фокус на название
    renderPlanningList();
}

function renderPlanningList() {
    planningList.innerHTML = '';
    
    // Считаем сумму текущего списка
    let sum = 0;
    
    state.currentItems.forEach(item => {
        if (item.price) sum += item.price;
        
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
            <span class="item-name">${item.name}</span>
            ${item.price ? `<span class="item-price">${formatPrice(item.price)}</span>` : ''}
            <button class="delete-btn" onclick="deleteItem('${item.id}')">✕</button>
        `;
        planningList.appendChild(li);
    });
    
    // Показываем сумму в заголовке вкладки планирования
    const title = document.getElementById('plan-title');
    title.textContent = sum > 0 ? `Новый список (${formatPrice(sum)})` : 'Новый список';
}

window.deleteItem = function(id) {
    state.currentItems = state.currentItems.filter(item => item.id !== id);
    renderPlanningList();
};

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
    
    document.getElementById('tab-shop').click();
    
    // Очищаем форму для следующего раза
    state.currentItems = [];
    renderPlanningList();
});

// --- РАБОТА С ВЫПОЛНЕНИЕМ (МАГАЗИН) ---

function renderShoppingList() {
    const activePlan = state.plans.find(p => p.id === state.activePlanId);
    if (!activePlan) return;

    shoppingList.innerHTML = '';
    let checkedCount = 0;
    let totalSum = 0;    // Общая запланированная сумма
    let spentSum = 0;    // Потраченная сумма (только отмеченные)

    activePlan.items.forEach(item => {
        if (item.checked) {
            checkedCount++;
            if (item.price) spentSum += item.price;
        }
        if (item.price) totalSum += item.price;
        
        const li = document.createElement('li');
        li.className = `list-item ${item.checked ? 'done' : ''}`;
        
        const imgSrc = item.checked ? 'images/check_mark.png' : 'images/tick_a_box.png';
        
        li.innerHTML = `
            <img src="${imgSrc}" class="checkbox-img" onclick="toggleCheck('${item.id}')">
            <span class="item-name">${item.name}</span>
            ${item.price ? `<span class="item-price">${formatPrice(item.price)}</span>` : ''}
        `;
        shoppingList.appendChild(li);
    });

    updateProgress(checkedCount, activePlan.items.length);
    updateTotalSum(spentSum, totalSum); // НОВОЕ
}

// НОВОЕ: Обновление итоговой суммы
function updateTotalSum(spent, total) {
    if (total === 0) {
        totalSumText.textContent = 'Сумма не указана';
    } else if (spent === total) {
        totalSumText.textContent = `Итого: ${formatPrice(total)} ✅`;
    } else {
        totalSumText.textContent = `Куплено на ${formatPrice(spent)} из ${formatPrice(total)}`;
    }
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
    progressText.textContent = `${checked} из ${total} выполнено (${percent}%)`;
}

// --- МЕНЮ ---

menuBtn.addEventListener('click', () => {
    renderSavedPlans();
    sideMenu.classList.remove('hidden');
});

closeMenuBtn.addEventListener('click', () => {
    sideMenu.classList.add('hidden');
});

function renderSavedPlans() {
    savedPlansList.innerHTML = '';
    const reversedPlans = [...state.plans].reverse();
    
    reversedPlans.forEach(plan => {
        const checked = plan.items.filter(i => i.checked).length;
        const total = plan.items.length;
        const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
        
        // НОВОЕ: считаем суммы
        const planTotal = plan.items.reduce((acc, i) => acc + (i.price || 0), 0);
        const planSpent = plan.items.filter(i => i.checked).reduce((acc, i) => acc + (i.price || 0), 0);
        
        const li = document.createElement('li');
        li.className = 'plan-item';
        li.innerHTML = `
            <h3>${plan.name}</h3>
            <p>Куплено: ${checked} из ${total} (${percent}%)</p>
            ${planTotal > 0 ? `<p class="plan-sum">${formatPrice(planSpent)} / ${formatPrice(planTotal)}</p>` : ''}
            <div class="plan-progress"><div class="plan-progress-bar" style="width: ${percent}%"></div></div>
            <button class="main-btn" style="margin-top: 10px; font-size: 14px; padding: 8px;" onclick="resumePlan('${plan.id}')">Выполнить снова</button>
        `;
        savedPlansList.appendChild(li);
    });
}

window.resumePlan = function(planId) {
    const plan = state.plans.find(p => p.id === planId);
    if (!plan) return;

    const checkedCount = plan.items.filter(i => i.checked).length;
    if (checkedCount > 0 && checkedCount < plan.items.length) {
        if (confirm('Этот план не доделан. Продолжить его или начать заново с нуля?')) {
            // Продолжаем
        } else {
            plan.items.forEach(i => i.checked = false);
        }
    } else if (checkedCount === plan.items.length) {
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

// --- ПАМЯТЬ ---

function saveToLocalStorage() {
    localStorage.setItem('korzinka_plans', JSON.stringify(state.plans));
    localStorage.setItem('korzinka_active_id', state.activePlanId || '');
}

function init() {
    const activePlan = state.plans.find(p => p.id === state.activePlanId);
    if (activePlan) {
        renderShoppingList();
    }
}

init();
