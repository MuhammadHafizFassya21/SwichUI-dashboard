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
let financialChartInstance = null;

const statusProgressMap = {
    "Briefing": 20,
    "Sketsa": 40,
    "Desain Final": 60,
    "Revisi": 80,
    "Selesai": 100
};

const servicePriceMap = {
    "Feed IG Single": 35000,
    "Poster Single": 50000,
    "Banner Design": 75000,
    "Logo Design": 150000,
    "Carousel 3 Slide": 100000,
    "Carousel 5 Slide": 150000,
    "UI/UX Design": 450000
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
        projects = data.map(row => {
            const service = row.jenis_layanan || row.layanan || "Lainnya";
            let value = row.harga_total || row.total_harga || row.value || 0;
            
            // Auto-fill price if it comes in as 0 from website
            if (value === 0 && servicePriceMap[service]) {
                value = servicePriceMap[service];
            }

            // Smart mapping for brief and other details
            const getField = (keywords, defaultValue = "") => {
                // Find all keys that match the keywords
                const matchingKeys = Object.keys(row).filter(k => keywords.some(kw => k.toLowerCase().includes(kw)));
                
                // Prefer keys that have a non-empty value
                const bestKey = matchingKeys.find(k => row[k] !== null && row[k] !== undefined && row[k] !== "") || matchingKeys[0];
                
                return (bestKey && row[bestKey] !== null && row[bestKey] !== undefined) ? row[bestKey] : defaultValue;
            };

            return {
                id: row.id,
                client: row.nama_klien || row.nama || "Unknown",
                namaBrand: row.nama_brand || row.brand || "-",
                service: service,
                priority: row.priority || "Medium",
                revisions: row.revisions || 0,
                status: row.status || "Briefing",
                value: value,
                dp: row.dp || row.uang_muka || 0,
                deadline: row.deadline || row.tenggat_waktu || "-",
                contact: row.kontak_wa || row.whatsapp || row.contact || "-",
                targetAudiens: getField(['audiens', 'target'], "-"),
                briefDesain: getField(['brief', 'pesan', 'kebutuhan', 'deskripsi'], ""),
                referensiDesain: getField(['referensi', 'reference'], ""),
                fileAsset: getField(['asset', 'file', 'drive'], ""),
                is_deleted: row.is_deleted || false
            };
        });
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
    renderRecentClients();
    renderFinanceView();
    updateTrendAnalysis();
    renderTrashTable();
    setupEventListeners();
    
    // Real-time listener for orders table (if using Supabase)
    if (supabaseClient) {
        supabaseClient
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
                fetchProjectsFromSupabase().then(() => {
                    renderSalesTable();
                    updateOverview();
                    renderProductionStatus();
                    renderFinancialChart();
                    renderClientTable();
                    renderRecentClients();
                    renderFinanceView();
                    updateTrendAnalysis();
                    renderTrashTable();
                    showToast('Data diperbarui dari server...', 'success');
                });
            })
            .subscribe();
    }
}

function setupEventListeners() {
    document.getElementById('btnAddProject').addEventListener('click', () => openModal());
    document.getElementById('btnExport').addEventListener('click', () => exportToCSV());
    document.getElementById('projectForm').addEventListener('submit', (e) => {
        handleFormSubmit(e);
    });

    // Auto-price logic
    document.getElementById('serviceType').addEventListener('change', (e) => {
        const service = e.target.value;
        const priceInput = document.getElementById('totalValue');
        const id = document.getElementById('projectId').value;
        
        // Only auto-fill price if it's a new project or current price is 0
        if (servicePriceMap[service] && (!id || parseInt(priceInput.value) === 0)) {
            priceInput.value = servicePriceMap[service];
            showToast(`Harga otomatis disesuaikan untuk ${service}`, 'success');
        }
    });

    // Search logic
    const searchInput = document.getElementById('projectSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderSalesTable();
        });
    }
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
            const viewTitleText = viewName === 'Dashboard' ? 'Ringkasan Dashboard' : 
                                viewName === 'Proyek' ? 'Manajemen Proyek' :
                                viewName === 'Keuangan' ? 'Manajemen Keuangan' : 'Database Klien';
            
            viewTitle.innerText = viewTitleText;
            viewSubtitle.innerText = `Melihat data dan statistik ${viewName.toLowerCase()} Anda.`;
            
            // Show Export button only on specific views
            const exportBtn = document.getElementById('btnExport');
            if (['nav-projects', 'nav-clients', 'nav-finances'].includes(item.id)) {
                exportBtn.style.display = 'block';
            } else {
                exportBtn.style.display = 'none';
            }

            // Specific refresh for trash view
            if (item.id === 'nav-trash') {
                renderTrashTable();
            }
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
    const activeTableBody = document.getElementById('salesTableBody');
    const archiveTableBody = document.getElementById('archiveTableBody');
    const searchQuery = document.getElementById('projectSearch')?.value.toLowerCase() || '';
    
    if (!activeTableBody || !archiveTableBody) return;
    
    activeTableBody.innerHTML = '';
    archiveTableBody.innerHTML = '';

    // Filter and Sort
    const filteredProjects = projects.filter(p => {
        if (p.is_deleted) return false;
        const idStr = String(p.id).toLowerCase();
        const clientStr = p.client.toLowerCase();
        const brandStr = p.namaBrand.toLowerCase();
        return idStr.includes(searchQuery) || clientStr.includes(searchQuery) || brandStr.includes(searchQuery);
    });

    const sortedProjects = [...filteredProjects].sort((a, b) => {
        const pOrder = { "Urgent": 0, "Medium": 1, "Low": 2 };
        if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
        return new Date(a.deadline) - new Date(b.deadline);
    });

    sortedProjects.forEach(proj => {
        const remaining = proj.dp > 0 ? proj.value - proj.dp : 0;
        const isOverdue = new Date(proj.deadline) < new Date() && proj.status !== 'Selesai';
        const row = document.createElement('tr');
        
        if (proj.status === 'Selesai') row.classList.add('status-lunas');
        else if (proj.status === 'Revisi' || proj.revisions > 3) row.classList.add('status-revisi');
        if (isOverdue) row.classList.add('status-overdue');

        // Short ID for display if it's a long UUID
        const displayId = typeof proj.id === 'string' && proj.id.length > 8 ? proj.id.substring(0, 8) + '...' : proj.id;

        row.innerHTML = `
            <td style="font-size: 0.7rem; font-family: monospace; color: var(--text-muted);" title="${proj.id}">${displayId}</td>
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
            <td style="color: var(--primary-blue)">Rp ${proj.dp.toLocaleString('id-ID')}</td>
            <td style="color: ${proj.status === 'Selesai' || (proj.dp > 0 && remaining <= 0) ? 'var(--success)' : (proj.dp === 0 ? 'var(--text-muted)' : 'var(--warning)')}">
                ${proj.status === 'Selesai' || (proj.dp > 0 && remaining <= 0) ? 'LUNAS' : `Rp ${remaining.toLocaleString('id-ID')}`}
            </td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-small btn-icon" title="Edit" onclick="openModal('${proj.id}')">✎</button>
                    <button class="btn-small btn-icon" title="Delete" onclick="handleDelete('${proj.id}')">🗑</button>
                    ${proj.status === 'Selesai' && remaining <= 0 ? `<button class="btn-invoice" onclick="generateInvoice('${proj.id}')">Inv</button>` : ''}
                </div>
            </td>
        `;

        if (proj.status === 'Selesai') {
            archiveTableBody.appendChild(row);
        } else {
            activeTableBody.appendChild(row);
        }
    });
}

async function handleDelete(id) {
    const confirmed = await showConfirm('Pindahkan ke Tempat Sampah?', 'Proyek ini akan disembunyikan dari laporan utama, tetapi tetap bisa dipulihkan nanti.');
    if (confirmed) {
        if (supabaseClient) {
            const { error } = await supabaseClient.from('orders').update({ is_deleted: true }).eq('id', id);
            if (error) {
                showToast('Gagal memindahkan ke sampah: ' + error.message, 'error');
                return;
            }
        }
        const proj = projects.find(p => p.id === id);
        if (proj) proj.is_deleted = true;
        
        saveAndRefresh(false);
        showToast('Proyek dipindahkan ke Tempat Sampah', 'warning');
    }
}

async function handleRestore(id) {
    if (supabaseClient) {
        const { error } = await supabaseClient.from('orders').update({ is_deleted: false }).eq('id', id);
        if (error) {
            showToast('Gagal memulihkan data: ' + error.message, 'error');
            return;
        }
    }
    const proj = projects.find(p => p.id === id);
    if (proj) proj.is_deleted = false;
    
    saveAndRefresh(false);
    renderTrashTable();
    showToast('Data berhasil dipulihkan!', 'success');
}

async function handlePermanentDelete(id) {
    const confirmed = await showConfirm('Hapus Permanen?', 'Tindakan ini tidak bisa dibatalkan. Data akan benar-benar hilang dari database.');
    if (confirmed) {
        if (supabaseClient) {
            const { error } = await supabaseClient.from('orders').delete().eq('id', id);
            if (error) {
                showToast('Gagal menghapus permanen: ' + error.message, 'error');
                return;
            }
        }
        projects = projects.filter(p => p.id !== id);
        saveAndRefresh(false);
        renderTrashTable();
        showToast('Data dihapus secara permanen', 'error');
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
        brief_singkat: newProj.briefDesain, // Support both column names for compatibility
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
    renderTrashTable();
    closeModal();
    showToast(isEdit ? 'Proyek berhasil diperbarui' : 'Proyek baru berhasil ditambahkan');
}

async function updateStatus(id, newStatus) {
    const proj = projects.find(p => p.id === id);
    if (proj) {
        proj.status = newStatus;
        
        // Logic: If status is 'Selesai', automatically set as LUNAS (dp = value)
        let updateData = { status: newStatus };
        if (newStatus === 'Selesai') {
            proj.dp = proj.value;
            updateData.dp = proj.value;
            showToast(`Proyek ${proj.client} ditandai selesai & lunas otomatis.`, 'success');
        }

        if (supabaseClient) {
            const { error } = await supabaseClient.from('orders').update(updateData).eq('id', id);
            if (error) showToast('Gagal update status di Supabase: ' + error.message, 'error');
        }
        saveAndRefresh(false);
        if (newStatus !== 'Selesai') {
            showToast(`Status ${proj.client} diperbarui ke ${newStatus}`);
        }
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
    renderRecentClients();
    updateOverview();
    renderProductionStatus();
    renderFinancialChart();
    renderFinanceView();
    updateTrendAnalysis();
    renderTrashTable();
}

// --- UI HELPERS ---
function openModal(id = null) {
    const modal = document.getElementById('projectModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('projectForm');
    if (id) {
        const proj = projects.find(p => p.id == id);
        title.innerText = 'Edit Proyek';
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

        // Logic: Lock price/dp if status is "Selesai"
        const isFinished = proj.status === 'Selesai';
        document.getElementById('totalValue').readOnly = isFinished;
        document.getElementById('dpPaid').readOnly = isFinished;
        if (isFinished) {
            document.getElementById('totalValue').style.opacity = '0.6';
            document.getElementById('dpPaid').style.opacity = '0.6';
        } else {
            document.getElementById('totalValue').style.opacity = '1';
            document.getElementById('dpPaid').style.opacity = '1';
        }
    } else {
        title.innerText = 'Tambah Proyek Baru';
        form.reset();
        document.getElementById('projectId').value = '';
        document.getElementById('totalValue').readOnly = false;
        document.getElementById('dpPaid').readOnly = false;
        document.getElementById('totalValue').style.opacity = '1';
        document.getElementById('dpPaid').style.opacity = '1';
    }
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('projectModal').style.display = 'none';
}

function updateOverview() {
    const activeProjects = projects.filter(p => !p.is_deleted);
    const totalRev = activeProjects.reduce((acc, p) => acc + p.value, 0);
    const activeCount = activeProjects.filter(p => p.status !== 'Selesai').length;
    const netProfit = activeProjects.reduce((acc, p) => acc + (p.value * 0.7), 0);
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
        const count = projects.filter(p => !p.is_deleted && p.status === s).length;
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
    
    // Group projects by client name and get the latest/most complete project for each
    const clientMap = {};
    projects.filter(p => !p.is_deleted).forEach(p => {
        const existing = clientMap[p.client];
        if (!existing) {
            clientMap[p.client] = p;
            return;
        }

        // Comparison logic: prefer more recent or more complete data
        const dateA = new Date(existing.deadline);
        const dateB = new Date(p.deadline);
        
        const isValidA = !isNaN(dateA.getTime());
        const isValidB = !isNaN(dateB.getTime());

        let isBetter = false;
        if (isValidA && isValidB) {
            isBetter = dateB > dateA;
        } else {
            // Fallback: Use ID/index (newer projects usually added later) or check if it has a brief
            const hasBriefA = !!existing.briefDesain;
            const hasBriefB = !!p.briefDesain;
            
            if (hasBriefB && !hasBriefA) {
                isBetter = true;
            } else if (hasBriefB === hasBriefA) {
                // If both have/don't have brief, use ID comparison
                isBetter = String(p.id) > String(existing.id);
            }
        }

        if (isBetter) {
            clientMap[p.client] = p;
        }
    });

    Object.values(clientMap).forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><div style="font-weight:600">${client.client}</div></td>
            <td>${client.namaBrand || '-'}</td>
            <td>${client.service}</td>
            <td>${client.contact}</td>
            <td><span class="badge ${new Date(client.deadline) < new Date() ? 'priority-urgent' : ''}">${client.deadline}</span></td>
            <td>
                <button class="btn-small" onclick="viewClientDetail('${client.id}')" title="View Full Brief">📄 Info</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function viewClientDetail(projectId) {
    const proj = projects.find(p => String(p.id) === String(projectId));
    if (!proj) return;

    const body = document.getElementById('clientDetailBody');
    body.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <label>Nama Brand / Usaha</label>
                <p>${proj.namaBrand || '-'}</p>
            </div>
            <div class="detail-item">
                <label>Layanan</label>
                <p>${proj.service}</p>
            </div>
            <div class="detail-item">
                <label>Deadline</label>
                <p>${proj.deadline}</p>
            </div>
            <div class="detail-item">
                <label>Total Kontrak</label>
                <p style="font-weight: 700; color: var(--accent-gold);">Rp ${proj.value.toLocaleString('id-ID')}</p>
            </div>
            <div class="detail-item" style="grid-column: span 2;">
                <label>Target Audiens</label>
                <p>${proj.targetAudiens || '-'}</p>
            </div>
            <div class="detail-item" style="grid-column: span 2;">
                <label>Brief / Kebutuhan Desain</label>
                <div class="brief-box">${proj.briefDesain || 'Tidak ada detail brief.'}</div>
            </div>
            <div class="detail-item" style="grid-column: span 2;">
                <label>Referensi Desain</label>
                <p>${proj.referensiDesain ? `<a href="${proj.referensiDesain}" target="_blank" class="link-gold">Buka Referensi 🔗</a>` : '-'}</p>
            </div>
            <div class="detail-item" style="grid-column: span 2;">
                <label>File / Asset</label>
                <p>${proj.fileAsset ? `<a href="${proj.fileAsset}" target="_blank" class="link-gold">Buka File Asset 📂</a>` : '-'}</p>
            </div>
        </div>
    `;
    document.getElementById('clientDetailModal').style.display = 'flex';
}

function renderTrashTable() {
    const tableBody = document.getElementById('trashTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const deletedProjects = projects.filter(p => p.is_deleted);
    
    if (deletedProjects.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">Tidak ada data di tempat sampah.</td></tr>';
        return;
    }

    deletedProjects.forEach(proj => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-size: 0.7rem; font-family: monospace; color: var(--text-muted);">${typeof proj.id === 'string' ? proj.id.substring(0, 8) : proj.id}...</td>
            <td>
                <div style="font-weight:600">${proj.client}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${proj.namaBrand}</div>
            </td>
            <td>${proj.service}</td>
            <td><span class="badge">${proj.status}</span></td>
            <td>Rp ${proj.value.toLocaleString('id-ID')}</td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-small" style="background: rgba(16, 185, 129, 0.15); color: var(--success); border-color: rgba(16, 185, 129, 0.3);" title="Pulihkan" onclick="handleRestore('${proj.id}')">↩ Pulihkan</button>
                    <button class="btn-small" style="background: rgba(239, 68, 68, 0.15); color: var(--danger); border-color: rgba(239, 68, 68, 0.3);" title="Hapus Permanen" onclick="handlePermanentDelete('${proj.id}')">🗑 Hapus</button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function closeClientModal() {
    document.getElementById('clientDetailModal').style.display = 'none';
}

function renderFinanceView() {
    const tableBody = document.getElementById('financeTableBody');
    const totalOmzetEl = document.getElementById('finance-total-omzet');
    const totalCashEl = document.getElementById('finance-total-cash');
    const totalUnpaidEl = document.getElementById('finance-total-unpaid');

    if (!tableBody) return;
    tableBody.innerHTML = '';

    let totalOmzet = 0;
    let totalCash = 0;
    let totalUnpaid = 0;

    projects.filter(p => !p.is_deleted).forEach(p => {
        const omzet = p.value || 0;
        const cash = p.dp || 0;
        const unpaid = omzet - cash;

        totalOmzet += omzet;
        totalCash += cash;
        totalUnpaid += unpaid;

        const row = document.createElement('tr');
        const statusClass = unpaid <= 0 ? 'badge-green' : (cash > 0 ? 'badge-blue' : 'badge-red');
        const statusText = unpaid <= 0 ? 'LUNAS' : (cash > 0 ? 'DP MASUK' : 'BELUM BAYAR');

        row.innerHTML = `
            <td>
                <div style="font-weight:600">${p.client}</div>
                <div style="font-size:0.75rem; color:var(--text-muted)">${p.service}</div>
            </td>
            <td>Rp ${omzet.toLocaleString('id-ID')}</td>
            <td style="color: var(--success)">Rp ${cash.toLocaleString('id-ID')}</td>
            <td style="color: ${unpaid > 0 ? 'var(--warning)' : 'var(--text-muted)'}">Rp ${unpaid.toLocaleString('id-ID')}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
        `;
        tableBody.appendChild(row);
    });

    if (totalOmzetEl) totalOmzetEl.innerHTML = `<span>Rp</span>${totalOmzet.toLocaleString('id-ID')}`;
    if (totalCashEl) totalCashEl.innerHTML = `<span>Rp</span>${totalCash.toLocaleString('id-ID')}`;
    if (totalUnpaidEl) totalUnpaidEl.innerHTML = `<span>Rp</span>${totalUnpaid.toLocaleString('id-ID')}`;

    // --- MONTHLY SUMMARY LOGIC ---
    const monthlyTableBody = document.getElementById('monthlyFinanceTableBody');
    if (!monthlyTableBody) return;
    monthlyTableBody.innerHTML = '';

    const monthlyStats = {};
    projects.filter(p => !p.is_deleted).forEach(p => {
        const d = new Date(p.deadline);
        if (isNaN(d)) return;
        const key = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

        if (!monthlyStats[key]) {
            monthlyStats[key] = { gross: 0, expense: 0, net: 0 };
        }
        monthlyStats[key].gross += (p.value || 0);
    });

    // Sort months (newest first)
    const sortedMonths = Object.keys(monthlyStats).sort((a, b) => new Date(b) - new Date(a));

    sortedMonths.forEach(month => {
        const data = monthlyStats[month];
        // Using the 26% expense / 74% net margin from dashboard stats
        data.expense = data.gross * 0.26;
        data.net = data.gross * 0.74;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><div style="font-weight:600">${month}</div></td>
            <td>Rp ${data.gross.toLocaleString('id-ID')}</td>
            <td style="color: var(--danger)">- Rp ${Math.round(data.expense).toLocaleString('id-ID')}</td>
            <td style="font-weight:700; color: var(--success)">Rp ${Math.round(data.net).toLocaleString('id-ID')}</td>
        `;
        monthlyTableBody.appendChild(row);
    });
}

function updateTrendAnalysis() {
    const popularList = document.getElementById('popularServicesList');
    const recommendations = document.getElementById('trendRecommendations');
    if (!popularList || !recommendations) return;

    // 1. Calculate Service Frequencies
    const activeProjects = projects.filter(p => !p.is_deleted);
    const serviceCounts = {};
    activeProjects.forEach(p => {
        serviceCounts[p.service] = (serviceCounts[p.service] || 0) + 1;
    });

    const sortedServices = Object.entries(serviceCounts)
        .sort((a, b) => b[1] - a[1]);

    // 2. Render Popular Services List
    popularList.innerHTML = '';
    sortedServices.slice(0, 4).forEach(([service, count], index) => {
        const percentage = Math.round((count / projects.length) * 100) || 0;
        const item = document.createElement('div');
        item.style.marginBottom = "0.75rem";
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom: 0.25rem;">
                <span>${index + 1}. ${service}</span>
                <span style="color: var(--accent-gold);">${count} Order (${percentage}%)</span>
            </div>
            <div class="progress-bar" style="height: 4px;"><div class="progress-fill" style="width: ${percentage}%; background: ${index === 0 ? 'var(--accent-gold)' : 'var(--primary-blue)'}"></div></div>
        `;
        popularList.appendChild(item);
    });

    // 3. Generate Strategic Recommendations
    const topService = sortedServices[0] ? sortedServices[0][0] : null;
    let insight = "";
    
    if (!topService) {
        insight = "Belum ada data proyek yang cukup untuk melakukan analisis tren. Silakan tambahkan lebih banyak proyek.";
    } else {
        if (topService === "Logo Design" || topService === "UI/UX Design") {
            insight = `Klien Anda sangat meminati <strong>${topService}</strong>. <br><br>
                       <strong>Rekomendasi:</strong> Pertimbangkan untuk membuat paket bundling (misal: Logo + Branding Kit) untuk meningkatkan nilai kontrak. Fokuskan portofolio utama pada jenis desain ini karena conversion rate-nya tinggi.`;
        } else if (topService.includes("Carousel") || topService.includes("Feed")) {
            insight = `Tren menunjukkan permintaan tinggi pada <strong>Konten Media Sosial</strong>. <br><br>
                       <strong>Rekomendasi:</strong> Ini adalah peluang untuk menawarkan sistem langganan bulanan (Retainer Model) daripada proyek satuan. Pastikan efisiensi workflow ditingkatkan agar margin keuntungan tetap tinggi pada volume order besar.`;
        } else {
            insight = `Layanan <strong>${topService}</strong> sedang menjadi primadona. <br><br>
                       <strong>Rekomendasi:</strong> Maksimalkan promosi pada layanan ini. Anda juga bisa mencoba melakukan up-selling ke layanan yang lebih premium (seperti UI/UX) kepada klien yang puas dengan hasil ${topService} Anda.`;
        }
    }

    recommendations.innerHTML = `<p>${insight}</p>`;
}

function renderFinancialChart() {
    const ctx = document.getElementById('financialChart');
    if (!ctx) return;

    // Destroy existing chart to avoid overlay issues
    if (financialChartInstance) {
        financialChartInstance.destroy();
    }

    // Data processing logic
    const monthlyData = {};
    const now = new Date();
    // Pre-fill last 6 months
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
        monthlyData[key] = { gross: 0, net: 0, label: d.toLocaleString('id-ID', { month: 'short' }) };
    }

    projects.filter(p => !p.is_deleted).forEach(p => {
        const d = new Date(p.deadline);
        if (isNaN(d)) return;
        const key = d.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
        if (monthlyData[key]) {
            monthlyData[key].gross += (p.value || 0);
            monthlyData[key].net += ((p.value || 0) * 0.74);
        }
    });

    const labels = Object.values(monthlyData).map(m => m.label);
    const grossData = Object.values(monthlyData).map(m => m.gross);
    const netData = Object.values(monthlyData).map(m => m.net);

    financialChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan Kotor',
                    data: grossData,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#3B82F6',
                    pointRadius: 4
                },
                {
                    label: 'Laba Bersih',
                    data: netData,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#D4AF37',
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: { 
                        color: '#94A3B8', 
                        font: { size: 10, family: 'Inter' },
                        usePointStyle: true,
                        boxWidth: 6
                    }
                },
                tooltip: {
                    backgroundColor: '#0B1120',
                    titleColor: '#F8FAFC',
                    bodyColor: '#94A3B8',
                    borderColor: 'rgba(212, 175, 55, 0.2)',
                    borderWidth: 1,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: {
                        color: '#94A3B8',
                        font: { size: 10 },
                        callback: function(value) {
                            if (value >= 1000000) return 'Rp' + (value/1000000).toFixed(1) + 'jt';
                            if (value >= 1000) return 'Rp' + (value/1000).toFixed(0) + 'rb';
                            return 'Rp' + value;
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94A3B8', font: { size: 10 } }
                }
            }
        }
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

    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const remaining = proj.value - proj.dp;
    const isPaid = remaining <= 0;

    // Fill placeholders
    document.getElementById('invId').innerText = `#INV-2024-${String(proj.id).slice(-3).toUpperCase()}`;
    document.getElementById('invDate').innerText = formattedDate;
    document.getElementById('invClientName').innerText = proj.client;
    document.getElementById('invBrand').innerText = proj.namaBrand || '-';
    document.getElementById('invContact').innerText = proj.contact || '-';
    document.getElementById('invService').innerText = proj.service;
    
    // Monetary values
    const formatIDR = (val) => `Rp ${val.toLocaleString('id-ID')}`;
    document.getElementById('invAmount').innerText = formatIDR(proj.value);
    document.getElementById('invSubtotal').innerText = formatIDR(proj.value);
    document.getElementById('invDP').innerText = formatIDR(proj.dp);
    document.getElementById('invTotal').innerText = isPaid ? 'LUNAS (PAID)' : formatIDR(remaining);

    // Paid Status Appearance
    const container = document.getElementById('invoiceContainer');
    const stamp = document.getElementById('invStatusStamp');
    
    if (isPaid) {
        container.classList.add('is-paid');
        stamp.style.display = 'block';
    } else {
        container.classList.remove('is-paid');
        stamp.style.display = 'none';
    }

    const template = document.getElementById('invoiceTemplate');
    template.style.display = 'block';
    
    showToast(isPaid ? 'Menyiapkan kwitansi pelunasan...' : 'Menyiapkan invoice tagihan...', 'success');

    setTimeout(() => {
        const printWindow = window.open('', '_blank');
        const styleLink = document.querySelector('link[href="style.css"]').href;
        const invoiceContent = template.innerHTML;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Invoice - ${proj.client}</title>
                    <link rel="stylesheet" href="${styleLink}">
                    <style>
                        body { background: white !important; margin: 0; padding: 0; }
                        .invoice-box { display: block !important; visibility: visible !important; }
                        .invoice-box * { visibility: visible !important; }
                    </style>
                </head>
                <body>
                    ${invoiceContent}
                    <script>
                        // Wait for stylesheet to load
                        const link = document.querySelector('link');
                        if (link.sheet) {
                            window.print();
                            window.close();
                        } else {
                            link.onload = () => {
                                window.print();
                                window.close();
                            };
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
        template.style.display = 'none';
    }, 500);
}

function exportToCSV() {
    if (projects.length === 0) {
        showToast('Tidak ada data untuk diekspor', 'warning');
        return;
    }

    const headers = ['ID', 'Klien', 'Brand', 'Layanan', 'Prioritas', 'Status', 'Revisi', 'Total Kontrak', 'DP', 'Sisa Tagihan', 'Deadline', 'Kontak'];
    const rows = projects.filter(p => !p.is_deleted).map(p => [
        p.id,
        `"${p.client}"`,
        `"${p.namaBrand}"`,
        `"${p.service}"`,
        p.priority,
        p.status,
        p.revisions,
        p.value,
        p.dp,
        (p.value - p.dp),
        p.deadline,
        `'${p.contact}` // Prefix with ' to prevent Excel from formatting as number
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `SwichUI_Laporan_Proyek_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Data berhasil diekspor ke CSV/Excel', 'success');
}

function renderRecentClients() {
    const container = document.getElementById('recentClientsList');
    if (!container) return;
    container.innerHTML = '';

    // Sort by "latest" - since we don't have a reliable 'created_at' date here, 
    // we'll assume the last items in the projects array (or latest deadline) are the newest.
    // Ideally, we'd sort by a real timestamp if available.
    const recent = [...projects].slice(-3).reverse(); 

    recent.forEach(proj => {
        const initials = proj.client.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const item = document.createElement('div');
        item.className = 'client-mini';
        item.innerHTML = `
            <div class="client-avatar">${initials}</div>
            <div class="client-info">
                <h4>${proj.client}</h4>
                <p>${proj.contact}</p>
            </div>
        `;
        container.appendChild(item);
    });
}
