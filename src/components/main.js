import { state, loadData, saveData } from './store.js';
import { getBaseLayoutTemplate, setupTouchEvents } from './components/layout.js';
import { getOnboardingTemplate, mountOnboardingLogic } from './components/onboarding.js';
import { calculateNextBillDate } from './utils.js';

const appContainer = document.getElementById('app');
export let currentTab = 'dashboard';

// Pengecekan otomatis untuk tagihan jatuh tempo (Dijalankan pas aplikasi diload)
function checkAutoDueDates() {
    let today = new Date(); today.setHours(0,0,0,0); 
    let changed = false;
    
    state.rooms.forEach(r => {
        if (r.status === 'occupied' && r.nextBillDate) {
            let due = new Date(r.nextBillDate); due.setHours(0,0,0,0);
            let type = state.roomTypes.find(t => t.id === r.typeId);
            while (today >= due) {
                if ((r.advance || 0) >= type.price) { 
                    r.advance -= type.price; 
                } else { 
                    r.debt += (type.price - (r.advance || 0)); 
                    r.advance = 0; 
                    if (!r.debtDate) r.debtDate = due.toISOString().split('T')[0]; 
                }
                r.nextBillDate = calculateNextBillDate(r.nextBillDate, r.dueDay);
                due = new Date(r.nextBillDate); due.setHours(0,0,0,0); 
                changed = true;
            }
        }
    });
    if(changed) saveData();
}

// Fungsi utama buat mounting aplikasi
function initApp() {
    // Render base layout (Header, Nav, main area)
    appContainer.innerHTML = getBaseLayoutTemplate();
    
    // Ganti Title sesuai data
    document.getElementById('app-title').innerText = state.kosanName || "KosanKu";
    
    // Setup gestures buat Bottom Sheets
    setupTouchEvents();
    
    // Binding fungsi pindah Tab ke Window
    window.switchTab = (t) => {
        document.querySelectorAll('.tab-content').forEach(el=>el.classList.add('hidden'));
        document.querySelectorAll('nav button').forEach(el=>{ el.classList.remove('tab-active'); el.classList.add('tab-inactive'); });
        
        const tabEl = document.getElementById(`tab-${t}`);
        if(tabEl) tabEl.classList.remove('hidden');
        
        let nav = document.getElementById(`nav-${t}`);
        if(nav){ nav.classList.remove('tab-inactive'); nav.classList.add('tab-active'); }
        
        let hk = document.getElementById('header-search-kamar');
        let hr = document.getElementById('header-search-riwayat');
        if(hk) hk.classList.toggle('hidden', t !== 'kamar');
        if(hr) hr.classList.toggle('hidden', t !== 'riwayat');
        
        currentTab = t;
        
        // Panggil fungsi render masing-masing tab (Nanti di Tarikan 3 dipasang)
        if(t==='dashboard' && window.renderDashboard) window.renderDashboard();
        if(t==='kamar' && window.renderRooms) window.renderRooms();
        if(t==='catat' && window.updateCatatCategories) window.updateCatatCategories();
        if(t==='riwayat' && window.renderHistory) window.renderHistory();
        if(t==='analitik' && window.renderAnalytic) window.renderAnalytic();
        window.scrollTo({top:0, behavior:'smooth'});
    };

    // Sementara inject HTML kosong buat tab (Nanti diganti full logic di Tarikan 3)
    document.getElementById('tab-dashboard').innerHTML = `<p class="text-center mt-10">Tampilan Dashboard (Tarikan 3)</p>`;
    document.getElementById('tab-kamar').innerHTML = `<p class="text-center mt-10">Tampilan Kamar (Tarikan 3)</p>`;
    document.getElementById('tab-catat').innerHTML = `<p class="text-center mt-10">Tampilan Catat (Tarikan 3)</p>`;
    document.getElementById('tab-riwayat').innerHTML = `<p class="text-center mt-10">Tampilan Riwayat (Tarikan 3)</p>`;
    document.getElementById('tab-analitik').innerHTML = `<p class="text-center mt-10">Tampilan Analitik (Tarikan 3)</p>`;

    // Pindah ke tab awal
    window.switchTab('dashboard');
}

// Logic start program
if (loadData() && state.rooms.length > 0) {
    // Kalau ada data, cek otomatis tagihan & langsung masuk app
    checkAutoDueDates(); 
    initApp();
} else {
    // Kalau data kosong, tampilkan onboarding
    appContainer.innerHTML = getOnboardingTemplate();
    
    // Binding fungsi onboarding dan set callback kalo kelar
    mountOnboardingLogic(() => {
        // Callback pas klik "Simpan & Mulai" di Onboarding
        initApp();
    });
}

