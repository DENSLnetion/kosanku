import { state, saveData } from './store.js';
import { openSheet, closeAllSheets } from './components/layout.js';
import { 
    formatInputRp, getRawRp, getRawRpFromEl, formatRp, getTodayStr, 
    generateId, calculateNextBillDate, calculatePreviousBillDate, 
    fmtTglSingkat, getMonthYearStr 
} from './utils.js';

let dashMonthOffset = 0;
let roomFilter = 'all';
let currentRoomCycles = [];
let currentCycleIndex = 0;
let historySelectMode = false;
let historySelected = new Set();
let chartInstance = null;

export function mountAppLogic() {
    
    // --- HELPER DENDA ---
    function getPenaltyInfo(room, asOfDateStr) {
        asOfDateStr = asOfDateStr || getTodayStr();
        if (room.debt === 0 && !room.dpDueDate) return null;
        
        let pAmt = parseInt(state.settings.penaltyAmount) || 0;
        if (pAmt <= 0 || state.settings.penaltyType === 'none') return null;

        let startPenaltyDate = room.dpDueDate ? room.dpDueDate : room.debtDate;
        if (!startPenaltyDate) return null;

        let due = new Date(startPenaltyDate); 
        due.setHours(0,0,0,0);
        
        let asOf = new Date(asOfDateStr); 
        asOf.setHours(0,0,0,0);
        
        let diffDays = Math.floor((asOf - due) / 86400000);
        if (diffDays <= 0) return null;

        let pType = state.settings.penaltyType;
        let count = 0, unitLabel = '';
        
        if (pType === 'daily') { 
            count = diffDays; 
            unitLabel = 'hari'; 
        }
        else if (pType === 'every3days') { 
            count = Math.floor(diffDays / 3); 
            unitLabel = '3 hari'; 
        }
        else if (pType === 'weekly') { 
            count = Math.floor(diffDays / 7); 
            unitLabel = 'minggu'; 
        }
        else if (pType === 'monthly') { 
            count = Math.floor(diffDays / 30); 
            unitLabel = 'bulan'; 
        }

        if (count <= 0) return null;

        let gross = count * pAmt; 
        let paid = room.penaltyPaid || 0;
        let outstanding = Math.max(0, gross - paid);
        if (outstanding <= 0) return null; 

        return { 
            count, 
            unitLabel, 
            perUnit: pAmt, 
            gross, 
            paid, 
            amount: outstanding, 
            startDate: startPenaltyDate, 
            endDate: asOfDateStr 
        };
    }
    
    window.getPenaltyInfo = getPenaltyInfo;

    window.calculatePenalty = (room) => { 
        let info = getPenaltyInfo(room); 
        return info ? info.amount : 0; 
    };
    
    window.isTelatTanpaDenda = (room) => {
        let startPenaltyDate = room.dpDueDate ? room.dpDueDate : room.debtDate;
        if (!startPenaltyDate) return false;
        
        let due = new Date(startPenaltyDate); 
        due.setHours(0,0,0,0);
        
        let today = new Date(); 
        today.setHours(0,0,0,0);
        
        let diffDays = Math.floor((today - due) / 86400000);
        if (diffDays <= 0) return false;
        
        let pAmt = parseInt(state.settings.penaltyAmount) || 0;
        return (pAmt <= 0 || state.settings.penaltyType === 'none');
    };

    function getNunggakMonthLabel(room) {
        if (!room.debt || room.debt <= 0) return null;
        
        let startStr = room.debtDate || room.nextBillDate;
        if (!startStr) return null;
        
        let endStr = room.nextBillDate && room.dueDay ? calculatePreviousBillDate(room.nextBillDate, room.dueDay) : startStr;
        let startLabel = getMonthYearStr(startStr);
        let endLabel = getMonthYearStr(endStr);
        
        return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
    }

    // --- DASHBOARD LOGIC ---
    window.dashChangeMonth = (delta) => {
        let newOffset = dashMonthOffset + delta;
        if (newOffset > 0) return;
        dashMonthOffset = newOffset;
        window.renderDashboard();
    };

    window.renderDashboard = () => {
        let baseDate = new Date(); 
        baseDate.setDate(1); 
        baseDate.setMonth(baseDate.getMonth() + dashMonthOffset);
        
        let monthPrefix = `${baseDate.getFullYear()}-${String(baseDate.getMonth()+1).padStart(2,'0')}`;
        let monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        
        let labelEl = document.getElementById('dash-month-label');
        if (labelEl) {
            labelEl.innerText = `${monthNames[baseDate.getMonth()]} ${baseDate.getFullYear()}`;
        }
        
        let nextBtn = document.getElementById('dash-next-btn');
        if (nextBtn) {
            nextBtn.disabled = dashMonthOffset >= 0;
        }
        
        let inBln = 0; 
        let outBln = 0;
        
        state.transactions.forEach(t => { 
            if (t.date.startsWith(monthPrefix)) { 
                if (t.type === 'in') inBln += t.amount; 
                else outBln += t.amount; 
            } 
        });
        
        let inEl = document.getElementById('dash-income');
        let outEl = document.getElementById('dash-expense');
        if (inEl) inEl.innerText = formatRp(inBln); 
        if (outEl) outEl.innerText = formatRp(outBln);

        let alerts = []; 
        let currDate = new Date(); 
        currDate.setHours(0,0,0,0);
        
        state.rooms.forEach(r => {
            if (r.status === 'occupied') {
                let pnlty = window.calculatePenalty(r); 
                let totBill = (r.debt > 0 ? r.debt : 0) + pnlty;
                
                if (totBill > 0) {
                    alerts.push({ 
                        room: r, 
                        type: 'debt', 
                        msg: `Tunggakan: ${formatRp(totBill)} ${pnlty > 0 ? `(Pokok ${formatRp(r.debt)} + Denda ${formatRp(pnlty)})` : ''}` 
                    });
                }
                else if (r.dpDueDate) {
                    let due = new Date(r.dpDueDate); 
                    due.setHours(0,0,0,0); 
                    let diff = Math.ceil((due - currDate) / 86400000);
                    if (diff < 0) {
                        alerts.push({ room: r, type: 'debt', msg: `Tenggat DP lewat ${Math.abs(diff)} hari!` }); 
                    } else {
                        alerts.push({ room: r, type: 'warning', msg: `Sisa waktu DP: ${diff} hari` });
                    }
                }
                else if (r.nextBillDate) {
                    let due = new Date(r.nextBillDate); 
                    due.setHours(0,0,0,0); 
                    let diff = Math.ceil((due - currDate) / 86400000);
                    if (diff === 0) {
                        alerts.push({ room: r, type: 'warning', msg: `Jatuh tempo HARI INI` }); 
                    } else if (diff > 0 && diff <= 7) {
                        alerts.push({ room: r, type: 'warning', msg: `Jatuh tempo ${diff} hari lagi` });
                    }
                }
            }
        });
        
        let alertC = document.getElementById('dash-alerts');
        if (alertC) {
            if (alerts.length === 0) {
                alertC.innerHTML = `<p class="text-sm text-slate-500 py-4 text-center">Yeay! Kosan aman terkendali.</p>`;
            } else {
                alertC.innerHTML = alerts.map(a => `
                    <div onclick="window.openRoomSheet('${a.room.id}')" class="rounded-xl ${a.type==='debt' ? 'bg-red-50' : 'bg-orange-50'} p-4 cursor-pointer transition-transform active:scale-95">
                        <div class="flex justify-between items-center mb-1.5">
                            <span class="font-bold text-slate-800 flex items-center gap-2">
                                <div class="w-2.5 h-2.5 rounded-full ${a.type==='debt' ? 'bg-red-500' : 'bg-orange-500'}"></div>
                                Kmr ${a.room.number}
                            </span>
                            <span class="text-[10px] px-2 py-1 bg-white/70 rounded-md font-semibold truncate max-w-[100px] text-slate-600 shadow-sm">${a.room.tenantName}</span>
                        </div>
                        <p class="text-sm text-slate-700 ml-4.5">${a.msg}</p>
                    </div>
                `).join('');
            }
        }
    };

    // --- KAMAR LOGIC ---
    window.setRoomFilter = (f) => {
        roomFilter = f;
        document.querySelectorAll('#room-filter-bar .filter-chip').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === f)
        });
        window.renderRooms();
    };

    window.renderRooms = () => {
        let searchEl = document.getElementById('search-kamar');
        let query = searchEl ? searchEl.value.toLowerCase() : ''; 
        let container = document.getElementById('room-grid');
        
        if (!container) return;

        let filtered = state.rooms.filter(r => 
            r.number.toLowerCase().includes(query) || 
            r.tenantName.toLowerCase().includes(query)
        );
        
        filtered = filtered.filter(r => {
            if (roomFilter === 'all') return true;
            if (roomFilter === 'occupied') return r.status === 'occupied';
            if (roomFilter === 'empty') return r.status === 'empty';
            if (r.status !== 'occupied') return false;
            
            let pnlty = window.calculatePenalty(r); 
            let totBill = r.debt + pnlty;
            let isNunggak = totBill > 0 || (r.dpDueDate && new Date(r.dpDueDate) < new Date());
            
            if (roomFilter === 'nunggak') return isNunggak;
            if (roomFilter === 'lunas') return !isNunggak && !r.dpDueDate;
            
            return true;
        });
        
        if (filtered.length === 0) {
            container.innerHTML = `<p class="col-span-2 sm:col-span-3 text-sm text-slate-400 text-center py-8">Tidak ada kamar yang cocok.</p>`;
        } else {
            container.innerHTML = filtered.map(r => {
                let type = state.roomTypes.find(t => t.id === r.typeId); 
                let bg = 'bg-white'; 
                let dotColor = 'bg-slate-300';
                let pnlty = window.calculatePenalty(r); 
                let totBill = r.debt + pnlty;
                
                if (r.status === 'occupied') {
                    dotColor = 'bg-blue-500';
                    if (totBill > 0 || (r.dpDueDate && new Date(r.dpDueDate) < new Date())) { 
                        dotColor = 'bg-red-500'; 
                        bg = 'bg-red-50'; 
                    }
                    else if (r.dpDueDate) { 
                        dotColor = 'bg-amber-500'; 
                        bg = 'bg-amber-50'; 
                    }
                    else if (r.nextBillDate) {
                        let diff = Math.ceil((new Date(r.nextBillDate) - new Date().setHours(0,0,0,0)) / 86400000);
                        if (diff <= 7) { 
                            dotColor = 'bg-orange-500'; 
                            bg = 'bg-orange-50'; 
                        }
                        else { 
                            dotColor = 'bg-emerald-500'; 
                        } 
                    }
                }
                
                return `
                <div onclick="window.openRoomSheet('${r.id}')" class="win-card ${bg} p-4 cursor-pointer relative flex flex-col justify-between min-h-[105px] transition-transform active:scale-95">
                    ${r.advance > 0 ? `<div class="absolute top-3 right-3 w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Ada Saldo"></div>` : ''}
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center gap-2">
                            <div class="w-2.5 h-2.5 rounded-full ${dotColor}"></div>
                            <h4 class="font-bold text-lg text-slate-800 leading-none">${r.number}</h4>
                        </div>
                        <span class="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold tracking-wide uppercase">${type.name}</span>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-slate-700 truncate">${r.status==='empty' ? '<span class="text-slate-400 font-normal">Kosong</span>' : r.tenantName}</p>
                        ${r.status==='occupied' && (totBill>0) ? `<p class="text-[10px] text-red-700 font-bold mt-1.5 uppercase bg-red-100/60 inline-block px-1.5 py-0.5 rounded shadow-sm">Nunggak ${formatRp(totBill)}</p>` : ''}
                    </div>
                </div>`;
            }).join('');
        }
    };

    // --- ROOM SHEET & PAYMENT ---
    window.processPayment = (roomId, amount, method, descPrefix = "Pembayaran Sewa") => {
        let room = state.rooms.find(r => r.id === roomId); 
        let type = state.roomTypes.find(t => t.id === room.typeId);
        
        let price = type.price; 
        let desc = descPrefix; 
        
        let penaltyInfoSnapshot = getPenaltyInfo(room); 
        let currentPenalty = penaltyInfoSnapshot ? penaltyInfoSnapshot.amount : 0;
        
        let totalFunds = amount + (room.advance || 0); 
        let transLogs = []; 
        let transIdGroup = generateId();

        if (currentPenalty > 0) {
            if (totalFunds >= currentPenalty) {
                totalFunds -= currentPenalty; 
                room.penaltyPaid = (room.penaltyPaid || 0) + currentPenalty; 
                transLogs.push({ 
                    id: transIdGroup + 'P', 
                    date: getTodayStr(), 
                    type: 'in', 
                    category: 'Pendapatan Denda', 
                    amount: currentPenalty, 
                    method: method, 
                    desc: `Denda Keterlambatan (${room.number})`, 
                    roomId: room.id,
                    penaltyMeta: { 
                        perUnit: penaltyInfoSnapshot.perUnit, 
                        unitLabel: penaltyInfoSnapshot.unitLabel, 
                        count: penaltyInfoSnapshot.count, 
                        startDate: penaltyInfoSnapshot.startDate, 
                        endDate: penaltyInfoSnapshot.endDate, 
                        grossTotal: penaltyInfoSnapshot.gross, 
                        paidBefore: penaltyInfoSnapshot.paid, 
                        thisPayment: currentPenalty, 
                        outstandingAfter: Math.max(0, penaltyInfoSnapshot.gross - penaltyInfoSnapshot.paid - currentPenalty) 
                    }
                });
                desc += " + Bayar Denda";
            } else {
                room.penaltyPaid = (room.penaltyPaid || 0) + totalFunds; 
                transLogs.push({ 
                    id: transIdGroup + 'P', 
                    date: getTodayStr(), 
                    type: 'in', 
                    category: 'Pendapatan Denda', 
                    amount: totalFunds, 
                    method: method, 
                    desc: `Cicil Denda (${room.number})`, 
                    roomId: room.id,
                    penaltyMeta: { 
                        perUnit: penaltyInfoSnapshot.perUnit, 
                        unitLabel: penaltyInfoSnapshot.unitLabel, 
                        count: penaltyInfoSnapshot.count, 
                        startDate: penaltyInfoSnapshot.startDate, 
                        endDate: penaltyInfoSnapshot.endDate, 
                        grossTotal: penaltyInfoSnapshot.gross, 
                        paidBefore: penaltyInfoSnapshot.paid, 
                        thisPayment: totalFunds, 
                        outstandingAfter: Math.max(0, penaltyInfoSnapshot.gross - penaltyInfoSnapshot.paid - totalFunds) 
                    }
                });
                desc += " (Cuma nutup Denda)"; 
                totalFunds = 0;
            }
        }
        
        if (room.debt > 0 && totalFunds > 0) {
            if (totalFunds >= room.debt) {
                desc = room.dpDueDate ? "Pelunasan Sisa DP" : (desc.includes("Denda") ? "Pelunasan Tunggakan & Denda" : "Pelunasan Tunggakan");
                totalFunds -= room.debt; 
                room.debt = 0; 
                room.debtDate = null; 
                room.penaltyPaid = 0; 
                
                if (room.dpDueDate) {
                    room.dpDueDate = null;
                    if (!room.nextBillDate) {
                        let lunasD = new Date(); 
                        let entryD = room.entryDate ? new Date(room.entryDate) : lunasD;
                        room.dueDay = (state.settings.anchorPolicy === 'lunas_date') ? lunasD.getDate() : entryD.getDate();
                        
                        let baseDate = (state.settings.anchorPolicy === 'lunas_date') ? lunasD : entryD;
                        let start = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, room.dueDay);
                        start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
                        room.nextBillDate = start.toISOString().split('T')[0];
                    }
                }
            } else { 
                desc = room.dpDueDate ? "Cicil Sisa DP" : "Cicil Tunggakan"; 
                room.debt -= totalFunds; 
                totalFunds = 0; 
            }
        }

        if (totalFunds > 0 && room.nextBillDate) {
            let multiplier = Math.floor(totalFunds / price); 
            let rem = totalFunds % price;
            
            if (multiplier > 0) {
                for(let i = 0; i < multiplier; i++) {
                    room.nextBillDate = calculateNextBillDate(room.nextBillDate, room.dueDay);
                }
                desc += desc ? ` & Sewa ${multiplier} Bln` : `Sewa ${multiplier} Bln`;
            }
            
            room.advance = rem; 
            if (rem > 0 && multiplier === 0) {
                desc += desc ? ` (+ Saldo)` : `Bayar Sebagian / Titip Saldo`;
            }
        }

        if (amount > 0) {
            let deductFromAmt = currentPenalty > amount ? amount : currentPenalty;
            transLogs.push({ 
                id: transIdGroup, 
                date: getTodayStr(), 
                type: 'in', 
                category: 'Sewa Kamar', 
                amount: amount - deductFromAmt, 
                method: method, 
                desc: `${desc} (${room.number})`, 
                roomId: room.id 
            });
        }

        transLogs.forEach(lg => { 
            state.transactions.push(lg); 
            room.history.unshift(lg.id); 
        }); 
        
        saveData(); 
        return transLogs.length > 0 ? transLogs[transLogs.length-1].id : null;
    };

    window.openRoomSheet = (roomId) => {
        let room = state.rooms.find(r => r.id === roomId);
        let type = state.roomTypes.find(t => t.id === room.typeId);
        let c = document.getElementById('sheet-room-content');
        let pnlty = window.calculatePenalty(room);
        
        let html = `
            <div class="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                <h2 class="text-2xl font-bold text-slate-800">Kamar ${room.number}</h2>
                <div class="text-right">
                    <span class="block font-bold text-[#005fb8] text-lg">${formatRp(type.price)}</span>
                    <span class="text-[10px] text-slate-400 font-medium">/ bulan</span>
                </div>
            </div>
        `;

        if (room.status === 'empty') {
            html += `
                <div class="space-y-4">
                    <div class="win-card p-5">
                        <label class="block font-semibold text-sm mb-2 text-slate-700">Nama Penghuni</label>
                        <input type="text" id="r-name" class="win-input w-full p-4 mb-2" placeholder="Masukkan nama...">
                    </div>
                    
                    <div class="win-card p-5">
                        <label class="block font-semibold text-sm mb-2 text-slate-700">Status Pendataan</label>
                        <select id="r-scheme" class="win-input w-full p-4 mb-4" onchange="window.toggleRoomScheme('${type.price}')">
                            <option value="new">Penghuni Baru Masuk</option>
                            <option value="old">Pendataan Anak Kos Lama</option>
                        </select>

                        <div id="box-new">
                            <label class="block font-semibold text-sm mb-1 text-[#005fb8]">Uang Masuk Pertama (Rp)</label>
                            <p class="text-[11px] text-slate-500 mb-3 leading-relaxed">Isi nominal yang diserahkan. Jika kurang dari harga kamar, otomatis tercatat sebagai DP.</p>
                            <input type="text" inputmode="numeric" id="r-amt" class="win-input w-full p-4 mb-2 font-bold text-[#005fb8] text-lg bg-blue-50/50" value="${type.price.toLocaleString('id-ID')}" oninput="window.formatInputRp(this); window.toggleDpDateDynamic('${type.price}')">

                            <div id="box-dp-date" class="hidden mt-4 p-4 bg-orange-50/50 rounded-xl">
                                <label class="block text-sm font-bold text-orange-700 mb-2">Batas Waktu Pelunasan DP</label>
                                <input type="date" id="r-dp-date" class="win-input w-full p-3.5 bg-white">
                            </div>
                        </div>

                        <div id="box-old-date" class="hidden bg-indigo-100 border-2 border-indigo-300 p-4 rounded-xl mt-2 shadow-inner">
                            <label class="block font-semibold text-sm mb-1 text-indigo-900">Tgl Jatuh Tempo Tetap (1-31)</label>
                            <p class="text-[11px] text-indigo-900/70 mb-3 leading-relaxed">Setiap tanggal berapa penghuni ini biasa bayar tagihan bulanan?</p>
                            <input type="number" id="r-due-day" class="win-input w-full p-4 mb-5 bg-white border-2 border-slate-200 font-bold text-slate-800" min="1" max="31" value="1">
                            
                            <label class="block font-semibold text-sm mb-1 text-indigo-900">Cicilan Bulan Ini (Opsional)</label>
                            <p class="text-[11px] text-indigo-900/70 mb-3 leading-relaxed">Masukkan nominal jika anak kos sudah pernah nyicil untuk tagihan bulan berjalan.</p>
                            <div id="old-payments-container" class="space-y-2 mb-3"></div>
                            <button type="button" onclick="window.addOldPaymentRow()" class="win-btn w-full bg-white text-[#005fb8] border-2 border-white p-3.5 text-sm font-bold shadow-sm">+ Tambah Baris Pembayaran</button>
                        </div>
                    </div>

                    <div class="win-card p-5">
                        <label class="block font-semibold text-sm mb-2 text-slate-700">Metode Bayar</label>
                        <select id="r-method" class="win-input w-full p-4">
                            <option value="Cash">Cash</option>
                            <option value="Transfer">Transfer</option>
                        </select>
                    </div>
                    
                    <button onclick="window.actionOccupyRoom('${roomId}')" class="win-btn w-full bg-[#005fb8] text-white p-4 font-bold text-base shadow-sm mt-2">Simpan & Masukkan Data</button>
                </div>
            `;
        } else {
            let totalNunggakNow = room.debt + pnlty;
            let totalOwedNow = Math.max(0, totalNunggakNow > 0 ? (totalNunggakNow - room.advance) : (type.price - room.advance));
            let dendaAktif = state.settings.penaltyType !== 'none' && (parseInt(state.settings.penaltyAmount) || 0) > 0;
            
            let pnltyReal = getPenaltyInfo(room); 
            let pnltyInfo = room.nextBillDate ? getPenaltyInfo(room, room.nextBillDate) : getPenaltyInfo(room);
            let projectedNextBill = Math.max(0, type.price + room.debt + (pnltyInfo ? pnltyInfo.amount : 0) - room.advance);
            
            let statusTheme = 'bg-emerald-500 text-white';
            let statusSubText = 'text-emerald-100';
            let statusBtnBg = 'bg-emerald-700 hover:bg-emerald-800 text-white';
            let statusMsg = 'Aman & Lancar';
            let quickActionAmt = type.price;
            let quickActionLabel = 'Bayar Sewa Bulan Depan ↓';
            let rincianDendaDiStatus = ''; 

            if (totalNunggakNow > 0) {
                statusTheme = 'bg-[#e81123] text-white'; 
                statusSubText = 'text-red-100';
                statusBtnBg = 'bg-[#ba0d1b] hover:bg-[#9a0b16] text-white';
                
                let nunggakMonthLabel = getNunggakMonthLabel(room);
                statusMsg = `${nunggakMonthLabel ? nunggakMonthLabel + ' ' : ''}Nunggak ${formatRp(totalNunggakNow)}`;
                quickActionAmt = totalNunggakNow;
                quickActionLabel = 'Lunasi Tunggakan Sekarang ↓';
                
                if (pnlty > 0) {
                    rincianDendaDiStatus = `
                        <div class="mt-1 text-[10px] opacity-90 font-medium bg-black/20 px-2 py-1 rounded inline-block">
                            Pokok ${formatRp(room.debt)} + Denda ${formatRp(pnlty)}
                        </div>
                    `;
                }
            } else if (room.dpDueDate) {
                statusTheme = 'bg-[#d97706] text-white'; 
                statusSubText = 'text-amber-100';
                statusBtnBg = 'bg-[#b45309] hover:bg-[#92400e] text-white';
                statusMsg = 'Sisa DP Belum Lunas';
                quickActionAmt = room.debt;
                quickActionLabel = 'Lunasi Sisa DP ↓';
            } else if (room.nextBillDate) {
                let diff = Math.ceil((new Date(room.nextBillDate) - new Date().setHours(0,0,0,0)) / 86400000);
                if (diff < 0) {
                   statusTheme = 'bg-[#e81123] text-white';
                   statusSubText = 'text-red-100';
                   statusBtnBg = 'bg-[#ba0d1b] hover:bg-[#9a0b16] text-white';
                   statusMsg = `Telat ${Math.abs(diff)} Hari`;
                } else if (diff <= 7) {
                   statusTheme = 'bg-[#d97706] text-white';
                   statusSubText = 'text-amber-100';
                   statusBtnBg = 'bg-[#b45309] hover:bg-[#92400e] text-white';
                   statusMsg = diff === 0 ? 'Jatuh Tempo HARI INI' : `Jatuh tempo ${diff} hari lagi`;
                }
            }

            html += `
                <div class="p-5 rounded-2xl ${statusTheme} shadow-md mb-4 relative overflow-hidden transition-all">
                    <div class="absolute right-0 top-0 w-32 h-32 bg-white rounded-full opacity-10 -mr-10 -mt-10"></div>
                    <p class="text-[11px] uppercase tracking-widest font-semibold mb-1 opacity-80">Penghuni</p>
                    <p class="text-2xl font-bold mb-4 relative z-10">${room.tenantName}</p>
                    
                    <div class="grid grid-cols-2 gap-3 text-sm mb-5 ${statusSubText} relative z-10 bg-black/10 p-4 rounded-xl">
                        <div>
                            <span class="block text-[10px] uppercase opacity-80 mb-1">Jatuh Tempo Selanjutnya</span>
                            <span class="font-semibold">${room.dpDueDate ? 'Menunggu DP' : (room.nextBillDate ? fmtTglSingkat(room.nextBillDate) : 'Tgl ' + room.dueDay)}</span>
                        </div>
                        <div>
                            <span class="block text-[10px] uppercase opacity-80 mb-1">Status</span>
                            <span class="font-semibold block">${statusMsg}</span>
                            ${rincianDendaDiStatus}
                        </div>
                        ${room.dpDueDate ? `
                            <div class="col-span-2 pt-2 mt-1 border-t border-white/20">
                                <span class="block text-[10px] uppercase opacity-80 mb-1">Batas Lunas DP</span>
                                <span class="font-bold text-white">${room.dpDueDate}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <button onclick="window.useNominal(${quickActionAmt})" class="w-full ${statusBtnBg} p-3.5 text-sm font-bold rounded-xl shadow-sm transition-transform active:scale-95 relative z-10">${quickActionLabel}</button>
                </div>
            `;

            let lumpSumReal = Math.max(0, type.price + room.debt + pnlty - room.advance);
            if (totalNunggakNow > 0) {
                let lumpSumRows = '';
                if (room.debt > 0) {
                    lumpSumRows += `
                        <div class="flex justify-between py-1.5">
                            <span class="text-blue-100">Tunggakan Bln Ini</span>
                            <span class="font-semibold">${formatRp(room.debt)}</span>
                        </div>
                    `;
                }
                lumpSumRows += `
                    <div class="flex justify-between py-1.5">
                        <span class="text-blue-100">Sewa Bulan Depan</span>
                        <span class="font-semibold">${formatRp(type.price)}</span>
                    </div>
                `;
                
                if (pnltyReal) {
                    lumpSumRows += `
                        <div class="flex justify-between py-1.5 mt-1 border-t border-blue-400/50">
                            <span>Denda Real-Time</span>
                            <span class="font-semibold">+ ${formatRp(pnltyReal.gross)}</span>
                        </div>
                    `;
                    if (pnltyReal.paid > 0) {
                        lumpSumRows += `
                            <div class="flex justify-between py-1 text-blue-200">
                                <span class="text-[11px]">Denda Dibayar</span>
                                <span class="font-semibold text-[11px]">- ${formatRp(pnltyReal.paid)}</span>
                            </div>
                        `;
                    }
                }
                if (room.advance > 0) {
                    lumpSumRows += `
                        <div class="flex justify-between py-1.5 mt-1 text-[#4ade80]">
                            <span>Saldo Simpanan</span>
                            <span class="font-semibold">- ${formatRp(room.advance)}</span>
                        </div>
                    `;
                }
                
                lumpSumRows += `
                    <div class="flex justify-between pt-3 mt-2 border-t border-blue-400 border-dashed font-bold text-white text-base">
                        <span>TOTAL BAYAR</span>
                        <span>${formatRp(lumpSumReal)}</span>
                    </div>
                `;

                html += `
                    <div class="p-5 bg-[#005fb8] rounded-2xl text-white shadow-md mb-4 relative overflow-hidden">
                        <p class="text-[11px] font-bold uppercase tracking-wider mb-1">Opsi Pelunasan Total</p>
                        <p class="text-[10px] text-blue-100 mb-4 leading-relaxed">Lunasi seluruh tunggakan, denda saat ini, dan sewa bulan depan sekaligus.</p>
                        <div class="text-sm">${lumpSumRows}</div>
                        <button onclick="window.useNominal(${lumpSumReal})" class="w-full bg-[#004a8f] hover:bg-[#003666] text-white p-3.5 mt-4 text-sm font-bold rounded-xl shadow-sm transition-transform active:scale-95">Gunakan Nominal Ini ↓</button>
                    </div>
                `;
            }

            if (room.nextBillDate && dendaAktif) {
                let labelTagihanDepan = 'Bulan Depan';
                let expectedNextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
                
                if (new Date(room.nextBillDate).getMonth() !== expectedNextMonth.getMonth()) {
                    labelTagihanDepan = 'Selanjutnya';
                }
                
                let rincianRows = '';
                if (room.debt > 0) {
                    rincianRows += `
                        <div class="flex justify-between py-1.5">
                            <span class="text-slate-500">Tunggakan Bln Ini</span>
                            <span class="font-semibold text-slate-700">${formatRp(room.debt)}</span>
                        </div>
                    `;
                }
                
                rincianRows += `
                    <div class="flex justify-between py-1.5">
                        <span class="text-slate-500">Sewa Bulan Depan</span>
                        <span class="font-semibold text-slate-700">${formatRp(type.price)}</span>
                    </div>
                `;
                
                if (room.debt > 0) {
                    rincianRows += `
                        <div class="flex justify-between py-1 mt-1 border-t border-slate-100">
                            <span class="text-slate-400 text-[11px]">Subtotal</span>
                            <span class="text-slate-400 text-[11px]">${formatRp(room.debt + type.price)}</span>
                        </div>
                    `;
                }
                
                if (pnltyInfo) {
                    rincianRows += `
                        <div class="flex justify-between py-1.5 mt-1 text-[#e81123]">
                            <span>Denda Estimasi<br><span class="text-[10px] text-red-400">s/d ${fmtTglSingkat(pnltyInfo.endDate)}</span></span>
                            <span class="font-semibold">+ ${formatRp(pnltyInfo.gross)}</span>
                        </div>
                    `;
                    if (pnltyInfo.paid > 0) {
                        rincianRows += `
                            <div class="flex justify-between py-1 text-[#107c41]">
                                <span class="text-[11px]">Denda Dibayar</span>
                                <span class="font-semibold text-[11px]">- ${formatRp(pnltyInfo.paid)}</span>
                            </div>
                        `;
                    }
                } else if (window.isTelatTanpaDenda(room)) {
                    rincianRows += `
                        <div class="py-1 mt-1 text-[10px] text-slate-400 bg-slate-50 rounded px-2">Tanpa denda aktif</div>
                    `;
                }
                
                if (room.advance > 0) {
                    rincianRows += `
                        <div class="flex justify-between py-1.5 mt-1 text-[#107c41]">
                            <span>Saldo Simpanan</span>
                            <span class="font-semibold">- ${formatRp(room.advance)}</span>
                        </div>
                    `;
                }
                
                rincianRows += `
                    <div class="flex justify-between pt-3 mt-2 border-t border-slate-200 border-dashed font-bold text-slate-800 text-base">
                        <span>ESTIMASI TOTAL</span>
                        <span class="text-[#005fb8]">${formatRp(projectedNextBill)}</span>
                    </div>
                `;

                html += `
                    <div class="win-card mb-6 overflow-hidden">
                        <button onclick="document.getElementById('acc-estimasi').classList.toggle('hidden'); this.querySelector('.ico-arrow').classList.toggle('rotate-180')" class="w-full p-4 flex justify-between items-center text-slate-700 font-semibold text-sm transition-colors hover:bg-slate-50">
                            <span class="flex items-center gap-2">
                               <svg class="w-5 h-5 text-[#005fb8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                               </svg>
                               Estimasi Tagihan ${labelTagihanDepan}
                            </span>
                            <svg class="ico-arrow w-5 h-5 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div id="acc-estimasi" class="hidden p-4 pt-1 border-t border-slate-100 text-sm">
                            ${rincianRows}
                        </div>
                    </div>
                `;
            }

            html += `
                <div class="win-card p-5 mb-5">
                    <h4 class="font-bold mb-4 text-slate-800 text-lg">Catat Pembayaran</h4>
                    <div class="flex gap-3 mb-4">
                        <div class="flex-[2]">
                            <label class="block text-xs font-semibold mb-2 text-slate-500 uppercase tracking-wider">Nominal (Rp)</label>
                            <input type="text" inputmode="numeric" id="r-pay-amt" class="win-input w-full p-4 font-bold text-lg text-[#005fb8]" value="${totalOwedNow.toLocaleString('id-ID')}" oninput="window.formatInputRp(this)">
                        </div>
                        <div class="flex-1">
                            <label class="block text-xs font-semibold mb-2 text-slate-500 uppercase tracking-wider">Via</label>
                            <select id="r-pay-method" class="win-input w-full p-4">
                                <option value="Cash">Cash</option>
                                <option value="Transfer">Trans</option>
                            </select>
                        </div>
                    </div>
                    <button onclick="window.actionPayRoom('${roomId}')" class="win-btn w-full bg-[#107c41] text-white p-4 font-bold text-base shadow-sm">Terima Pembayaran</button>
                </div>
                
                <div class="grid grid-cols-2 gap-3 mb-6">
                    <button onclick="window.actionResetRoom('${roomId}')" class="win-btn bg-slate-100 text-slate-700 hover:bg-slate-200 p-4 font-semibold text-sm rounded-xl">Kosongkan Kamar</button>
                    <button onclick="window.actionFleeRoom('${roomId}')" class="win-btn bg-red-50 text-red-600 hover:bg-red-100 p-4 font-semibold text-sm rounded-xl">Penghuni Kabur</button>
                </div>
            `;

            let roomTrans = state.transactions.filter(t => t.roomId === roomId).sort((a,b) => new Date(b.date) - new Date(a.date));
            let historyHtml = roomTrans.length > 0 ? roomTrans.map(t => `
                <div onclick="window.openPaymentDetail('${roomId}', '${t.id}')" class="flex justify-between items-center py-3 border-b border-slate-100/60 last:border-0 cursor-pointer active:bg-slate-100 transition-colors rounded-lg px-2 -mx-2 hover:bg-slate-50">
                    <div class="pr-3">
                        <p class="text-xs font-bold text-slate-700">
                            ${fmtTglSingkat(t.date)} 
                            <span class="font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px] ml-1 border border-slate-200/50">${t.method}</span>
                        </p>
                        <p class="text-[11px] text-slate-500 truncate max-w-[180px] mt-1">${t.desc}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-bold ${t.type==='in' ? 'text-[#107c41]' : 'text-[#e81123]'}">${t.type==='in' ? '+' : '-'}${formatRp(t.amount)}</p>
                        ${t.id.endsWith('P') ? `<span class="text-[9px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded block mt-1 w-max ml-auto">Denda</span>` : ''}
                    </div>
                </div>
            `).join('') : '<p class="text-xs text-slate-400 italic py-2 text-center">Belum ada riwayat transaksi.</p>';

            html += `
                <div class="win-card p-5 mb-5 relative bg-white border border-slate-100 shadow-sm">
                    <h4 class="font-bold text-sm mb-4 text-slate-800 flex items-center justify-between">
                        Rincian Bayar per Bulan
                        <div class="flex gap-1.5">
                            <button onclick="window.changeCycle(-1)" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#005fb8] hover:text-white transition-all active:scale-95 shadow-sm border border-slate-200">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path>
                                </svg>
                            </button>
                            <button onclick="window.changeCycle(1)" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#005fb8] hover:text-white transition-all active:scale-95 shadow-sm border border-slate-200">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </button>
                        </div>
                    </h4>
                    <div id="cycle-card-content" class="min-h-[125px] transition-opacity duration-200">
                    </div>
                </div>
                <div class="win-card p-5">
                    <h4 class="font-bold text-sm mb-3 text-slate-700">Riwayat Pembayaran</h4>
                    <p class="text-[10px] text-slate-400 mb-3 uppercase tracking-wider">Tap untuk lihat rincian alokasi</p>
                    <div class="space-y-1 max-h-48 overflow-y-auto pr-1">
                        ${historyHtml}
                    </div>
                </div>
            `;
        }
        
        c.innerHTML = html;
        
        if (room.status === 'occupied') {
            currentRoomCycles = window.generateBillingCycles(roomId);
            currentCycleIndex = currentRoomCycles.length > 0 ? currentRoomCycles.length - 1 : 0;
            window.renderCycleCard();
        }
        
        openSheet('sheet-room');
        
        if (room.status === 'empty') { 
            let d = new Date(); 
            d.setDate(d.getDate() + 3); 
            let el = document.getElementById('r-dp-date');
            if (el) {
                el.value = d.toISOString().split('T')[0]; 
            }
        }
    };

    window.toggleRoomScheme = (price) => {
        let val = document.getElementById('r-scheme').value; 
        let boxNew = document.getElementById('box-new'); 
        let boxOld = document.getElementById('box-old-date');
        
        if(val === 'new') { 
            boxOld.classList.add('hidden'); 
            boxNew.classList.remove('hidden'); 
            window.toggleDpDateDynamic(price); 
        } 
        else if(val === 'old') { 
            boxNew.classList.add('hidden'); 
            boxOld.classList.remove('hidden'); 
        }
    };

    window.toggleDpDateDynamic = (priceStr) => {
        let price = parseInt(priceStr); 
        let amt = getRawRp('r-amt'); 
        let boxDp = document.getElementById('box-dp-date');
        
        if (amt < price && amt > 0) {
            boxDp.classList.remove('hidden'); 
        } else {
            boxDp.classList.add('hidden');
        }
    };

    window.addOldPaymentRow = () => {
        let container = document.getElementById('old-payments-container'); 
        let div = document.createElement('div'); 
        div.className = 'grid grid-cols-[1fr_1fr_auto] gap-2 old-pay-row';
        div.innerHTML = `
            <input type="date" class="win-input w-full min-w-0 p-3 text-xs bg-white border-2 border-slate-200 font-semibold text-slate-700 old-pay-date" value="${getTodayStr()}">
            <input type="text" inputmode="numeric" class="win-input w-full min-w-0 p-3 text-xs bg-white border-2 border-slate-200 font-bold text-slate-800 old-pay-amt" placeholder="Nominal" oninput="window.formatInputRp(this)">
            <button class="bg-red-50 text-red-600 px-3 font-bold win-btn rounded-xl shrink-0" onclick="this.parentElement.remove()">X</button>
        `;
        container.appendChild(div);
    };

    window.actionOccupyRoom = (roomId) => {
        let room = state.rooms.find(r => r.id === roomId); 
        let type = state.roomTypes.find(t => t.id === room.typeId);
        let name = document.getElementById('r-name').value; 
        let scheme = document.getElementById('r-scheme').value; 
        let method = document.getElementById('r-method').value;

        if (!name) return alert("Isi nama penghuni!"); 
        
        room.status = 'occupied'; 
        room.tenantName = name; 
        room.dpDueDate = null;

        if (scheme === 'old') {
            let dueDay = parseInt(document.getElementById('r-due-day').value);
            if (!dueDay || dueDay < 1 || dueDay > 31) return alert("Tanggal Jatuh Tempo harus 1 - 31!");
            
            room.dueDay = dueDay;
            let today = new Date(); 
            let startBill = new Date(today.getFullYear(), today.getMonth(), dueDay);
            
            if (today.getDate() >= dueDay) {
                startBill.setMonth(startBill.getMonth() + 1);
            }
            startBill.setMinutes(startBill.getMinutes() - startBill.getTimezoneOffset());
            room.nextBillDate = startBill.toISOString().split('T')[0];

            let totalPaid = 0; 
            let payments = [];
            
            document.querySelectorAll('.old-pay-row').forEach(node => {
                let d = node.querySelector('.old-pay-date').value; 
                let a = parseInt(node.querySelector('.old-pay-amt').value.replace(/[^0-9]/g, '')) || 0;
                if(a > 0) { 
                    payments.push({date: d, amount: a}); 
                    totalPaid += a; 
                }
            });

            if (totalPaid >= type.price) {
                room.debt = 0; 
                room.debtDate = null; 
                room.penaltyPaid = 0; 
                room.advance = totalPaid - type.price;
                while (room.advance >= type.price) { 
                    room.advance -= type.price; 
                    room.nextBillDate = calculateNextBillDate(room.nextBillDate, room.dueDay); 
                }
            } else { 
                room.debt = type.price - totalPaid; 
                room.advance = 0; 
                room.penaltyPaid = 0; 
                room.debtDate = calculatePreviousBillDate(room.nextBillDate, room.dueDay); 
            }

            payments.forEach(p => { 
                let tId = generateId(); 
                state.transactions.push({ 
                    id: tId, 
                    date: p.date, 
                    type: 'in', 
                    category: 'Sewa Kamar', 
                    amount: p.amount, 
                    method: method, 
                    desc: `Catatan Anak Lama (${room.number})`, 
                    roomId: room.id 
                }); 
                room.history.unshift(tId); 
            });
            
            saveData(); 
            closeAllSheets(); 
            window.renderRooms(); 
            if (window.currentTab === 'dashboard') window.renderDashboard(); 
            return;
        }

        let amt = getRawRp('r-amt'); 
        room.advance = 0; 
        room.debt = 0; 
        room.debtDate = null; 
        room.penaltyPaid = 0;
        
        if (amt < type.price) {
            let dpDate = document.getElementById('r-dp-date').value; 
            if(!dpDate) return alert("Tenggat waktu pelunasan DP wajib diisi!");
            
            room.debt = type.price - amt; 
            room.dpDueDate = dpDate; 
            room.entryDate = getTodayStr(); 
            room.dueDay = null; 
            room.nextBillDate = null;
            window.processPayment(roomId, amt, method, "Bayar Uang Muka (DP)");
        } else {
            room.dueDay = new Date().getDate(); 
            let startBill = new Date(new Date().getFullYear(), new Date().getMonth() + 1, room.dueDay);
            startBill.setMinutes(startBill.getMinutes() - startBill.getTimezoneOffset()); 
            room.nextBillDate = startBill.toISOString().split('T')[0];
            
            if (amt > type.price) {
                room.debt = type.price - amt; 
            }
            window.processPayment(roomId, amt, method, "Masuk Lunas 1 Bulan");
        }
        
        closeAllSheets(); 
        window.renderRooms(); 
        if (window.currentTab === 'dashboard') window.renderDashboard();
    };

    window.useNominal = (amount) => { 
        let el = document.getElementById('r-pay-amt'); 
        el.value = amount.toLocaleString('id-ID'); 
        window.formatInputRp(el); 
        el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        el.focus(); 
    };

    window.actionPayRoom = (roomId) => { 
        let amt = getRawRp('r-pay-amt'); 
        if(!amt || amt <= 0) return alert("Nominal invalid"); 
        
        let transId = window.processPayment(roomId, amt, document.getElementById('r-pay-method').value); 
        closeAllSheets(); 
        window.renderRooms(); 
        
        if(window.currentTab === 'dashboard') window.renderDashboard(); 
        if(transId && confirm("Pembayaran dicatat. Buka kuitansi?")) {
            setTimeout(() => window.openReceiptSheet(transId), 400); 
        }
    };

    window.actionResetRoom = (roomId) => {
        if(confirm("Yakin mengosongkan/pindah kamar ini? Data penghuni akan dihapus dari kamar, riwayat bayar tetap ada di Laporan.")) {
            let r = state.rooms.find(x => x.id === roomId); 
            r.status = 'empty'; 
            r.tenantName = ''; 
            r.debt = 0; 
            r.advance = 0; 
            r.nextBillDate = null; 
            r.dpDueDate = null; 
            r.debtDate = null; 
            r.penaltyPaid = 0; 
            r.entryDate = null; 
            r.history = []; 
            r.dueDay = null;
            saveData(); 
            closeAllSheets(); 
            window.renderRooms();
        }
    };

    window.actionFleeRoom = (roomId) => {
        let r = state.rooms.find(x => x.id === roomId); 
        let pnlty = window.calculatePenalty(r); 
        let totalLoss = r.debt + pnlty;
        
        if (confirm(`Catat penghuni kabur? Mencatat KERUGIAN ${formatRp(totalLoss)} di riwayat (Tagihan + Denda), lalu mengosongkan kamar.`)) {
            if (totalLoss > 0) {
                state.transactions.push({ 
                    id: generateId(), 
                    date: getTodayStr(), 
                    type: 'out', 
                    category: 'Kerugian', 
                    amount: totalLoss, 
                    method: '-', 
                    desc: `Penghuni kabur (${r.number}) - Ninggalin Hutang`, 
                    roomId: r.id 
                });
            }
            window.actionResetRoom(roomId);
        }
    };

    // --- GENERATE BILLING CYCLES ---
    window.generateBillingCycles = (roomId) => {
        let room = state.rooms.find(r => r.id === roomId);
        if (room.status !== 'occupied') return [];
        let type = state.roomTypes.find(t => t.id === room.typeId);
        let price = type.price;
        
        let trans = state.transactions
            .filter(t => t.roomId === roomId && t.category === 'Sewa Kamar' && t.type === 'in')
            .sort((a, b) => new Date(a.date) - new Date(b.date));
            
        let moneyQueue = trans.map(t => ({ ...t, remaining: t.amount })); 
        let totalPaid = trans.reduce((sum, t) => sum + t.amount, 0);
        let totalBilled = totalPaid + (room.debt || 0) - (room.advance || 0);
        let numMonths = Math.max(1, Math.ceil(totalBilled / price));
        
        let cycleEndDateStr = room.nextBillDate || room.debtDate || room.dpDueDate || getTodayStr();
        let cycleEndDate = new Date(cycleEndDateStr);
        let cycleDates = [];
        let currDate = new Date(cycleEndDate);
        
        for (let i = 0; i < numMonths; i++) {
            cycleDates.unshift(currDate.toISOString().split('T')[0]); 
            let prevDateStr = calculatePreviousBillDate(currDate.toISOString().split('T')[0], room.dueDay || currDate.getDate());
            currDate = new Date(prevDateStr);
        }
        
        cycleDates.unshift(currDate.toISOString().split('T')[0]); 
        let cycles = [];
        
        for (let i = 0; i < numMonths; i++) {
            let start = cycleDates[i];
            let end = cycleDates[i+1];
            let cycleCost = price;
            let cyclePaid = 0;
            let cycleTrans = [];
            
            while (cyclePaid < cycleCost && moneyQueue.length > 0) {
                let m = moneyQueue[0];
                let needed = cycleCost - cyclePaid;
                
                if (m.remaining <= 0) { 
                    moneyQueue.shift(); 
                    continue; 
                }
                
                let take = Math.min(m.remaining, needed);
                m.remaining -= take;
                cyclePaid += take;
                cycleTrans.push({ date: m.date, amount: take, id: m.id });
                
                if (m.remaining <= 0) {
                    moneyQueue.shift();
                }
            }
            cycles.push({ 
                monthName: getMonthYearStr(start), 
                startDate: start, 
                endDate: end, 
                cost: cycleCost, 
                paid: cyclePaid, 
                transactions: cycleTrans 
            });
        }
        return cycles;
    };

    window.renderCycleCard = () => {
        let c = document.getElementById('cycle-card-content');
        if (!c) return;
        
        if (currentRoomCycles.length === 0) {
            c.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Belum ada riwayat siklus.</p>`;
            return;
        }
        
        let cycle = currentRoomCycles[currentCycleIndex];
        let isLunas = cycle.paid >= cycle.cost;
        let deficit = cycle.cost - cycle.paid;
        
        let statusHtml = isLunas 
            ? `<span class="text-[#107c41] font-bold text-xs bg-green-50 px-2.5 py-1 rounded-md shadow-sm border border-green-200/50">LUNAS</span>`
            : `<span class="text-[#e81123] font-bold text-xs bg-red-50 px-2.5 py-1 rounded-md shadow-sm border border-red-200/50">NUNGGAK -${formatRp(deficit)}</span>`;

        let txHtml = '';
        if (cycle.transactions.length > 0) {
            let parts = cycle.transactions.map(tx => formatRp(tx.amount));
            let dates = cycle.transactions.map(tx => fmtTglSingkat(tx.date));
            txHtml = `
                <div class="mt-3.5 bg-blue-50/40 p-3 rounded-xl border border-blue-100/50">
                    <p class="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Histori Bayar Bulan Ini</p>
                    <div class="text-sm font-bold text-[#005fb8] mb-0.5">+${formatRp(cycle.paid)} ${parts.length > 1 ? `<span class="text-[11px] text-slate-500 font-normal">(${parts.join(' + ')})</span>` : ''}</div>
                    <p class="text-[10px] text-slate-500 font-medium break-words"><span class="text-slate-400">Tgl:</span> ${dates.join(', ')}</p>
                </div>
            `;
        } else {
            txHtml = `
                <div class="mt-3.5 bg-slate-50 p-3 rounded-xl border border-slate-100 border-dashed text-center">
                    <p class="text-xs text-slate-400 italic">Belum ada pembayaran untuk periode ini.</p>
                </div>
            `;
        }
        
        let comment = isLunas 
            ? (currentCycleIndex === currentRoomCycles.length - 1 ? "Mantap! Bulan ini sudah lunas sepenuhnya." : "Aman! Siklus lampau ini tercatat lunas.") 
            : (cycle.paid > 0 ? `Cicilan masuk, sisa ${formatRp(deficit)} lagi untuk lunas bulan ini.` : "Waduh, periode ini masih kosong belum ada pembayaran.");
        
        c.style.opacity = 0;
        setTimeout(() => {
            c.innerHTML = `
                <div class="flex justify-between items-start mb-1">
                    <div>
                        <h5 class="font-extrabold text-[17px] text-slate-800 tracking-tight">${cycle.monthName}</h5>
                        <p class="text-[10px] text-slate-400 font-medium mt-0.5"><span class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">${fmtTglSingkat(cycle.startDate)} - ${fmtTglSingkat(cycle.endDate)}</span></p>
                    </div>
                    <div class="text-right shrink-0 pl-2">
                        ${statusHtml}
                    </div>
                </div>
                ${txHtml}
                <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <p class="text-[11px] text-slate-600 font-medium pr-2">${comment}</p>
                    <span class="text-[10px] text-slate-400 font-bold shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">${currentCycleIndex + 1} / ${currentRoomCycles.length}</span>
                </div>
            `;
            c.style.opacity = 1;
        }, 150);
    };

    window.changeCycle = (dir) => {
        let newIdx = currentCycleIndex + dir;
        if (newIdx >= 0 && newIdx < currentRoomCycles.length) {
            currentCycleIndex = newIdx;
            window.renderCycleCard();
        }
    };

    // --- MANUAL CATAT ---
    window.updateCatatCategories = () => {
        let type = document.getElementById('catat-type').value;
        let catEl = document.getElementById('catat-category');
        if (!catEl) return;
        
        if (type === 'in') {
            catEl.innerHTML = `
                <option value="Uang Parkir">Uang Parkir</option>
                <option value="Pendapatan Denda">Pendapatan Denda</option>
                <option value="Lainnya">Lainnya</option>
            `;
        } else {
            catEl.innerHTML = `
                <option value="Listrik/Token">Listrik / Token</option>
                <option value="Air">Air PAM / Jetpump</option>
                <option value="Iuran RT/RW">Iuran Keamanan/Sampah</option>
                <option value="Perbaikan">Perbaikan Kerusakan</option>
                <option value="Gaji Pegawai">Gaji Pegawai</option>
                <option value="Lainnya">Lainnya</option>
            `;
        }
    };
    
    window.saveManualTransaction = () => { 
        let amt = getRawRp('catat-amount'); 
        if(!amt || amt <= 0) return alert("Nominal invalid!"); 
        
        state.transactions.push({ 
            id: generateId(), 
            date: getTodayStr(), 
            type: document.getElementById('catat-type').value, 
            category: document.getElementById('catat-category').value, 
            amount: amt, 
            method: document.getElementById('catat-method').value, 
            desc: document.getElementById('catat-desc').value, 
            roomId: null 
        }); 
        
        saveData(); 
        
        document.getElementById('catat-amount').value = ''; 
        document.getElementById('catat-desc').value = ''; 
        
        let btn = document.querySelector('#tab-catat button'); 
        if (btn) {
            let old = btn.innerText; 
            btn.innerText = "Tersimpan!"; 
            btn.classList.replace('bg-blue-600', 'bg-[#107c41]'); 
            setTimeout(()=> { 
                btn.innerText = old; 
                btn.classList.replace('bg-[#107c41]', 'bg-blue-600'); 
            }, 1500);
        }
    };

    // --- HISTORY ---
    window.renderHistory = () => { 
        let searchEl = document.getElementById('search-riwayat');
        let q = searchEl ? searchEl.value.toLowerCase() : ''; 
        
        let list = [...state.transactions].reverse().filter(t => 
            t.category.toLowerCase().includes(q) || 
            t.desc.toLowerCase().includes(q) || 
            t.id.toLowerCase().includes(q)
        );
        
        let c = document.getElementById('history-list');
        if(!c) return;
        
        if (list.length > 0) {
            c.innerHTML = list.map(t => {
                let sel = historySelected.has(t.id);
                return `
                <div data-id="${t.id}" class="history-item win-card p-4 flex justify-between items-start gap-3 transition-transform active:scale-95 ${sel ? 'ring-2 ring-[#005fb8] bg-blue-50/50' : ''}">
                    ${historySelectMode ? `
                        <div class="shrink-0 pt-1">
                            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center ${sel ? 'bg-[#005fb8] border-[#005fb8]' : 'border-slate-300 bg-white'}">
                                ${sel ? `
                                    <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type==='in'?'bg-green-50 text-green-600':'bg-red-50 text-red-500'} font-bold text-lg leading-none pt-0.5">
                            ${t.type==='in' ? '+' : '-'}
                        </div>
                        <div class="min-w-0">
                            <p class="font-bold text-sm text-slate-800">${t.category}</p>
                            <p class="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2 break-words">${t.desc}</p>
                            <p class="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                                ${t.date} <span class="text-slate-300">|</span> <span class="font-mono">${t.id.toUpperCase()}</span>
                            </p>
                        </div>
                    </div>
                    <div class="text-right shrink-0 pl-1">
                        <p class="font-bold text-base tracking-tight whitespace-nowrap ${t.type==='in'?'text-[#107c41]':'text-[#e81123]'}">
                            ${t.type==='in'?'+':'-'}${formatRp(t.amount)}
                        </p>
                    </div>
                </div>`;
            }).join('');
        } else {
            c.innerHTML = `<p class="text-sm text-slate-400 text-center py-8">Belum ada riwayat.</p>`;
        }
        
        document.querySelectorAll('.history-item').forEach(el => {
            let pressTimer = null; 
            let longPressFired = false;
            
            const startPress = () => {
                longPressFired = false;
                pressTimer = setTimeout(() => {
                    longPressFired = true;
                    if (navigator.vibrate) navigator.vibrate(30);
                    if (!historySelectMode) { 
                        historySelectMode = true; 
                        historySelected.clear(); 
                    }
                    window.toggleHistorySelect(el.dataset.id);
                }, 500);
            };
            
            const cancelPress = () => clearTimeout(pressTimer);
            
            el.addEventListener('touchstart', startPress, {passive:true});
            el.addEventListener('touchend', cancelPress);
            el.addEventListener('touchcancel', cancelPress);
            el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') startPress(); });
            el.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') cancelPress(); });
            el.addEventListener('pointerleave', cancelPress);
            el.addEventListener('contextmenu', e => e.preventDefault());
            el.addEventListener('click', () => {
                if (longPressFired) { 
                    longPressFired = false; 
                    return; 
                }
                if (historySelectMode) {
                    window.toggleHistorySelect(el.dataset.id);
                } else {
                    window.openReceiptSheet(el.dataset.id);
                }
            });
        });
        window.updateHistoryToolbar();
    };

    window.toggleHistorySelect = (id) => {
        if (historySelected.has(id)) {
            historySelected.delete(id); 
        } else {
            historySelected.add(id);
        }
        if (historySelected.size === 0) {
            historySelectMode = false;
        }
        window.patchHistorySelectionUI();
    };

    window.exitHistorySelectMode = () => { 
        historySelectMode = false; 
        historySelected.clear(); 
        window.patchHistorySelectionUI(); 
    };

    window.patchHistorySelectionUI = () => {
        document.querySelectorAll('.history-item').forEach(el => {
            let id = el.dataset.id; 
            let sel = historySelected.has(id);
            
            el.classList.toggle('ring-2', sel); 
            el.classList.toggle('ring-[#005fb8]', sel); 
            el.classList.toggle('bg-blue-50/50', sel);
            
            let cb = el.querySelector('.history-checkbox');
            if (historySelectMode) {
                if (!cb) { 
                    cb = document.createElement('div'); 
                    cb.className = 'history-checkbox shrink-0 pt-1'; 
                    el.insertBefore(cb, el.firstChild); 
                }
                cb.innerHTML = `
                    <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center ${sel ? 'bg-[#005fb8] border-[#005fb8]' : 'border-slate-300 bg-white'}">
                        ${sel ? `
                            <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                        ` : ''}
                    </div>
                `;
            } else if (cb) { 
                cb.remove(); 
            }
        });
        window.updateHistoryToolbar();
    };

    window.updateHistoryToolbar = () => {
        let selBar = document.getElementById('history-select-bar'); 
        let normBar = document.getElementById('history-normal-bar');
        
        if (!selBar || !normBar) return;
        
        if (historySelectMode) {
            selBar.classList.remove('hidden'); 
            selBar.classList.add('flex'); 
            normBar.classList.add('hidden');
            document.getElementById('history-select-count').innerText = `${historySelected.size} dipilih`;
        } else {
            selBar.classList.add('hidden'); 
            selBar.classList.remove('flex'); 
            normBar.classList.remove('hidden');
        }
    };

    window.deleteSelectedHistory = () => {
        if (historySelected.size === 0) return;
        if (!confirm(`Hapus ${historySelected.size} transaksi terpilih? Tindakan ini tidak bisa dibatalkan.`)) return;
        
        state.transactions = state.transactions.filter(t => !historySelected.has(t.id));
        state.rooms.forEach(r => { 
            if (r.history) r.history = r.history.filter(id => !historySelected.has(id)); 
        });
        
        saveData(); 
        window.exitHistorySelectMode();
        
        if (window.currentTab === 'dashboard') window.renderDashboard();
    };

    window.copySelectedHistory = () => {
        if (historySelected.size === 0) return;
        
        let items = state.transactions.filter(t => historySelected.has(t.id));
        let text = items.map(t => `${t.date} | ${t.category} | ${t.type==='in'?'+':'-'}${formatRp(t.amount)} | ${t.desc || '-'}`).join('\n');
        
        let done = () => { 
            window.exitHistorySelectMode(); 
            alert('Tersalin ke clipboard!'); 
        };
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(() => window.fallbackCopyText(text, done));
        } else {
            window.fallbackCopyText(text, done);
        }
    };

    window.fallbackCopyText = (text, cb) => {
        let ta = document.createElement('textarea'); 
        ta.value = text; 
        ta.style.position = 'fixed'; 
        ta.style.opacity = '0';
        document.body.appendChild(ta); 
        ta.select();
        try { document.execCommand('copy'); } catch(e) {}
        document.body.removeChild(ta); 
        if (cb) cb();
    };

    window.clearHistory = () => { 
        if (confirm("Hapus semua riwayat transaksi? Data kamar aman.")) { 
            state.transactions = []; 
            state.rooms.forEach(r => r.history = []); 
            saveData(); 
            window.renderHistory(); 
        } 
    };

    // --- ANALYTIC CHART ---
    window.renderAnalytic = () => {
        if (typeof Chart === 'undefined') return; 
        
        let labels = []; 
        let keys = []; 
        let inData = []; 
        let outData = []; 
        let d = new Date();
        
        for (let i = 5; i >= 0; i--) {
            let m = new Date(d.getFullYear(), d.getMonth() - i, 1);
            let key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
            keys.push(key);
            labels.push(m.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }));
            
            let mIn = 0, mOut = 0; 
            state.transactions.forEach(t => { 
                if (t.date.startsWith(key)) { 
                    if (t.type === 'in') mIn += t.amount; 
                    else mOut += t.amount; 
                } 
            }); 
            inData.push(mIn); 
            outData.push(mOut);
        }
        
        let ctx = document.getElementById('chart-cashflow');
        if (!ctx) return;
        
        if (chartInstance) chartInstance.destroy();
        
        chartInstance = new Chart(ctx.getContext('2d'), { 
            type: 'bar', 
            data: { 
                labels: labels, 
                datasets: [
                    { label: 'Masuk', data: inData, backgroundColor: '#107c41', borderRadius: 4 }, 
                    { label: 'Keluar', data: outData, backgroundColor: '#e81123', borderRadius: 4 }
                ] 
            }, 
            options: { 
                responsive: true, 
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } }, 
                scales: { x: { grid: { display: false } }, y: { border: { display: false } } } 
            } 
        });
        
        let totIn = inData.reduce((a,b) => a + b, 0); 
        let totOut = outData.reduce((a,b) => a + b, 0);
        
        document.getElementById('analytic-details').innerHTML = `
            <div class="flex justify-between border-b border-slate-100 py-3">
                <span>Total Masuk (6 Bln):</span>
                <span class="font-bold text-[#107c41]">${formatRp(totIn)}</span>
            </div>
            <div class="flex justify-between border-b border-slate-100 py-3">
                <span>Total Keluar (6 Bln):</span>
                <span class="font-bold text-[#e81123]">${formatRp(totOut)}</span>
            </div>
            <div class="flex justify-between py-3 mt-1 bg-slate-50 px-3 rounded-xl">
                <span>Net Profit:</span>
                <span class="font-bold text-lg ${totIn - totOut >= 0 ? 'text-[#005fb8]' : 'text-[#e81123]'}">${formatRp(totIn - totOut)}</span>
            </div>
        `;
    };

    // --- SETTINGS & PRICE ---
    window.openSettings = () => {
        let el = document.getElementById('sheet-settings-content');
        if (!el) return;
        
        el.innerHTML = `
            <h2 class="text-2xl font-bold mb-6 text-slate-800">Pengaturan</h2>
            <div class="space-y-5">
                <div class="win-card p-5">
                    <h3 class="font-bold mb-1 text-slate-800">Konfigurasi Dasar Kosan</h3>
                    <p class="text-xs text-slate-500 mb-4 leading-relaxed">Ubah nama kosan, jumlah lantai & kamar, atau tipe & harga kamar.</p>
                    <button onclick="window.openOnboardingEdit()" class="win-btn w-full bg-[#e4f0fa] text-[#005fb8] p-4 font-bold">Edit Setup Kosan</button>
                </div>
                <div class="win-card p-5">
                    <h3 class="font-bold mb-1 text-slate-800">Perubahan Harga Kamar</h3>
                    <p class="text-xs text-slate-500 mb-4 leading-relaxed">Naikkan atau turunkan harga sewa suatu tipe kamar.</p>
                    <button onclick="window.openPriceChangeSheet()" class="win-btn w-full bg-[#e4f0fa] text-[#005fb8] p-4 font-bold">Ubah Harga Kamar</button>
                </div>
                <div class="win-card p-5">
                    <h3 class="font-bold mb-1 text-slate-800">Anchor Jatuh Tempo Anak Baru</h3>
                    <select id="set-anchor-policy" class="win-input w-full p-4 mb-1" onchange="window.saveSettings()">
                        <option value="dp_date">Dihitung dr Tgl Bayar DP</option>
                        <option value="lunas_date">Dihitung dr Tgl Pelunasan DP</option>
                    </select>
                </div>
                <div class="win-card p-5">
                    <h3 class="font-bold mb-1 text-slate-800">Denda Keterlambatan</h3>
                    <select id="set-penalty-type" class="win-input w-full p-4 mb-4" onchange="window.markSettingsUnsaved()">
                        <option value="none">Tanpa Denda</option>
                        <option value="daily">Per Hari keterlambatan</option>
                        <option value="every3days">Per 3 Hari</option>
                        <option value="weekly">Per Minggu</option>
                        <option value="monthly">Per Bulan</option>
                    </select>
                    <input type="text" inputmode="numeric" id="set-penalty-amount" class="win-input w-full p-4 mb-5" placeholder="Nominal Denda (Rp)" oninput="window.formatInputRp(this); window.markSettingsUnsaved()">
                    <button onclick="window.confirmSaveSettings()" class="win-btn w-full bg-slate-800 text-white p-4 font-bold shadow-sm">Simpan Setting</button>
                    <div class="mt-4 pt-3 border-t border-slate-100">
                        <p id="settings-unsaved-msg" class="hidden text-xs text-orange-600 font-bold text-center bg-orange-50 py-2 rounded-lg">Ada perubahan belum disimpan!</p>
                        <p id="settings-saved-msg" class="hidden text-xs text-green-600 font-semibold text-center bg-green-50 py-2 rounded-lg">Tersimpan! Denda sudah dihitung ulang.</p>
                        <p id="settings-active-info" class="text-xs text-slate-500 text-center mt-1"></p>
                    </div>
                </div>
                <div class="win-card p-5">
                    <h3 class="font-bold mb-4 text-slate-800">Manajemen Data</h3>
                    <button onclick="window.exportData()" class="win-btn w-full bg-slate-100 text-slate-700 p-4 mb-3 font-semibold">Export Data (JSON)</button>
                    <button onclick="document.getElementById('import-file').click()" class="win-btn w-full bg-slate-100 text-slate-700 p-4 mb-3 font-semibold">Import Data (JSON)</button>
                    <input type="file" id="import-file" class="hidden" accept=".json" onchange="window.importData(event)">
                    <button onclick="window.exportCSV()" class="win-btn w-full bg-[#107c41] text-white p-4 mt-2 font-semibold shadow-sm">Export ke Excel (CSV)</button>
                </div>
                <button onclick="window.hardReset()" class="win-btn w-full bg-red-50 text-red-600 p-4 font-bold mt-8 rounded-2xl">Reset Semua Data</button>
            </div>
        `;
        
        document.getElementById('set-anchor-policy').value = state.settings.anchorPolicy; 
        document.getElementById('set-penalty-type').value = state.settings.penaltyType; 
        
        let pAmt = document.getElementById('set-penalty-amount'); 
        pAmt.value = state.settings.penaltyAmount; 
        window.formatInputRp(pAmt); 
        
        window.renderActiveSettingInfo(); 
        openSheet('sheet-settings'); 
    };

    window.saveSettings = () => { 
        state.settings.anchorPolicy = document.getElementById('set-anchor-policy').value; 
        state.settings.penaltyType = document.getElementById('set-penalty-type').value; 
        state.settings.penaltyAmount = getRawRp('set-penalty-amount'); 
        
        saveData(); 
        
        if (window.currentTab === 'dashboard') window.renderDashboard(); 
        if (window.currentTab === 'kamar') window.renderRooms(); 
    };
    
    window.renderActiveSettingInfo = () => { 
        let info = document.getElementById('settings-active-info'); 
        if (!info) return; 
        
        let t = state.settings.penaltyType; 
        let a = state.settings.penaltyAmount || 0; 
        
        if (t === 'none' || a <= 0) { 
            info.innerHTML = `Setting tersimpan saat ini: <b class="text-slate-700">Tanpa Denda</b>`; 
        } else { 
            let label = t === 'daily' ? 'per hari' : (t === 'every3days' ? 'per 3 hari' : (t === 'weekly' ? 'per minggu' : 'per bulan')); 
            info.innerHTML = `Setting tersimpan saat ini: <b class="text-[#005fb8]">${formatRp(a)} ${label}</b>`; 
        } 
    };
    
    window.markSettingsUnsaved = () => { 
        document.getElementById('settings-saved-msg').classList.add('hidden'); 
        document.getElementById('settings-unsaved-msg').classList.remove('hidden'); 
    };
    
    window.confirmSaveSettings = () => { 
        window.saveSettings(); 
        document.getElementById('settings-unsaved-msg').classList.add('hidden'); 
        
        let msg = document.getElementById('settings-saved-msg'); 
        msg.classList.remove('hidden'); 
        window.renderActiveSettingInfo(); 
        
        setTimeout(() => msg.classList.add('hidden'), 2500); 
    };
    
    window.hardReset = () => { 
        if (prompt("Ketik 'RESET' untuk hapus semua data:") === 'RESET') { 
            localStorage.removeItem("kosanku_v9_ultimate"); 
            location.reload(); 
        } 
    };
    
    window.exportData = () => { 
        let a = document.createElement('a'); 
        a.href = URL.createObjectURL(new Blob([JSON.stringify(state)], {type:"application/json"})); 
        a.download = `Backup_${getTodayStr()}.json`; 
        a.click(); 
    };
    
    window.importData = (e) => { 
        let f = e.target.files[0]; 
        if (!f) return; 
        
        let r = new FileReader(); 
        r.onload = function(evt) { 
            try {
                let p = JSON.parse(evt.target.result); 
                if (p.rooms) {
                    Object.assign(state, p); 
                    saveData(); 
                    alert("Berhasil di-import!"); 
                    location.reload();
                }
            } catch(err) {
                alert("Error file rusak");
            }
        }; 
        r.readAsText(f); 
    };
    
    window.exportCSV = () => { 
        let csv = "ID,Tanggal,Jenis,Kategori,Nominal,Metode,Keterangan\n"; 
        state.transactions.forEach(t => {
            csv += `${t.id},${t.date},${t.type},${t.category},${t.amount},${t.method},"${(t.desc||'').replace(/"/g, '""')}"\n`;
        }); 
        
        let a = document.createElement('a'); 
        a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"})); 
        a.download = `Laporan.csv`; 
        a.click(); 
    };

    // --- RECEIPT & KUITANSI (TEMPAT LU COPAS LOGIC ASLI LU) ---
    window.openReceiptSheet = (transId) => {
        // [Taruh Logic Kuitansi HTML Injection Asli lu di sini]
        alert("Buka Kuitansi untuk ID: " + transId); 
    };

    window.openPaymentDetail = (roomId, transId) => {
        // [Taruh Logic Kuitansi HTML Injection Asli lu di sini]
        alert("Buka Detail Payment: " + transId);
    };

    window.closePaymentDetail = () => {
        let modal = document.getElementById('modal-payment');
        let card = document.getElementById('modal-payment-card');
        if (modal) {
            modal.classList.add('opacity-0'); 
            card.classList.add('scale-95');
            setTimeout(() => { 
                modal.classList.remove('flex'); 
                modal.classList.add('hidden'); 
            }, 200);
        }
    };
    
    window.shareReceipt = (transId) => {
        // [Taruh Logic Share WA Asli lu di sini]
    }
}


