export function getTabDashboard() {
    return `
        <div class="win-card p-5 relative overflow-hidden bg-gradient-to-br from-[#0a6fd6] to-[#013a75] text-white shadow-[0_10px_30px_rgba(1,58,117,0.35)]">
            <div class="absolute -left-10 -top-10 w-32 h-32 bg-white/10 rounded-full"></div>
            <div class="absolute -right-10 -bottom-14 w-36 h-36 bg-white/5 rounded-full"></div>
            <div class="flex items-center justify-between mb-5 relative z-10">
                <button onclick="window.dashChangeMonth(-1)" class="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-white/15 active:scale-90 transition-transform">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <p id="dash-month-label" class="text-sm font-bold text-white uppercase tracking-wider"></p>
                <button onclick="window.dashChangeMonth(1)" id="dash-next-btn" class="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-white/15 active:scale-90 transition-transform disabled:opacity-30 disabled:pointer-events-none">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </div>
            <div class="relative z-10 divide-y divide-white/10">
                <div class="flex items-center justify-between py-3">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-emerald-400/20 flex items-center justify-center">
                            <svg class="w-4.5 h-4.5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5m0 0l-6 6m6-6l6 6"></path>
                            </svg>
                        </div>
                        <p class="text-[12px] text-white/70 font-semibold uppercase tracking-wider">Pemasukan</p>
                    </div>
                    <p id="dash-income" class="text-xl font-bold text-white">Rp 0</p>
                </div>
                <div class="flex items-center justify-between py-3">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-rose-400/20 flex items-center justify-center">
                            <svg class="w-4.5 h-4.5 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m0 0l-6-6m6 6l6-6"></path>
                            </svg>
                        </div>
                        <p class="text-[12px] text-white/70 font-semibold uppercase tracking-wider">Pengeluaran</p>
                    </div>
                    <p id="dash-expense" class="text-xl font-bold text-white">Rp 0</p>
                </div>
            </div>
        </div>
        <div class="win-card p-5 mt-4">
            <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 class="font-bold text-slate-800">Perlu Perhatian</h3>
                <div class="w-8 h-1 bg-slate-200 rounded-full"></div>
            </div>
            <div id="dash-alerts" class="space-y-3"></div>
        </div>
    `;
}

export function getTabKamar() {
    return `
        <div id="room-filter-bar" class="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
            <button onclick="window.setRoomFilter('all')" data-filter="all" class="filter-chip active">Semua</button>
            <button onclick="window.setRoomFilter('occupied')" data-filter="occupied" class="filter-chip">Terisi</button>
            <button onclick="window.setRoomFilter('empty')" data-filter="empty" class="filter-chip">Kosong</button>
            <button onclick="window.setRoomFilter('nunggak')" data-filter="nunggak" class="filter-chip">Nunggak</button>
            <button onclick="window.setRoomFilter('lunas')" data-filter="lunas" class="filter-chip">Lunas</button>
        </div>
        <div id="room-grid" class="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4"></div>
    `;
}

export function getTabCatat() {
    return `
        <div class="win-card p-5">
            <h2 class="font-bold text-xl mb-6 text-slate-800">Catat Transaksi</h2>
            
            <label class="block font-semibold mb-1.5 text-sm text-slate-700">Jenis</label>
            <select id="catat-type" class="win-input w-full p-4 mb-4" onchange="window.updateCatatCategories()">
                <option value="in">Pemasukan (+)</option>
                <option value="out">Pengeluaran (-)</option>
            </select>
            
            <label class="block font-semibold mb-1.5 text-sm text-slate-700">Kategori</label>
            <select id="catat-category" class="win-input w-full p-4 mb-4"></select>
            
            <label class="block font-semibold mb-1.5 text-sm text-slate-700">Nominal (Rp)</label>
            <input type="text" inputmode="numeric" id="catat-amount" class="win-input w-full p-4 mb-4 font-bold text-lg text-blue-700" placeholder="0" oninput="window.formatInputRp(this)">
            
            <label class="block font-semibold mb-1.5 text-sm text-slate-700">Metode</label>
            <select id="catat-method" class="win-input w-full p-4 mb-4">
                <option value="Cash">Cash</option>
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Dana">Dana</option>
                <option value="Gopay">Gopay</option>
                <option value="Ovo">Ovo</option>
            </select>
            
            <label class="block font-semibold mb-1.5 text-sm text-slate-700">Keterangan</label>
            <input type="text" id="catat-desc" class="win-input w-full p-4 mb-8" placeholder="Catatan tambahan...">
            
            <button onclick="window.saveManualTransaction()" class="win-btn w-full bg-blue-600 text-white p-4 font-bold text-base shadow-sm">Simpan Transaksi</button>
        </div>
    `;
}

export function getTabRiwayat() {
    return `
        <div id="history-normal-bar" class="flex justify-between items-center mb-4 px-1">
            <h3 class="font-bold text-slate-800">Semua Transaksi</h3>
            <button onclick="window.clearHistory()" class="text-xs text-red-500 font-semibold bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors">Hapus Lama</button>
        </div>
        <div id="history-select-bar" class="hidden justify-between items-center mb-4 px-3 py-2.5 bg-blue-50 border-2 border-blue-200 rounded-2xl">
            <div class="flex items-center gap-2">
                <button onclick="window.exitHistorySelectMode()" class="text-slate-500 hover:text-slate-700 p-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <span id="history-select-count" class="font-bold text-sm text-slate-800">0 dipilih</span>
            </div>
            <div class="flex gap-2">
                <button onclick="window.copySelectedHistory()" class="text-xs font-bold bg-white text-[#005fb8] border-2 border-[#005fb8]/30 px-3 py-2 rounded-full">Copy</button>
                <button onclick="window.deleteSelectedHistory()" class="text-xs font-bold bg-[#e81123] text-white px-3 py-2 rounded-full">Hapus</button>
            </div>
        </div>
        <div id="history-list" class="space-y-3 pb-4"></div>
    `;
}

export function getTabAnalitik() {
    return `
        <div class="win-card p-5 mb-4">
            <h3 class="font-bold mb-6 text-slate-800">Arus Kas (6 Bulan)</h3>
            <canvas id="chart-cashflow" width="400" height="280"></canvas>
        </div>
        <div class="win-card p-5">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 class="font-bold text-slate-800">Rincian Keuangan</h3>
            </div>
            <div id="analytic-details" class="space-y-3 text-sm"></div>
        </div>
    `;
}


