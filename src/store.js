const STORAGE_KEY = "kosanku_v9_ultimate";

export const state = { 
    kosanName: "", 
    setupFloors: [{ id: 1, count: 5 }], 
    roomFormat: "1A", 
    roomTypes: [{ id: "t1", name: "Standar", price: 800000 }], 
    rooms: [], 
    transactions: [], 
    settings: { 
        anchorPolicy: 'dp_date', 
        penaltyType: 'none', 
        penaltyAmount: 0 
    } 
};

export function loadData() {
    let data = localStorage.getItem(STORAGE_KEY);
    if (data) { 
        try { 
            let parsed = JSON.parse(data); 
            // Merge parsed data into existing state object
            Object.assign(state, parsed);
            
            if(!state.settings.penaltyType) state.settings.penaltyType = 'none';
            if(!state.settings.anchorPolicy) state.settings.anchorPolicy = 'dp_date';
            
            state.rooms.forEach(r => {
                if (r.debt > 0 && !r.debtDate && !r.dpDueDate) r.debtDate = getTodayStr(); 
                if (typeof r.penaltyPaid !== 'number') r.penaltyPaid = 0;
            });
            return true; 
        } catch(e) {
            console.error("Gagal load data", e);
        } 
    }
    return false;
}

export function saveData() { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); 
}

// Fungsi bantu biar bisa ambil string tanggal hari ini di dalam store
function getTodayStr() { 
    let d = new Date(); 
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; 
}
