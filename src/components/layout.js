export function getBaseLayoutTemplate() {
    return `
        <!-- ==================== HEADER ==================== -->
        <div class="sticky top-0 z-30 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <header class="text-slate-800 p-4 flex justify-between items-center">
                <h1 id="app-title" class="font-bold text-xl tracking-tight">KosanKu</h1>
                <button onclick="window.openSettings()" class="text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </button>
            </header>
            
            <div id="header-search-kamar" class="hidden px-4 pb-4">
                <input type="text" id="search-kamar" placeholder="Cari kamar / penghuni..." class="win-input w-full p-3 font-medium text-sm" onkeyup="window.renderRooms()">
            </div>
            <div id="header-search-riwayat" class="hidden px-4 pb-4">
                <input type="text" id="search-riwayat" placeholder="Cari kategori, keterangan, atau kode kuitansi..." class="win-input w-full p-3 font-medium text-sm" onkeyup="window.renderHistory()">
            </div>
        </div>

        <!-- ==================== MAIN CONTENT ==================== -->
        <main id="main-content" class="flex-1 overflow-y-auto pb-28 px-4 pt-4">
            <!-- Konten Tab akan di-inject ke sini oleh module masing-masing (di Tarikan 3) -->
            <div id="tab-dashboard" class="tab-content space-y-4 hidden"></div>
            <div id="tab-kamar" class="tab-content hidden"></div>
            <div id="tab-catat" class="tab-content hidden"></div>
            <div id="tab-riwayat" class="tab-content hidden"></div>
            <div id="tab-analitik" class="tab-content hidden"></div>
        </main>

        <!-- ==================== NAVIGATION ==================== -->
        <div class="fixed bottom-5 left-4 right-4 z-40 pointer-events-none">
            <nav class="bg-white rounded-2xl flex justify-around p-2 border-2 border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.18)] pointer-events-auto">
                <button onclick="window.switchTab('dashboard')" id="nav-dashboard" class="flex flex-col items-center justify-center p-3 w-16 h-14 transition-all tab-active group">
                    <svg class="w-6 h-6 transition-transform group-active:scale-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
                </button>
                <button onclick="window.switchTab('kamar')" id="nav-kamar" class="flex flex-col items-center justify-center p-3 w-16 h-14 transition-all tab-inactive group">
                    <svg class="w-6 h-6 transition-transform group-active:scale-90" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                </button>
                <button onclick="window.switchTab('catat')" id="nav-catat" class="flex flex-col items-center justify-center p-3 w-16 h-14 transition-all tab-inactive group">
                    <svg class="w-6 h-6 transition-transform group-active:scale-90" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"></path></svg>
                </button>
                <button onclick="window.switchTab('riwayat')" id="nav-riwayat" class="flex flex-col items-center justify-center p-3 w-16 h-14 transition-all tab-inactive group">
                    <svg class="w-6 h-6 transition-transform group-active:scale-90" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path></svg>
                </button>
                <button onclick="window.switchTab('analitik')" id="nav-analitik" class="flex flex-col items-center justify-center p-3 w-16 h-14 transition-all tab-inactive group">
                    <svg class="w-6 h-6 transition-transform group-active:scale-90" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
                </button>
            </nav>
        </div>

        <!-- ==================== BOTTOM SHEETS CONTAINERS ==================== -->
        <div id="bs-overlay" class="fixed inset-0 bg-slate-900/60 z-40 hidden bottom-sheet-overlay" onclick="window.closeAllSheets()"></div>

        <div id="sheet-room" class="bottom-sheet fixed bottom-0 left-0 w-full bg-[#e3e8ed] z-50 transform translate-y-full flex flex-col max-h-[92vh]">
            <div class="w-full h-2 bg-transparent relative py-4" id="sheet-room-handle">
                <div class="mx-auto w-12 h-1.5 bg-slate-300 rounded-full"></div>
            </div>
            <div class="px-5 overflow-y-auto flex-1 pb-10" id="sheet-room-content"></div>
        </div>

        <div id="sheet-receipt" class="bottom-sheet fixed bottom-0 left-0 w-full bg-[#e3e8ed] z-50 transform translate-y-full flex flex-col max-h-[88vh]">
             <div class="w-full h-2 bg-transparent relative py-4" id="sheet-receipt-handle">
                <div class="mx-auto w-12 h-1.5 bg-slate-300 rounded-full"></div>
             </div>
            <div class="px-5 overflow-y-auto flex-1 pb-10" id="sheet-receipt-content"></div>
        </div>

        <!-- Settings dan Price Change Sheet disiapkan containernya aja -->
        <div id="sheet-settings" class="bottom-sheet fixed bottom-0 left-0 w-full bg-[#e3e8ed] z-50 transform translate-y-full flex flex-col h-[90vh]">
             <div class="w-full h-2 bg-transparent relative py-4" id="sheet-settings-handle"><div class="mx-auto w-12 h-1.5 bg-slate-300 rounded-full"></div></div>
            <div class="px-5 overflow-y-auto flex-1 pb-10" id="sheet-settings-content"></div>
        </div>

        <div id="sheet-price-change" class="bottom-sheet fixed bottom-0 left-0 w-full bg-[#e3e8ed] z-50 transform translate-y-full flex flex-col h-[90vh]">
             <div class="w-full h-2 bg-transparent relative py-4" id="sheet-price-change-handle"><div class="mx-auto w-12 h-1.5 bg-slate-300 rounded-full"></div></div>
            <div class="px-5 overflow-y-auto flex-1 pb-10" id="sheet-price-change-content"></div>
        </div>

        <!-- MODAL PAYMENT -->
        <div id="modal-payment" class="fixed inset-0 z-[70] hidden items-center justify-center p-4 bg-slate-900/60 opacity-0 transition-opacity duration-200">
            <div class="bg-[#f0f4f8] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform scale-95 transition-transform duration-200 flex flex-col max-h-[90vh]" id="modal-payment-card">
                <div class="p-4 flex justify-between items-center bg-white border-b border-slate-200/60">
                    <h2 class="font-bold text-slate-800 text-lg">Detail Alokasi Pembayaran</h2>
                    <button onclick="window.closePaymentDetail()" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div class="p-5 overflow-y-auto flex-1" id="modal-payment-content"></div>
            </div>
        </div>
    `;
}

// Global logic untuk UI Sheets
let isSheetOpen = false;
let lastOpenCall = { id: null, time: 0 };

export function anySheetVisuallyOpen() {
    return [...document.querySelectorAll('.bottom-sheet')].some(s => {
        let t = s.style.transform;
        return t === 'translateY(0px)' || t === 'translateY(0)' || t === '';
    }) && !document.getElementById('bs-overlay').classList.contains('hidden');
}

export function hideAllSheetsVisually() {
    document.querySelectorAll('.bottom-sheet').forEach(s => s.style.transform='translateY(100%)');
    setTimeout(() => { 
        document.getElementById('bs-overlay').classList.add('hidden'); 
        document.body.classList.remove('no-scroll'); 
    }, 300);
}

export function openSheet(id) {
    let now = Date.now();
    if (lastOpenCall.id === id && (now - lastOpenCall.time) < 400) return;
    lastOpenCall = { id, time: now };
    
    if (!isSheetOpen) history.pushState({ sheet: id }, ''); 
    else history.replaceState({ sheet: id }, '');
    
    isSheetOpen = true; 
    document.body.classList.add('no-scroll'); 
    document.getElementById('bs-overlay').classList.remove('hidden');
    setTimeout(() => { document.getElementById(id).style.transform = 'translateY(0)'; }, 10);
}

export function closeAllSheets() {
    if (isSheetOpen) { history.back(); }
    else if (anySheetVisuallyOpen()) { hideAllSheetsVisually(); }
}

export function setupTouchEvents() {
    document.querySelectorAll('.bottom-sheet').forEach(sheet => {
        let handle = sheet.querySelector('div[id$="-handle"]'); 
        if(!handle) return; 
        
        let startY, currentY;
        handle.addEventListener('touchstart', e => startY = e.touches[0].clientY, {passive:true});
        handle.addEventListener('touchmove', e => { 
            currentY = e.touches[0].clientY; 
            if(currentY>startY) sheet.style.transform = `translateY(${currentY-startY}px)`; 
        }, {passive:true});
        handle.addEventListener('touchend', () => { 
            if(currentY-startY>100) { closeAllSheets(); } 
            else { sheet.style.transform='translateY(0)'; }
        });
    });

    window.addEventListener('popstate', (e) => {
        let modal = document.getElementById('modal-payment');
        if (modal && !modal.classList.contains('hidden')) {
            window.closePaymentDetail();
            return;
        }
        if (isSheetOpen || anySheetVisuallyOpen()) {
            hideAllSheetsVisually();
            isSheetOpen = false;
        }
    });
}

