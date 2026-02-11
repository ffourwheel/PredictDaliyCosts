/**
 * Daily Expense Predictor - Frontend Logic
 */

// ===== Tab Navigation =====
const tabs = document.querySelectorAll('.nav-tab');
const contents = document.querySelectorAll('.tab-content');

function switchTab(tabName) {
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`content-${tabName}`).classList.add('active');

    // Load data for specific tabs
    if (tabName === 'history') loadRecords();
    if (tabName === 'train') checkModelStatus();
    if (tabName === 'predict') checkModelForPredict();
}

tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// ===== Toast Notification =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(60px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Set default date =====
document.getElementById('date').valueAsDate = new Date();

// ===== Track used dates =====
let usedDates = [];

async function loadUsedDates() {
    try {
        const res = await fetch('/api/used-dates');
        const data = await res.json();
        usedDates = data.dates;
        validateDateInput();
    } catch (err) {
        console.error('Error loading used dates:', err);
    }
}

function validateDateInput() {
    const dateInput = document.getElementById('date');
    const selectedDate = dateInput.value;
    const submitBtn = document.getElementById('submitRecord');
    const hint = document.getElementById('dateHint');

    if (usedDates.includes(selectedDate)) {
        dateInput.style.borderColor = '#ef4444';
        dateInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
        submitBtn.disabled = true;
        if (hint) {
            hint.textContent = '⚠️ วันนี้มีข้อมูลแล้ว กรุณาเลือกวันอื่น';
            hint.style.color = '#ef4444';
        }
    } else {
        dateInput.style.borderColor = '';
        dateInput.style.boxShadow = '';
        submitBtn.disabled = false;
        if (hint) {
            hint.textContent = 'เลือกวันที่ยังไม่เคยบันทึก';
            hint.style.color = '';
        }
    }
}

document.getElementById('date').addEventListener('change', validateDateInput);

// ===== Record Form =====
document.getElementById('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        date: document.getElementById('date').value,
        meals_out: document.getElementById('meals_out').value,
        travel_distance: document.getElementById('travel_distance').value,
        shopping_score: document.getElementById('shopping_score').value,
        activities: document.getElementById('activities').value,
        sleep_hours: document.getElementById('sleep_hours').value,
        daily_expense: document.getElementById('daily_expense').value,
    };

    // Client-side duplicate check
    if (usedDates.includes(formData.date)) {
        showToast('วันที่นี้มีข้อมูลแล้ว กรุณาเลือกวันอื่น', 'error');
        return;
    }

    try {
        const res = await fetch('/api/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        const data = await res.json();

        if (data.success) {
            showToast(data.message, 'success');
            e.target.reset();
            document.getElementById('date').valueAsDate = new Date();
            updateRecordCount();
            loadUsedDates();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
});

// ===== Update Record Count =====
async function updateRecordCount() {
    try {
        const res = await fetch('/api/records');
        const data = await res.json();
        const count = data.count;

        document.getElementById('recordCount').textContent = count;

        const progress = Math.min((count / 7) * 100, 100);
        document.getElementById('progressBar').style.width = progress + '%';

        const msgEl = document.getElementById('progressMessage');
        if (count >= 7) {
            msgEl.textContent = '✅ เก็บข้อมูลครบแล้ว! สามารถสร้างโมเดลได้';
            msgEl.style.color = '#6ee7b7';
        } else {
            msgEl.textContent = `ต้องเก็บข้อมูลอีก ${7 - count} วัน เพื่อสร้างโมเดล`;
            msgEl.style.color = '';
        }
    } catch (err) {
        console.error('Error updating count:', err);
    }
}

// ===== Load Records (History Tab) =====
async function loadRecords() {
    try {
        const res = await fetch('/api/records');
        const data = await res.json();
        const tbody = document.getElementById('historyBody');
        const empty = document.getElementById('emptyHistory');

        if (data.records.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';

        const featureLabels = {
            meals_out: 'มื้อ',
            travel_distance: 'กม.',
            shopping_score: 'คะแนน',
            activities: 'กิจกรรม',
            sleep_hours: 'ชม.',
        };

        tbody.innerHTML = data.records.map(r => `
            <tr>
                <td>${formatDate(r.date)}</td>
                <td>${r.meals_out}</td>
                <td>${r.travel_distance}</td>
                <td>${r.shopping_score}</td>
                <td>${r.activities}</td>
                <td>${r.sleep_hours}</td>
                <td style="font-weight:600; color:#f59e0b;">฿${Number(r.daily_expense).toLocaleString()}</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteRecord(${r.id})">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

// ===== Delete Record =====
async function deleteRecord(id) {
    if (!confirm('ต้องการลบข้อมูลนี้หรือไม่?')) return;

    try {
        const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, 'success');
            loadRecords();
            updateRecordCount();
            loadUsedDates();
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการลบ', 'error');
    }
}

// ===== Train Model =====
async function trainModel() {
    const btn = document.getElementById('trainBtn');
    const spinner = document.getElementById('trainSpinner');

    btn.style.display = 'none';
    spinner.style.display = 'flex';

    try {
        const res = await fetch('/api/train', { method: 'POST' });
        const data = await res.json();

        if (data.success) {
            showToast(data.message, 'success');
            displayMetrics(data.metrics);
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการสร้างโมเดล', 'error');
    } finally {
        btn.style.display = 'inline-flex';
        spinner.style.display = 'none';
    }
}

// ===== Display Metrics =====
function displayMetrics(metrics) {
    const panel = document.getElementById('metricsPanel');
    panel.style.display = 'block';

    document.getElementById('r2Train').textContent = metrics.r2_train;
    document.getElementById('r2Test').textContent = metrics.r2_test;
    document.getElementById('maeTest').textContent = metrics.mae_test.toLocaleString();
    document.getElementById('mseTest').textContent = metrics.mse_test.toLocaleString();
    document.getElementById('rmseTest').textContent = metrics.rmse_test.toLocaleString();

    // Coefficients
    const coefGrid = document.getElementById('coefGrid');
    const featureNames = {
        meals_out: 'มื้อนอกบ้าน',
        travel_distance: 'ระยะทาง',
        shopping_score: 'ช้อปปิ้ง',
        activities: 'กิจกรรม',
        sleep_hours: 'ชม.นอน',
    };

    coefGrid.innerHTML = Object.entries(metrics.coefficients).map(([name, value]) => `
        <div class="coef-item">
            <span class="coef-name">${featureNames[name] || name}</span>
            <span class="coef-value">${value >= 0 ? '+' : ''}${value}</span>
        </div>
    `).join('');

    document.getElementById('interceptValue').textContent = metrics.intercept;

    // Equation
    const eqParts = Object.entries(metrics.coefficients).map(([name, value]) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value} × ${featureNames[name]}`;
    });
    document.getElementById('modelEquation').textContent =
        `ค่าใช้จ่าย = ${metrics.intercept} ${eqParts.join(' ')}`;
}

// ===== Check Model Status =====
async function checkModelStatus() {
    try {
        const res = await fetch('/api/model-status');
        const data = await res.json();

        if (data.model_exists && data.metrics) {
            displayMetrics(data.metrics);
        }
    } catch (err) {
        console.error('Error checking model:', err);
    }
}

// ===== Predict Section =====
async function checkModelForPredict() {
    try {
        const res = await fetch('/api/model-status');
        const data = await res.json();

        const warning = document.getElementById('noModelWarning');
        if (!data.model_exists) {
            warning.style.display = 'block';
        } else {
            warning.style.display = 'none';
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

// ===== Predict Form =====
document.getElementById('predictForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        meals_out: document.getElementById('p_meals_out').value,
        travel_distance: document.getElementById('p_travel_distance').value,
        shopping_score: document.getElementById('p_shopping_score').value,
        activities: document.getElementById('p_activities').value,
        sleep_hours: document.getElementById('p_sleep_hours').value,
    };

    try {
        const res = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        const data = await res.json();

        if (data.success) {
            const resultCard = document.getElementById('predictionResult');
            resultCard.style.display = 'block';

            // Animate count up
            animateValue('predictedAmount', 0, data.prediction, 600);
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการทำนาย', 'error');
    }
});

// ===== Animate Counter =====
function animateValue(elementId, start, end, duration) {
    const el = document.getElementById(elementId);
    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + range * eased;

        el.textContent = Math.round(current).toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = Number(end).toLocaleString();
        }
    }

    requestAnimationFrame(update);
}

// ===== Initialize =====
updateRecordCount();
loadUsedDates();
