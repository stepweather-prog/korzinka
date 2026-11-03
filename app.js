// ===================== СОСТОЯНИЕ =====================
let state = {
    plans: JSON.parse(localStorage.getItem('korzinka_plans')) || [],
    history: JSON.parse(localStorage.getItem('korzinka_history')) || [],
    activePlanId: localStorage.getItem('korzinka_active_id') || null,
    currentItems: [],
    statsMonth: new Date(),
    selectMode: false,
    selectedPlans: []
};

const ITEMS_PER_PAGE = 10;

// ===================== DOM =====================
const tabs = document.querySelectorAll('.tab');
const views = document.querySelectorAll('.view');
const addInput = document.getElementById('new-item-input');
const addQtyInput = document.getElementById('new-qty-input');
const addUnitSelect = document.getElementById('new-unit-select');
const addPriceInput = document.getElementById('new-price-input');
const addBtn = document.getElementById('add-btn');

const planningPagesContainer = document.getElementById('planning-pages');
const shoppingPagesContainer = document.getElementById('shopping-pages');

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
const shareActivePlanBtn = document.getElementById('share-active-plan-btn');
const downloadActivePlanBtn = document.getElementById('download-active-plan-btn');

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
const clearStatsBtn = document.getElementById('clear-stats-btn');

const selectModeBtn = document.getElementById('select-mode-btn');
const selectModeActions = document.getElementById('select-mode-actions');
const cancelSelectBtn = document.getElementById('cancel-select-btn');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');

const modal = document.getElementById('plan-details-modal');
const modalTitle = document.getElementById('modal-plan-title');
const modalDate = document.getElementById('modal-plan-date');
const modalItemsList = document.getElementById('modal-items-list');
const modalSummary = document.getElementById('modal-plan-summary');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalShareBtn = document.getElementById('modal-share-btn');
const modalDownloadBtn = document.getElementById('modal-download-btn');

const sharePlanningBtn = document.getElementById('share-planning-btn');
const downloadPlanningBtn = document.getElementById('download-planning-btn');
const importPlanBtn = document.getElementById('import-plan-btn');
const importFileInput = document.getElementById('import-file-input');
const exportAllBtn = document.getElementById('export-all-btn');
const updateAppBtn = document.getElementById('update-app-btn');
const appVersionLabel = document.getElementById('app-version');

let modalCurrentPlanId = null;

// ===================== НАВИГАЦИЯ =====================
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        views.forEach(v => v.classList.remove('active'));
        const targetView = tab.id === 'tab-plan' ? 'view-plan' : 'view-shop';
        document.getElementById(targetView).classList.add('active');
    });
});

// ===================== ХЕЛПЕРЫ =====================
function formatPrice(price) {
    if (!price && price !== 0) return '';
    return new Intl.NumberFormat('ru-RU', { 
        style: 'currency', currency: 'RUB', maximumFractionDigits: 0 
    }).format(price);
}

function pluralize(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

function getItemTotal(item) {
    if (!item.price) return 0;
    const qty = item.qty ? parseFloat(item.qty) : 1;
    return item.price * (isNaN(qty) ? 1 : qty);
}

function getQtyLabel(item) {
    if (!item.qty && item.qty !== 0) return '';
    return `${item.qty} ${item.unit || 'шт'}`;
}

function chunk(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ===================== СЕРИАЛИЗАЦИЯ =====================
function encodePlan(plan) {
    const payload = {
        n: plan.name,
        d: plan.date,
        c: plan.createdAt,
        i: plan.items.map(it => ({
            n: it.name,
            q: it.qty,
            u: it.unit,
            p: it.price,
            ch: it.checked
        }))
    };
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodePlan(encoded) {
    try {
        const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const json = new TextDecoder().decode(bytes);
        const payload = JSON.parse(json);
        return {
            name: payload.n || 'Импортированный план',
            date: payload.d || new Date().toLocaleString('ru-RU'),
            createdAt: payload.c || new Date().toISOString(),
            items: (payload.i || []).map(it => ({
                id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
                name: it.n,
                qty: it.q,
                unit: it.u,
                price: it.p,
                checked: !!it.ch,
                selectedForDeletion: false
            }))
        };
    } catch (e) {
        console.error('Ошибка импорта:', e);
        return null;
    }
}

// ===================== ПОДЕЛИТЬСЯ =====================
function sharePlan(plan) {
    if (!plan || !plan.items || plan.items.length === 0) {
        alert('Список пуст, нечем делиться');
        return;
    }
    const encoded = encodePlan(plan);
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?import=${encoded}`;

    if (navigator.share) {
        navigator.share({
            title: 'Корзинка — ' + plan.name,
            text: 'Мой список покупок',
            url: shareUrl
        }).catch(() => fallbackCopy(shareUrl));
    } else {
        fallbackCopy(shareUrl);
    }
}

function fallbackCopy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Ссылка скопирована в буфер обмена. Отправь её на другое устройство.');
        }).catch(() => prompt('Скопируйте ссылку вручную:', text));
    } else {
        prompt('Скопируйте ссылку вручную:', text);
    }
}

// ===================== СКАЧИВАНИЕ =====================
function downloadPlan(plan) {
    if (!plan || !plan.items || plan.items.length === 0) {
        alert('Список пуст, нечего скачивать');
        return;
    }
    
    const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        plan: {
            name: plan.name,
            date: plan.date,
            createdAt: plan.createdAt,
            items: plan.items.map(it => ({
                name: it.name,
                qty: it.qty,
                unit: it.unit,
                price: it.price,
                checked: it.checked
            }))
        }
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = plan.name.replace(/[^\wа-яёА-ЯЁ\-]+/gi, '_').slice(0, 40) || 'korzinka-plan';
    a.href = url;
    a.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===================== ЭКСПОРТ ВСЕХ ПЛАНОВ =====================
function exportAllPlans() {
    if (state.plans.length === 0 && state.history.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }

    const exportData = {
        version: 1,
        type: 'korzinka-full-backup',
        exportedAt: new Date().toISOString(),
        plans: state.plans.map(p => ({
            name: p.name,
            date: p.date,
            createdAt: p.createdAt,
            items: p.items.map(it => ({
                name: it.name, qty: it.qty, unit: it.unit, price: it.price, checked: it.checked
            }))
        })),
        history: state.history.map(p => ({
            name: p.name,
            date: p.date,
            createdAt: p.createdAt,
            completedAt: p.completedAt,
            originalPlanId: p.originalPlanId,
            items: p.items.map(it => ({
                name: it.name, qty: it.qty, unit: it.unit, price: it.price, checked: it.checked
            }))
        }))
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `korzinka-all-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
// ===================== ИМПОРТ ИЗ ФАЙЛА =====================
function importPlanFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Определяем тип файла
            if (data.type === 'korzinka-full-backup' && (data.plans || data.history)) {
                importFullBackup(data);
            } else {
                importSinglePlan(data.plan || data);
            }
        } catch (err) {
            console.error(err);
            alert('Не удалось прочитать файл. Убедитесь, что это .json-файл из Корзинки.');
        }
    };
    reader.readAsText(file);
}

function importSinglePlan(rawPlan) {
    if (!rawPlan.items || !Array.isArray(rawPlan.items)) {
        alert('В файле нет корректного списка товаров');
        return;
    }

    const imported = {
        id: Date.now().toString(),
        name: rawPlan.name || 'Импортированный план',
        date: rawPlan.date || new Date().toLocaleString('ru-RU'),
        createdAt: rawPlan.createdAt || new Date().toISOString(),
        items: rawPlan.items.map(it => ({
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            name: it.name || it.n || 'Товар',
            qty: it.qty || it.q || 1,
            unit: it.unit || it.u || 'шт',
            price: (typeof it.price !== 'undefined' ? it.price : (typeof it.p !== 'undefined' ? it.p : null)),
            checked: !!(it.checked || it.ch),
            selectedForDeletion: false
        }))
    };

    state.plans.push(imported);
    state.activePlanId = imported.id;
    saveToLocalStorage();

    renderSavedPlans();
    renderShoppingList();
    document.getElementById('tab-shop').click();
    alert(`План «${imported.name}» импортирован (${imported.items.length} позиций)`);
}

function importFullBackup(data) {
    const plans = data.plans || [];
    const history = data.history || [];

    if (plans.length === 0 && history.length === 0) {
        alert('В файле нет данных для импорта');
        return;
    }

    const hasExisting = state.plans.length > 0 || state.history.length > 0;
    const replace = hasExisting
        ? confirm(
            `Найдено: ${plans.length} планов и ${history.length} записей истории.\n\n` +
            `ОК = добавить к существующим (объединить).\n` +
            `Отмена = заменить всё текущее.`
        )
        : true;

    const mapPlan = (p, isHistory) => ({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        name: p.name,
        date: p.date,
        createdAt: p.createdAt,
        completedAt: isHistory ? p.completedAt : undefined,
        originalPlanId: isHistory ? p.originalPlanId : undefined,
        items: (p.items || []).map(it => ({
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            name: it.name,
            qty: it.qty,
            unit: it.unit,
            price: it.price,
            checked: !!it.checked,
            selectedForDeletion: false
        }))
    });

    const newPlans = plans.map(p => mapPlan(p, false));
    const newHistory = history.map(p => mapPlan(p, true));

    if (replace) {
        state.plans = newPlans;
        state.history = newHistory;
        state.activePlanId = null;
    } else {
        state.plans = state.plans.concat(newPlans.map(p => ({ ...p, name: p.name + ' (импорт)' })));
        state.history = state.history.concat(newHistory);
    }

    saveToLocalStorage();
    renderSavedPlans();
    renderStats();
    renderShoppingList();
    alert(`Импортировано: ${plans.length} планов, ${history.length} записей истории.`);
}

// ===================== ИМПОРТ ИЗ URL =====================
function checkImportFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('import');
    if (!encoded) return;

    const imported = decodePlan(encoded);
    if (!imported) {
        alert('Не удалось прочитать план из ссылки');
        window.history.replaceState({}, '', window.location.pathname);
        return;
    }

    const hashKey = 'korzinka_imported_' + encoded.slice(0, 16);
    if (localStorage.getItem(hashKey)) {
        window.history.replaceState({}, '', window.location.pathname);
        return;
    }
    localStorage.setItem(hashKey, '1');

    const newPlan = {
        id: Date.now().toString(),
        name: imported.name,
        date: imported.date,
        createdAt: imported.createdAt,
        items: imported.items
    };
    state.plans.push(newPlan);
    state.activePlanId = newPlan.id;
    saveToLocalStorage();

    window.history.replaceState({}, '', window.location.pathname);

    renderSavedPlans();
    renderShoppingList();
    document.getElementById('tab-shop').click();
    setTimeout(() => {
        alert(`План «${newPlan.name}» добавлен на это устройство.`);
    }, 300);
}

// ===================== ПЛАНИРОВАНИЕ =====================
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
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        name: text,
        qty: isNaN(qty) ? 1 : qty,
        unit: unit,
        price: isNaN(price) ? null : price,
        checked: false,
        selectedForDeletion: false
    });
    
    addInput.value = '';
    addQtyInput.value = '1';
    addUnitSelect.value = 'шт';
    addPriceInput.value = '';
    addInput.focus();
    renderPlanningList();
}

function renderPlanningList() {
    let sum = 0;
    state.currentItems.forEach(item => sum += getItemTotal(item));

    const title = document.getElementById('plan-title');
    title.textContent = sum > 0 ? `Новый список (${formatPrice(sum)})` : 'Новый список';

    const selectedCount = state.currentItems.filter(i => i.selectedForDeletion).length;
    const controls = document.getElementById('planning-controls');
    
    if (state.currentItems.length === 0) {
        planningPagesContainer.innerHTML = '';
        controls.classList.add('hidden');
        return;
    }
    
    if (selectedCount > 0) {
        controls.classList.remove('hidden');
        document.getElementById('delete-selected-items-btn').textContent = `🗑 Удалить выбранные (${selectedCount})`;
    } else {
        controls.classList.add('hidden');
    }

    const pages = chunk(state.currentItems, ITEMS_PER_PAGE);
    renderPages(planningPagesContainer, pages, 'planning');
}

window.updatePlanningQty = function(id, value) {
    const item = state.currentItems.find(i => i.id === id);
    if (!item) return;
    const qty = parseFloat(value);
    item.qty = isNaN(qty) || qty < 0 ? 1 : qty;
    renderPlanningList();
};

window.updatePlanningPrice = function(id, value) {
    const item = state.currentItems.find(i => i.id === id);
    if (!item) return;
    const price = parseFloat(value);
    item.price = isNaN(price) || price < 0 ? null : price;
    renderPlanningList();
};

window.togglePlanningSelect = function(id) {
    const item = state.currentItems.find(i => i.id === id);
    if (!item) return;
    item.selectedForDeletion = !item.selectedForDeletion;
    renderPlanningList();
};

document.getElementById('delete-selected-items-btn').addEventListener('click', () => {
    const selectedCount = state.currentItems.filter(i => i.selectedForDeletion).length;
    if (selectedCount === 0) return;
    if (!confirm(`Удалить ${selectedCount} ${pluralize(selectedCount, 'позицию', 'позиции', 'позиций')}?`)) return;
    
    state.currentItems = state.currentItems.filter(i => !i.selectedForDeletion);
    renderPlanningList();
});

startShoppingBtn.addEventListener('click', () => {
    if (state.currentItems.length === 0) {
        alert('Сначала добавьте продукты!');
        return;
    }

    const itemsToSave = state.currentItems.map(i => ({ ...i, selectedForDeletion: false }));

    const newPlan = {
        id: Date.now().toString(),
        name: `План от ${new Date().toLocaleDateString('ru-RU')}`,
        items: itemsToSave,
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

sharePlanningBtn.addEventListener('click', () => {
    if (state.currentItems.length === 0) {
        alert('Сначала добавьте продукты');
        return;
    }
    const planToShare = {
        name: `План от ${new Date().toLocaleDateString('ru-RU')}`,
        date: new Date().toLocaleString('ru-RU'),
        createdAt: new Date().toISOString(),
        items: state.currentItems
    };
    sharePlan(planToShare);
});

downloadPlanningBtn.addEventListener('click', () => {
    if (state.currentItems.length === 0) {
        alert('Сначала добавьте продукты');
        return;
    }
    const planToSave = {
        name: `План от ${new Date().toLocaleDateString('ru-RU')}`,
        date: new Date().toLocaleString('ru-RU'),
        createdAt: new Date().toISOString(),
        items: state.currentItems
    };
    downloadPlan(planToSave);
});

// ===================== ВЫПОЛНЕНИЕ =====================
function renderShoppingList() {
    const activePlan = state.plans.find(p => p.id === state.activePlanId);
    
    if (!activePlan || activePlan.items.length === 0) {
        noActivePlan.classList.remove('hidden');
        activePlanContent.classList.add('hidden');
        shoppingPagesContainer.innerHTML = '';
        return;
    }

    noActivePlan.classList.add('hidden');
    activePlanContent.classList.remove('hidden');

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
    });

    const pages = chunk(activePlan.items, ITEMS_PER_PAGE);
    renderPages(shoppingPagesContainer, pages, 'shopping');

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

        const allChecked = activePlan.items.length > 0 && activePlan.items.every(i => i.checked);
        
        // Ищем запись в истории именно для ЭТОГО activePlan (по его id)
        const existingIdx = state.history.findIndex(h => h.id === activePlan.id);

        if (allChecked) {
            const historyEntry = {
                ...activePlan,
                id: existingIdx >= 0 ? state.history[existingIdx].id : (activePlan.id + '-' + Date.now()),
                originalPlanId: activePlan.id,
                completedAt: new Date().toISOString()
            };

            if (existingIdx >= 0) {
                state.history[existingIdx] = historyEntry;
            } else {
                state.history.push(historyEntry);
            }
        } else if (existingIdx >= 0) {
            state.history.splice(existingIdx, 1);
        }

        saveToLocalStorage();
        renderShoppingList();
        renderStats();
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

shareActivePlanBtn.addEventListener('click', () => {
    const activePlan = state.plans.find(p => p.id === state.activePlanId);
    if (!activePlan) {
        alert('Нет активного плана');
        return;
    }
    sharePlan(activePlan);
});

downloadActivePlanBtn.addEventListener('click', () => {
    const activePlan = state.plans.find(p => p.id === state.activePlanId);
    if (!activePlan) {
        alert('Нет активного плана');
        return;
    }
    downloadPlan(activePlan);
});

// ===================== РЕНДЕР СТРАНИЦ =====================
function renderPages(container, pages, mode) {
    container.innerHTML = '';

    pages.forEach((pageItems, pageIndex) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'list-wrapper';

        const bg = document.createElement('img');
        bg.src = 'images/list.png';
        bg.alt = 'Листик';
        bg.className = 'list-bg';
        wrapper.appendChild(bg);

        const textPanel = document.createElement('div');
        textPanel.className = 'text-panel';
        const ul = document.createElement('ul');
        ul.className = 'items-list';
        ul.id = `${mode}-list-${pageIndex}`;

        pageItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'list-item' + (item.checked ? ' done' : '');

            if (mode === 'planning') {
                const imgSrc = item.selectedForDeletion ? 'images/check_mark.png' : 'images/tick_a_box.png';
                li.innerHTML = `
                    <img src="${imgSrc}" class="item-checkbox" onclick="togglePlanningSelect('${item.id}')" alt="">
                    <span class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
                    <input type="number" class="item-qty-input" value="${item.qty}" min="0" step="0.001"
                           onchange="updatePlanningQty('${item.id}', this.value)" placeholder="Кол-во">
                    <span class="item-qty">${item.unit}</span>
                    <input type="number" class="item-price-input" value="${item.price || ''}" min="0" step="0.01"
                           onchange="updatePlanningPrice('${item.id}', this.value)" placeholder="₽">
                `;
            } else {
                const imgSrc = item.checked ? 'images/check_mark.png' : 'images/tick_a_box.png';
                li.innerHTML = `
                    <img src="${imgSrc}" class="checkbox-img" onclick="toggleCheck('${item.id}')" alt="">
                    <span class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
                    <span class="item-qty">${getQtyLabel(item)}</span>
                    <span class="item-price-display">${item.price ? formatPrice(getItemTotal(item)) : '—'}</span>
                `;
            }
            ul.appendChild(li);
        });

        textPanel.appendChild(ul);
        wrapper.appendChild(textPanel);
        container.appendChild(wrapper);
    });
}

// ===================== МЕНЮ =====================
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

// ===================== ИМПОРТ =====================
importPlanBtn.addEventListener('click', () => {
    importFileInput.value = '';
    importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importPlanFromFile(file);
});
exportAllBtn.addEventListener('click', exportAllPlans);
// ===================== РЕЖИМ ВЫБОРА ПЛАНОВ =====================
selectModeBtn.addEventListener('click', enterSelectMode);
cancelSelectBtn.addEventListener('click', exitSelectMode);
deleteSelectedBtn.addEventListener('click', deleteSelectedPlans);

function enterSelectMode() {
    state.selectMode = true;
    state.selectedPlans = [];
    selectModeBtn.classList.add('hidden');
    importPlanBtn.classList.add('hidden');
    selectModeActions.classList.remove('hidden');
    renderSavedPlans();
}

function exitSelectMode() {
    state.selectMode = false;
    state.selectedPlans = [];
    selectModeBtn.classList.remove('hidden');
    importPlanBtn.classList.remove('hidden');
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

// ===================== СПИСОК ПЛАНОВ =====================
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
                    <h3>${escapeHtml(plan.name)}</h3>
                    <p>Куплено: ${checked} из ${total} (${percent}%)</p>
                    ${planTotal > 0 ? `<p class="plan-sum">${formatPrice(planSpent)} / ${formatPrice(planTotal)}</p>` : ''}
                    <div class="plan-progress"><div class="plan-progress-bar" style="width: ${percent}%"></div></div>
                </div>
            `;
        } else {
            li.innerHTML = `
                <h3>${escapeHtml(plan.name)}</h3>
                <p>Куплено: ${checked} из ${total} (${percent}%)</p>
                ${planTotal > 0 ? `<p class="plan-sum">${formatPrice(planSpent)} / ${formatPrice(planTotal)}</p>` : ''}
                <div class="plan-progress"><div class="plan-progress-bar" style="width: ${percent}%"></div></div>
                <div style="display:flex; gap:5px; margin-top:10px; flex-wrap:wrap;">
                    <button class="main-btn" style="font-size: 14px; padding: 8px; margin:0; flex:1; min-width:130px;" onclick="resumePlan('${plan.id}')">Выполнить снова</button>
                    <button class="share-plan-small" onclick="shareSavedPlan('${plan.id}')">🔗</button>
                    <button class="share-plan-small" style="background: rgba(76, 175, 80, 0.9);" onclick="downloadSavedPlan('${plan.id}')">💾</button>
                </div>
            `;
        }
        savedPlansList.appendChild(li);
    });
}

window.shareSavedPlan = function(planId) {
    const plan = state.plans.find(p => p.id === planId);
    if (!plan) return;
    sharePlan(plan);
};

window.downloadSavedPlan = function(planId) {
    const plan = state.plans.find(p => p.id === planId);
    if (!plan) return;
    downloadPlan(plan);
};

// ===================== ВЫПОЛНИТЬ СНОВА =====================
window.resumePlan = function(planId) {
    const plan = state.plans.find(p => p.id === planId);
    if (!plan) return;

    // Копируем товары плана в «Планирование» (в currentItems)
    state.currentItems = plan.items.map(i => ({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        name: i.name,
        qty: i.qty,
        unit: i.unit,
        price: i.price,
        checked: false,
        selectedForDeletion: false
    }));

    // Сбрасываем активный план (чтобы не путать)
    state.activePlanId = null;
    saveToLocalStorage();
    renderPlanningList();
    renderShoppingList();

    exitSelectMode();
    sideMenu.classList.add('hidden');

    // Переключаемся на «Планирование»
    document.getElementById('tab-plan').click();
};

// ===================== СТАТИСТИКА =====================
prevMonthBtn.addEventListener('click', () => {
    state.statsMonth.setMonth(state.statsMonth.getMonth() - 1);
    renderStats();
});

nextMonthBtn.addEventListener('click', () => {
    state.statsMonth.setMonth(state.statsMonth.getMonth() + 1);
    renderStats();
});

clearStatsBtn.addEventListener('click', () => {
    const year = state.statsMonth.getFullYear();
    const month = state.statsMonth.getMonth();
    
    const monthPlans = state.history.filter(plan => {
        const planDate = new Date(plan.completedAt || plan.createdAt || plan.date);
        return planDate.getFullYear() === year && planDate.getMonth() === month;
    });

    if (monthPlans.length === 0) {
        alert('За этот месяц нет планов для удаления');
        return;
    }

    const monthName = state.statsMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    if (!confirm(`Удалить историю за ${monthName} (${monthPlans.length} шт.)?`)) return;

    const idsToRemove = monthPlans.map(p => p.id);
    state.history = state.history.filter(p => !idsToRemove.includes(p.id));
    saveToLocalStorage();
    renderStats();
});

function renderStats() {
    const year = state.statsMonth.getFullYear();
    const month = state.statsMonth.getMonth();
    
    const monthName = state.statsMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    currentMonthLabel.textContent = monthName;

    const monthPlans = state.history.filter(plan => {
        const planDate = new Date(plan.completedAt || plan.createdAt || plan.date);
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

    monthPlans.slice().reverse().forEach(plan => {
        const checked = plan.items.filter(i => i.checked).length;
        const total = plan.items.length;
        const planSpent = plan.items.filter(i => i.checked).reduce((acc, i) => acc + getItemTotal(i), 0);
        const planTotal = plan.items.reduce((acc, i) => acc + getItemTotal(i), 0);
        
        const li = document.createElement('li');
        li.className = 'plan-item';
        li.innerHTML = `
            <button class="delete-plan-btn" onclick="deletePlanFromStats('${plan.id}', event)" title="Удалить">✕</button>
            <div onclick="window.openPlanDetails('${plan.id}')" style="cursor:pointer;">
                <h3>${escapeHtml(plan.name)}</h3>
                <p>Куплено: ${checked} из ${total}</p>
                ${planTotal > 0 ? `<p class="plan-sum">${formatPrice(planSpent)} / ${formatPrice(planTotal)}</p>` : ''}
                <p style="font-size:12px; color:#4CAF50; margin-top:5px;">Нажмите, чтобы посмотреть детали ▸</p>
            </div>
        `;
        statsPlansList.appendChild(li);
    });
}

window.deletePlanFromStats = function(planId, event) {
    event.stopPropagation();
    if (!confirm('Удалить этот план из статистики?')) return;
    
    state.history = state.history.filter(p => p.id !== planId);
    saveToLocalStorage();
    renderStats();
};

// ===================== МОДАЛЬНОЕ ОКНО =====================
window.openPlanDetails = function(planId) {
    const plan = state.plans.find(p => p.id === planId) || state.history.find(p => p.id === planId);
    if (!plan) return;

    modalCurrentPlanId = planId;
    modalTitle.textContent = plan.name;
    modalDate.textContent = `Создан: ${plan.date || new Date(plan.createdAt).toLocaleString('ru-RU')}`;

    renderModalItems(plan);
    modal.classList.remove('hidden');
};

function renderModalItems(plan) {
    modalItemsList.innerHTML = '';
    plan.items.forEach(item => {
        const li = document.createElement('li');
        const imgSrc = item.checked ? 'images/check_mark.png' : 'images/tick_a_box.png';
        const totalPrice = item.price ? formatPrice(getItemTotal(item)) : '—';
        li.innerHTML = `
            <img src="${imgSrc}" class="modal-item-check">
            <span class="modal-item-name ${item.checked ? 'checked' : ''}">${escapeHtml(item.name)}</span>
            <input type="number" class="modal-item-qty-input" value="${item.qty}" min="0" step="0.001"
                   onchange="updateModalQty('${item.id}', this.value)" placeholder="Кол-во">
            <span class="item-qty" style="font-size:11px;">${item.unit || 'шт'}</span>
            <input type="number" class="modal-item-price-input" value="${item.price || ''}" min="0" step="0.01"
                   onchange="updateModalPrice('${item.id}', this.value)" placeholder="₽">
            <div class="modal-item-price-info">
                <span class="modal-item-total">${totalPrice}</span>
            </div>
        `;
        modalItemsList.appendChild(li);
    });

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
}

window.updateModalQty = function(itemId, value) {
    let plan = state.plans.find(p => p.id === modalCurrentPlanId);
    if (!plan) plan = state.history.find(p => p.id === modalCurrentPlanId);
    if (!plan) return;

    const item = plan.items.find(i => i.id === itemId);
    if (!item) return;

    const qty = parseFloat(value);
    item.qty = isNaN(qty) || qty < 0 ? 1 : qty;
    saveToLocalStorage();
    renderModalItems(plan);
    
    if (plan.id === state.activePlanId) renderShoppingList();
    renderStats();
    renderSavedPlans();
};

window.updateModalPrice = function(itemId, value) {
    let plan = state.plans.find(p => p.id === modalCurrentPlanId);
    if (!plan) plan = state.history.find(p => p.id === modalCurrentPlanId);
    if (!plan) return;

    const item = plan.items.find(i => i.id === itemId);
    if (!item) return;

    const price = parseFloat(value);
    item.price = isNaN(price) || price < 0 ? null : price;
    saveToLocalStorage();
    renderModalItems(plan);
    
    if (plan.id === state.activePlanId) renderShoppingList();
    renderStats();
    renderSavedPlans();
};

modalCloseBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});

modalSaveBtn.addEventListener('click', () => {
    saveToLocalStorage();
    modal.classList.add('hidden');
    renderSavedPlans();
    renderStats();
    if (state.activePlanId === modalCurrentPlanId) renderShoppingList();
});

modalShareBtn.addEventListener('click', () => {
    if (!modalCurrentPlanId) return;
    const plan = state.plans.find(p => p.id === modalCurrentPlanId)
             || state.history.find(p => p.id === modalCurrentPlanId);
    if (!plan) return;
    sharePlan(plan);
});

modalDownloadBtn.addEventListener('click', () => {
    if (!modalCurrentPlanId) return;
    const plan = state.plans.find(p => p.id === modalCurrentPlanId)
             || state.history.find(p => p.id === modalCurrentPlanId);
    if (!plan) return;
    downloadPlan(plan);
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
    }
});

// ===================== ОБНОВЛЕНИЕ =====================
let currentVersion = localStorage.getItem('korzinka_version') || null;

if (appVersionLabel) {
    appVersionLabel.textContent = currentVersion || 'dev';
}

async function checkLatestVersion() {
    try {
        const res = await fetch('sw.js?_=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return null;
        const text = await res.text();
        const match = text.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

async function clearAllCaches() {
    if (!('caches' in window)) return;
    try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        console.log('Все кэши удалены:', keys);
    } catch (e) {
        console.error('Ошибка очистки кэшей:', e);
    }
}

if (updateAppBtn) {
    updateAppBtn.addEventListener('click', async () => {
        if (!('serviceWorker' in navigator)) {
            updateAppBtn.textContent = '⏳ Чищу кэш...';
            await clearAllCaches();
            window.location.reload();
            return;
        }

        updateAppBtn.textContent = '⏳ Проверяю...';
        updateAppBtn.disabled = true;

        const latest = await checkLatestVersion();

        if (!latest) {
            alert('Не удалось проверить новую версию (нет интернета?)');
            updateAppBtn.textContent = '🔄 Обновить приложение';
            updateAppBtn.disabled = false;
            return;
        }

        // Всегда сохраняем последнюю версию
        localStorage.setItem('korzinka_version', latest);

        updateAppBtn.textContent = '⏳ Обновляю...';

        try {
            const reg = await navigator.serviceWorker.getRegistration();

            if (reg) {
                try { await reg.update(); } catch (e) { console.log('update failed', e); }

                if (reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    await new Promise(r => setTimeout(r, 800));
                }

                if (reg.installing) {
                    await new Promise(r => setTimeout(r, 800));
                }
            }

            // Принудительно чистим все кэши
            await clearAllCaches();

            await new Promise(r => setTimeout(r, 300));

            // Перезагружаем с обходом кэша браузера
            const url = new URL(window.location.href);
            url.searchParams.set('_v', Date.now());
            window.location.href = url.toString();

        } catch (e) {
            console.error('Ошибка при обновлении:', e);
            await clearAllCaches();
            window.location.reload();
        }
    });
}

(async function silentVersionCheck() {
    if (!('serviceWorker' in navigator)) return;
    const latest = await checkLatestVersion();
    if (latest && currentVersion && latest !== currentVersion) {
        if (updateAppBtn) {
            updateAppBtn.style.background = '#f44336';
            updateAppBtn.textContent = '🔄 Доступно обновление!';
        }
    }
    if (latest && !currentVersion) {
        currentVersion = latest;
        localStorage.setItem('korzinka_version', latest);
        if (appVersionLabel) appVersionLabel.textContent = latest;
    }
})();

// Очищаем ?_v= из URL после перезагрузки
(function cleanUrlParam() {
    const url = new URL(window.location.href);
    if (url.searchParams.has('_v')) {
        url.searchParams.delete('_v');
        window.history.replaceState({}, '', url.toString());
    }
})();
// ===================== ПАМЯТЬ =====================
function saveToLocalStorage() {
    localStorage.setItem('korzinka_plans', JSON.stringify(state.plans));
    localStorage.setItem('korzinka_history', JSON.stringify(state.history));
    localStorage.setItem('korzinka_active_id', state.activePlanId || '');
}

// ===================== СТАРТ =====================
async function init() {
    checkImportFromUrl();
    renderPlanningList();
    renderShoppingList();

    if (!localStorage.getItem('korzinka_version') && 'serviceWorker' in navigator) {
        const latest = await checkLatestVersion();
        if (latest) {
            localStorage.setItem('korzinka_version', latest);
            currentVersion = latest;
            if (appVersionLabel) appVersionLabel.textContent = latest;
        }
    }
}

init();
