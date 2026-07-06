import { state, saveData } from '../store.js';
import { formatInputRp, getRawRpFromEl, formatRp } from '../utils.js';

let isEditMode = false;

export function getOnboardingTemplate() {
    return `
    <div id="onboarding" class="absolute inset-0 bg-[#e3e8ed] z-[100] overflow-y-auto flex flex-col">
        <div id="onboarding-wrap" class="p-6 max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
            <div id="onboarding-card" class="win-card p-8">
                <div id="onboarding-header">
                    <div class="flex items-center justify-between mb-1">
                        <h1 id="onboarding-title" class="text-2xl font-bold text-[#005fb8] tracking-tight">Setup Kosan</h1>
                        <button id="onboarding-close-btn" onclick="window.cancelEditSetup()" style="display:none" class="w-9 h-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex">
                            <svg class="w-5 h-5 m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <p id="onboarding-subtitle" class="text-xs text-slate-500 mb-5">Isi datanya langkah demi langkah, cuma butuh beberapa menit.</p>

                    <!-- Progress indicator -->
                    <div>
                        <div class="flex items-center gap-1.5 mb-2">
                            <div class="onboarding-dot flex-1 h-1.5 rounded-full bg-[#005fb8] transition-colors" data-step="1"></div>
                            <div class="onboarding-dot flex-1 h-1.5 rounded-full bg-slate-200 transition-colors" data-step="2"></div>
                            <div class="onboarding-dot flex-1 h-1.5 rounded-full bg-slate-200 transition-colors" data-step="3"></div>
                            <div class="onboarding-dot flex-1 h-1.5 rounded-full bg-slate-200 transition-colors" data-step="4"></div>
                        </div>
                        <div class="flex justify-between text-[10px] font-bold" id="onboarding-progress-labels">
                            <span data-step="1" class="text-[#005fb8]">Nama</span>
                            <span data-step="2" class="text-slate-400">Kamar</span>
                            <span data-step="3" class="text-slate-400">Tipe</span>
                            <span data-step="4" class="text-slate-400">Cek Ulang</span>
                        </div>
                    </div>
                </div>

                <div id="step-1" class="step-container">
                    <div class="onboarding-step-body">
                        <div class="flex items-center gap-2 mb-1 mt-6">
                            <span class="w-7 h-7 rounded-full bg-[#e4f0fa] text-[#005fb8] text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                            <label class="font-bold text-slate-800">Nama Kosan</label>
                        </div>
                        <p class="text-xs text-slate-500 mb-4 ml-9">Nama ini akan tampil di bagian atas aplikasi.</p>
                        <input type="text" id="setup-name" class="win-input w-full p-4 mb-1" placeholder="Cth: Kosan Makmur" oninput="document.getElementById('err-step1').classList.add('hidden')">
                        <p id="err-step1" class="hidden text-xs text-red-500 font-semibold mt-1">Nama kosan wajib diisi</p>
                    </div>
                    <div class="onboarding-footer mt-6">
                        <button onclick="window.goStep1Next()" class="win-btn w-full bg-blue-600 text-white p-4 font-semibold">Lanjut</button>
                    </div>
                </div>

                <div id="step-2" class="step-container hidden">
                    <div class="onboarding-step-body">
                        <div class="flex items-center gap-2 mb-1 mt-6">
                            <span class="w-7 h-7 rounded-full bg-[#e4f0fa] text-[#005fb8] text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                            <label class="font-bold text-slate-800">Lantai & Jumlah Kamar</label>
                        </div>
                        <p class="text-xs text-slate-500 mb-4 ml-9">Tambahkan tiap lantai, lalu isi berapa kamar di lantai itu.</p>
                        <div id="floor-list" class="space-y-3 mb-2"></div>
                        <p class="text-xs text-slate-600 mb-4 font-medium">Total kamar akan dibuat: <span id="setup-total-rooms" class="font-bold text-[#005fb8]">0</span> kamar</p>
                        <button onclick="window.addSetupFloor()" class="win-btn w-full bg-slate-100 text-slate-700 p-4 font-semibold mb-6 hover:bg-slate-200">+ Tambah Lantai</button>
                        <label class="block font-semibold mb-2 text-sm text-slate-700">Format Penomoran Kamar</label>
                        <select id="setup-format" class="win-input w-full p-4 mb-2" onchange="window.updateFormatPreview()">
                            <option value="1A">1A, 1B, 2A... (Lantai + Abjad)</option>
                            <option value="A1">A1, A2, B1... (Abjad + Lantai)</option>
                            <option value="101">101, 102, 201... (Angka Ratusan)</option>
                        </select>
                        <p class="text-xs text-slate-500">Contoh: <span id="format-preview-example" class="font-bold text-slate-700"></span></p>
                    </div>
                    <div class="onboarding-footer flex gap-3 mt-4">
                        <button onclick="window.prevStep(1)" class="win-btn w-1/3 bg-slate-100 text-slate-700 p-4 font-semibold">Kembali</button>
                        <button onclick="window.goStep2Next()" class="win-btn w-2/3 bg-blue-600 text-white p-4 font-semibold">Lanjut</button>
                    </div>
                </div>

                <div id="step-3" class="step-container hidden">
                    <div class="onboarding-step-body">
                        <div class="flex items-center gap-2 mb-1 mt-6">
                            <span class="w-7 h-7 rounded-full bg-[#e4f0fa] text-[#005fb8] text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                            <label class="font-bold text-slate-800">Tipe Kamar & Harga</label>
                        </div>
                        <p class="text-xs text-slate-500 mb-4 ml-9">Buat tipe kamar (misal: Standar, VIP), lalu cocokkan tipenya untuk tiap kamar di bawah.</p>
                        <div id="setup-types-container" class="space-y-3 mb-3"></div>
                        <button onclick="window.addSetupType()" class="win-btn w-full bg-slate-100 text-slate-700 p-4 font-semibold mb-6 hover:bg-slate-200">+ Tambah Tipe</button>
                        <label class="block font-semibold text-sm mb-1 pt-4 border-t border-slate-100">Tipe Tiap Kamar</label>
                        <p class="text-xs text-slate-500 mb-3">Ketuk dropdown di tiap kamar untuk memilih tipenya.</p>
                        <div id="setup-rooms-type-grid" class="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1"></div>
                    </div>
                    <div class="onboarding-footer flex gap-3 mt-8">
                        <button onclick="window.prevStep(2)" class="win-btn w-1/3 bg-slate-100 text-slate-700 p-4 font-semibold">Kembali</button>
                        <button onclick="window.prepConfirm(); window.nextStep(4)" class="win-btn w-2/3 bg-blue-600 text-white p-4 font-semibold">Lanjut</button>
                    </div>
                </div>

                <div id="step-4" class="step-container hidden">
                    <div class="onboarding-step-body">
                        <div class="flex items-center gap-2 mb-1 mt-6">
                            <span class="w-7 h-7 rounded-full bg-[#e4f0fa] text-[#005fb8] text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
                            <h2 class="font-bold text-slate-800">Cek Kembali Datanya</h2>
                        </div>
                        <p class="text-xs text-slate-500 mb-4 ml-9">Pastikan semua sudah benar sebelum disimpan.</p>
                        <div id="setup-confirm-data" class="bg-slate-50 rounded-xl p-4 text-sm max-h-64 overflow-y-auto border-none shadow-inner leading-relaxed"></div>
                    </div>
                    <div class="onboarding-footer flex gap-3 mt-4">
                        <button onclick="window.prevStep(3)" class="win-btn w-1/3 bg-slate-100 text-slate-700 p-4 font-semibold">Kembali</button>
                        <button onclick="window.finishSetup()" class="win-btn w-2/3 bg-[#107c41] text-white p-4 font-semibold">Simpan & Mulai</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

// Logic Onboarding (Di-export manual ke window biar onclick HTML jalan)
export function mountOnboardingLogic(onFinishCallback) {
    window.nextStep = (s) => {
        document.querySelectorAll('.step-container').forEach(el => el.classList.add('hidden')); 
        document.getElementById(`step-${s}`).classList.remove('hidden'); 
        updateOnboardingProgress(s);
    };
    
    window.prevStep = (s) => window.nextStep(s);

    window.goStep1Next = () => {
        let name = document.getElementById('setup-name').value.trim();
        if (!name) { document.getElementById('err-step1').classList.remove('hidden'); return; }
        window.nextStep(2);
    };

    window.goStep2Next = () => {
        if (state.setupFloors.length === 0) { alert('Tambahkan minimal 1 lantai dulu.'); return; }
        if (!generateRooms()) return;
        window.nextStep(3);
    };

    window.updateFormatPreview = () => {
        let format = document.getElementById('setup-format').value;
        let map = { 
            '1A': '1A, 1B, 1C... (lantai 1), lalu 2A, 2B... (lantai 2)', 
            'A1': 'A1, A2, A3... (lantai 1), lalu B1, B2... (lantai 2)', 
            '101': '101, 102, 103... (lantai 1), lalu 201, 202... (lantai 2)' 
        };
        let exampleEl = document.getElementById('format-preview-example');
        if(exampleEl) exampleEl.innerText = map[format] || '';
    };

    window.addSetupFloor = () => {
        state.setupFloors.push({ id: state.setupFloors.length+1, count: 5 }); 
        window.renderSetupFloors();
    };

    window.updateSetupTotalRooms = () => {
        let total = state.setupFloors.reduce((a, f) => a + (parseInt(f.count) || 0), 0);
        let el = document.getElementById('setup-total-rooms');
        if (el) el.innerText = total;
    };

    window.updateFloorCount = (index, value) => {
        state.setupFloors[index].count = parseInt(value) || 1;
        window.updateSetupTotalRooms();
    };

    window.removeSetupFloor = (index) => {
        state.setupFloors.splice(index, 1);
        window.renderSetupFloors();
    };

    window.renderSetupFloors = () => {
        document.getElementById('floor-list').innerHTML = state.setupFloors.map((f, i) => `
            <div class="win-card p-3 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                    <p class="text-[11px] text-slate-500 font-semibold mb-1">Lantai ${i+1}</p>
                    <input type="number" min="1" value="${f.count}" onchange="window.updateFloorCount(${i}, this.value)" class="win-input w-full min-w-0 p-3" placeholder="Jumlah kamar">
                </div>
                <button onclick="window.removeSetupFloor(${i})" class="text-red-500 bg-red-50 rounded-lg font-bold w-10 h-10 flex-shrink-0 flex items-center justify-center hover:bg-red-100">X</button>
            </div>
        `).join(''); 
        window.updateSetupTotalRooms();
    };

    window.updateTypeName = (index, value) => {
        state.roomTypes[index].name = value;
        window.renderSetupRoomsGrid();
    };

    window.updateTypePrice = (index, el) => {
        formatInputRp(el);
        state.roomTypes[index].price = getRawRpFromEl(el);
    };

    window.renderSetupTypes = () => {
        document.getElementById('setup-types-container').innerHTML = state.roomTypes.map((t, i) => `
            <div class="win-card p-3 flex gap-3 items-center shadow-sm">
                <div class="flex-1">
                    <input type="text" value="${t.name}" onchange="window.updateTypeName(${i}, this.value)" class="win-input w-full p-3 mb-2 text-sm font-bold" placeholder="Nama Tipe">
                    <input type="text" inputmode="numeric" value="${t.price.toLocaleString('id-ID')}" oninput="window.updateTypePrice(${i}, this)" class="win-input w-full p-3 text-sm" placeholder="Harga">
                </div>
                ${i>0 ? `<button onclick="window.removeSetupType('${t.id}')" class="text-red-500 bg-red-50 rounded-lg font-bold p-3 h-full hover:bg-red-100">X</button>` : `<div class="w-10"></div>`}
            </div>
        `).join('');
        window.renderSetupRoomsGrid();
    };

    window.renderSetupRoomsGrid = () => {
        if(state.rooms.length === 0) return;
        document.getElementById('setup-rooms-type-grid').innerHTML = state.rooms.map(r => `
            <div class="p-3 rounded-xl bg-white shadow-sm flex flex-col justify-between">
                <p class="font-bold text-sm mb-2 text-slate-800">${r.number}</p>
                <select onchange="window.assignRoomType('${r.id}', this.value)" class="win-input w-full p-2.5 text-xs">
                    ${state.roomTypes.map(t => `<option value="${t.id}" ${r.typeId === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                </select>
            </div>
        `).join('');
    };

    window.assignRoomType = (rid, tid) => { 
        let r = state.rooms.find(x => x.id === rid); 
        r.typeId = tid; 
    };

    window.addSetupType = () => { 
        state.roomTypes.push({ id: 't'+Date.now(), name: "Tipe Baru", price: 800000 }); 
        window.renderSetupTypes(); 
    };

    window.removeSetupType = (id) => { 
        state.roomTypes = state.roomTypes.filter(t=>t.id!==id); 
        state.rooms.forEach(r => { if(r.typeId===id) r.typeId=state.roomTypes[0].id }); 
        window.renderSetupTypes(); 
    };

    window.prepConfirm = () => { 
        state.kosanName = document.getElementById('setup-name').value || "KosanKu"; 
        let html = `
            <div class="mb-3"><span class="text-slate-500 text-xs block">Kosan:</span><span class="font-bold text-base text-slate-800">${state.kosanName}</span></div>
            <div class="mb-4"><span class="text-slate-500 text-xs block">Total Kamar:</span><span class="font-bold text-base text-slate-800">${state.rooms.length}</span></div>`; 
        
        state.roomTypes.forEach(t => {
            html += `<div class="flex justify-between py-1 border-t border-slate-200/50 mt-1"><span class="font-semibold text-slate-700">${t.name} <span class="text-xs text-slate-400 font-normal">(${formatRp(t.price)})</span></span><span class="font-bold text-slate-800">${state.rooms.filter(r=>r.typeId===t.id).length} kmr</span></div>`;
        }); 
        document.getElementById('setup-confirm-data').innerHTML = html; 
    };

    window.finishSetup = () => {
        saveData();
        if (onFinishCallback) onFinishCallback();
    };

    // Initialize Default view for onboarding
    document.getElementById('setup-format').value = state.roomFormat || '1A';
    window.renderSetupFloors(); 
    window.renderSetupTypes(); 
    window.updateFormatPreview();
}

function updateOnboardingProgress(step) {
    document.querySelectorAll('.onboarding-dot').forEach(d => {
        let s = parseInt(d.dataset.step);
        d.classList.toggle('bg-[#005fb8]', s <= step);
        d.classList.toggle('bg-slate-200', s > step);
    });
    document.querySelectorAll('#onboarding-progress-labels span').forEach(l => {
        let s = parseInt(l.dataset.step);
        l.classList.toggle('text-[#005fb8]', s === step);
        l.classList.toggle('text-slate-400', s !== step);
    });
}

function generateRooms() {
    let format = document.getElementById('setup-format').value; 
    state.roomFormat = format; 
    let abjad = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let newNumbers = [];
    
    state.setupFloors.forEach((f, fi) => {
        for(let i=0; i<f.count; i++) {
            let num = format==="1A" ? `${fi+1}${abjad[i%26]}` : format==="A1" ? `${abjad[i%26]}${fi+1}` : `${fi+1}${String(i+1).padStart(2,'0')}`;
            newNumbers.push(num);
        }
    });
    
    let makeEmptyRoom = (num) => ({ id:'r'+Date.now()+Math.random().toString(36).substr(2,6), number:num, typeId:state.roomTypes[0].id, status:'empty', tenantName:'', dueDay: null, debt:0, advance:0, nextBillDate:null, dpDueDate:null, debtDate:null, penaltyPaid:0, entryDate:null, history:[] });

    if (isEditMode) {
        let existingByNumber = {}; 
        state.rooms.forEach(r => existingByNumber[r.number] = r);
        let removed = state.rooms.filter(r => !newNumbers.includes(r.number));
        
        if (removed.length > 0) {
            let hasData = removed.some(r => r.status === 'occupied' || r.debt > 0 || (r.history && r.history.length > 0));
            let msg = `Konfigurasi baru ini akan menghapus ${removed.length} kamar: ${removed.map(r=>r.number).join(', ')}.`;
            if (hasData) msg += `\n\nPERHATIAN: sebagian kamar tersebut punya data penghuni/riwayat transaksi yang akan HILANG PERMANEN.`;
            msg += `\n\nLanjutkan?`;
            if (!confirm(msg)) return false;
        }
        state.rooms = newNumbers.map(num => existingByNumber[num] || makeEmptyRoom(num));
    } else {
        state.rooms = newNumbers.map(num => makeEmptyRoom(num));
    }
    
    window.renderSetupTypes();
    return true;
}

