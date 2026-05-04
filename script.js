// SwichUI Dashboard Logic - Admin & Navigation Edition

// --- SUPABASE CONFIGURATION ---
// IMPORTANT: Replace these with your actual Supabase Project URL and Anon Key
const SUPABASE_URL = 'https://meczixzzigxmddaqgwcf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lY3ppeHp6aWd4bWRkYXFnd2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTE1MDQsImV4cCI6MjA5MzEyNzUwNH0.dS4ESi-K3865LkXxfJOvVqrTQqvYL4QWOIVhznHYzFQ';

let supabaseClient = null;
if (window.supabase) {
    // Initialize Supabase if CDN is loaded
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Initial Data & State Management (Fallback if Supabase is not connected)
let projects = JSON.parse(localStorage.getItem('swichui_projects')) || [
    { id: 1, client: "UMKM Kopi A", service: "Logo Design", priority: "Urgent", revisions: 4, status: "Revisi", value: 3500000, dp: 1500000, deadline: "2024-05-01", contact: "+62 812-3456-7890" },
    { id: 2, client: "Batik Rahmat", service: "Instagram Feed", priority: "Medium", revisions: 2, status: "Sketsa", value: 2000000, dp: 500000, deadline: "2024-05-10", contact: "+62 812-9876-5432" }
];

// --- SESSION SECURITY CONFIG ---
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 Menit (dalam milidetik)
let logoutTimer;

const statusProgressMap = {
    "Briefing": 20,
    "Sketsa": 40,
    "Desain Final": 60,
    "Revisi": 80,
    "Selesai": 100
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    setupAuthListeners();
    await checkAuth();
});

async function checkAuth() {
    // If Supabase is configured, check session
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            showDashboard();
            await fetchProjectsFromSupabase();
            initApp();
            startSessionTimer(); // Mulai timer keamanan
        } else {
            showLogin();
        }
    } else {
        // DEV MODE / NO SUPABASE: Skip login for now or use dummy login
        // To force login screen in dev mode, we just show it.
        showLogin();
    }
}

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function setupAuthListeners() {
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');
            errorDiv.style.display = 'none';

            if (!email || !password) {
                errorDiv.innerText = 'Mohon isi email dan password.';
                errorDiv.style.display = 'block';
                return;
            }

            btnLogin.innerText = 'Loading...';
            btnLogin.disabled = true;

            try {
                // Dummy login for preview without Supabase
                if (!supabaseClient) {
                    if (email === 'admin@swichui.com' && password === 'admin123') {
                        showDashboard();
                        initApp();
                    } else {
                        errorDiv.innerText = 'Error: Supabase tidak terhubung. Gunakan admin@swichui.com / admin123 untuk demo.';
                        errorDiv.style.display = 'block';
                    }
                    btnLogin.innerText = 'Login';
                    btnLogin.disabled = false;
                    return;
                }

                // Real Supabase Auth
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    errorDiv.innerText = error.message;
                    errorDiv.style.display = 'block';
                } else {
                    showDashboard();
                    await fetchProjectsFromSupabase();
                    initApp();
                    startSessionTimer(); // Mulai timer keamanan
                }
            } catch (err) {
                errorDiv.innerText = 'Koneksi error: ' + err.message;
                errorDiv.style.display = 'block';
            }

            btnLogin.innerText = 'Login';
            btnLogin.disabled = false;
        });
    }
}

async function fetchProjectsFromSupabase() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient.from('orders').select('*');
    if (error) {
        console.error('Error fetching data from Supabase:', error);
    } else if (data) {
        projects = data.map(row => ({
            id: row.id,
            client: row.nama_klien || "Unknown",
            namaBrand: row.nama_brand || "-",
            service: row.jenis_layanan || "Lainnya",
            priority: row.priority || "Medium",
            revisions: row.revisions || 0,
            status: row.status || "Briefing",
            value: row.harga_total || 0,
            dp: row.dp || 0,
            deadline: row.deadline || "-",
            contact: row.kontak_wa || "-",
            targetAudiens: row.target_audiens || "-",
            briefDesain: row.brief_desain || "",
            referensiDesain: row.referensi_desain || "",
            fileAsset: row.file_asset || ""
        }));
    }
}

// --- SECURITY LOGIC ---
function startSessionTimer() {
    resetLogoutTimer();
    // Listen for any user activity to reset the timer
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(name => {
        document.addEventListener(name, resetLogoutTimer, true);
    });
}

function resetLogoutTimer() {
    if (document.getElementById('app-container').style.display === 'none') return;
    clearTimeout(logoutTimer);
    logoutTimer = setTimeout(handleLogout, SESSION_TIMEOUT);
}

async function handleLogout() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    // Reset state and UI
    showLogin();
    showToast('Sesi berakhir demi keamanan. Silakan login kembali.', 'warning');

    // Stop listening for activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(name => {
        document.removeEventListener(name, resetLogoutTimer, true);
    });
}

function initApp() {
    setupNavigation();
    renderSalesTable();
    updateOverview();
    renderProductionStatus();
    renderFinancialChart();
    renderLeadSources();
    renderClientTable();
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('btnAddProject').addEventListener('click', () => openModal());
    document.getElementById('projectForm').addEventListener('submit', (e) => {
        // Call the async handler without returning a promise to the event listener
        handleFormSubmit(e);
    });
}

// --- NAVIGATION LOGIC ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.content-view');
    const viewTitle = document.getElementById('view-title');
    const viewSubtitle = document.getElementById('view-subtitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            const viewId = item.id.replace('nav-', 'view-');
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');
            const viewName = item.innerText;
            viewTitle.innerText = viewName === 'Dashboard' ? 'Dashboard Overview' : `${viewName} Management`;
            viewSubtitle.innerText = `Viewing your ${viewName.toLowerCase()} data and statistics.`;
        });
    });
}

// --- NOTIFICATION & ALERT LOGIC ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

let confirmPromiseResolve;
function showConfirm(title, message) {
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = message;
    document.getElementById('confirmModal').style.display = 'flex';
    return new Promise((resolve) => {
        confirmPromiseResolve = resolve;
    });
}

function closeConfirm() {
    document.getElementById('confirmModal').style.display = 'none';
    if (confirmPromiseResolve) confirmPromiseResolve(false);
}

document.getElementById('confirmBtn').addEventListener('click', () => {
    document.getElementById('confirmModal').style.display = 'none';
    if (confirmPromiseResolve) confirmPromiseResolve(true);
});

// --- CRUD LOGIC ---
function renderSalesTable() {
    const tableBody = document.getElementById('salesTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const sortedProjects = [...projects].sort((a, b) => {
        const pOrder = { "Urgent": 0, "Medium": 1, "Low": 2 };
        if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
        return new Date(a.deadline) - new Date(b.deadline);
    });

    sortedProjects.forEach(proj => {
        const remaining = proj.value - proj.dp;
        const isOverdue = new Date(proj.deadline) < new Date() && proj.status !== 'Selesai';
        const row = document.createElement('tr');
        if (proj.status === 'Selesai') row.classList.add('status-lunas');
        else if (proj.status === 'Revisi' || proj.revisions > 3) row.classList.add('status-revisi');
        if (isOverdue) row.classList.add('status-overdue');

        row.innerHTML = `
            <td>
                <div style="font-weight:600">${proj.client}</div>
                <div style="font-size:0.75rem; color:var(--accent-gold); font-weight:500;">${proj.namaBrand}</div>
                <div style="font-size:0.7rem; color:var(--text-muted)">DL: ${proj.deadline} ${isOverdue ? '<span style="color:var(--danger)">!</span>' : ''}</div>
            </td>
            <td>${proj.service}</td>
            <td>
                <select class="status-select" onchange="updateStatus('${proj.id}', this.value)">
                    ${Object.keys(statusProgressMap).map(s => `<option value="${s}" ${proj.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </td>
            <td>
                <div class="revision-ctrl">
                    <button class="btn-small" onclick="updateRevisions('${proj.id}', -1)">-</button>
                    <span class="${proj.revisions > 3 ? 'revision-warning' : ''}">${proj.revisions}</span>
                    <button class="btn-small" onclick="updateRevisions('${proj.id}', 1)">+</button>
                </div>
            </td>
            <td>Rp ${proj.value.toLocaleString('id-ID')}</td>
            <td style="color: ${remaining > 0 ? 'var(--warning)' : 'var(--success)'}">
                ${remaining > 0 ? `Rp ${remaining.toLocaleString('id-ID')}` : 'LUNAS'}
            </td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-small" title="Edit" onclick="openModal('${proj.id}')">✎</button>
                    <button class="btn-small" title="Delete" onclick="handleDelete('${proj.id}')">🗑</button>
                    ${proj.status === 'Selesai' && remaining <= 0 ? `<button class="btn-invoice" onclick="generateInvoice('${proj.id}')">Inv</button>` : ''}
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function handleDelete(id) {
    const confirmed = await showConfirm('Hapus Proyek?', 'Apakah Anda yakin ingin menghapus proyek ini? Data tidak bisa dikembalikan.');
    if (confirmed) {
        if (supabaseClient) {
            const { error } = await supabaseClient.from('orders').delete().eq('id', id);
            if (error) {
                showToast('Gagal menghapus dari Supabase: ' + error.message, 'error');
                return;
            }
        }
        projects = projects.filter(p => p.id !== id);
        saveAndRefresh(false); // false means don't sync all again
        showToast('Proyek berhasil dihapus', 'success');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('projectId').value;
    const isEdit = !!id;

    // Default UUID creation fallback if not connected, though Supabase will generate it
    const tempId = id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());

    const newProj = {
        id: tempId,
        client: document.getElementById('clientName').value,
        namaBrand: document.getElementById('namaBrand').value,
        service: document.getElementById('serviceType').value,
        deadline: document.getElementById('projectDeadline').value,
        contact: document.getElementById('kontakWA').value,
        targetAudiens: document.getElementById('targetAudiens').value,
        briefDesain: document.getElementById('briefDesain').value,
        referensiDesain: document.getElementById('referensiDesain').value,
        fileAsset: document.getElementById('fileAsset').value,
        priority: document.getElementById('priorityLevel').value,
        status: document.getElementById('projectStatus').value,
        value: parseInt(document.getElementById('totalValue').value) || 0,
        dp: parseInt(document.getElementById('dpPaid').value) || 0,
        revisions: id ? projects.find(p => p.id == id).revisions : 0
    };

    const dbRow = {
        nama_klien: newProj.client,
        nama_brand: newProj.namaBrand,
        jenis_layanan: newProj.service,
        deadline: newProj.deadline,
        kontak_wa: newProj.contact,
        target_audiens: newProj.targetAudiens,
        brief_desain: newProj.briefDesain,
        referensi_desain: newProj.referensiDesain,
        file_asset: newProj.fileAsset,
        priority: newProj.priority,
        status: newProj.status,
        harga_total: newProj.value,
        dp: newProj.dp,
        revisions: newProj.revisions
    };

    if (supabaseClient) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            dbRow.user_id = user.id; // Pastikan kolom user_id ada di tabel orders Anda
        }
    }

    if (id) dbRow.id = id;

    if (id) {
        const index = projects.findIndex(p => p.id == id);
        projects[index] = newProj;
    } else {
        projects.push(newProj);
    }

    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('orders').upsert([dbRow]).select();
        if (error) {
            showToast('Gagal menyimpan ke Supabase: ' + error.message, 'error');
        } else if (data && data.length > 0 && !id) {
            // Update local ID with the generated UUID from Supabase
            projects[projects.length - 1].id = data[0].id;
        }
    }

    saveAndRefresh(false);
    closeModal();
    showToast(isEdit ? 'Proyek berhasil diperbarui' : 'Proyek baru berhasil ditambahkan');
}

async function updateStatus(id, newStatus) {
    const proj = projects.find(p => p.id === id);
    if (proj) {
        proj.status = newStatus;
        if (supabaseClient) {
            const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', id);
            if (error) showToast('Gagal update status di Supabase: ' + error.message, 'error');
        }
        saveAndRefresh(false);
        showToast(`Status ${proj.client} diperbarui ke ${newStatus}`);
    }
}

async function updateRevisions(id, delta) {
    const proj = projects.find(p => p.id === id);
    if (proj) {
        proj.revisions = Math.max(0, proj.revisions + delta);
        if (supabaseClient) {
            const { error } = await supabaseClient.from('orders').update({ revisions: proj.revisions }).eq('id', id);
            if (error) showToast('Gagal update revisi di Supabase: ' + error.message, 'error');
        }
        saveAndRefresh(false);
        if (proj.revisions > 3) {
            showToast(`Peringatan: Revisi ${proj.client} sudah lebih dari 3!`, 'warning');
        }
    }
}

async function saveAndRefresh(syncToSupabase = true) {
    if (supabaseClient && syncToSupabase) {
        // Fallback mass sync if needed, though we handle it per-action now
    }

    localStorage.setItem('swichui_projects', JSON.stringify(projects));
    renderSalesTable();
    renderClientTable();
    updateOverview();
    renderProductionStatus();
    renderFinancialChart();
}

// --- UI HELPERS ---
function openModal(id = null) {
    const modal = document.getElementById('projectModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('projectForm');
    if (id) {
        const proj = projects.find(p => p.id == id);
        title.innerText = 'Edit Project';
        document.getElementById('projectId').value = proj.id;
        document.getElementById('clientName').value = proj.client;
        document.getElementById('namaBrand').value = proj.namaBrand;
        document.getElementById('serviceType').value = proj.service;
        document.getElementById('projectDeadline').value = proj.deadline;
        document.getElementById('kontakWA').value = proj.contact;
        document.getElementById('targetAudiens').value = proj.targetAudiens;
        document.getElementById('briefDesain').value = proj.briefDesain;
        document.getElementById('referensiDesain').value = proj.referensiDesain;
        document.getElementById('fileAsset').value = proj.fileAsset;
        document.getElementById('priorityLevel').value = proj.priority;
        document.getElementById('projectStatus').value = proj.status;
        document.getElementById('totalValue').value = proj.value;
        document.getElementById('dpPaid').value = proj.dp;
    } else {
        title.innerText = 'Add New Project';
        form.reset();
        document.getElementById('projectId').value = '';
    }
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('projectModal').style.display = 'none';
}

function updateOverview() {
    const totalRev = projects.reduce((acc, p) => acc + p.value, 0);
    const activeCount = projects.filter(p => p.status !== 'Selesai').length;
    const netProfit = projects.reduce((acc, p) => acc + (p.value * 0.7), 0);
    const statValues = document.querySelectorAll('.stat-value');
    if (statValues.length >= 3) {
        statValues[0].innerHTML = `<span>Rp</span>${totalRev.toLocaleString('id-ID')}`;
        statValues[1].innerText = activeCount;
        statValues[2].innerHTML = `<span>Rp</span>${netProfit.toLocaleString('id-ID')}`;
    }
}

function renderProductionStatus() {
    const container = document.getElementById('productionStatus');
    if (!container) return;
    container.innerHTML = '';
    Object.keys(statusProgressMap).forEach(s => {
        const count = projects.filter(p => p.status === s).length;
        const item = document.createElement('div');
        item.className = 'status-item';
        item.innerHTML = `
            <div class="status-header"><span>${s}</span><span>${count} Proyek</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width: ${statusProgressMap[s]}%; opacity: ${count > 0 ? 1 : 0.3}"></div></div>
        `;
        container.appendChild(item);
    });
}

function renderClientTable() {
    const tableBody = document.getElementById('clientTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const clientMap = {};
    projects.forEach(p => {
        if (!clientMap[p.client]) clientMap[p.client] = { name: p.client, whatsapp: p.contact || "N/A", projects: 0, lastProject: p.deadline };
        clientMap[p.client].projects++;
        if (new Date(p.deadline) > new Date(clientMap[p.client].lastProject)) clientMap[p.client].lastProject = p.deadline;
    });
    Object.values(clientMap).forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${client.name}</td><td>${client.whatsapp}</td><td>${client.projects}</td><td>${client.lastProject}</td>
            <td><button class="btn-small" onclick="showToast('Fitur chat ke ${client.name} sedang dikembangkan', 'warning')">💬</button></td>`;
        tableBody.appendChild(row);
    });
}

function renderFinancialChart() {
    const container = document.getElementById('financialChart');
    if (!container) return;
    container.innerHTML = '';

    // Grouping logic: Get data for the last 4 months
    const monthlyData = {};
    const now = new Date();

    // Pre-fill last 4 months to ensure chart isn't empty and stays consistent
    for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
        monthlyData[key] = { gross: 0, net: 0, label: key };
    }

    // Populate with real project data
    projects.forEach(p => {
        const d = new Date(p.deadline);
        if (isNaN(d)) return;
        const key = d.toLocaleString('id-ID', { month: 'short', year: 'numeric' });

        // Only count if it matches one of our displayed months
        if (monthlyData[key]) {
            monthlyData[key].gross += (p.value || 0);
            // Net logic: 70% margin (consistent with updateOverview)
            monthlyData[key].net += ((p.value || 0) * 0.7);
        }
    });

    const dataPoints = Object.values(monthlyData);
    const maxVal = Math.max(...dataPoints.map(m => m.gross), 1000000); // Scale relative to max gross, min 1M

    dataPoints.forEach(d => {
        const group = document.createElement('div');
        group.className = 'chart-group';
        group.style.flex = "1";
        group.style.display = "flex";
        group.style.flexDirection = "column";
        group.style.alignItems = "center";
        group.style.height = "100%";
        group.style.justifyContent = "flex-end";

        const barsContainer = document.createElement('div');
        barsContainer.style.display = "flex";
        barsContainer.style.alignItems = "flex-end";
        barsContainer.style.gap = "4px";
        barsContainer.style.height = "140px"; // Leave space for label
        barsContainer.style.width = "100%";
        barsContainer.style.justifyContent = "center";

        const grossHeight = (d.gross / maxVal) * 100;
        const netHeight = (d.net / maxVal) * 100;

        barsContainer.innerHTML = `
            <div class="bar" style="height: ${grossHeight}%; width: 20px;" title="${d.label} Gross: Rp ${d.gross.toLocaleString('id-ID')}"></div>
            <div class="bar bar-profit" style="height: ${netHeight}%; width: 20px;" title="${d.label} Net: Rp ${d.net.toLocaleString('id-ID')}"></div>
        `;

        const label = document.createElement('div');
        label.style.fontSize = "0.65rem";
        label.style.color = "var(--text-muted)";
        label.style.marginTop = "8px";
        label.innerText = d.label.split(' ')[0]; // Show only month name

        group.appendChild(barsContainer);
        group.appendChild(label);
        container.appendChild(group);
    });
}

function renderLeadSources() {
    const container = document.getElementById('leadSourceList');
    if (!container) return;
    container.innerHTML = '';
    const leads = [{ s: "Instagram", p: 50 }, { s: "TikTok", p: 30 }, { s: "Website", p: 20 }];
    leads.forEach(l => {
        const item = document.createElement('div');
        item.style.marginBottom = "0.75rem";
        item.innerHTML = `<div style="display:flex; justify-content:space-between; font-size:0.875rem"><span>${l.s}</span><span>${l.p}%</span></div>
            <div class="progress-bar" style="height:4px"><div class="progress-fill" style="width:${l.p}%; background:var(--accent-gold)"></div></div>`;
        container.appendChild(item);
    });
}

function generateInvoice(projectId) {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    document.getElementById('invId').innerText = `#INV-2024-${String(proj.id).slice(-3)}`;
    document.getElementById('invClientName').innerText = proj.client;
    document.getElementById('invService').innerText = proj.service;
    document.getElementById('invAmount').innerText = `Rp ${proj.value.toLocaleString('id-ID')}`;
    document.getElementById('invTotal').innerText = `Rp ${proj.value.toLocaleString('id-ID')}`;
    const template = document.getElementById('invoiceTemplate');
    template.style.display = 'block';
    showToast('Menyiapkan invoice untuk dicetak...', 'success');
    setTimeout(() => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><body>' + template.innerHTML + '</body></html>');
        printWindow.document.close();
        printWindow.print();
        template.style.display = 'none';
    }, 500);
}
