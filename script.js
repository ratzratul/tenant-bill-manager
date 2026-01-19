// ==========================================
// FINAL VERSION 
// ==========================================

// ১. গ্লোবাল ভেরিয়েবল
const tenantIDs = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D", "4A", "4B", "4C", "4D", "5A", "5B", "5C", "5D", "6A", "6B"];
let db = {};
let savedUnitRate = localStorage.getItem("globalUnitRate") || "8.5";
const SHEET_URL = "https://script.google.com/macros/s/AKfycbzzjtXlK6mpX-nQsiKIHW72S9ddazW-lD-MPEesC6R9hyBbdGApJwxub1DVWXq76A1vYw/exec";

let currentSelectedMonth = "";
let typeInterval; // টাইপিং এনিমেশনের জন্য

// ==========================================
// ২. লোডার ফাংশন (Manually Added HTML Control)
// ==========================================

function showGlobalLoader(message) {
    const loader = document.getElementById('global-loader');
    const textEl = document.getElementById('loader-text');

    if (loader && textEl) {
        loader.style.display = 'flex';

        // টাইপিং ইফেক্ট শুরু
        textEl.textContent = "";
        let i = 0;
        clearInterval(typeInterval); // আগের ইন্টারভাল থাকলে ক্লিয়ার করবে

        typeInterval = setInterval(() => {
            if (i < message.length) {
                // textContent ব্যবহার করলে স্পেস ঠিকমতো কাজ করে
                textEl.textContent += message.charAt(i);
                i++;
            } else {
                // লেখা শেষ হলে ডট অ্যানিমেশন (...)
                if (textEl.textContent.length < message.length + 3) {
                    textEl.textContent += ".";
                } else {
                    // ৩টি ডট হয়ে গেলে আবার মেইন মেসেজে ফিরে যাবে (লুপ হবে)
                    textEl.textContent = message;
                }
            }
        }, 80);
    }
}

function hideGlobalLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = 'none'; // লোডার লুকিয়ে ফেলবে
    }
    clearInterval(typeInterval);
}

// ==========================================
// ৩. অথেন্টিকেশন ও স্টার্টআপ
// ==========================================

// পেজ লোড হলে পিন ইনপুটে ফোকাস করবে 
window.onload = () => {
    if (document.getElementById('pin-input')) {
        document.getElementById('pin-input').focus();
    }
};

function checkPin() {
    const pinEntered = document.getElementById("pin-input").value;
    if (pinEntered !== "") {
        document.getElementById("login-screen").style.display = "none";
        loadDataFromSheet();
    } else {
        alert("দয়া করে পিন দিন!");
    }
}

async function loadDataFromSheet() {
    if (!currentSelectedMonth) {
        const now = new Date();
        currentSelectedMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    }

    // ডিফল্ট ভ্যালু সেটআপ
    tenantIDs.forEach(id => {
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

    init(); // UI তৈরি
    handleMonthChange(); // ডাটা ফেচ
}

// ==========================================
// ৪. ডাটা ফেচিং (লোডার সহ)
// ==========================================

async function handleMonthChange() {
    const selectedMonth = currentSelectedMonth;
    const pin = document.getElementById("pin-input").value;

    // লোডার চালু
    showGlobalLoader("সার্ভার থেকে ডাটা লোড করা হচ্ছে...");

    try {
        const response = await fetch(`${SHEET_URL}?action=getMonthData&month=${selectedMonth}&pin=${pin}`);
        const currentData = await response.json();

        if (currentData && currentData.length > 0) {
            renderDataToUI(currentData);
            // ডাটা পাওয়া গেলে সরাসরি লোডার বন্ধ, কোনো মেসেজ/অ্যালার্ট দরকার নেই
        } else {
            // কারেন্ট মাসে ডাটা না থাকলে মেসেজ আপডেট
            showGlobalLoader("বর্তমান ডাটা নেই! আগের মাসের রিডিং খোঁজা হচ্ছে...");

            const prevMonth = getPreviousMonth(selectedMonth);
            const prevResponse = await fetch(`${SHEET_URL}?action=getMonthData&month=${prevMonth}&pin=${pin}`);
            const prevData = await prevResponse.json();

            if (prevData && prevData.length > 0) {
                populateFromPrevious(prevData);
                // ইউজারকে পড়ার সময় দেওয়ার জন্য ১.৫ সেকেন্ড অপেক্ষা
                showGlobalLoader(`${getBnMonthName(prevMonth)} মাসের রিডিং অটোমেটিক বসানো হয়েছে...`);
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
                resetToDefaults();
                // ডিফল্ট ভ্যালু সেট করার মেসেজ
                showGlobalLoader("কোনো পূর্ববর্তী ডাটা পাওয়া যায়নি। ডিফল্ট সেট করা হচ্ছে...");
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
    } catch (e) {
        console.error("Load Error:", e);
        alert("ডাটা লোড করতে সমস্যা হয়েছে। ইন্টারনেট চেক করুন।"); // শুধু এরর হলে অ্যালার্ট থাকবে
    } finally {
        hideGlobalLoader(); // কাজ শেষ
    }
}

// ==========================================
// ৫. UI রেন্ডারিং
// ==========================================

function renderDataToUI(data) {
    const rate = parseFloat(document.getElementById("globalUnitRate").value) || 8.5;
    data.forEach(row => {
        const id = row.id;
        if (document.getElementById(`currM-${id}`)) {
            document.getElementById(`prevM-${id}`).value = row.prevM;
            document.getElementById(`currM-${id}`).value = row.currM;
            document.getElementById(`rent-${id}`).value = row.rent;
            document.getElementById(`gas-${id}`).value = row.service;
            document.getElementById(`lastTotal-${id}`).value = row.dues;
            document.getElementById(`lastPaid-${id}`).value = row.paid || 0; // lastPaid যদি থাকে

            const units = row.currM - row.prevM;
            const eBill = (units * rate).toFixed(0);
            updateHeaderLabel(id, units, eBill, row.dues, row.total);
        }
    });
}

function populateFromPrevious(prevData) {
    resetToDefaults();
    prevData.forEach(row => {
        const id = row.id;
        if (document.getElementById(`prevM-${id}`)) document.getElementById(`prevM-${id}`).value = row.currM;
        if (document.getElementById(`lastTotal-${id}`)) document.getElementById(`lastTotal-${id}`).value = row.total;
        if (document.getElementById(`label-${id}`)) document.getElementById(`label-${id}`).innerHTML = "নতুন ডাটা ইনপুট দিন...";
    });
}

function resetToDefaults() {
    tenantIDs.forEach(id => {
        if (document.getElementById(`prevM-${id}`)) document.getElementById(`prevM-${id}`).value = 0;
        if (document.getElementById(`currM-${id}`)) document.getElementById(`currM-${id}`).value = 0;
        if (document.getElementById(`lastTotal-${id}`)) document.getElementById(`lastTotal-${id}`).value = 0;
        if (document.getElementById(`lastPaid-${id}`)) document.getElementById(`lastPaid-${id}`).value = 0;
        if (db[id]) {
            if (document.getElementById(`rent-${id}`)) document.getElementById(`rent-${id}`).value = db[id].rent;
            if (document.getElementById(`gas-${id}`)) document.getElementById(`gas-${id}`).value = db[id].gas + db[id].service;
        }
        if (document.getElementById(`label-${id}`)) document.getElementById(`label-${id}`).innerHTML = "ডাটা ইনপুট করুন...";
    });
}

function updateHeaderLabel(id, units, eBill, dues, total) {
    const label = document.getElementById(`label-${id}`);
    if (label) {
        label.innerHTML = `
        <span style="font-size: 0.9em;">E.Bill: ৳${eBill}, Dues: ৳${dues},</span>
        <span style="color: #ff007f; font-weight: bold; margin-left: 5px;"> Total: ৳${total}</span>`;
    }
}

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
            <div class="accord-btn">
                <button type="button" class="btn-clear" onclick="clearTenantBalance('${t.id}')">
                    নতুন ভাড়াটিয়া (ব্যালেন্স ০ করুন)
                </button>
                <button type="button" class="btn-paid" onclick="saveDepositEntry('${t.id}')">
                    জমা টাকা সেভ করুন 💰 
                </button>
            </div>
        </div>`;
        container.appendChild(card);
    });
}

function togglePanel(id) {
    const allPanels = document.querySelectorAll('.details-panel');
    const targetPanel = document.getElementById(`panel-${id}`);
    allPanels.forEach(panel => {
        if (panel !== targetPanel) {
            panel.classList.remove('active');
        }
    });
    targetPanel.classList.toggle('active');
}

// ==========================================
// ৬. মেইন ক্যালকুলেশন ও সেভ (লোডার সহ)
// ==========================================

async function calculateAll() {
    if (!confirm("আপনি কি নিশ্চিত যে হিসাব সেভ করতে চান?")) return;

    const rate = parseFloat(document.getElementById("globalUnitRate").value) || 8.5;
    localStorage.setItem("globalUnitRate", rate);
    const pin = document.getElementById("pin-input").value;

    showGlobalLoader("সব ফ্ল্যাটের হিসাব তৈরি ও সেভ হচ্ছে...");

    const syncData = [];
    const month = currentSelectedMonth;

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

        updateHeaderLabel(id, units, eBill, dues, total);

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
            paid: lPad,
            total
        });
    });

    try {
        await fetch(SHEET_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pin: pin,
                data: syncData
            })
        });

        // সাকসেস মেসেজ লোডারে দেখাবে
        showGlobalLoader("✅ হিসাব সম্পন্ন এবং সার্ভারে সেভ হয়েছে!");
        await new Promise(resolve => setTimeout(resolve, 1500)); // ১.৫ সেকেন্ড দেখাবে

        if (document.getElementById("btn-undo")) {
            document.getElementById("btn-undo").style.display = "inline-block";
        }
    } catch (e) {
        console.error("Save Error:", e);
        alert("সার্ভার এরর! ইন্টারনেট কানেকশন চেক করুন।");
    } finally {
        hideGlobalLoader();
    }
}

// ==========================================
// ৭. জমা এন্ট্রি (Individual Deposit)
// ==========================================

async function saveDepositEntry(targetId) {
    const pin = document.getElementById("pin-input").value;
    if (!pin) {
        alert("আগে পিন নম্বর দিন!");
        return;
    }

    const paidAmount = document.getElementById(`lastPaid-${targetId}`).value;
    if (!confirm(`ফ্ল্যাট ${targetId}-এর জমা: ৳${paidAmount} সেভ করতে চাচ্ছেন?`)) return;

    // --- বাটন সেফটি পার্ট ---
    const btn = document.querySelector(`button[onclick="saveDepositEntry('${targetId}')"]`);
    let originalText = "";
    if (btn) {
        originalText = btn.innerText;
        btn.innerText = "⏳...";
        btn.disabled = true;
    }

    // লোডার চালু
    showGlobalLoader(`ফ্ল্যাট ${targetId} এর জমা লিপিবদ্ধ হচ্ছে...`);

    const syncData = [];
    const month = currentSelectedMonth;

    tenantIDs.forEach((id) => {
        syncData.push({
            id: id,
            month: month,
            prevM: document.getElementById(`prevM-${id}`).value,
            currM: document.getElementById(`currM-${id}`).value,
            units: 0,
            eBill: 0,
            rent: document.getElementById(`rent-${id}`).value,
            service: document.getElementById(`gas-${id}`).value,
            dues: document.getElementById(`lastTotal-${id}`).value,
            paid: document.getElementById(`lastPaid-${id}`).value,
            total: 0
        });
    });

    try {
        await fetch(SHEET_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pin: pin,
                data: syncData
            })
        });

        // সাকসেস মেসেজ লোডারে
        showGlobalLoader(`✅ ফ্ল্যাট ${targetId}-এর টাকা জমা সাকসেসফুল!`);
        await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (e) {
        console.error(e);
        alert("সার্ভার কানেকশন এরর!");
    } finally {
        // --- বাটন ও লোডার রিলিজ ---
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
        hideGlobalLoader();
    }
}

// ==========================================
// ৮. ব্যাকআপ ও রিস্টোর (লোডার সহ)
// ==========================================

async function downloadBackup() {
    if (!confirm("আপনি কি সব মাসের ব্যাকআপ ডাটা ডাউনলোড করতে চান?")) return;

    showGlobalLoader("ব্যাকআপ ফাইল তৈরি হচ্ছে...");

    try {
        const response = await fetch(`${SHEET_URL}?action=getAllData`);
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Full_Backup_${new Date().toLocaleDateString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // ডাউনলোড শুরু হলে মেসেজ
        showGlobalLoader("✅ ডাউনলোড শুরু হয়েছে...");
        await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (e) {
        alert("ডাউনলোড এরর! সার্ভার থেকে ডাটা পাওয়া যায়নি।");
    } finally {
        hideGlobalLoader();
    }
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            if (!confirm(`ফাইলে ${backupData.length} টি এন্ট্রি পাওয়া গেছে। আপলোড করবেন?`)) return;

            const pin = document.getElementById("pin-input").value;
            showGlobalLoader("ব্যাকআপ ডাটা সার্ভারে আপলোড হচ্ছে...");

            await fetch(SHEET_URL, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    pin: pin,
                    data: backupData
                })
            });

            // সাকসেস মেসেজ ও রিলোড
            showGlobalLoader("✅ ব্যাকআপ আপলোড সম্পন্ন! পেজ রিলোড হচ্ছে...");
            await new Promise(resolve => setTimeout(resolve, 2000)); // ২ সেকেন্ড দেখাবে
            location.reload();

        } catch (err) {
            hideGlobalLoader();
            alert("ভুল ফাইল ফরম্যাট বা আপলোড এরর!");
        }
    };
    reader.readAsText(file);
}

// ==========================================
// ৯. রিসেট ফাংশনস (লোডার সহ)
// ==========================================

function clearTenantBalance(id) {
    if (confirm(`ফ্ল্যাট ${id}-এর গত মাসের বকেয়া ও জমা কি শূন্য করতে চান?`)) {
        document.getElementById(`lastTotal-${id}`).value = 0;
        document.getElementById(`lastPaid-${id}`).value = 0;
        document.getElementById(`label-${id}`).innerHTML = "<b style='color:#ff4d4d;'>রিসেট করা হয়েছে (সেভ করতে ভুলবেন না)!</b>";
    }
}

async function resetLastInput() {
    const month = currentSelectedMonth;
    const pin = document.getElementById("pin-input").value;

    if (!confirm(getBnMonthName(month) + " মাসের সব ডাটা শিট থেকে মুছে ফেলতে চান?")) return;

    showGlobalLoader("ডাটা মোছা হচ্ছে...");

    try {
        const response = await fetch(`${SHEET_URL}?action=deleteLast&month=${month}&pin=${pin}`);
        const result = await response.text();

        if (result === "Success") {
            showGlobalLoader("✅ ডাটা সফলভাবে মোছা হয়েছে। রিলোড হচ্ছে...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            window.location.reload();
        } else if (result === "Unauthorized") {
            hideGlobalLoader();
            alert("ভুল পিন! ডাটা মোছার অনুমতি নেই।");
        } else {
            hideGlobalLoader();
            alert("এরর: " + result);
        }
    } catch (e) {
        hideGlobalLoader();
        alert("সার্ভার এরর!");
    }
}

// ==========================================
// ১০. হেল্পার ও প্রিন্ট লজিক
// ==========================================

function getPreviousMonth(currentMonthStr) {
    const date = new Date(currentMonthStr + "-01");
    date.setMonth(date.getMonth() - 1);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
}

function getBnMonthName(str) {
    if (!str) return "";
    const months = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
    const [y, m] = str.split("-");
    return `${months[parseInt(m) - 1]} - ${enToBnNumber(y)}`;
}

function enToBnNumber(n) {
    if (n === undefined || n === null) return "০";
    const bn = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return n.toString().replace(/\d/g, (d) => bn[d]);
}

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
    const curYear = now.getFullYear();
    let html = `<select id="billingMonth_Year" onchange="updateSelectedYear(this.value)">`;
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
    const curMonth = now.getMonth();
    const selectedYear = parseInt(currentSelectedMonth.split('-')[0]);

    let html = `<select id="billingMonth_Month" onchange="updateSelectedMonth(this.value)">`;
    names.forEach((name, i) => {
        const val = (i + 1).toString().padStart(2, "0");
        const isSelected = currentSelectedMonth.split('-')[1] == val ? "selected" : "";
        let isDisabled = (selectedYear === curYear && i > curMonth) ? "disabled" : "";
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

function generatePrintView() {
    const selDate = currentSelectedMonth;
    const formattedMonth = getBnMonthName(selDate);
    const targetMonthName = formattedMonth.split(" ")[0];

    let printArea = document.querySelector(".print-only") || document.createElement("div");
    printArea.className = "print-only";
    if (!document.querySelector(".print-only")) document.body.appendChild(printArea);
    printArea.innerHTML = "";

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const printMargin = isSafari ? "5mm" : "0mm";

    const style = document.createElement('style');
    style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
    @media print {
        @page { margin: ${printMargin} !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .bill-cell { font-family: 'Noto Sans Bengali', sans-serif; line-height: 1.2; color: #000; padding: 5px; border: 1px solid #ccc; }
        .bill-cell h4 { margin: 0 0 2px 0; font-size: 16px; font-weight: 500; text-align: center; border-bottom: 2px solid #000; padding-bottom: 3px; }
        .bill-cell p { margin: 3px 0; font-size: 14px; font-weight: 500; display: flex; }
        .total-row { font-size: 15px !important; font-weight: 700 !important; border-top: 2px dashed #000 !important; margin-top: 6px !important; padding-top: 8px; }
    }`;
    document.head.appendChild(style);

    const chunks = [tenantIDs.slice(0, 9), tenantIDs.slice(9, 18)];

    chunks.forEach((chunk, index) => {
        let pageDiv = document.createElement("div");
        pageDiv.className = "page-container " + (index === 0 ? "page-break" : "");
        let html = `<div class="page-header"><h4>ভাড়া ও বিদ্যুৎ বিল : ${formattedMonth}</h4></div><div class="print-grid">`;

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
            <p><strong>${targetMonthName} মাসের বকেয়া: ${enToBnNumber(dues.toFixed(0))}৳</strong></p>
            <p class="total-row"><strong>এই মাসে মোট পাওনা: ${enToBnNumber(total.toFixed(0))}৳</strong></p>
            <div style="margin-top:10px; font-size:12px; border-top:1px solid #000; padding-top:6px; text-align: center; line-height: 1.3;">
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
