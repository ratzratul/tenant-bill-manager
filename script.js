// FINAL Version

// ১. গ্লোবাল ভেরিয়েবল (আপনার লেটেস্ট SHEET_URL ব্যবহার করুন)
const tenantIDs = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D", "4A", "4B", "4C", "4D", "5A", "5B", "5C", "5D", "6A", "6B"];
let db = {};
let savedUnitRate = localStorage.getItem("globalUnitRate") || "8.5";
const SHEET_URL = "https://script.google.com/macros/s/AKfycbzzjtXlK6mpX-nQsiKIHW72S9ddazW-lD-MPEesC6R9hyBbdGApJwxub1DVWXq76A1vYw/exec";

let currentSelectedMonth = "";

// ২. লগইন চেক (সিকিউর: কোডে পিন নেই, শুধু ইনপুট চেক করছে)
function checkPin() {
    const pinEntered = document.getElementById("pin-input").value;
    if (pinEntered !== "") {
        document.getElementById("login-screen").style.display = "none";
        loadDataFromSheet();
    } else {
        alert("দয়া করে পিন দিন!");
    }
}

// ৩. ডিফল্ট সেটআপ (গিটহাবের রেন্ট লজিক এখানে যুক্ত আছে)
async function loadDataFromSheet() {
    if (!currentSelectedMonth) {
        const now = new Date();
        currentSelectedMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    }

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

    init(); // UI আগে তৈরি হবে
    handleMonthChange(); // তারপর ডাটা ফেচ হবে
}

// ৪. স্মার্ট ডাটা হ্যান্ডলার (পিসি কোডের স্মার্ট লুক-ব্যাক এবং সিকিউর পিন)
async function handleMonthChange() {
    const selectedMonth = currentSelectedMonth;
    const pin = document.getElementById("pin-input").value;
    try {
        const response = await fetch(`${SHEET_URL}?action=getMonthData&month=${selectedMonth}&pin=${pin}`);
        const currentData = await response.json();

        if (currentData && currentData.length > 0) {
            renderDataToUI(currentData); // ডাটা থাকলে সরাসরি রেন্ডার
            alert(getBnMonthName(selectedMonth) + " মাসের ডাটা লোড হয়েছে।");
        } else {
            // যদি কারেন্ট মাসে ডাটা না থাকে, আগের মাস চেক করো
            const prevMonth = getPreviousMonth(selectedMonth);
            const prevResponse = await fetch(`${SHEET_URL}?action=getMonthData&month=${prevMonth}&pin=${pin}`);
            const prevData = await prevResponse.json();

            if (prevData && prevData.length > 0) {
                populateFromPrevious(prevData);
                alert(`নতুন মাস! ${getBnMonthName(prevMonth)} মাসের মিটার রিডিং এবং বকেয়া আনা হয়েছে।`);
            } else {
                resetToDefaults();
                alert("পূর্বের কোনো ডাটা পাওয়া যায়নি। ডিফল্ট ভ্যালু সেট করা হয়েছে।");
            }
        }
    } catch (e) {
        console.error("Load Error:", e);
    }
}

// ৫. UI রেন্ডারিং ও পপুলেশন 
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
            document.getElementById(`lastPaid-${id}`).value = 0;

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
<span style="font-size: 0.9em;">Unit: ${units}, E.Bill: ৳${eBill}, Dues: ৳${dues},</span>
<span style="color: #ff007f; font-weight: bold; margin-left: 5px;"> Total: ৳${total}</span>
`;
    }
}

// ৬. ইন্টারফেস তৈরি
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
style="background: #800000; color: #f2f2f2; border: none; padding: 10px; border-radius: 5px; cursor: pointer; width: 98%; font-weight: bold; font-size: 13px;">
নতুন ভাড়াটিয়া (ব্যালেন্স ০ করুন)
</button>
</div>
</div>`;
        container.appendChild(card);
    });
}
// ৭. অ্যাকর্ডিয়ন টগল
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

// ৮. ক্যালকুলেশন এবং ডাটা সেভ (সিকিউর ভার্সন)
async function calculateAll() {
    if (!confirm("আপনি কি নিশ্চিত যে হিসাব সেভ করতে চান?")) return;

    const rate = parseFloat(document.getElementById("globalUnitRate").value) || 8.5;
    localStorage.setItem("globalUnitRate", rate);
    const pin = document.getElementById("pin-input").value; // পিন ইনপুট বক্স থেকে নিচ্ছে

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
            total
        });
    });

    // সার্ভারে ডাটা পাঠানো
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
        alert("হিসাব সম্পন্ন এবং সার্ভারে সেভ হয়েছে!");

        //রিসেট লাস্ট ইনপুট
        if (document.getElementById("btn-undo")) {
            document.getElementById("btn-undo").style.display = "inline-block";
        }
    } catch (e) {
        console.error("Save Error:", e);
        alert("সার্ভার এরর! ইন্টারনেট কানেকশন চেক করুন।");
    }
}

// ৯. ভাড়াটিয়া রিসেট ও ব্যাকআপ লজিক

function clearTenantBalance(id) {
    if (confirm(`ফ্ল্যাট ${id}-এর গত মাসের বকেয়া ও জমা কি শূন্য করতে চান?`)) {
        document.getElementById(`lastTotal-${id}`).value = 0;
        document.getElementById(`lastPaid-${id}`).value = 0;
        // হেডারে লাল রঙে মেসেজ দেখাবে যাতে ভুল না হয়
        document.getElementById(`label-${id}`).innerHTML = "<b style='color:#ff4d4d;'>রিসেট করা হয়েছে (সেভ করতে ভুলবেন না)!</b>";
    }
}

// সব ডাটা একবারে ফাইল হিসেবে ডাউনলোড করা
async function downloadBackup() {
    if (!confirm("আপনি কি সব মাসের ব্যাকআপ ডাটা ডাউনলোড করতে চান?")) return;
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
    } catch (e) {
        alert("ডাউনলোড এরর! সার্ভার থেকে ডাটা পাওয়া যায়নি।");
    }
}

// ফাইল থেকে ডাটা নিয়ে সার্ভারে ইমপোর্ট/আপলোড করা
function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            if (!confirm(`ফাইলে ${backupData.length} টি এন্ট্রি পাওয়া গেছে। এগুলো কি সার্ভারে আপলোড করবেন?`)) return;

            const pin = document.getElementById("pin-input").value;

            // ডাটা সরাসরি সার্ভারে পাঠানো (কোনো রিক্যালকুলেশন ছাড়া)
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

            alert("ব্যাকআপ ডাটা সফলভাবে আপলোড হয়েছে! আপডেট দেখতে পেজটি রিলোড দিন।");
            location.reload();
        } catch (err) {
            alert("ভুল ফাইল ফরম্যাট! দয়া করে সঠিক JSON ব্যাকআপ ফাইল দিন।");
        }
    };
    reader.readAsText(file);
}


// ১০. সার্ভার অ্যাকশনস (রিসেট ও ডিলিট)

async function resetLastInput() {
    const month = currentSelectedMonth;
    const pin = document.getElementById("pin-input").value;

    if (!confirm(getBnMonthName(month) + " মাসের সব ডাটা শিট থেকে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।")) return;

    try {
        const response = await fetch(`${SHEET_URL}?action=deleteLast&month=${month}&pin=${pin}`);
        const result = await response.text();

        if (result === "Success") {
            alert("ডাটা সফলভাবে মোছা হয়েছে। পেজ রিফ্রেশ হচ্ছে...");
            window.location.reload();
        } else if (result === "Unauthorized") {
            alert("ভুল পিন! ডাটা মোছার অনুমতি নেই।");
        } else {
            alert("এরর: " + result);
        }
    } catch (e) {
        alert("সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। আপনার ইন্টারনেট চেক করুন।");
    }
}

// ১১. হেল্পার ফাংশনস (তারিখ ও বাংলা নম্বর)

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
    const bn = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return n.toString().replace(/\d/g, (d) => bn[d]);
}

// ১২. ডায়নামিক তারিখ ও মাস কন্ট্রোল

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

        // লজিক: বর্তমান বছরের বর্তমান মাসের পরের মাসগুলো ডিজেবল থাকবে
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

// ১৩. প্রিন্ট ভিউ (পুরোপুরি গিটহাব স্টাইলে)
function generatePrintView() {
    const selDate = currentSelectedMonth;
    const formattedMonth = getBnMonthName(selDate);
    const targetMonthName = formattedMonth.split(" ")[0]; // মাসের নাম (যেমন: জানুয়ারি)

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
.bill-cell h4 { margin: 0 0 2px 0; font-size: 16px; font-weight: 600; text-align: center; border-bottom: 2px solid #000; padding-bottom: 3px; }
.bill-cell p { margin: 3px 0; font-size: 14px; font-weight: 500; display: flex; }
.total-row { font-size: 15px !important; font-weight: 700 !important; border-top: 2px dashed #000 !important; margin-top: 6px !important; padding-top: 8px; }
}`;
    document.head.appendChild(style);

    const chunks = [tenantIDs.slice(0, 9), tenantIDs.slice(9, 18)];

    chunks.forEach((chunk, index) => {
        let pageDiv = document.createElement("div");
        pageDiv.className = "page-container " + (index === 0 ? "page-break" : "");
        let html = `<div class="page-header"><h4>ভাড়া ও বিদ্যুৎ বিল - ${formattedMonth}</h4></div><div class="print-grid">`;

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

window.onload = () => {
    if (document.getElementById('pin-input')) document.getElementById('pin-input').focus();
};
