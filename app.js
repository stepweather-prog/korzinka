let state = {
    plans: JSON.parse(localStorage.getItem('korzinka_plans')) || [],
    activePlanId: localStorage.getItem('korzinka_active_id') || null,
    currentItems: [],
    statsMonth: new Date(),
    selectMode: false,
    selectedPlans: []
};

// --- DOM ---
const tabs = document.querySelectorAll('.tab');
const views = document.querySelectorAll('.view');
const addInput = document.getElementById('new-item-input');
const addQtyInput = document.getElementById('new-qty-input');
const addUnitSelect = document.getElementById('new-unit-select');
const addPriceInput = document.getElementById('new-price-input');
const addBtn = document.getElementById('add-btn');

const planningList = document.getElementById('planning-list');
const planningPrices = document.getElementById('planning-prices');
const shoppingList = document.getElementById('shopping-list');
const shoppingPrices = document.getElementById('shopping-prices');

const startShoppingBtn = document.getElementById('start-shopping-btn');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const totalSumText = document.getElementById('total-sum-text');

const menuBtn = document.getElementById('menu-btn');
const sideMenu = document.getElementById('side-menu');
const closeMenuBtn = document.getElementById('close-menu-btn');
const savedPlansList = document.getElementById('saved-plans-list');

const noActivePlan = document.getElementById('no-active-plan');
const activePlanContent = document.getElementById('active-plan-content');
const deleteActivePlanBtn = document.getElementById('delete-active-plan-btn');

const menuTabPlans = document.getElementById('menu-tab-plans');
const menuTabStats = document.getElementById('menu-tab-stats');
const menuPlansView = document.getElementById('menu-plans-view');
const menuStatsView = document.getElementById('menu-stats-view');

const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const currentMonthLabel = document.getElementById('current-month-label');
const statsTotalSum = document.getElementById('stats-total-sum');
const statsPlansCount = document.getElementById('stats-plans-count');
const statsPlansList = document.getElementById('stats-plans-list');

const selectModeBtn = document.getElementById('select-mode-btn');
const selectModeActions = document.getElementById('select-mode-actions');
const cancelSelectBtn = document.getElementById('cancel-select-btn');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');

// Модальное окно
const modal = document.getElementById('plan-details-modal');
const modalTitle = document.getElementById('modal-plan-title');
const modalDate = document.getElementById('modal-plan-date');
const modalItemsList = document.getElementById('modal-items-list');
const modalSummary = document.getElementById('modal-plan-summary');
const modalCloseBtn = document.getElementById('modal-close-btn');

// --- НАВИГАЦИЯ ---
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
function formatPrice(price) {
    if (!price && price !== 0) return '';
    return new Intl.NumberFormat('ru-RU', { 
        style: 'currency', currency: 'RUB', maximumFractionDigits: 2 
    }).format(price);
}

function pluralize(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

// Итог по позиции: цена за единицу × количество
function getItemTotal(item) {
    if (!item.price) return 0;
    const qty = item.qty ? parseFloat(item.qty) : 1;
    return item.price * (isNaN(qty) ? 1 : qty);
}

// Подпись количества: "2 шт" или "1.5 кг"
function getQtyLabel(item) {
    if (!item.qty && item.qty !== 0) return '';
    return `${item.qty} ${item.unit || 'шт'}`;
}

// --- ПЛАНИРОВАНИЕ ---
addBtn.addEventListener('click', addItem);
addInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addItem(); });
addQtyInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addItem(); });
addPriceInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addItem(); });

function addItem() {
    const text = addInput.value.trim();
    const qtyValue = addQtyInput.value.trim();
    const unit = addUnitSelect.value;
    const priceValue = addPriceInput.value.trim();
    if (!text) return;

    const qty = qtyValue === '' ? 1 : parseFloat(qtyValue);
    const price = priceValue === '' ? null : parseFloat(priceValue);

    state.currentItems.push({
        id: Date.now().toString(),
        name: text,
        qty: isNaN(qty) ? 1 : qty,
        unit: unit,
        price: isNaN(price) ? null : price,
        checked: false
    });
    
    addInput.value = '';
    addQtyInput.value = '1';
    addUnitSelect.value = 'шт';
    addPriceInput.value = '';
    addInput.focus();
    renderPlanningList();
}

function renderPlanningList() {
    planningList.innerHTML = '';
    planningPrices.innerHTML = '';
    let sum = 0;
    
    state.currentItems.forEach(item => {
        const itemTotal = getItemTotal(item);
        sum += itemTotal;

        // Левая колонка
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
            <span class="item-name" title="${item.name}">${item.name}</span>
            <span class="item-qty">${getQtyLabel(item)}</span>
            <button class="delete-btn" onclick="deleteItem('${item.id}')">✕</button>
        `;
        planningList.appendChild(li);

        // Правая колонка — цена
        const priceLi = document.createElement('li');
        priceLi.textContent = item.price ? formatPrice(itemTotal) : '—';
        planningPrices.appendChild(priceLi);
    });
    
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
        name: `План от ${new Date().toLocaleDateString('ru-RU')}`,
        items: [...state.currentItems],
        date: new Date().toLocaleString('ru-RU'),
        createdAt: new Date().toISOString()
    };

    state.plans.push(newPlan);
    state.activePlanId = newPlan.id;
    
    saveToLocalStorage();
    renderShoppingList();
    document.getElementById('tab-shop').click();
    
    state.currentItems = [];
    renderPlanningList();
});

// --- ВЫПОЛНЕНИЕ ---
function renderShoppingList() {
    const activePlan = state.plans.find(p => p.id === state.activePlanId);
    
    if (!activePlan) {
        noActivePlan.classList.remove('hidden');
        activePlanContent.classList.add('hidden');
        return;
    }

    noActivePlan.classList.add('hidden');
    activePlanContent.classList.remove('hidden');

    shoppingList.innerHTML = '';
    shoppingPrices.innerHTML = '';
    
    let checkedCount = 0;
    let totalSum = 0;
    let spentSum = 0;

    activePlan.items.forEach(item => {
        const itemTotal = getItemTotal(item);
        if (item.checked) {
            checkedCount++;
            spentSum += itemTotal;
        }
        totalSum += itemTotal;
        
        // Левая колонка
        const li = document.createElement('li');
        li.className = `list-item ${item.checked ? 'done' : ''}`;
        const imgSrc = item.checked ? 'images/check_mark.png' : 'images/tick_a_box.png';
        li.innerHTML = `
            <img src="${imgSrc}" class="checkbox-img" onclick="toggleCheck('${item.id}')">
            <span class="item-name" title="${item.name}">${item.name}</span>
            <span class="item-qty">${getQtyLabel(item)}</span>
        `;
        shoppingList.appendChild(li);

        // Правая колонка — цена
        const priceLi = document.createElement('li');
        priceLi.textContent = item.price ? formatPrice(itemTotal) : '—';
        if (item.checked) priceLi.classList.add('done');
        shoppingPrices.appendChild(priceLi);
    });

    updateProgress(checkedCount, activePlan.items.length);
    updateTotalSum(spentSum, totalSum);
}

function updateTotalSum(spent, total) {
    if (total === 0) {
        totalSumText.textContent = 'Сумма не указана';
    } else if (Math.abs(spent - total) < 0.01) {
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

deleteActivePlanBtn.addEventListener('click', () => {
    if (!state.activePlanId) return;
    if (!confirm('Удалить текущий план? Его нельзя будет восстановить.')) return;

    state.plans = state.plans.filter(p => p.id !== state.activePlanId);
    state.activePlanId = null;
    saveToLocalStorage();
    renderShoppingList();
});

// --- МЕНЮ ---
menuBtn.addEventListener('click', () => {
    renderSavedPlans();
    renderStats();
    switchMenuTab('plans');
    sideMenu.classList.remove('hidden');
});

closeMenuBtn.addEventListener('click', () => {
    exitSelectMode();
    sideMenu.classList.add('hidden');
});

menuTabPlans.addEventListener('click', () => switchMenuTab('plans'));
menuTabStats.addEventListener('click', () => switchMenuTab('stats'));

function switchMenuTab(tab) {
    if (tab === 'plans') {
        menuTabPlans.classList.add('active');
        menuTabStats.classList.remove('active');
        menuPlansView.classList.remove('hidden');
        menuStatsView.classList.add('hidden');
        document.getElementById('plans-controls').classList.remove('hidden');
    } else {
        exitSelectMode();
        menuTabPlans.classList.remove('active');
        menuTabStats.classList.add('active');
        menuPlansView.classList.add('hidden');
        menuStatsView.classList.remove('hidden');
        document.getElementById('plans-controls').classList.add('hidden');
        renderStats();
    }
}

// --- РЕЖИМ ВЫБОРА ---
selectModeBtn.addEventListener('click', enterSelectMode);
cancelSelectBtn.addEventListener('click', exitSelectMode);
deleteSelectedBtn.addEventListener('click', deleteSelectedPlans);

function enterSelectMode() {
    state.selectMode = true;
    state.selectedPlans = [];
    selectModeBtn.classList.add('hidden');
    selectModeActions.classList.remove('hidden');
    renderSavedPlans();
}

function exitSelectMode() {
    state.selectMode = false;
    state.selectedPlans = [];
    selectModeBtn.classList.remove('hidden');
    selectModeActions.classList.add('hidden');
    renderSavedPlans();
}

function deleteSelectedPlans() {
    if (state.selectedPlans.length === 0) {
        alert('Выберите хотя бы один план для удаления');
        return;
    }

    const count = state.selectedPlans.length;
    if (!confirm(`Удалить ${count} ${pluralize(count, 'план', 'плана', 'планов')}?`)) return;

    state.plans = state.plans.filter(p => !state.selectedPlans.includes(p.id));
    
    if (state.activePlanId && state.selectedPlans.includes(state.activePlanId)) {
        state.activePlanId = null;
        renderShoppingList();
    }
    
    saveToLocalStorage();
    exitSelectMode();
    renderSavedPlans();
}

window.togglePlanSelection = function(planId) {
    if (state.selectedPlans.includes(planId)) {
        state.selectedPlans = state.selectedPlans.filter(id => id !== planId);
    } else {
        state.selectedPlans.push(planId);
    }
    renderSavedPlans();
};

// --- СПИСОК ПЛАНОВ ---
function renderSavedPlans() {
    savedPlansList.innerHTML = '';
    const reversedPlans = [...state.plans].reverse();
    
    if (reversedPlans.length === 0) {
        savedPlansList.innerHTML = '<p class="stats-empty">Пока нет сохранённых планов</p>';
        selectModeBtn.classList.add('hidden');
        return;
    }
    
    selectModeBtn.classList.remove('hidden');

    reversedPlans.forEach(plan => {
        const checked = plan.items.filter(i => i.checked).length;
        const total = plan.items.length;
        const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
        const planTotal = plan.items.reduce((acc, i) => acc + getItemTotal(i), 0);
        const planSpent = plan.items.filter(i => i.checked).reduce((acc, i) => acc + getItemTotal(i), 0);
        
        const li = document.createElement('li');
        li.className = 'plan-item';

        if (state.selectMode) {
            const isSelected = state.selectedPlans.includes(plan.id);
            const imgSrc = isSelected ? 'images/check_mark.png' : 'images/tick_a_box.png';
            li.classList.add('selectable');
            li.innerHTML = `
                <img src="${imgSrc}" class="plan-checkbox" onclick="togglePlanSelection('${plan.id}')">
                <div class="plan-content">
                    <h3>${plan.name}</h3>
                    <p>Куплено: ${checked} из ${total} (${percent}%)</p>
                    ${planTotal > 0 ? `<p class="plan-sum">${formatPrice(planSpent)} / ${formatPrice(planTotal)}</p>` : ''}
                    <div class="plan-progress"><div class="plan-progress-bar" style="width: ${percent}%"></div></div>
                </div>
            `;
        } else {
            li.innerHTML = `
                <h3>${plan.name}</h3>
                <p>Куплено: ${checked} из ${total} (${percent}%)</p>
                ${planTotal > 0 ? `<p class="plan-sum">${formatPrice(planSpent)} / ${formatPrice(planTotal)}</p>` : ''}
                <div class="plan-progress"><div class="plan-progress-bar" style="width: ${percent}%"></div></div>
                <button class="main-btn" style="margin-top: 10px; font-size: 14px; padding: 8px;" onclick="resumePlan('${plan.id}')">Выполнить снова</button>
            `;
        }
        savedPlansList.appendChild(li);
    });
}

window.resumePlan = function(planId) {
    const plan = state.plans.find(p => p.id === planId);
    if (!plan) return;

    const checkedCount = plan.items.filter(i => i.checked).length;
    if (checkedCount > 0 && checkedCount < plan.items.length) {
        if (!confirm('Этот план не доделан. Продолжить его или начать заново с нуля?')) {
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
    
    exitSelectMode();
    sideMenu.classList.add('hidden');
    renderShoppingList();
    document.getElementById('tab-shop').click();
};

// --- СТАТИСТИКА ---
prevMonthBtn.addEventListener('click', () => {
    state.statsMonth.setMonth(state.statsMonth.getMonth() - 1);
    renderStats();
});

nextMonthBtn.addEventListener('click', () => {
    state.statsMonth.setMonth(state.statsMonth.getMonth() + 1);
    renderStats();
});

function renderStats() {
    const year = state.statsMonth.getFullYear();
    const month = state.statsMonth.getMonth();
    
    const monthName = state.statsMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    currentMonthLabel.textContent = monthName;

    const monthPlans = state.plans.filter(plan => {
        const planDate = plan.createdAt ? new Date(plan.createdAt) : new Date(plan.date);
        return planDate.getFullYear() === year && planDate.getMonth() === month;
    });

    let totalSum = 0;
    monthPlans.forEach(plan => {
        plan.items.forEach(item => {
            if (item.checked) totalSum += getItemTotal(item);
        });
    });

    statsTotalSum.textContent = formatPrice(totalSum) || '0 ₽';
    statsPlansCount.textContent = `${monthPlans.length} ${pluralize(monthPlans.length, 'план', 'плана', 'планов')}`;

    statsPlansList.innerHTML = '';
    
    if (monthPlans.length === 0) {
        statsPlansList.innerHTML = '<p class="stats-empty">За этот месяц нет покупок</p>';
        return;
    }

    monthPlans.reverse().forEach(plan => {
        const checked = plan.items.filter(i => i.checked).length;
        const total = plan.items.length;
        const planSpent = plan.items.filter(i => i.checked).reduce((acc, i) => acc + getItemTotal(i), 0);
        const planTotal = plan.items.reduce((acc, i) => acc + getItemTotal(i), 0);
        
        const li = document.createElement('li');
        li.className = 'plan-item';
        li.style.cursor = 'pointer';
        li.onclick = () => window.openPlanDetails(plan.id);
        li.innerHTML = `
            <h3>${plan.name}</h3>
            <p>Куплено: ${checked} из ${total}</p>
            ${planTotal > 0 ? `<p class="plan-sum">${formatPrice(planSpent)} / ${formatPrice(planTotal)}</p>` : ''}
            <p style="font-size:12px; color:#4CAF50; margin-top:5px;">Нажмите, чтобы посмотреть детали ▸</p>
        `;
        statsPlansList.appendChild(li);
    });
}

// --- МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ПЛАНА ---
window.openPlanDetails = function(planId) {
    const plan = state.plans.find(p => p.id === planId);
    if (!plan) return;

    modalTitle.textContent = plan.name;
    modalDate.textContent = `Создан: ${plan.date || new Date(plan.createdAt).toLocaleString('ru-RU')}`;

    // Заполняем список продуктов
    modalItemsList.innerHTML = '';
    plan.items.forEach(item => {
        const li = document.createElement('li');
        const imgSrc = item.checked ? 'images/check_mark.png' : 'images/tick_a_box.png';
        li.innerHTML = `
            <img src="${imgSrc}" class="modal-item-check">
            <span class="modal-item-name ${item.checked ? 'checked' : ''}">${item.name}</span>
            <span class="modal-item-qty">${getQtyLabel(item)}</span>
            ${item.price ? `<span class="modal-item-price">${formatPrice(getItemTotal(item))}</span>` : ''}
        `;
        modalItemsList.appendChild(li);
    });

    // Считаем итоги
    const totalSum = plan.items.reduce((acc, i) => acc + getItemTotal(i), 0);
    const spentSum = plan.items.filter(i => i.checked).reduce((acc, i) => acc + getItemTotal(i), 0);
    const checkedCount = plan.items.filter(i => i.checked).length;

    modalSummary.innerHTML = `
        <p>Куплено: <b>${checkedCount} из ${plan.items.length}</b></p>
        ${totalSum > 0 ? `
            <p>Потрачено: <span class="modal-spent">${formatPrice(spentSum)}</span></p>
            <p>Всего по плану: <span class="modal-total">${formatPrice(totalSum)}</span></p>
        ` : ''}
    `;

    modal.classList.remove('hidden');
};

modalCloseBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});

// Клик по фону закрывает модалку
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});

// Esc закрывает модалку
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
    }
});

// --- ПАМЯТЬ ---
function saveToLocalStorage() {
    localStorage.setItem('korzinka_plans', JSON.stringify(state.plans));
    localStorage.setItem('korzinka_active_id', state.activePlanId || '');
}

function init() {
    renderShoppingList();
}

init();
