// FORMATTING
export function formatInputRp(el) { 
    let val = el.value.replace(/[^0-9]/g, ''); 
    if(val === '') { el.value = ''; return; } 
    el.value = new Intl.NumberFormat('id-ID').format(val); 
}

export function getRawRp(id) { 
    let el = document.getElementById(id); 
    if(!el) return 0; 
    return parseInt(el.value.replace(/[^0-9]/g, '')) || 0; 
}

export function getRawRpFromEl(el) { 
    return parseInt(el.value.replace(/[^0-9]/g, '')) || 0; 
}

export function formatRp(angka) { 
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0); 
}

// DATE & ID UTILS
export function getTodayStr() { 
    let d = new Date(); 
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; 
}

export function generateId() { 
    return Math.random().toString(36).substr(2, 9); 
}

export function fmtTglSingkat(dateStr) {
    if (!dateStr) return '-'; 
    let d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getMonthYearStr(dateStr) {
    let d = new Date(dateStr);
    let months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

// LOGIC TANGGAL TAGIHAN
export function calculateNextBillDate(currentBillDateStr, dueDayAnchor) {
    let d = new Date(currentBillDateStr); d.setHours(0,0,0,0);
    let targetMonth = d.getMonth() + 1; 
    let targetYear = d.getFullYear();
    
    if (targetMonth > 11) { targetMonth = 0; targetYear++; }
    
    let daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    let finalDay = dueDayAnchor > daysInTargetMonth ? daysInTargetMonth : dueDayAnchor;
    let nextD = new Date(targetYear, targetMonth, finalDay);
    
    nextD.setMinutes(nextD.getMinutes() - nextD.getTimezoneOffset());
    return nextD.toISOString().split('T')[0];
}

export function calculatePreviousBillDate(currentBillDateStr, dueDayAnchor) {
    let d = new Date(currentBillDateStr); d.setHours(0,0,0,0);
    let targetMonth = d.getMonth() - 1; 
    let targetYear = d.getFullYear();
    
    if (targetMonth < 0) { targetMonth = 11; targetYear--; }
    
    let daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    let finalDay = dueDayAnchor > daysInTargetMonth ? daysInTargetMonth : dueDayAnchor;
    let prevD = new Date(targetYear, targetMonth, finalDay);
    
    prevD.setMinutes(prevD.getMinutes() - prevD.getTimezoneOffset());
    return prevD.toISOString().split('T')[0];
}
