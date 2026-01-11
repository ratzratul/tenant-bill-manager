const tenantIDs = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D", "4A", "4B", "4C", "4D", "5A", "5B", "5C", "5D", "6A", "6B"];
let db = {};
let savedUnitRate = localStorage.getItem("globalUnitRate") || "8.5";
const SHEET_URL = "https://script.google.com/macros/s/AKfycbw3xSp2yrUKhPu_yY8Xz80FuNX8sf66q-8xD7EsHH3m3_mRiYUCY339w7Ov9BFs96iWgA/exec";

let currentSelectedMonth = "";

// ১. লগইন চেক
function checkPin() {
    if (document.getElementById("pin-input").value === "1269") {
        document.getElementById("login-screen").style.display = "none";
        loadDataFromSheet();
    } else {
        alert("ভুল পিন!");
    }
}

// ২. শিট থেকে ডাটা লোড (রেন্ট বা ভাড়া ম্যানুয়ালি সেট করার লজিকসহ)
async function loadDataFromSheet() {
    try {
        const response = await fetch(SHEET_URL);
        const latestData = await response.json();

        tenantIDs.forEach(id => {
            // ডিফল্ট ভাড়া আপনার ফাইল অনুযায়ী (যদি শিটে না থাকে)
            let defaultRent = 0;
            if (id === "1A" || id === "2A" || id === "4A" || id === "5A" || id === "6A") defaultRent = 4000;
            else if (id === "1B" || id === "4B" || id === "6B") defaultRent = 5700;
            else if (id === "2B" || id === "1C" || id === "2C" || id === "4C") defaultRent = 5000;
            else if (id.includes("D")) defaultRent = 4500;
            else if (id === "5B" || id === "5C") defaultRent = 6000;

            db[id] = {
                id,
                rent: defaultRent,
                gas: 0,
                service: (id.includes("A") || id.includes("D") ? 50 : 70),
                prevMeter: 0,
                totalLastMonth: 0
            };
        });

        latestData.forEach((row) => {
            if (db[row.id]) {
                db[row.id].prevMeter = row.currM;
                db[row.id].totalLastMonth = row.total;
                db[row.id].rent = row.rent || db[row.id].rent; // শিটে ভাড়া থাকলে সেটা নেবে
            }
        });

        if (!currentSelectedMonth) {
            const now = new Date();
            currentSelectedMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
        }
        init();
    } catch (e) {
        alert("শিট থেকে ডাটা লোড করা যায়নি। ইন্টারনেট কানেকশন চেক করুন।");
        init();
    }
}

// ৩. মাস পরিবর্তন হ্যান্ডলার
async function handleMonthChange() {
    const selectedMonth = currentSelectedMonth;
    try {
        const response = await fetch(`${SHEET_URL}?action=getMonthData&month=${selectedMonth}`);
        const monthData = await response.json();

        if (monthData && monthData.length > 0) {
            monthData.forEach(row => {
                if (document.getElementById(`currM-${row.id}`)) {
                    document.getElementById(`prevM-${row.id}`).value = row.prevM;
                    document.getElementById(`currM-${row.id}`).value = row.currM;
                    document.getElementById(`rent-${row.id}`).value = row.rent || db[row.id].rent;
                    document.getElementById(`gas-${row.id}`).value = row.service;
                    document.getElementById(`lastTotal-${row.id}`).value = row.dues;
                    document.getElementById(`lastPaid-${row.id}`).value = 0;

                    const units = row.currM - row.prevM;
                    const eBill = (units * parseFloat(savedUnitRate)).toFixed(0);
                    document.getElementById(`label-${row.id}`).innerHTML =
                        `Unit: ${units} | E.Bill: ${eBill} | Dues: ${row.dues} | Total: ৳${row.total}`;
                }
            });
            alert(getBnMonthName(selectedMonth) + " মাসের ডাটা লোড হয়েছে।");
        } else {
            await loadDataFromSheet();
            tenantIDs.forEach(id => {
                if (document.getElementById(`rent-${id}`)) {
                    document.getElementById(`rent-${id}`).value = db[id].rent;
                }
            });
            alert("নতুন মাসের জন্য পূর্বের মিটার রিডিং ও ভাড়া আপডেট করা হয়েছে।");
        }
    } catch (e) {
        console.error("Load Error:", e);
    }
}

// ৪. ইন্টারফেস রেন্ডারিং
function init() {
    setupBillingDate();
    const container = document.getElementById("tenantAccordion");
    container.innerHTML = "";
    document.getElementById("globalUnitRate").value = savedUnitRate;
    tenantIDs.forEach((id) => {
        const t = db[id];
        const card = document.createElement("div");
        card.className = "tenant-card";
        card.innerHTML = `
<div class="summary-header" onclick="togglePanel('${t.id}')">
   <span>[FLAT: ${t.id}]</span><span id="label-${t.id}" class="header-stats">ডাটা ইনপুট করুন...</span>
</div>
<div class="details-panel" id="panel-${t.id}">
   <div class="accord-grid">
      <div class="input-group"><label>পূর্বের মিটার রিডিং:</label><input type="number" id="prevM-${t.id}" value="${t.prevMeter}"></div>
      <div class="input-group"><label>বর্তমান মিটার রিডিং:</label><input type="number" id="currM-${t.id}" value="0"></div>
      <div class="input-group"><label>ভাড়া:</label><input type="number" id="rent-${t.id}" value="${t.rent}"></div>
      <div class="input-group"><label>সার্ভিস:</label><input type="number" id="gas-${t.id}" value="${t.gas + t.service}"></div>
      <div class="input-group"><label>গত মাসের পাওনা:</label><input type="number" id="lastTotal-${t.id}" value="${t.totalLastMonth}"></div>
      <div class="input-group"><label>গত মাসের জমা:</label><input type="number" id="lastPaid-${t.id}" value="0"></div>
   </div>
   <div style="flex-basis: 100%; width: 100%; text-align: center; margin-top: 15px;">
      <button type="button" class="btn-clear" onclick="clearTenantBalance('${t.id}')" 
         style="background: #800000; color: #f2f2f2; border: none; padding: 10px; border-radius: 5px; cursor: pointer; width: 98%; font-weight:  bold; font-size: 13px;">
      নতুন ভাড়াটিয়া (ব্যালেন্স ০ করুন)
      </button>
   </div>
</div>`;
        container.appendChild(card);
    });
}

function togglePanel(id) {
    // ১. প্রথমে সব প্যানেল খুঁজে বের করা
    const allPanels = document.querySelectorAll('.details-panel');
    const targetPanel = document.getElementById(`panel-${id}`);

    // ২. লুপ চালিয়ে টার্গেট প্যানেল ছাড়া বাকি সব প্যানেল থেকে 'active' ক্লাস সরিয়ে দেওয়া
    allPanels.forEach(panel => {
        if (panel !== targetPanel) {
            panel.classList.remove('active');
        }
    });

    // ৩. এখন টার্গেট প্যানেলটি টগল (ওপেন/ক্লোজ) করা
    targetPanel.classList.toggle('active');
}

// ৫. ক্যালকুলেশন এবং ব্যাকআপ ডাটা শিটে পাঠানো
async function calculateAll() {
    if (!confirm("আপনি কি নিশ্চিত যে হিসাব সেভ করতে চান?")) return;

    const rate = parseFloat(document.getElementById("globalUnitRate").value) || 8.5;
    localStorage.setItem("globalUnitRate", rate);

    const syncData = [];
    const month = currentSelectedMonth;

    // প্রতিটি ফ্ল্যাটের বর্তমান ইনপুট বক্স থেকে ডাটা সংগ্রহ
    tenantIDs.forEach((id) => {
        const curr = parseFloat(document.getElementById(`currM-${id}`).value) || 0;
        const prev = parseFloat(document.getElementById(`prevM-${id}`).value) || 0;
        const rent = parseFloat(document.getElementById(`rent-${id}`).value) || 0;
        const serv = parseFloat(document.getElementById(`gas-${id}`).value) || 0;
        const lTot = parseFloat(document.getElementById(`lastTotal-${id}`).value) || 0;
        const lPad = parseFloat(document.getElementById(`lastPaid-${id}`).value) || 0;

        const units = curr - prev;
        const eBill = (units * rate).toFixed(0);
        const dues = (lTot - lPad).toFixed(0);
        const total = (parseFloat(eBill) + rent + serv + parseFloat(dues)).toFixed(0);

        // UI আপডেট (লেবেল দেখানো)
        const label = document.getElementById(`label-${id}`);
        if (label) label.innerHTML = `Unit: ${units} | E.Bill: ${eBill} | Dues: ${dues} | Total: ৳${total}`;

        syncData.push({
            id,
            month,
            prevM: prev,
            currM: curr,
            units,
            eBill,
            rent,
            service: serv,
            dues,
            total
        });
    });

    await sendToSheet(syncData);
}

// ব্যাকআপ ডাটা আপলোড করার স্পেশাল ফাংশন
function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backupJSON = JSON.parse(e.target.result);
            uploadBackupData(backupJSON); // ফাইল পড়া শেষ হলে আপলোড শুরু হবে
        } catch (err) {
            alert("ভুল ফাইল! দয়া করে সঠিক JSON ব্যাকআপ ফাইল সিলেক্ট করুন।");
        }
    };
    reader.readAsText(file);
}

// ব্যাকআপ ডাটা প্রোসেস এবং শিটে পাঠানোর ফাংশন
async function uploadBackupData(backupJSON) {
    if (!confirm("ব্যাকআপ ডাটা কি শিটে আপলোড করবেন?")) return;
    const rate = parseFloat(document.getElementById("globalUnitRate").value) || 8.5;
    const month = currentSelectedMonth;
    const syncData = [];

    Object.keys(backupJSON).forEach(id => {
        const b = backupJSON[id];
        const curr = b.currMeter || 0;
        const prev = b.prevMeter || 0;
        const rent = b.rent || 0;
        const gas = b.gas || 0;
        const service = b.service || 0;
        const lTot = b.totalLastMonth || 0;
        const lPad = b.paidLastMonth || 0;

        const units = curr - prev;
        const eBill = (units * rate).toFixed(0);
        const dues = (lTot - lPad).toFixed(0);
        const total = (parseFloat(eBill) + rent + gas + service + parseFloat(dues)).toFixed(0);

        syncData.push({
            id: id,
            month: month,
            prevM: prev,
            currM: curr,
            units: units,
            eBill: eBill,
            rent: rent,
            service: gas + service,
            dues: dues,
            total: total
        });
    });

    // সরাসরি fetch ব্যবহার করছি যাতে কোনো বাড়তি ফাংশনের ওপর নির্ভর করতে না হয়
    try {
        await fetch(SHEET_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(syncData)
        });
        alert("ব্যাকআপ ডাটা সফলভাবে পাঠানো হয়েছে!");
    } catch (e) {
        alert("কানেকশন এরর!");
    }
}

// সাধারণ সেন্ডিং ফাংশন (যাতে বারবার এলার্ট কোড না লিখতে হয়)
async function sendToSheet(data) {
    try {
        await fetch(SHEET_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        alert("অপারেশন সফল! ডাটা পাঠানো হয়েছে।");
        if (document.getElementById("btn-undo")) document.getElementById("btn-undo").style.display = "inline-block";

    } catch (e) {
        // ফায়ারফক্সের জন্য: যদি ডাটা ঠিকই যায় কিন্তু ব্রাউজার এরর দেখায়
        alert("ডাটা পাঠানো হয়েছে। শিট চেক করুন।");
        if (document.getElementById("btn-undo")) document.getElementById("btn-undo").style.display = "inline-block";
    }
}

// ৬. রিসেট লাস্ট ইনপুট (ডিলিট এবং রিলোড)
async function resetLastInput() {
    const month = currentSelectedMonth;
    if (!confirm(getBnMonthName(month) + " মাসের সব ডাটা শিট থেকে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।")) return;

    try {
        const response = await fetch(`${SHEET_URL}?action=deleteLast&month=${month}`);
        const result = await response.text();

        if (result === "Success") {
            alert("ডাটা সফলভাবে মোছা হয়েছে। পেজ রিফ্রেশ হচ্ছে...");
            window.location.reload();
        } else {
            alert("এরর: " + result);
        }
    } catch (e) {
        alert("সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।");
    }
}

// ৭. তারিখ ও মাস সেটআপ (ব্রাউজার অনুযায়ী)
function setupBillingDate() {
    const cal = document.getElementById("billingMonth");
    const drop = document.getElementById("dynamicDateContainer");
    const now = new Date();
    const maxVal = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;

    if (/Chrome|Edg/.test(navigator.userAgent)) {
        cal.style.display = "block";
        drop.style.display = "none";
        cal.value = currentSelectedMonth;
        cal.max = maxVal;
        cal.onchange = (e) => {
            currentSelectedMonth = e.target.value;
            handleMonthChange();
        };
    } else {
        cal.style.display = "none";
        drop.style.display = "flex";
        renderDynamicDateControls();
    }
}

function renderDynamicDateControls() {
    const container = document.getElementById("dynamicDateContainer");
    const now = new Date();
    const curYear = now.getFullYear(); // বর্তমান বছর (২০২৬)
    
    let html = `<select id="billingMonth_Year" onchange="updateSelectedYear(this.value)">`;
    // ২০১৫ থেকে বর্তমান বছর পর্যন্ত লুপ
    for (let i = curYear; i >= 2015; i--) {
        const isSelected = currentSelectedMonth.split('-')[0] == i ? "selected" : "";
        html += `<option value="${i}" ${isSelected}>${enToBnNumber(i)}</option>`;
    }
    container.innerHTML = `<span id="monthDropdownContainer"></span>` + html + `</select>`;
    updateMonthOptions();
}

function updateMonthOptions() {
    const container = document.getElementById("monthDropdownContainer");
    const names = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
    
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // ০ থেকে ১১ (জানুয়ারি = ০)
    
    const selectedYear = parseInt(currentSelectedMonth.split('-')[0]);

    let html = `<select id="billingMonth_Month" onchange="updateSelectedMonth(this.value)">`;
    
    names.forEach((name, i) => {
        const val = (i + 1).toString().padStart(2, "0");
        const isSelected = currentSelectedMonth.split('-')[1] == val ? "selected" : "";
        
        // লজিক: যদি সিলেক্ট করা বছর বর্তমান বছর হয়, তবে বর্তমান মাসের পরের মাসগুলো ডিজেবল থাকবে
        let isDisabled = "";
        if (selectedYear === curYear && i > curMonth) {
            isDisabled = "disabled";
        }
        
        html += `<option value="${val}" ${isSelected} ${isDisabled}>${name}</option>`;
    });
    
    container.innerHTML = html + `</select>`;
}

function updateSelectedYear(year) {
    const month = currentSelectedMonth.split('-')[1] || "01";
    currentSelectedMonth = `${year}-${month}`;
    updateMonthOptions();
}


function updateSelectedMonth(month) {
    const year = currentSelectedMonth.split('-')[0];
    currentSelectedMonth = `${year}-${month}`;
    handleMonthChange();
}

// ৮. প্রিন্ট ফাংশন (৩x৩ গ্রিড)
function generatePrintView() {
    const selDate = currentSelectedMonth;
    const formattedMonth = getBnMonthName(selDate);
    const nextDate = new Date(selDate + "-01");
    nextDate.setMonth(nextDate.getMonth() + 1);
    const nextMonthBn = nextDate.toLocaleDateString('bn-BD', {
        month: 'long'
    });
    
    let printArea = document.querySelector(".print-only");
    if (!printArea) {
        printArea = document.createElement("div");
        printArea.className = "print-only";
        document.body.appendChild(printArea);
    }
    printArea.innerHTML = "";

    // ব্রাউজার ডিটেকশন লজিক
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const printMargin = isSafari ? "5mm" : "0mm"; 

    // স্টাইল ইনজেকশন
    const style = document.createElement('style');
    style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');

    @media print {
        @page {
            margin: ${printMargin} !important;
        }
        
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        .bill-cell { 
            font-family: 'Noto Sans Bengali', sans-serif; 
            line-height: 1.2; 
            color: #000; 
            padding: 5px;
            border: 1px solid #ccc;
        }

        .bill-cell h4 { 
            margin: 0 0 2px 0; 
            font-size: 16px; 
            font-weight: 500; 
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 3px;
        }

        .bill-cell p { 
            margin: 3px 0; 
            font-size: 14px; 
            font-weight: 500;
            display: flex;  
        }

        .total-row { 
            font-size: 15px !important; 
            font-weight: 500 !important; 
            border-top: 2px dashed #000 !important; /* !important যোগ করা হয়েছে ফায়ারফক্সের জন্য */
            margin-top: 6px !important; 
            padding-top: 8px; 
        }
    }
    `;
    document.head.appendChild(style);

    const chunks = [tenantIDs.slice(0, 9), tenantIDs.slice(9, 18)];

    chunks.forEach((chunk, index) => {
        let pageDiv = document.createElement("div");
        pageDiv.className = "page-container " + (index === 0 ? "page-break" : "");
        let html = `<div class="page-header"><h4>ভাড়া ও বিদ্যুৎ বিল  ${formattedMonth}</h4></div><div class="print-grid">`;

        chunk.forEach((id) => {
            const curr = parseFloat(document.getElementById(`currM-${id}`).value) || 0;
            const prev = parseFloat(document.getElementById(`prevM-${id}`).value) || 0;
            const rent = parseFloat(document.getElementById(`rent-${id}`).value) || 0;
            const serv = parseFloat(document.getElementById(`gas-${id}`).value) || 0;
            const lTot = parseFloat(document.getElementById(`lastTotal-${id}`).value) || 0;
            const lPad = parseFloat(document.getElementById(`lastPaid-${id}`).value) || 0;
            const rate = parseFloat(document.getElementById("globalUnitRate").value) || 0;
            const units = curr - prev;
            const eBill = (units * rate);
            const dues = (lTot - lPad);
            const total = eBill + rent + serv + dues;

            html += `
            <div class="bill-cell">
        <h4>${enToBnNumber(id)} (${formattedMonth}) এর জন্যঃ</h4>
        <p>মাস শেষের মিটার রিডিং: ${enToBnNumber(curr)}</p>
        <p>মাস শুরুর মিটার রিডিং: ${enToBnNumber(prev)}</p>
        <p>ব্যবহৃত ইউনিট: ${enToBnNumber(units.toFixed(0))}</p>
        <p><strong>বিদ্যুৎ বিল (${enToBnNumber(rate)}৳ হারে): ${enToBnNumber(eBill.toFixed(0))}/-</strong></p>
        <p>মাসিক ভাড়া: ${enToBnNumber(rent)}/-</p>
        <p>${id === "6B" ? "গ্যাস বিল ও সিঁড়ি ঝাড়ু" : "সিঁড়ি ঝাড়ু"}: ${enToBnNumber(serv)}/-</p>
        <p><strong>${formattedMonth.split(" ")[0]} মাসের বকেয়া: ${enToBnNumber(dues.toFixed(0))}৳</strong></p>
        <p class="total-row"><strong>এই মাসে মোট পাওনা: ${enToBnNumber(total.toFixed(0))}৳</strong></p>
        <!--p class="total-row">${nextMonthBn} মাসে মোট পাওনা: ৳${enToBnNumber(total.toFixed(0))}</p-->
        <div style="margin-top:12px; font-size:12px; border-top:1px solid #000; padding-top:6px; text-align: center;">
        <strong>প্রতি মাসের ৫ তারিখের মধ্যে কারেন্ট বিলের টাকা বিকাশ করতে হবে। বিকাশ নাম্বার: 01944529442 রেফারেন্স (Ref): ${id}</strong>
        </div>
    </div>`;
        });
        html += `</div>`;
        pageDiv.innerHTML = html;
        printArea.appendChild(pageDiv);
    });
    window.print();
}

function enToBnNumber(n) {
    const bn = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return n.toString().replace(/\d/g, (d) => bn[d]);
}

function getBnMonthName(str) {
    if (!str) return "";
    const months = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
    const [y, m] = str.split("-");
    return `${months[parseInt(m) - 1]} - ${enToBnNumber(y)}`;
}

// ভাড়াটিয়া পরিবর্তন হলে বকেয়া ও জমা ০ করে দেওয়ার ফাংশন
function clearTenantBalance(id) {
    if (confirm(`আপনি কি নিশ্চিত যে ফ্ল্যাট ${id}-এর গত মাসের বকেয়া ও জমা শূন্য করতে চান?`)) {
        const lastTotalEl = document.getElementById(`lastTotal-${id}`);
        const lastPaidEl = document.getElementById(`lastPaid-${id}`);

        if (lastTotalEl) lastTotalEl.value = 0;
        if (lastPaidEl) lastPaidEl.value = 0;

        alert(`ফ্ল্যাট ${id}-এর ব্যালেন্স শূন্য করা হয়েছে। এখন নতুন রিডিং দিয়ে ক্যালকুলেট করুন।`);
    }
}

window.onload = () => {
    if (document.getElementById('pin-input')) document.getElementById('pin-input').focus();

};



