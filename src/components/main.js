import { state, loadData, saveData } from './store.js';
import { getBaseLayoutTemplate, setupTouchEvents } from './components/layout.js';
import { getOnboardingTemplate, mountOnboardingLogic } from './components/onboarding.js';
import { calculateNextBillDate } from './utils.js';

// Import Templates Tab
import { 
    getTabDashboard, 
    getTabKamar, 
    getTabCatat, 
    getTabRiwayat, 
    getTabAnalitik 
} from './templates.js';

// Import Logic Utama
import { mountAppLogic } from './logic.js';

const appContainer = document.getElementById('app');

function checkAutoDueDates() {
    let today = new Date(); 
    today.setHours(0,0,0,0); 
    let changed = false;
    
    state.rooms.forEach(r => {
        if (r.status === 'occupied' && r.nextBillDate) {
            let due = new Date(r.nextBillDate); 
            due.setHours(0,0,0,0);
            
            let type = state.roomTypes.find(t => t.id === r.typeId);
            
            while (today >= due) {
                if ((r.advance || 0) >= type.price) { 
                    r.advance -= type.price; 
                } else { 
                    r.debt += (type.price - (r.advance || 0)); 
                    r.advance = 0; 
                    if (!r.debtDate) {
                        r.debtDate = due.toISOString().split('T')[0]; 
                    }
                }
                r.nextBillDate = calculateNextBillDate(r.nextBillDate, r.dueDay);
                due = new Date(r.nextBillDate); 
                due.setHours(0,0,0,0); 
                changed = true;
            }
        }
    });
    if (changed) saveData();
}

function initApp() {
    // 1. Render Base UI
    appContainer.innerHTML = getBaseLayoutTemplate();
    document.getElementById('app-title').innerText = state.kosanName || "KosanKu";
    
    // 2. Inject Tab Templates
    document.getElementById('tab-dashboard').innerHTML = getTabDashboard();
    document.getElementById('tab-kamar').innerHTML = getTabKamar();
    document.getElementById('tab-catat').innerHTML = getTabCatat();
    document.getElementById('tab-riwayat').innerHTML = getTabRiwayat();
    document.getElementById('tab-analitik').innerHTML = getTabAnalitik();

    // 3. Jalankan semua binding Logic ke global window
    mountAppLogic();
    setupTouchEvents();
    
    // 4. Setup Tab Logic
    window.switchTab = (t) => {
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.add('hidden')
        });
        
        document.querySelectorAll('nav button').forEach(el => { 
            el.classList.remove('tab-active'); 
            el.classList.add('tab-inactive'); 
        });
        
        const tabEl = document.getElementById(`tab-${t}`);
        if (tabEl) tabEl.classList.remove('hidden');
        
        let nav = document.getElementById(`nav-${t}`);
        if (nav) { 
            nav.classList.remove('tab-inactive'); 
            nav.classList.add('tab-active'); 
        }
        
        let hk = document.getElementById('header-search-kamar');
        let hr = document.getElementById('header-search-riwayat');
        
        if (hk) hk.classList.toggle('hidden', t !== 'kamar');
        if (hr) hr.classList.toggle('hidden', t !== 'riwayat');
        
        window.currentTab = t;
        
        // Panggil render function sesuai tab
        if (t === 'dashboard') window.renderDashboard();
        if (t === 'kamar') window.renderRooms();
        if (t === 'catat') window.updateCatatCategories();
        if (t === 'riwayat') window.renderHistory();
        if (t === 'analitik') window.renderAnalytic();
        
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    // 5. Start from dashboard
    window.switchTab('dashboard');
}

// Eksekusi utama program
if (loadData() && state.rooms.length > 0) {
    checkAutoDueDates(); 
    initApp();
} else {
    appContainer.innerHTML = getOnboardingTemplate();
    mountOnboardingLogic(() => {
        initApp();
    });
}


