const tenantIDs = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D", "4A", "4B", "4C", "4D", "5A", "5B", "5C", "5D", "6A", "6B"];
let db = {},
	savedUnitRate = localStorage.getItem("globalUnitRate") || "8.5";
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxVc2HhrkCu1ttnnWJw5_AqiMxTqgnaGlc3xZxGmLxzzdmQhAj6HwVw6Lrrrtrmz16SOA/exec";
let currentSelectedMonth = "",
	adjustedAdvances = {},
	typeInterval;

function showGlobalLoader(e) {
	let t = document.getElementById("global-loader"),
		l = document.getElementById("loader-text");
	if (t && l) {
		t.style.display = "flex";
		l.textContent = "";
		let n = 0;
		clearInterval(typeInterval);
		typeInterval = setInterval(() => {
			n < e.length ? (l.textContent += e.charAt(n), n++) : l.textContent.length < e.length + 3 ? l.textContent += "." : l.textContent = e
		}, 80)
	}
}

function hideGlobalLoader() {
	let e = document.getElementById("global-loader");
	e && (e.style.display = "none"), clearInterval(typeInterval)
}

function checkPin() {
	"" !== document.getElementById("pin-input").value ? (document.getElementById("login-screen").style.display = "none", loadDataFromSheet()) : alert("দয়া করে পিন দিন!")
}

async function loadDataFromSheet() {
	if (!currentSelectedMonth) {
		let e = new Date;
		currentSelectedMonth = `${e.getFullYear()}-${(e.getMonth()+1).toString().padStart(2,"0")}`
	}
	tenantIDs.forEach(e => {
		let t = 0;
		"1A" === e || "2A" === e || "4A" === e || "5A" === e || "6A" === e ? t = 4000 : "1B" === e || "4B" === e || "6B" === e ? t = 5700 : "2B" === e || "1C" === e || "2C" === e || "4C" === e ? t = 5000 : e.includes("D") ? t = 4500 : ("5B" === e || "5C" === e) && (t = 6000), db[e] = {
			id: e,
			rent: t,
			gas: 0,
			service: e.includes("A") || e.includes("D") ? 50 : 70,
			prevMeter: 0,
			totalLastMonth: 0,
			serverEBill: void 0
		}
	}), init(), handleMonthChange()
}

async function handleMonthChange() {
	let e = currentSelectedMonth,
		t = document.getElementById("pin-input").value;
	showGlobalLoader("সার্ভার থেকে ডাটা লোড করা হচ্ছে...");
	try {
		let l = await (await fetch(`${SHEET_URL}?action=getMonthData&month=${e}&pin=${t}`)).json();
		if (l && l.length > 0) renderDataToUI(l);
		else {
			showGlobalLoader("বর্তমান ডাটা নেই! আগের মাসের ডাটা খোঁজা হচ্ছে...");
			let n = getPreviousMonth(e),
				a = await (await fetch(`${SHEET_URL}?action=getMonthData&month=${n}&pin=${t}`)).json();
			a && a.length > 0 ? (populateFromPrevious(a), showGlobalLoader(`${getBnMonthName(n)} মাসের রিডিং ও ভাড়া অটোমেটিক বসানো হয়েছে...`), await new Promise(e => setTimeout(e, 1500))) : (resetToDefaults(), showGlobalLoader("কোনো পূর্ববর্তী ডাটা পাওয়া যায়নি। ডিফল্ট সেট করা হচ্ছে..."), await new Promise(e => setTimeout(e, 2e3)))
		}
	} catch (i) {
		console.error("Load Error:", i), alert("ডাটা লোড করতে সমস্যা হয়েছে।")
	} finally {
		hideGlobalLoader()
	}
}

function renderDataToUI(e) {
	e.forEach(e => {
		let t = e.id;
		if (document.getElementById(`currM-${t}`)) {
			document.getElementById(`prevM-${t}`).value = e.prevM, document.getElementById(`currM-${t}`).value = e.currM, document.getElementById(`rent-${t}`).value = e.rent, document.getElementById(`gas-${t}`).value = e.service, document.getElementById(`lastTotal-${t}`).value = e.dues || 0, document.getElementById(`lastPaid-${t}`).value = e.paid || 0;
			let l = e.currM - e.prevM,
				n = void 0 !== e.eBill && "" !== e.eBill ? parseFloat(e.eBill).toFixed(0) : calculateElectricityBill(l).toFixed(0);
			db[t] && (db[t].serverEBill = n);
			let a = (parseFloat(e.dues) - parseFloat(e.paid)).toFixed(0);
			updateHeaderLabel(t, l, n, a, e.total)
		}
	})
}

function populateFromPrevious(e) {
	resetToDefaults(), e.forEach(e => {
		let t = e.id;
		document.getElementById(`prevM-${t}`) && (document.getElementById(`prevM-${t}`).value = e.currM), document.getElementById(`lastTotal-${t}`) && (document.getElementById(`lastTotal-${t}`).value = parseFloat(e.total || 0).toFixed(0)), document.getElementById(`rent-${t}`) && (document.getElementById(`rent-${t}`).value = e.rent), document.getElementById(`gas-${t}`) && (document.getElementById(`gas-${t}`).value = e.service), document.getElementById(`label-${t}`) && (document.getElementById(`label-${t}`).innerHTML = "<span class='text-teal'>আগের মাসের ডাটা লোড হয়েছে...</span>")
	})
}

function resetToDefaults() {
	tenantIDs.forEach(e => {
		document.getElementById(`prevM-${e}`) && (document.getElementById(`prevM-${e}`).value = 0), document.getElementById(`currM-${e}`) && (document.getElementById(`currM-${e}`).value = 0), document.getElementById(`lastTotal-${e}`) && (document.getElementById(`lastTotal-${e}`).value = 0), document.getElementById(`lastPaid-${e}`) && (document.getElementById(`lastPaid-${e}`).value = 0), db[e] && (db[e].serverEBill = void 0, document.getElementById(`rent-${e}`) && (document.getElementById(`rent-${e}`).value = db[e].rent), document.getElementById(`gas-${e}`) && (document.getElementById(`gas-${e}`).value = db[e].gas + db[e].service)), document.getElementById(`label-${e}`) && (document.getElementById(`label-${e}`).innerHTML = "ডাটা ইনপুট করুন...")
	})
}

function updateHeaderLabel(e, t, l, n, a) {
	let i = document.getElementById(`label-${e}`);
	i && (i.innerHTML = `
        <span class="label-ebill">E.Bill: ৳${l}, Dues: ৳${n},</span>
        <span class="label-total"> Total: ৳${a}</span>`)
}

function init() {
	setupBillingDate();
	let e = document.getElementById("tenantAccordion");
	e.innerHTML = "", tenantIDs.forEach(t => {
		let l = db[t],
			n = document.createElement("div");
		n.className = "tenant-card", n.innerHTML = `
        <div class="summary-header" onclick="togglePanel('${l.id}')">
            <span>[FLAT: ${l.id}]</span><span id="label-${l.id}" class="header-stats">ডাটা ইনপুট করুন...</span>
        </div>
        <div class="details-panel" id="panel-${l.id}">
            <div class="accord-grid">
                <div class="input-group"><label>পূর্বের মিটার রিডিং:</label><input type="number" id="prevM-${l.id}" value="${l.prevMeter}"></div>
                <div class="input-group"><label>বর্তমান মিটার রিডিং:</label><input type="number" id="currM-${l.id}" value="0"></div>
                <div class="input-group"><label>ভাড়া:</label><input type="number" id="rent-${l.id}" value="${l.rent}"></div>
                <div class="input-group"><label>সার্ভিস:</label><input type="number" id="gas-${l.id}" value="${l.gas+l.service}"></div>
                <div class="input-group"><label>গত মাসের পাওনা:</label><input type="number" id="lastTotal-${l.id}" value="${l.totalLastMonth}"></div>
                <div class="input-group"><label>গত মাসের জমা:</label><input type="number" id="lastPaid-${l.id}" value="0"></div>
            </div>
            <div class="accord-btn">
                <button type="button" class="btn-clear" onclick="clearTenantBalance('${l.id}')">রিসেট (0)</button>
                <button type="button" class="btn-advance" onclick="openAdvanceModal('${l.id}')">⚡ অ্যাডভান্স</button>
                <button type="button" class="btn-paid" onclick="saveDepositEntry('${l.id}')">💰 জমা সেভ</button>
            </div>
        </div>`, e.appendChild(n)
	})
}

function togglePanel(e) {
	let t = document.querySelectorAll(".details-panel"),
		l = document.getElementById(`panel-${e}`);
	t.forEach(e => {
		e !== l && e.classList.remove("active")
	}), l.classList.toggle("active")
}

async function calculateAll() {
    if (!confirm("আপনি কি নিশ্চিত যে হিসাব সেভ করতে চান?")) return;

    let pinElement = document.getElementById("pin-input");
    let pinValue = pinElement ? pinElement.value : "";
    
    showGlobalLoader("সব ফ্ল্যাটের হিসাব তৈরি ও সেভ হচ্ছে...");
    
    let l = [];
    let n = currentSelectedMonth;

    tenantIDs.forEach(e => {
        let t = parseFloat(document.getElementById(`currM-${e}`)?.value) || 0,
            a = parseFloat(document.getElementById(`prevM-${e}`)?.value) || 0,
            i = parseFloat(document.getElementById(`rent-${e}`)?.value) || 0,
            r = parseFloat(document.getElementById(`gas-${e}`)?.value) || 0,
            d = parseFloat(document.getElementById(`lastTotal-${e}`)?.value) || 0,
            o = parseFloat(document.getElementById(`lastPaid-${e}`)?.value) || 0,
            c = t - a,
            s = calculateElectricityBill(c).toFixed(0),
            u = d - o,
            p = (parseFloat(s) + i + r + u).toFixed(0);

        db[e] && (db[e].serverEBill = s);
        updateHeaderLabel(e, c, s, u.toFixed(0), p);
        
        l.push({
            id: e,
            month: n,
            prevM: a,
            currM: t,
            units: c,
            eBill: s,
            rent: i,
            service: r,
            dues: d,
            paid: o,
            total: p
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
                pin: pinValue,
                data: l
            })
        });
        showGlobalLoader("✅ হিসাব সম্পন্ন এবং সার্ভারে সেভ হয়েছে!");
        await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
        alert("সার্ভার এরর!");
    } finally {
        hideGlobalLoader();
    }
}

async function saveDepositEntry(e) {
	let t = document.getElementById("pin-input").value;
	if (!t) {
		alert("আগে পিন নম্বর দিন!");
		return
	}
	if (!confirm(`ফ্ল্যাট ${e}-এর জমা: ৳${document.getElementById(`lastPaid-${e}`).value} সেভ করতে চাচ্ছেন?`)) return;
	showGlobalLoader(`ফ্ল্যাট ${e} এর জমা লিপিবদ্ধ হচ্ছে...`);
	let l = [],
		n = currentSelectedMonth;
	tenantIDs.forEach(e => {
		let t = parseFloat(document.getElementById(`currM-${e}`).value) || 0,
			a = parseFloat(document.getElementById(`prevM-${e}`).value) || 0,
			i = parseFloat(document.getElementById(`rent-${e}`).value) || 0,
			r = parseFloat(document.getElementById(`gas-${e}`).value) || 0,
			d = parseFloat(document.getElementById(`lastTotal-${e}`).value) || 0,
			o = parseFloat(document.getElementById(`lastPaid-${e}`).value) || 0,
			c = t - a,
			s = db[e] && void 0 !== db[e].serverEBill ? parseFloat(db[e].serverEBill) : calculateElectricityBill(c),
			u = (s + i + r + (d - o)).toFixed(0);
		l.push({
			id: e,
			month: n,
			prevM: a,
			currM: t,
			units: c,
			eBill: s.toFixed(0),
			rent: i,
			service: r,
			dues: d,
			paid: o,
			total: u
		})
	});
	try {
		await fetch(SHEET_URL, {
			method: "POST",
			mode: "no-cors",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				pin: t,
				data: l
			})
		}), showGlobalLoader(`✅ জমা সাকসেসফুল!`), await new Promise(e => setTimeout(e, 1500))
	} catch (a) {
		alert("এরর!")
	} finally {
		hideGlobalLoader()
	}
}

async function downloadBackup() {
	if (confirm("আপনি কি সব মাসের ব্যাকআপ ডাটা ডাউনলোড করতে চান?")) {
		showGlobalLoader("ব্যাকআপ ফাইল তৈরি হচ্ছে...");
		try {
			let e = await (await fetch(`${SHEET_URL}?action=getAllData`)).json(),
				t = new Blob([JSON.stringify(e, null, 2)], {
					type: "application/json"
				}),
				l = URL.createObjectURL(t),
				n = document.createElement("a");
			n.href = l, n.download = `Full_Backup_${new Date().toLocaleDateString()}.json`, document.body.appendChild(n), n.click(), document.body.removeChild(n), showGlobalLoader("✅ ডাউনলোড শুরু হয়েছে..."), await new Promise(e => setTimeout(e, 1e3))
		} catch (a) {
			alert("ডাউনলোড এরর! সার্ভার থেকে ডাটা পাওয়া যায়নি।")
		} finally {
			hideGlobalLoader()
		}
	}
}

function importData(e) {
	let t = e.files[0];
	if (!t) return;
	let l = new FileReader;
	l.onload = async function(e) {
		try {
			let t = JSON.parse(e.target.result);
			if (!confirm(`ফাইলে ${t.length} টি এন্ট্রি পাওয়া গেছে। আপলোড করবেন?`)) return;
			let l = document.getElementById("pin-input").value;
			showGlobalLoader("ব্যাকআপ ডাটা সার্ভারে আপলোড হচ্ছে..."), await fetch(SHEET_URL, {
				method: "POST",
				mode: "no-cors",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					pin: l,
					data: t
				})
			}), showGlobalLoader("✅ ব্যাকআপ আপলোড সম্পন্ন! পেজ রিলোড হচ্ছে..."), await new Promise(e => setTimeout(e, 2e3)), location.reload()
		} catch (n) {
			hideGlobalLoader(), alert("ভুল ফাইল ফরম্যাট বা আপলোড এরর!")
		}
	}, l.readAsText(t)
}

function clearTenantBalance(e) {
	confirm(`ফ্ল্যাট ${e}-এর গত মাসের বকেয়া ও জমা কি শূন্য করতে চান?`) && (document.getElementById(`lastTotal-${e}`).value = 0, document.getElementById(`lastPaid-${e}`).value = 0, document.getElementById(`label-${e}`).innerHTML = "<b class='text-danger'>রিসেট করা হয়েছে (সেভ করতে ভুলবেন চিহ্নিত)!</b>")
}

async function resetLastInput() {
	let e = currentSelectedMonth,
		t = document.getElementById("pin-input").value;
	if (confirm(getBnMonthName(e) + " মাসের সব ডাটা শিট থেকে মুছে ফেলতে চান?")) {
		showGlobalLoader("ডাটা মোছা হচ্ছে...");
		try {
			let l = await (await fetch(`${SHEET_URL}?action=deleteLast&month=${e}&pin=${t}`)).text();
			"Success" === l ? (showGlobalLoader("✅ ডাটা সফলভাবে মোছা হয়েছে। রিলোড হচ্ছে..."), await new Promise(e => setTimeout(e, 2e3)), window.location.reload()) : "Unauthorized" === l ? (hideGlobalLoader(), alert("ভুল পিন! ডাটা মোছার অনুমতি নেই।")) : (hideGlobalLoader(), alert("এরর: " + l))
		} catch (n) {
			hideGlobalLoader(), alert("সার্ভার এরর!")
		}
	}
}
window.onload = () => {
	document.getElementById("pin-input") && document.getElementById("pin-input").focus(), document.querySelectorAll(".slab-limit").forEach((e, t, l) => {
		e.addEventListener("input", () => {
			if (t < l.length - 1) {
				let n = document.querySelectorAll(".slab-start")[t + 1],
					a = parseInt(e.value);
				isNaN(a) || (n.textContent = a + 1)
			}
		})
	})
};
let currentAdvanceId = null;

async function openAdvanceModal(e) {
	currentAdvanceId = e, document.getElementById("adv-modal-id").innerText = e, document.getElementById("new-advance-input").value = "", showGlobalLoader("অ্যাডভান্স ব্যালেন্স চেক করা হচ্ছে...");
	try {
		let t = await (await fetch(`${SHEET_URL}?action=getAdvance&id=${e}`)).json();
		document.getElementById("current-advance-display").innerText = t.amount || 0, document.getElementById("advanceModal").style.display = "flex"
	} catch (l) {
		alert("অ্যাডভান্স ডাটা লোড করা যায়নি!")
	} finally {
		hideGlobalLoader()
	}
}

function closeAdvanceModal() {
	document.getElementById("advanceModal").style.display = "none"
}

async function saveAdvanceData() {
	let e = document.getElementById("pin-input").value;
	if (!e) {
		alert("আগে পিন নম্বর দিন!");
		return
	}
	let t = parseFloat(document.getElementById("new-advance-input").value);
	if (isNaN(t)) {
		alert("সঠিক টাকার পরিমাণ দিন!");
		return
	}
	showGlobalLoader("অ্যাডভান্স সেভ হচ্ছে...");
	try {
		await fetch(SHEET_URL, {
			method: "POST",
			body: JSON.stringify({
				pin: e,
				action: "updateAdvance",
				id: currentAdvanceId,
				amount: t
			})
		}), document.getElementById("current-advance-display").innerText = t, document.getElementById("new-advance-input").value = "", showGlobalLoader("✅ অ্যাডভান্স সেভ হয়েছে!"), await new Promise(e => setTimeout(e, 1200))
	} catch (l) {
		alert("সেভ এরর!")
	} finally {
		hideGlobalLoader()
	}
}

async function deductFromTotal() {
	let e = document.getElementById("pin-input").value;
	if (!e) {
		alert("আগে পিন নম্বর দিন!");
		return
	}
	let t = parseFloat(document.getElementById("current-advance-display").innerText);
	if (t <= 0) {
		alert("কাটার মতো কোনো অ্যাডভান্স টাকা নেই!");
		return
	}
	if (confirm(`আপনি কি মোট বিল থেকে ৳${t} কমাতে চান? এটি স্বয়ংক্রিয়ভাবে সার্ভারে সেভ হবে।`)) {
		closeAdvanceModal(), showGlobalLoader(`ফ্ল্যাট ${currentAdvanceId}-এর অ্যাডভান্স অ্যাডজাস্ট ও সেভ হচ্ছে...`);
		try {
			await fetch(SHEET_URL, {
				method: "POST",
				body: JSON.stringify({
					pin: e,
					action: "updateAdvance",
					id: currentAdvanceId,
					amount: 0
				})
			});
			let l = document.getElementById(`lastPaid-${currentAdvanceId}`),
				n = parseFloat(l.value) || 0;
			l.value = n + t, adjustedAdvances[currentAdvanceId] = t, localStorage.setItem(`adv_${currentSelectedMonth}_${currentAdvanceId}`, t), await saveDepositEntryAfterAdvance(currentAdvanceId);
			let a = parseFloat(document.getElementById(`currM-${currentAdvanceId}`).value) || 0,
				i = parseFloat(document.getElementById(`prevM-${currentAdvanceId}`).value) || 0,
				r = parseFloat(document.getElementById(`rent-${currentAdvanceId}`).value) || 0,
				d = parseFloat(document.getElementById(`gas-${currentAdvanceId}`).value) || 0,
				o = parseFloat(document.getElementById(`lastTotal-${currentAdvanceId}`).value) || 0,
				c = parseFloat(l.value),
				s = a - i,
				u = db[currentAdvanceId] && void 0 !== db[currentAdvanceId].serverEBill ? parseFloat(db[currentAdvanceId].serverEBill).toFixed(0) : calculateElectricityBill(s).toFixed(0),
				p = (o - c).toFixed(0),
				g = (parseFloat(u) + r + d + parseFloat(p)).toFixed(0);
			updateHeaderLabel(currentAdvanceId, s, u, p, g), document.getElementById("current-advance-display").innerText = "0", showGlobalLoader(`✅ সফল হয়েছে! ৳${t} অ্যাডজাস্ট করে মোট বিল ৳${g} করা হয়েছে।`), await new Promise(e => setTimeout(e, 2e3))
		} catch (m) {
			console.error(m), alert("সার্ভার এরর!")
		} finally {
			hideGlobalLoader()
		}
	}
}

async function saveDepositEntryAfterAdvance(e) {
	let t = document.getElementById("pin-input").value,
		l = [],
		n = currentSelectedMonth;
	tenantIDs.forEach(e => {
		let t = parseFloat(document.getElementById(`currM-${e}`).value) || 0,
			a = parseFloat(document.getElementById(`prevM-${e}`).value) || 0,
			i = parseFloat(document.getElementById(`rent-${e}`).value) || 0,
			r = parseFloat(document.getElementById(`gas-${e}`).value) || 0,
			d = parseFloat(document.getElementById(`lastTotal-${e}`).value) || 0,
			o = parseFloat(document.getElementById(`lastPaid-${e}`).value) || 0,
			c = t - a,
			s = db[e] && void 0 !== db[e].serverEBill ? parseFloat(db[e].serverEBill) : calculateElectricityBill(c),
			u = (s + i + r + (d - o)).toFixed(0);
		l.push({
			id: e,
			month: n,
			prevM: a,
			currM: t,
			units: c,
			eBill: s.toFixed(0),
			rent: i,
			service: r,
			dues: d,
			paid: o,
			total: u
		})
	}), await fetch(SHEET_URL, {
		method: "POST",
		mode: "no-cors",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			pin: t,
			data: l
		})
	})
}

function calculateElectricityBill(e) {
	if (e <= 0) return 0;
	let t = 0,
		l = e;
	if (l > 0) {
		let n = Math.min(l, 75);
		t += 8.5 * n, l -= n
	}
	if (l > 0) {
		let a = Math.min(l, 75);
		t += 9 * a, l -= a
	}
	if (l > 0) {
		let i = Math.min(l, 75);
		t += 11 * i, l -= i
	}
	if (l > 0) {
		let r = Math.min(l, 75);
		t += 13 * r, l -= r
	}
	if (l > 0) {
		let d = Math.min(l, 75);
		t += 15 * d, l -= d
	}
	return l > 0 && (t += 17.5 * l, l = 0), t
}

function getPreviousMonth(e) {
	let t = new Date(e + "-01");
	t.setMonth(t.getMonth() - 1);
	return `${t.getFullYear()}-${(t.getMonth()+1).toString().padStart(2,"0")}`
}

function getBnMonthName(e) {
	if (!e) return "";
	let [t, l] = e.split("-");
	return `${["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"][parseInt(l)-1]} - ${enToBnNumber(t)}`
}

function enToBnNumber(e) {
	if (null == e) return "০";
	let t = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
	return e.toString().replace(/\d/g, e => t[e])
}

function setupBillingDate() {
	let e = document.getElementById("billingMonth"),
		t = document.getElementById("dynamicDateContainer"),
		l = new Date,
		n = `${l.getFullYear()}-${(l.getMonth()+1).toString().padStart(2,"0")}`;
	/Chrome|Edg/.test(navigator.userAgent) ? (e.style.display = "block", t.style.display = "none", e.value = currentSelectedMonth, e.max = n, e.onchange = e => {
		currentSelectedMonth = e.target.value, handleMonthChange()
	}) : (e.style.display = "none", t.style.display = "flex", renderDynamicDateControls())
}

function renderDynamicDateControls() {
	let e = document.getElementById("dynamicDateContainer"),
		t = (new Date).getFullYear(),
		l = '<select id="billingMonth_Year" onchange="updateSelectedYear(this.value)">';
	for (let n = t; n >= 2015; n--) l += `<option value="${n}" ${currentSelectedMonth.split("-")[0]==n?"selected":""}>${enToBnNumber(n)}</option>`;
	e.innerHTML = '<span id="monthDropdownContainer"></span>' + l + "</select>", updateMonthOptions()
}

function updateMonthOptions() {
	let e = document.getElementById("monthDropdownContainer"),
		t = new Date,
		l = t.getFullYear(),
		n = t.getMonth(),
		a = parseInt(currentSelectedMonth.split("-")[0]),
		i = '<select id="billingMonth_Month" onchange="updateSelectedMonth(this.value)">';
	["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"].forEach((e, t) => {
		let r = (t + 1).toString().padStart(2, "0");
		i += `<option value="${r}" ${currentSelectedMonth.split("-")[1]==r?"selected":""} ${a===l&&t>n?"disabled":""}>${e}</option>`
	}), e.innerHTML = i + "</select>"
}

function updateSelectedYear(e) {
	currentSelectedMonth = `${e}-${currentSelectedMonth.split("-")[1]||"01"}`, updateMonthOptions()
}

function updateSelectedMonth(e) {
	currentSelectedMonth = `${currentSelectedMonth.split("-")[0]}-${e}`, handleMonthChange()
}

function generatePrintView() {
	let e = currentSelectedMonth,
		t = getBnMonthName(e);
	t.split(" ")[0];
	let l = document.querySelector(".print-only") || document.createElement("div");
	l.className = "print-only", document.querySelector(".print-only") || document.body.appendChild(l), l.innerHTML = "";
	let n = /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
		a = document.createElement("style");
	a.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
    @media print {
        @page { margin: ${n?"5mm":"0mm"} !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .bill-cell { font-family: 'Noto Sans Bengali', sans-serif; line-height: 1.2; color: #000; padding: 3px; border: 1px solid #ccc; }
        .bill-cell h4 { margin: 0 0 2px 0; font-size: 17px !important; font-weight: 500; text-align: center; border-bottom: 2px solid #000; padding-bottom: 3px; }
        .bill-cell p { margin: 3px 0; font-size: 15px !important; font-weight: 500; display: flex; }
        .bill-cell p.total-row { font-size: 16px !important; font-weight: 700 !important; border-top: 1.5px solid #000; margin-top: 2px !important; padding-top: 12px; padding-bottom: 2px; }
    }`, document.head.appendChild(a);
	[tenantIDs.slice(0, 9), tenantIDs.slice(9, 18)].forEach((n, a) => {
		let i = document.createElement("div");
		i.className = "page-container " + (0 === a ? "page-break" : "");
		let r = `<div class="page-header"><h4>ভাড়া ও বিদ্যুৎ বিল : ${t}</h4></div><div class="print-grid">`;
		n.forEach(l => {
			let n = parseFloat(document.getElementById(`currM-${l}`).value) || 0,
				a = parseFloat(document.getElementById(`prevM-${l}`).value) || 0,
				i = parseFloat(document.getElementById(`rent-${l}`).value) || 0,
				d = parseFloat(document.getElementById(`gas-${l}`).value) || 0,
				o = parseFloat(document.getElementById(`lastTotal-${l}`).value) || 0,
				c = parseFloat(document.getElementById(`lastPaid-${l}`).value) || 0,
				s = n - a,
				u = calculateElectricityBill(s),
				p = o - c,
				g = void 0 !== adjustedAdvances && adjustedAdvances[l] ? adjustedAdvances[l] : localStorage.getItem(`adv_${e}_${l}`),
				m = g ? `<p class="adv-note-print">* অ্যাডভান্স ৳${enToBnNumber(g)} বাদ দেয়া হয়েছে।</p>` : "";
			r += `
            <div class="bill-cell">
            <h4>${enToBnNumber(l)} (${t.replace(" - ২০"," - '")}) এর জন্যঃ</h4>
            <p>মাস শেষের মিটার রিডিংঃ ${enToBnNumber(n)}</p>
            <p>মাস শুরুর মিটার রিডিংঃ ${enToBnNumber(a)}</p>
            <p>ব্যবহৃত ইউনিটঃ ${enToBnNumber(s.toFixed(0))}</p>
            <p><strong>বিদ্যুৎ বিল</strong> (স্ল্যাব রেট)<span class="print-justify-span">বঃ</span> <strong>${enToBnNumber(u.toFixed(0))}/-</strong></p>
            <p>মাসিক ভাড়াঃ ${enToBnNumber(i)}/-</p>
            <p>${"6B"===l?"গ্যাস বিল ও সিঁড়ি ঝাড়ু":"সিঁড়ি ঝাড়ু"}ঃ ${enToBnNumber(d)}/-</p>
            <p><strong>আগের মাসের বকেয়াঃ ${enToBnNumber(p.toFixed(0))}৳</strong></p>
            ${m}
            <p class="total-row"><strong>এই মাসে পাওনাঃ ${enToBnNumber((u+i+d+p).toFixed(0))}৳</strong></p>
            <div style="margin-top:10px; font-size:12px; font-style: italic; border-top: 2px dashed #000; padding-top:4px; text-align: center; line-height: 1.3;">
            <strong>প্রতি মাসের ৫ তারিখের মধ্যে কারেন্ট বিলের টাকা বিকাশ করতে হবে। বিকাশ নাম্বারঃ 01944529442 রেফারেন্স(Ref): ${l}</strong>
            </div>
            </div>`
		}), r += "</div>", i.innerHTML = r, l.appendChild(i)
	}), window.print()
}

function getSlabs() {
	let e = [];
	return document.querySelectorAll(".slab-item").forEach(t => {
		let l = t.querySelector(".slab-limit"),
			n = t.querySelector(".slab-rate"),
			a = "Infinity" === l.value ? 1 / 0 : parseInt(l.value),
			i = parseFloat(n.value);
		e.push({
			limit: a,
			rate: i
		})
	}), e
}

function calculateSlabBill(e) {
	let t = getSlabs(),
		l = e,
		n = 0,
		a = [],
		i = 0;
	for (let r = 0; r < t.length; r++) {
		let d = t[r],
			o = Math.min(l, d.limit === 1 / 0 ? 1 / 0 : d.limit - i);
		if (o > 0) {
			let c = o * d.rate;
			n += c, a.push({
				units: o,
				rate: d.rate,
				cost: c
			}), l -= o
		}
		if (i = d.limit, l <= 0) break
	}
	return {
		totalBill: n,
		breakdown: a
	}
}

function generatePrintViewBack() {
	let e = currentSelectedMonth,
		t = getBnMonthName(e),
		l = document.querySelector(".print-only") || document.createElement("div");
	l.innerHTML = "", l.className = "print-only print-back-only", document.querySelector(".print-only") || document.body.appendChild(l);
	let n = getSlabs(),
		a = 0,
		i = `<div class="slab-rate-wrapper">
      <table class="slab-rate-table">
        <tr class="slab-rate-header">
          <td class="text-left">ইউনিট রেঞ্জ</td>
          <td class="text-center" style="width: 20px;">→</td>
          <td class="text-right">রেট</td>
        </tr>`;
	n.forEach(e => {
		let t = e.limit === 1 / 0 ? `${enToBnNumber(a+1)}+` : `${enToBnNumber(0===a?0:a+1)}–${enToBnNumber(e.limit)}`;
		i += `<tr>
          <td class="text-left">${t}</td>
          <td class="text-center" style="width: 20px;">→</td>
          <td class="text-right">${enToBnNumber(e.rate)} ৳</td>
      </tr>`, a = e.limit
	}), i += "</table></div>";
	[tenantIDs.slice(0, 9), tenantIDs.slice(9, 18)].forEach((e, n) => {
		let a = document.createElement("div");
		a.className = "page-container " + (0 === n ? "page-break" : "");
		let r = `<div class="page-header"><h4>${t} এর বিদ্যুৎ বিল বিস্তারিত ভেঙে দেখানোঃ</h4></div><div class="print-grid">`;
		[2, 1, 0, 5, 4, 3, 8, 7, 6].forEach(t => {
			let l = e[t];
			if (l) {
				let n = parseFloat(document.getElementById(`currM-${l}`).value) || 0,
					a = parseFloat(document.getElementById(`prevM-${l}`).value) || 0,
					d = n - a,
					o = calculateSlabBill(d),
					c = `<table class="calc-table">
                                <tr><td colspan="3" class="calc-table-header">স্ল্যাব রেট অনুযায়ী বিদ্যুৎ বিলঃ</td></tr>`;
				o.breakdown.forEach(e => {
					c += `<tr>
                      <td class="text-left">${enToBnNumber(e.units)} × ${enToBnNumber(e.rate)}</td>
                      <td class="text-center" style="width: 20px;">=</td>
                      <td class="text-right">${enToBnNumber(e.cost.toFixed(1))}</td>
                  </tr>`
				}), c += "</table>", r += `
              <div class="bill-cell">
                  ${i}
                  <div class="calc-breakdown-print">
                      ${c}
                      <hr class="calc-divider">
                      <table class="calc-total-table">
                          <tr>
                              <td class="text-left">মোটঃ ${enToBnNumber(d.toFixed(0))} ইউনিট</td>
                              <td class="text-center" style="width: 20px;">=</td>
                              <td class="text-right">${enToBnNumber(o.totalBill.toFixed(0))} ৳</td>
                          </tr>
                      </table>
                  </div>
              </div>`
			} else r += '<div class="bill-cell"></div>'
		}), r += "</div>", a.innerHTML = r, l.appendChild(a)
	}), window.print()
} tenantIDs = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D", "4A", "4B", "4C", "4D", "5A", "5B", "5C", "5D", "6A", "6B"];
db = {},
	savedUnitRate = localStorage.getItem("globalUnitRate") || "8.5";
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxVc2HhrkCu1ttnnWJw5_AqiMxTqgnaGlc3xZxGmLxzzdmQhAj6HwVw6Lrrrtrmz16SOA/exec";
let currentSelectedMonth = "",
	adjustedAdvances = {},
	typeInterval;

function showGlobalLoader(e) {
	let t = document.getElementById("global-loader"),
		l = document.getElementById("loader-text");
	if (t && l) {
		t.style.display = "flex";
		l.textContent = "";
		let n = 0;
		clearInterval(typeInterval);
		typeInterval = setInterval(() => {
			n < e.length ? (l.textContent += e.charAt(n), n++) : l.textContent.length < e.length + 3 ? l.textContent += "." : l.textContent = e
		}, 80)
	}
}

function hideGlobalLoader() {
	let e = document.getElementById("global-loader");
	e && (e.style.display = "none"), clearInterval(typeInterval)
}

function checkPin() {
	"" !== document.getElementById("pin-input").value ? (document.getElementById("login-screen").style.display = "none", loadDataFromSheet()) : alert("দয়া করে পিন দিন!")
}

async function loadDataFromSheet() {
	if (!currentSelectedMonth) {
		let e = new Date;
		currentSelectedMonth = `${e.getFullYear()}-${(e.getMonth()+1).toString().padStart(2,"0")}`
	}
	tenantIDs.forEach(e => {
		let t = 0;
		"1A" === e || "2A" === e || "4A" === e || "5A" === e || "6A" === e ? t = 4000 : "1B" === e || "4B" === e || "6B" === e ? t = 5700 : "2B" === e || "1C" === e || "2C" === e || "4C" === e ? t = 5000 : e.includes("D") ? t = 4500 : ("5B" === e || "5C" === e) && (t = 6000), db[e] = {
			id: e,
			rent: t,
			gas: 0,
			service: e.includes("A") || e.includes("D") ? 50 : 70,
			prevMeter: 0,
			totalLastMonth: 0,
			serverEBill: void 0
		}
	}), init(), handleMonthChange()
}

async function handleMonthChange() {
	let e = currentSelectedMonth,
		t = document.getElementById("pin-input").value;
	showGlobalLoader("সার্ভার থেকে ডাটা লোড করা হচ্ছে...");
	try {
		let l = await (await fetch(`${SHEET_URL}?action=getMonthData&month=${e}&pin=${t}`)).json();
		if (l && l.length > 0) renderDataToUI(l);
		else {
			showGlobalLoader("বর্তমান ডাটা নেই! আগের মাসের ডাটা খোঁজা হচ্ছে...");
			let n = getPreviousMonth(e),
				a = await (await fetch(`${SHEET_URL}?action=getMonthData&month=${n}&pin=${t}`)).json();
			a && a.length > 0 ? (populateFromPrevious(a), showGlobalLoader(`${getBnMonthName(n)} মাসের রিডিং ও ভাড়া অটোমেটিক বসানো হয়েছে...`), await new Promise(e => setTimeout(e, 1500))) : (resetToDefaults(), showGlobalLoader("কোনো পূর্ববর্তী ডাটা পাওয়া যায়নি। ডিফল্ট সেট করা হচ্ছে..."), await new Promise(e => setTimeout(e, 2e3)))
		}
	} catch (i) {
		console.error("Load Error:", i), alert("ডাটা লোড করতে সমস্যা হয়েছে।")
	} finally {
		hideGlobalLoader()
	}
}

function renderDataToUI(e) {
	e.forEach(e => {
		let t = e.id;
		if (document.getElementById(`currM-${t}`)) {
			document.getElementById(`prevM-${t}`).value = e.prevM, document.getElementById(`currM-${t}`).value = e.currM, document.getElementById(`rent-${t}`).value = e.rent, document.getElementById(`gas-${t}`).value = e.service, document.getElementById(`lastTotal-${t}`).value = e.dues || 0, document.getElementById(`lastPaid-${t}`).value = e.paid || 0;
			let l = e.currM - e.prevM,
				n = void 0 !== e.eBill && "" !== e.eBill ? parseFloat(e.eBill).toFixed(0) : calculateElectricityBill(l).toFixed(0);
			db[t] && (db[t].serverEBill = n);
			let a = (parseFloat(e.dues) - parseFloat(e.paid)).toFixed(0);
			updateHeaderLabel(t, l, n, a, e.total)
		}
	})
}

function populateFromPrevious(e) {
	resetToDefaults(), e.forEach(e => {
		let t = e.id;
		document.getElementById(`prevM-${t}`) && (document.getElementById(`prevM-${t}`).value = e.currM), document.getElementById(`lastTotal-${t}`) && (document.getElementById(`lastTotal-${t}`).value = parseFloat(e.total || 0).toFixed(0)), document.getElementById(`rent-${t}`) && (document.getElementById(`rent-${t}`).value = e.rent), document.getElementById(`gas-${t}`) && (document.getElementById(`gas-${t}`).value = e.service), document.getElementById(`label-${t}`) && (document.getElementById(`label-${t}`).innerHTML = "<span class='text-teal'>আগের মাসের ডাটা লোড হয়েছে...</span>")
	})
}

function resetToDefaults() {
	tenantIDs.forEach(e => {
		document.getElementById(`prevM-${e}`) && (document.getElementById(`prevM-${e}`).value = 0), document.getElementById(`currM-${e}`) && (document.getElementById(`currM-${e}`).value = 0), document.getElementById(`lastTotal-${e}`) && (document.getElementById(`lastTotal-${e}`).value = 0), document.getElementById(`lastPaid-${e}`) && (document.getElementById(`lastPaid-${e}`).value = 0), db[e] && (db[e].serverEBill = void 0, document.getElementById(`rent-${e}`) && (document.getElementById(`rent-${e}`).value = db[e].rent), document.getElementById(`gas-${e}`) && (document.getElementById(`gas-${e}`).value = db[e].gas + db[e].service)), document.getElementById(`label-${e}`) && (document.getElementById(`label-${e}`).innerHTML = "ডাটা ইনপুট করুন...")
	})
}

function updateHeaderLabel(e, t, l, n, a) {
	let i = document.getElementById(`label-${e}`);
	i && (i.innerHTML = `
        <span class="label-ebill">E.Bill: ৳${l}, Dues: ৳${n},</span>
        <span class="label-total"> Total: ৳${a}</span>`)
}

function init() {
	setupBillingDate();
	let e = document.getElementById("tenantAccordion");
	e.innerHTML = "", tenantIDs.forEach(t => {
		let l = db[t],
			n = document.createElement("div");
		n.className = "tenant-card", n.innerHTML = `
        <div class="summary-header" onclick="togglePanel('${l.id}')">
            <span>[FLAT: ${l.id}]</span><span id="label-${l.id}" class="header-stats">ডাটা ইনপুট করুন...</span>
        </div>
        <div class="details-panel" id="panel-${l.id}">
            <div class="accord-grid">
                <div class="input-group"><label>পূর্বের মিটার রিডিং:</label><input type="number" id="prevM-${l.id}" value="${l.prevMeter}"></div>
                <div class="input-group"><label>বর্তমান মিটার রিডিং:</label><input type="number" id="currM-${l.id}" value="0"></div>
                <div class="input-group"><label>ভাড়া:</label><input type="number" id="rent-${l.id}" value="${l.rent}"></div>
                <div class="input-group"><label>সার্ভিস:</label><input type="number" id="gas-${l.id}" value="${l.gas+l.service}"></div>
                <div class="input-group"><label>গত মাসের পাওনা:</label><input type="number" id="lastTotal-${l.id}" value="${l.totalLastMonth}"></div>
                <div class="input-group"><label>গত মাসের জমা:</label><input type="number" id="lastPaid-${l.id}" value="0"></div>
            </div>
            <div class="accord-btn">
                <button type="button" class="btn-clear" onclick="clearTenantBalance('${l.id}')">রিসেট (0)</button>
                <button type="button" class="btn-advance" onclick="openAdvanceModal('${l.id}')">⚡ অ্যাডভান্স</button>
                <button type="button" class="btn-paid" onclick="saveDepositEntry('${l.id}')">💰 জমা সেভ</button>
            </div>
        </div>`, e.appendChild(n)
	})
}

function togglePanel(e) {
	let t = document.querySelectorAll(".details-panel"),
		l = document.getElementById(`panel-${e}`);
	t.forEach(e => {
		e !== l && e.classList.remove("active")
	}), l.classList.toggle("active")
}

async function calculateAll() {
    if (!confirm("আপনি কি নিশ্চিত যে হিসাব সেভ করতে চান?")) return;

    let pinElement = document.getElementById("pin-input");
    let pinValue = pinElement ? pinElement.value : "";
    
    showGlobalLoader("সব ফ্ল্যাটের হিসাব তৈরি ও সেভ হচ্ছে...");
    
    let l = [];
    let n = currentSelectedMonth;

    tenantIDs.forEach(e => {
        let t = parseFloat(document.getElementById(`currM-${e}`)?.value) || 0,
            a = parseFloat(document.getElementById(`prevM-${e}`)?.value) || 0,
            i = parseFloat(document.getElementById(`rent-${e}`)?.value) || 0,
            r = parseFloat(document.getElementById(`gas-${e}`)?.value) || 0,
            d = parseFloat(document.getElementById(`lastTotal-${e}`)?.value) || 0,
            o = parseFloat(document.getElementById(`lastPaid-${e}`)?.value) || 0,
            c = t - a,
            s = calculateElectricityBill(c).toFixed(0),
            u = d - o,
            p = (parseFloat(s) + i + r + u).toFixed(0);

        db[e] && (db[e].serverEBill = s);
        updateHeaderLabel(e, c, s, u.toFixed(0), p);
        
        l.push({
            id: e,
            month: n,
            prevM: a,
            currM: t,
            units: c,
            eBill: s,
            rent: i,
            service: r,
            dues: d,
            paid: o,
            total: p
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
                pin: pinValue,
                data: l
            })
        });
        showGlobalLoader("✅ হিসাব সম্পন্ন এবং সার্ভারে সেভ হয়েছে!");
        await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
        alert("সার্ভার এরর!");
    } finally {
        hideGlobalLoader();
    }
}

async function saveDepositEntry(e) {
	let t = document.getElementById("pin-input").value;
	if (!t) {
		alert("আগে পিন নম্বর দিন!");
		return
	}
	if (!confirm(`ফ্ল্যাট ${e}-এর জমা: ৳${document.getElementById(`lastPaid-${e}`).value} সেভ করতে চাচ্ছেন?`)) return;
	showGlobalLoader(`ফ্ল্যাট ${e} এর জমা লিপিবদ্ধ হচ্ছে...`);
	let l = [],
		n = currentSelectedMonth;
	tenantIDs.forEach(e => {
		let t = parseFloat(document.getElementById(`currM-${e}`).value) || 0,
			a = parseFloat(document.getElementById(`prevM-${e}`).value) || 0,
			i = parseFloat(document.getElementById(`rent-${e}`).value) || 0,
			r = parseFloat(document.getElementById(`gas-${e}`).value) || 0,
			d = parseFloat(document.getElementById(`lastTotal-${e}`).value) || 0,
			o = parseFloat(document.getElementById(`lastPaid-${e}`).value) || 0,
			c = t - a,
			s = db[e] && void 0 !== db[e].serverEBill ? parseFloat(db[e].serverEBill) : calculateElectricityBill(c),
			u = (s + i + r + (d - o)).toFixed(0);
		l.push({
			id: e,
			month: n,
			prevM: a,
			currM: t,
			units: c,
			eBill: s.toFixed(0),
			rent: i,
			service: r,
			dues: d,
			paid: o,
			total: u
		})
	});
	try {
		await fetch(SHEET_URL, {
			method: "POST",
			mode: "no-cors",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				pin: t,
				data: l
			})
		}), showGlobalLoader(`✅ জমা সাকসেসফুল!`), await new Promise(e => setTimeout(e, 1500))
	} catch (a) {
		alert("এরর!")
	} finally {
		hideGlobalLoader()
	}
}

async function downloadBackup() {
	if (confirm("আপনি কি সব মাসের ব্যাকআপ ডাটা ডাউনলোড করতে চান?")) {
		showGlobalLoader("ব্যাকআপ ফাইল তৈরি হচ্ছে...");
		try {
			let e = await (await fetch(`${SHEET_URL}?action=getAllData`)).json(),
				t = new Blob([JSON.stringify(e, null, 2)], {
					type: "application/json"
				}),
				l = URL.createObjectURL(t),
				n = document.createElement("a");
			n.href = l, n.download = `Full_Backup_${new Date().toLocaleDateString()}.json`, document.body.appendChild(n), n.click(), document.body.removeChild(n), showGlobalLoader("✅ ডাউনলোড শুরু হয়েছে..."), await new Promise(e => setTimeout(e, 1e3))
		} catch (a) {
			alert("ডাউনলোড এরর! সার্ভার থেকে ডাটা পাওয়া যায়নি।")
		} finally {
			hideGlobalLoader()
		}
	}
}

function importData(e) {
	let t = e.files[0];
	if (!t) return;
	let l = new FileReader;
	l.onload = async function(e) {
		try {
			let t = JSON.parse(e.target.result);
			if (!confirm(`ফাইলে ${t.length} টি এন্ট্রি পাওয়া গেছে। আপলোড করবেন?`)) return;
			let l = document.getElementById("pin-input").value;
			showGlobalLoader("ব্যাকআপ ডাটা সার্ভারে আপলোড হচ্ছে..."), await fetch(SHEET_URL, {
				method: "POST",
				mode: "no-cors",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					pin: l,
					data: t
				})
			}), showGlobalLoader("✅ ব্যাকআপ আপলোড সম্পন্ন! পেজ রিলোড হচ্ছে..."), await new Promise(e => setTimeout(e, 2e3)), location.reload()
		} catch (n) {
			hideGlobalLoader(), alert("ভুল ফাইল ফরম্যাট বা আপলোড এরর!")
		}
	}, l.readAsText(t)
}

function clearTenantBalance(e) {
	confirm(`ফ্ল্যাট ${e}-এর গত মাসের বকেয়া ও জমা কি শূন্য করতে চান?`) && (document.getElementById(`lastTotal-${e}`).value = 0, document.getElementById(`lastPaid-${e}`).value = 0, document.getElementById(`label-${e}`).innerHTML = "<b class='text-danger'>রিসেট করা হয়েছে (সেভ করতে ভুলবেন চিহ্নিত)!</b>")
}

async function resetLastInput() {
	let e = currentSelectedMonth,
		t = document.getElementById("pin-input").value;
	if (confirm(getBnMonthName(e) + " মাসের সব ডাটা শিট থেকে মুছে ফেলতে চান?")) {
		showGlobalLoader("ডাটা মোছা হচ্ছে...");
		try {
			let l = await (await fetch(`${SHEET_URL}?action=deleteLast&month=${e}&pin=${t}`)).text();
			"Success" === l ? (showGlobalLoader("✅ ডাটা সফলভাবে মোছা হয়েছে। রিলোড হচ্ছে..."), await new Promise(e => setTimeout(e, 2e3)), window.location.reload()) : "Unauthorized" === l ? (hideGlobalLoader(), alert("ভুল পিন! ডাটা মোছার অনুমতি নেই।")) : (hideGlobalLoader(), alert("এরর: " + l))
		} catch (n) {
			hideGlobalLoader(), alert("সার্ভার এরর!")
		}
	}
}
window.onload = () => {
	document.getElementById("pin-input") && document.getElementById("pin-input").focus(), document.querySelectorAll(".slab-limit").forEach((e, t, l) => {
		e.addEventListener("input", () => {
			if (t < l.length - 1) {
				let n = document.querySelectorAll(".slab-start")[t + 1],
					a = parseInt(e.value);
				isNaN(a) || (n.textContent = a + 1)
			}
		})
	})
};
let currentAdvanceId = null;

async function openAdvanceModal(e) {
	currentAdvanceId = e, document.getElementById("adv-modal-id").innerText = e, document.getElementById("new-advance-input").value = "", showGlobalLoader("অ্যাডভান্স ব্যালেন্স চেক করা হচ্ছে...");
	try {
		let t = await (await fetch(`${SHEET_URL}?action=getAdvance&id=${e}`)).json();
		document.getElementById("current-advance-display").innerText = t.amount || 0, document.getElementById("advanceModal").style.display = "flex"
	} catch (l) {
		alert("অ্যাডভান্স ডাটা লোড করা যায়নি!")
	} finally {
		hideGlobalLoader()
	}
}

function closeAdvanceModal() {
	document.getElementById("advanceModal").style.display = "none"
}

async function saveAdvanceData() {
	let e = document.getElementById("pin-input").value;
	if (!e) {
		alert("আগে পিন নম্বর দিন!");
		return
	}
	let t = parseFloat(document.getElementById("new-advance-input").value);
	if (isNaN(t)) {
		alert("সঠিক টাকার পরিমাণ দিন!");
		return
	}
	showGlobalLoader("অ্যাডভান্স সেভ হচ্ছে...");
	try {
		await fetch(SHEET_URL, {
			method: "POST",
			body: JSON.stringify({
				pin: e,
				action: "updateAdvance",
				id: currentAdvanceId,
				amount: t
			})
		}), document.getElementById("current-advance-display").innerText = t, document.getElementById("new-advance-input").value = "", showGlobalLoader("✅ অ্যাডভান্স সেভ হয়েছে!"), await new Promise(e => setTimeout(e, 1200))
	} catch (l) {
		alert("সেভ এরর!")
	} finally {
		hideGlobalLoader()
	}
}

async function deductFromTotal() {
	let e = document.getElementById("pin-input").value;
	if (!e) {
		alert("আগে পিন নম্বর দিন!");
		return
	}
	let t = parseFloat(document.getElementById("current-advance-display").innerText);
	if (t <= 0) {
		alert("কাটার মতো কোনো অ্যাডভান্স টাকা নেই!");
		return
	}
	if (confirm(`আপনি কি মোট বিল থেকে ৳${t} কমাতে চান? এটি স্বয়ংক্রিয়ভাবে সার্ভারে সেভ হবে।`)) {
		closeAdvanceModal(), showGlobalLoader(`ফ্ল্যাট ${currentAdvanceId}-এর অ্যাডভান্স অ্যাডজাস্ট ও সেভ হচ্ছে...`);
		try {
			await fetch(SHEET_URL, {
				method: "POST",
				body: JSON.stringify({
					pin: e,
					action: "updateAdvance",
					id: currentAdvanceId,
					amount: 0
				})
			});
			let l = document.getElementById(`lastPaid-${currentAdvanceId}`),
				n = parseFloat(l.value) || 0;
			l.value = n + t, adjustedAdvances[currentAdvanceId] = t, localStorage.setItem(`adv_${currentSelectedMonth}_${currentAdvanceId}`, t), await saveDepositEntryAfterAdvance(currentAdvanceId);
			let a = parseFloat(document.getElementById(`currM-${currentAdvanceId}`).value) || 0,
				i = parseFloat(document.getElementById(`prevM-${currentAdvanceId}`).value) || 0,
				r = parseFloat(document.getElementById(`rent-${currentAdvanceId}`).value) || 0,
				d = parseFloat(document.getElementById(`gas-${currentAdvanceId}`).value) || 0,
				o = parseFloat(document.getElementById(`lastTotal-${currentAdvanceId}`).value) || 0,
				c = parseFloat(l.value),
				s = a - i,
				u = db[currentAdvanceId] && void 0 !== db[currentAdvanceId].serverEBill ? parseFloat(db[currentAdvanceId].serverEBill).toFixed(0) : calculateElectricityBill(s).toFixed(0),
				p = (o - c).toFixed(0),
				g = (parseFloat(u) + r + d + parseFloat(p)).toFixed(0);
			updateHeaderLabel(currentAdvanceId, s, u, p, g), document.getElementById("current-advance-display").innerText = "0", showGlobalLoader(`✅ সফল হয়েছে! ৳${t} অ্যাডজাস্ট করে মোট বিল ৳${g} করা হয়েছে।`), await new Promise(e => setTimeout(e, 2e3))
		} catch (m) {
			console.error(m), alert("সার্ভার এরর!")
		} finally {
			hideGlobalLoader()
		}
	}
}

async function saveDepositEntryAfterAdvance(e) {
	let t = document.getElementById("pin-input").value,
		l = [],
		n = currentSelectedMonth;
	tenantIDs.forEach(e => {
		let t = parseFloat(document.getElementById(`currM-${e}`).value) || 0,
			a = parseFloat(document.getElementById(`prevM-${e}`).value) || 0,
			i = parseFloat(document.getElementById(`rent-${e}`).value) || 0,
			r = parseFloat(document.getElementById(`gas-${e}`).value) || 0,
			d = parseFloat(document.getElementById(`lastTotal-${e}`).value) || 0,
			o = parseFloat(document.getElementById(`lastPaid-${e}`).value) || 0,
			c = t - a,
			s = db[e] && void 0 !== db[e].serverEBill ? parseFloat(db[e].serverEBill) : calculateElectricityBill(c),
			u = (s + i + r + (d - o)).toFixed(0);
		l.push({
			id: e,
			month: n,
			prevM: a,
			currM: t,
			units: c,
			eBill: s.toFixed(0),
			rent: i,
			service: r,
			dues: d,
			paid: o,
			total: u
		})
	}), await fetch(SHEET_URL, {
		method: "POST",
		mode: "no-cors",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			pin: t,
			data: l
		})
	})
}

function calculateElectricityBill(e) {
	if (e <= 0) return 0;
	let t = 0,
		l = e;
	if (l > 0) {
		let n = Math.min(l, 75);
		t += 8.5 * n, l -= n
	}
	if (l > 0) {
		let a = Math.min(l, 75);
		t += 9 * a, l -= a
	}
	if (l > 0) {
		let i = Math.min(l, 75);
		t += 11 * i, l -= i
	}
	if (l > 0) {
		let r = Math.min(l, 75);
		t += 13 * r, l -= r
	}
	if (l > 0) {
		let d = Math.min(l, 75);
		t += 15 * d, l -= d
	}
	return l > 0 && (t += 17.5 * l, l = 0), t
}

function getPreviousMonth(e) {
	let t = new Date(e + "-01");
	t.setMonth(t.getMonth() - 1);
	return `${t.getFullYear()}-${(t.getMonth()+1).toString().padStart(2,"0")}`
}

function getBnMonthName(e) {
	if (!e) return "";
	let [t, l] = e.split("-");
	return `${["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"][parseInt(l)-1]} - ${enToBnNumber(t)}`
}

function enToBnNumber(e) {
	if (null == e) return "০";
	let t = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
	return e.toString().replace(/\d/g, e => t[e])
}

function setupBillingDate() {
	let e = document.getElementById("billingMonth"),
		t = document.getElementById("dynamicDateContainer"),
		l = new Date,
		n = `${l.getFullYear()}-${(l.getMonth()+1).toString().padStart(2,"0")}`;
	/Chrome|Edg/.test(navigator.userAgent) ? (e.style.display = "block", t.style.display = "none", e.value = currentSelectedMonth, e.max = n, e.onchange = e => {
		currentSelectedMonth = e.target.value, handleMonthChange()
	}) : (e.style.display = "none", t.style.display = "flex", renderDynamicDateControls())
}

function renderDynamicDateControls() {
	let e = document.getElementById("dynamicDateContainer"),
		t = (new Date).getFullYear(),
		l = '<select id="billingMonth_Year" onchange="updateSelectedYear(this.value)">';
	for (let n = t; n >= 2015; n--) l += `<option value="${n}" ${currentSelectedMonth.split("-")[0]==n?"selected":""}>${enToBnNumber(n)}</option>`;
	e.innerHTML = '<span id="monthDropdownContainer"></span>' + l + "</select>", updateMonthOptions()
}

function updateMonthOptions() {
	let e = document.getElementById("monthDropdownContainer"),
		t = new Date,
		l = t.getFullYear(),
		n = t.getMonth(),
		a = parseInt(currentSelectedMonth.split("-")[0]),
		i = '<select id="billingMonth_Month" onchange="updateSelectedMonth(this.value)">';
	["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"].forEach((e, t) => {
		let r = (t + 1).toString().padStart(2, "0");
		i += `<option value="${r}" ${currentSelectedMonth.split("-")[1]==r?"selected":""} ${a===l&&t>n?"disabled":""}>${e}</option>`
	}), e.innerHTML = i + "</select>"
}

function updateSelectedYear(e) {
	currentSelectedMonth = `${e}-${currentSelectedMonth.split("-")[1]||"01"}`, updateMonthOptions()
}

function updateSelectedMonth(e) {
	currentSelectedMonth = `${currentSelectedMonth.split("-")[0]}-${e}`, handleMonthChange()
}

function generatePrintView() {
	let e = currentSelectedMonth,
		t = getBnMonthName(e);
	t.split(" ")[0];
	let l = document.querySelector(".print-only") || document.createElement("div");
	l.className = "print-only", document.querySelector(".print-only") || document.body.appendChild(l), l.innerHTML = "";
	let n = /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
		a = document.createElement("style");
	a.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
    @media print {
        @page { margin: ${n?"5mm":"0mm"} !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .bill-cell { font-family: 'Noto Sans Bengali', sans-serif; line-height: 1.2; color: #000; padding: 3px; border: 1px solid #ccc; }
        .bill-cell h4 { margin: 0 0 2px 0; font-size: 17px !important; font-weight: 500; text-align: center; border-bottom: 2px solid #000; padding-bottom: 3px; }
        .bill-cell p { margin: 3px 0; font-size: 15px !important; font-weight: 500; display: flex; }
        .bill-cell p.total-row { font-size: 16px !important; font-weight: 700 !important; border-top: 1.5px solid #000; margin-top: 2px !important; padding-top: 12px; padding-bottom: 2px; }
    }`, document.head.appendChild(a);
	[tenantIDs.slice(0, 9), tenantIDs.slice(9, 18)].forEach((n, a) => {
		let i = document.createElement("div");
		i.className = "page-container " + (0 === a ? "page-break" : "");
		let r = `<div class="page-header"><h4>ভাড়া ও বিদ্যুৎ বিল : ${t}</h4></div><div class="print-grid">`;
		n.forEach(l => {
			let n = parseFloat(document.getElementById(`currM-${l}`).value) || 0,
				a = parseFloat(document.getElementById(`prevM-${l}`).value) || 0,
				i = parseFloat(document.getElementById(`rent-${l}`).value) || 0,
				d = parseFloat(document.getElementById(`gas-${l}`).value) || 0,
				o = parseFloat(document.getElementById(`lastTotal-${l}`).value) || 0,
				c = parseFloat(document.getElementById(`lastPaid-${l}`).value) || 0,
				s = n - a,
				u = calculateElectricityBill(s),
				p = o - c,
				g = void 0 !== adjustedAdvances && adjustedAdvances[l] ? adjustedAdvances[l] : localStorage.getItem(`adv_${e}_${l}`),
				m = g ? `<p class="adv-note-print">* অ্যাডভান্স ৳${enToBnNumber(g)} বাদ দেয়া হয়েছে।</p>` : "";
			r += `
            <div class="bill-cell">
            <h4>${enToBnNumber(l)} (${t.replace(" - ২০"," - '")}) এর জন্যঃ</h4>
            <p>মাস শেষের মিটার রিডিংঃ ${enToBnNumber(n)}</p>
            <p>মাস শুরুর মিটার রিডিংঃ ${enToBnNumber(a)}</p>
            <p>ব্যবহৃত ইউনিটঃ ${enToBnNumber(s.toFixed(0))}</p>
            <p><strong>বিদ্যুৎ বিল</strong> (স্ল্যাব রেট)<span class="print-justify-span">বঃ</span> <strong>${enToBnNumber(u.toFixed(0))}/-</strong></p>
            <p>মাসিক ভাড়াঃ ${enToBnNumber(i)}/-</p>
            <p>${"6B"===l?"গ্যাস বিল ও সিঁড়ি ঝাড়ু":"সিঁড়ি ঝাড়ু"}ঃ ${enToBnNumber(d)}/-</p>
            <p><strong>আগের মাসের বকেয়াঃ ${enToBnNumber(p.toFixed(0))}৳</strong></p>
            ${m}
            <p class="total-row"><strong>এই মাসে পাওনাঃ ${enToBnNumber((u+i+d+p).toFixed(0))}৳</strong></p>
            <div style="margin-top:10px; font-size:12px; font-style: italic; border-top: 2px dashed #000; padding-top:4px; text-align: center; line-height: 1.3;">
            <strong>প্রতি মাসের ৫ তারিখের মধ্যে কারেন্ট বিলের টাকা বিকাশ করতে হবে। বিকাশ নাম্বারঃ 01944529442 রেফারেন্স(Ref): ${l}</strong>
            </div>
            </div>`
		}), r += "</div>", i.innerHTML = r, l.appendChild(i)
	}), window.print()
}

function getSlabs() {
	let e = [];
	return document.querySelectorAll(".slab-item").forEach(t => {
		let l = t.querySelector(".slab-limit"),
			n = t.querySelector(".slab-rate"),
			a = "Infinity" === l.value ? 1 / 0 : parseInt(l.value),
			i = parseFloat(n.value);
		e.push({
			limit: a,
			rate: i
		})
	}), e
}

function calculateSlabBill(e) {
	let t = getSlabs(),
		l = e,
		n = 0,
		a = [],
		i = 0;
	for (let r = 0; r < t.length; r++) {
		let d = t[r],
			o = Math.min(l, d.limit === 1 / 0 ? 1 / 0 : d.limit - i);
		if (o > 0) {
			let c = o * d.rate;
			n += c, a.push({
				units: o,
				rate: d.rate,
				cost: c
			}), l -= o
		}
		if (i = d.limit, l <= 0) break
	}
	return {
		totalBill: n,
		breakdown: a
	}
}

function generatePrintViewBack() {
	let e = currentSelectedMonth,
		t = getBnMonthName(e),
		l = document.querySelector(".print-only") || document.createElement("div");
	l.innerHTML = "", l.className = "print-only print-back-only", document.querySelector(".print-only") || document.body.appendChild(l);
	let n = getSlabs(),
		a = 0,
		i = `<div class="slab-rate-wrapper">
      <table class="slab-rate-table">
        <tr class="slab-rate-header">
          <td class="text-left">ইউনিট রেঞ্জ</td>
          <td class="text-center" style="width: 20px;">→</td>
          <td class="text-right">রেট</td>
        </tr>`;
	n.forEach(e => {
		let t = e.limit === 1 / 0 ? `${enToBnNumber(a+1)}+` : `${enToBnNumber(0===a?0:a+1)}–${enToBnNumber(e.limit)}`;
		i += `<tr>
          <td class="text-left">${t}</td>
          <td class="text-center" style="width: 20px;">→</td>
          <td class="text-right">${enToBnNumber(e.rate)} ৳</td>
      </tr>`, a = e.limit
	}), i += "</table></div>";
	[tenantIDs.slice(0, 9), tenantIDs.slice(9, 18)].forEach((e, n) => {
		let a = document.createElement("div");
		a.className = "page-container " + (0 === n ? "page-break" : "");
		let r = `<div class="page-header"><h4>${t} এর বিদ্যুৎ বিল বিস্তারিত ভেঙে দেখানোঃ</h4></div><div class="print-grid">`;
		[2, 1, 0, 5, 4, 3, 8, 7, 6].forEach(t => {
			let l = e[t];
			if (l) {
				let n = parseFloat(document.getElementById(`currM-${l}`).value) || 0,
					a = parseFloat(document.getElementById(`prevM-${l}`).value) || 0,
					d = n - a,
					o = calculateSlabBill(d),
					c = `<table class="calc-table">
                                <tr><td colspan="3" class="calc-table-header">স্ল্যাব রেট অনুযায়ী বিদ্যুৎ বিলঃ</td></tr>`;
				o.breakdown.forEach(e => {
					c += `<tr>
                      <td class="text-left">${enToBnNumber(e.units)} × ${enToBnNumber(e.rate)}</td>
                      <td class="text-center" style="width: 20px;">=</td>
                      <td class="text-right">${enToBnNumber(e.cost.toFixed(1))}</td>
                  </tr>`
				}), c += "</table>", r += `
              <div class="bill-cell">
                  ${i}
                  <div class="calc-breakdown-print">
                      ${c}
                      <hr class="calc-divider">
                      <table class="calc-total-table">
                          <tr>
                              <td class="text-left">মোটঃ ${enToBnNumber(d.toFixed(0))} ইউনিট</td>
                              <td class="text-center" style="width: 20px;">=</td>
                              <td class="text-right">${enToBnNumber(o.totalBill.toFixed(0))} ৳</td>
                          </tr>
                      </table>
                  </div>
              </div>`
			} else r += '<div class="bill-cell"></div>'
		}), r += "</div>", a.innerHTML = r, l.appendChild(a)
	}), window.print()
}const tenantIDs = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D", "4A", "4B", "4C", "4D", "5A", "5B", "5C", "5D", "6A", "6B"];
let db = {},
	savedUnitRate = localStorage.getItem("globalUnitRate") || "8.5";
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxVc2HhrkCu1ttnnWJw5_AqiMxTqgnaGlc3xZxGmLxzzdmQhAj6HwVw6Lrrrtrmz16SOA/exec";
let currentSelectedMonth = "",
	adjustedAdvances = {},
	typeInterval;

function showGlobalLoader(e) {
	let t = document.getElementById("global-loader"),
		l = document.getElementById("loader-text");
	if (t && l) {
		t.style.display = "flex";
		l.textContent = "";
		let n = 0;
		clearInterval(typeInterval);
		typeInterval = setInterval(() => {
			n < e.length ? (l.textContent += e.charAt(n), n++) : l.textContent.length < e.length + 3 ? l.textContent += "." : l.textContent = e
		}, 80)
	}
}

function hideGlobalLoader() {
	let e = document.getElementById("global-loader");
	e && (e.style.display = "none"), clearInterval(typeInterval)
}

function checkPin() {
	"" !== document.getElementById("pin-input").value ? (document.getElementById("login-screen").style.display = "none", loadDataFromSheet()) : alert("দয়া করে পিন দিন!")
}

async function loadDataFromSheet() {
	if (!currentSelectedMonth) {
		let e = new Date;
		currentSelectedMonth = `${e.getFullYear()}-${(e.getMonth()+1).toString().padStart(2,"0")}`
	}
	tenantIDs.forEach(e => {
		let t = 0;
		"1A" === e || "2A" === e || "4A" === e || "5A" === e || "6A" === e ? t = 4000 : "1B" === e || "4B" === e || "6B" === e ? t = 5700 : "2B" === e || "1C" === e || "2C" === e || "4C" === e ? t = 5000 : e.includes("D") ? t = 4500 : ("5B" === e || "5C" === e) && (t = 6000), db[e] = {
			id: e,
			rent: t,
			gas: 0,
			service: e.includes("A") || e.includes("D") ? 50 : 70,
			prevMeter: 0,
			totalLastMonth: 0,
			serverEBill: void 0
		}
	}), init(), handleMonthChange()
}

async function handleMonthChange() {
	let e = currentSelectedMonth,
		t = document.getElementById("pin-input").value;
	showGlobalLoader("সার্ভার থেকে ডাটা লোড করা হচ্ছে...");
	try {
		let l = await (await fetch(`${SHEET_URL}?action=getMonthData&month=${e}&pin=${t}`)).json();
		if (l && l.length > 0) renderDataToUI(l);
		else {
			showGlobalLoader("বর্তমান ডাটা নেই! আগের মাসের ডাটা খোঁজা হচ্ছে...");
			let n = getPreviousMonth(e),
				a = await (await fetch(`${SHEET_URL}?action=getMonthData&month=${n}&pin=${t}`)).json();
			a && a.length > 0 ? (populateFromPrevious(a), showGlobalLoader(`${getBnMonthName(n)} মাসের রিডিং ও ভাড়া অটোমেটিক বসানো হয়েছে...`), await new Promise(e => setTimeout(e, 1500))) : (resetToDefaults(), showGlobalLoader("কোনো পূর্ববর্তী ডাটা পাওয়া যায়নি। ডিফল্ট সেট করা হচ্ছে..."), await new Promise(e => setTimeout(e, 2e3)))
		}
	} catch (i) {
		console.error("Load Error:", i), alert("ডাটা লোড করতে সমস্যা হয়েছে।")
	} finally {
		hideGlobalLoader()
	}
}

function renderDataToUI(e) {
	e.forEach(e => {
		let t = e.id;
		if (document.getElementById(`currM-${t}`)) {
			document.getElementById(`prevM-${t}`).value = e.prevM, document.getElementById(`currM-${t}`).value = e.currM, document.getElementById(`rent-${t}`).value = e.rent, document.getElementById(`gas-${t}`).value = e.service, document.getElementById(`lastTotal-${t}`).value = e.dues || 0, document.getElementById(`lastPaid-${t}`).value = e.paid || 0;
			let l = e.currM - e.prevM,
				n = void 0 !== e.eBill && "" !== e.eBill ? parseFloat(e.eBill).toFixed(0) : calculateElectricityBill(l).toFixed(0);
			db[t] && (db[t].serverEBill = n);
			let a = (parseFloat(e.dues) - parseFloat(e.paid)).toFixed(0);
			updateHeaderLabel(t, l, n, a, e.total)
		}
	})
}

function populateFromPrevious(e) {
	resetToDefaults(), e.forEach(e => {
		let t = e.id;
		document.getElementById(`prevM-${t}`) && (document.getElementById(`prevM-${t}`).value = e.currM), document.getElementById(`lastTotal-${t}`) && (document.getElementById(`lastTotal-${t}`).value = parseFloat(e.total || 0).toFixed(0)), document.getElementById(`rent-${t}`) && (document.getElementById(`rent-${t}`).value = e.rent), document.getElementById(`gas-${t}`) && (document.getElementById(`gas-${t}`).value = e.service), document.getElementById(`label-${t}`) && (document.getElementById(`label-${t}`).innerHTML = "<span class='text-teal'>আগের মাসের ডাটা লোড হয়েছে...</span>")
	})
}

function resetToDefaults() {
	tenantIDs.forEach(e => {
		document.getElementById(`prevM-${e}`) && (document.getElementById(`prevM-${e}`).value = 0), document.getElementById(`currM-${e}`) && (document.getElementById(`currM-${e}`).value = 0), document.getElementById(`lastTotal-${e}`) && (document.getElementById(`lastTotal-${e}`).value = 0), document.getElementById(`lastPaid-${e}`) && (document.getElementById(`lastPaid-${e}`).value = 0), db[e] && (db[e].serverEBill = void 0, document.getElementById(`rent-${e}`) && (document.getElementById(`rent-${e}`).value = db[e].rent), document.getElementById(`gas-${e}`) && (document.getElementById(`gas-${e}`).value = db[e].gas + db[e].service)), document.getElementById(`label-${e}`) && (document.getElementById(`label-${e}`).innerHTML = "ডাটা ইনপুট করুন...")
	})
}

function updateHeaderLabel(e, t, l, n, a) {
	let i = document.getElementById(`label-${e}`);
	i && (i.innerHTML = `
        <span class="label-ebill">E.Bill: ৳${l}, Dues: ৳${n},</span>
        <span class="label-total"> Total: ৳${a}</span>`)
}

function init() {
	setupBillingDate();
	let e = document.getElementById("tenantAccordion");
	e.innerHTML = "", tenantIDs.forEach(t => {
		let l = db[t],
			n = document.createElement("div");
		n.className = "tenant-card", n.innerHTML = `
        <div class="summary-header" onclick="togglePanel('${l.id}')">
            <span>[FLAT: ${l.id}]</span><span id="label-${l.id}" class="header-stats">ডাটা ইনপুট করুন...</span>
        </div>
        <div class="details-panel" id="panel-${l.id}">
            <div class="accord-grid">
                <div class="input-group"><label>পূর্বের মিটার রিডিং:</label><input type="number" id="prevM-${l.id}" value="${l.prevMeter}"></div>
                <div class="input-group"><label>বর্তমান মিটার রিডিং:</label><input type="number" id="currM-${l.id}" value="0"></div>
                <div class="input-group"><label>ভাড়া:</label><input type="number" id="rent-${l.id}" value="${l.rent}"></div>
                <div class="input-group"><label>সার্ভিস:</label><input type="number" id="gas-${l.id}" value="${l.gas+l.service}"></div>
                <div class="input-group"><label>গত মাসের পাওনা:</label><input type="number" id="lastTotal-${l.id}" value="${l.totalLastMonth}"></div>
                <div class="input-group"><label>গত মাসের জমা:</label><input type="number" id="lastPaid-${l.id}" value="0"></div>
            </div>
            <div class="accord-btn">
                <button type="button" class="btn-clear" onclick="clearTenantBalance('${l.id}')">রিসেট (0)</button>
                <button type="button" class="btn-advance" onclick="openAdvanceModal('${l.id}')">⚡ অ্যাডভান্স</button>
                <button type="button" class="btn-paid" onclick="saveDepositEntry('${l.id}')">💰 জমা সেভ</button>
            </div>
        </div>`, e.appendChild(n)
	})
}

function togglePanel(e) {
	let t = document.querySelectorAll(".details-panel"),
		l = document.getElementById(`panel-${e}`);
	t.forEach(e => {
		e !== l && e.classList.remove("active")
	}), l.classList.toggle("active")
}

async function calculateAll() {
    if (!confirm("আপনি কি নিশ্চিত যে হিসাব সেভ করতে চান?")) return;

    let pinElement = document.getElementById("pin-input");
    let pinValue = pinElement ? pinElement.value : "";
    
    showGlobalLoader("সব ফ্ল্যাটের হিসাব তৈরি ও সেভ হচ্ছে...");
    
    let l = [];
    let n = currentSelectedMonth;

    tenantIDs.forEach(e => {
        let t = parseFloat(document.getElementById(`currM-${e}`)?.value) || 0,
            a = parseFloat(document.getElementById(`prevM-${e}`)?.value) || 0,
            i = parseFloat(document.getElementById(`rent-${e}`)?.value) || 0,
            r = parseFloat(document.getElementById(`gas-${e}`)?.value) || 0,
            d = parseFloat(document.getElementById(`lastTotal-${e}`)?.value) || 0,
            o = parseFloat(document.getElementById(`lastPaid-${e}`)?.value) || 0,
            c = t - a,
            s = calculateElectricityBill(c).toFixed(0),
            u = d - o,
            p = (parseFloat(s) + i + r + u).toFixed(0);

        db[e] && (db[e].serverEBill = s);
        updateHeaderLabel(e, c, s, u.toFixed(0), p);
        
        l.push({
            id: e,
            month: n,
            prevM: a,
            currM: t,
            units: c,
            eBill: s,
            rent: i,
            service: r,
            dues: d,
            paid: o,
            total: p
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
                pin: pinValue,
                data: l
            })
        });
        showGlobalLoader("✅ হিসাব সম্পন্ন এবং সার্ভারে সেভ হয়েছে!");
        await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
        alert("সার্ভার এরর!");
    } finally {
        hideGlobalLoader();
    }
}

async function saveDepositEntry(e) {
	let t = document.getElementById("pin-input").value;
	if (!t) {
		alert("আগে পিন নম্বর দিন!");
		return
	}
	if (!confirm(`ফ্ল্যাট ${e}-এর জমা: ৳${document.getElementById(`lastPaid-${e}`).value} সেভ করতে চাচ্ছেন?`)) return;
	showGlobalLoader(`ফ্ল্যাট ${e} এর জমা লিপিবদ্ধ হচ্ছে...`);
	let l = [],
		n = currentSelectedMonth;
	tenantIDs.forEach(e => {
		let t = parseFloat(document.getElementById(`currM-${e}`).value) || 0,
			a = parseFloat(document.getElementById(`prevM-${e}`).value) || 0,
			i = parseFloat(document.getElementById(`rent-${e}`).value) || 0,
			r = parseFloat(document.getElementById(`gas-${e}`).value) || 0,
			d = parseFloat(document.getElementById(`lastTotal-${e}`).value) || 0,
			o = parseFloat(document.getElementById(`lastPaid-${e}`).value) || 0,
			c = t - a,
			s = db[e] && void 0 !== db[e].serverEBill ? parseFloat(db[e].serverEBill) : calculateElectricityBill(c),
			u = (s + i + r + (d - o)).toFixed(0);
		l.push({
			id: e,
			month: n,
			prevM: a,
			currM: t,
			units: c,
			eBill: s.toFixed(0),
			rent: i,
			service: r,
			dues: d,
			paid: o,
			total: u
		})
	});
	try {
		await fetch(SHEET_URL, {
			method: "POST",
			mode: "no-cors",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				pin: t,
				data: l
			})
		}), showGlobalLoader(`✅ জমা সাকসেসফুল!`), await new Promise(e => setTimeout(e, 1500))
	} catch (a) {
		alert("এরর!")
	} finally {
		hideGlobalLoader()
	}
}

async function downloadBackup() {
	if (confirm("আপনি কি সব মাসের ব্যাকআপ ডাটা ডাউনলোড করতে চান?")) {
		showGlobalLoader("ব্যাকআপ ফাইল তৈরি হচ্ছে...");
		try {
			let e = await (await fetch(`${SHEET_URL}?action=getAllData`)).json(),
				t = new Blob([JSON.stringify(e, null, 2)], {
					type: "application/json"
				}),
				l = URL.createObjectURL(t),
				n = document.createElement("a");
			n.href = l, n.download = `Full_Backup_${new Date().toLocaleDateString()}.json`, document.body.appendChild(n), n.click(), document.body.removeChild(n), showGlobalLoader("✅ ডাউনলোড শুরু হয়েছে..."), await new Promise(e => setTimeout(e, 1e3))
		} catch (a) {
			alert("ডাউনলোড এরর! সার্ভার থেকে ডাটা পাওয়া যায়নি।")
		} finally {
			hideGlobalLoader()
		}
	}
}

function importData(e) {
	let t = e.files[0];
	if (!t) return;
	let l = new FileReader;
	l.onload = async function(e) {
		try {
			let t = JSON.parse(e.target.result);
			if (!confirm(`ফাইলে ${t.length} টি এন্ট্রি পাওয়া গেছে। আপলোড করবেন?`)) return;
			let l = document.getElementById("pin-input").value;
			showGlobalLoader("ব্যাকআপ ডাটা সার্ভারে আপলোড হচ্ছে..."), await fetch(SHEET_URL, {
				method: "POST",
				mode: "no-cors",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					pin: l,
					data: t
				})
			}), showGlobalLoader("✅ ব্যাকআপ আপলোড সম্পন্ন! পেজ রিলোড হচ্ছে..."), await new Promise(e => setTimeout(e, 2e3)), location.reload()
		} catch (n) {
			hideGlobalLoader(), alert("ভুল ফাইল ফরম্যাট বা আপলোড এরর!")
		}
	}, l.readAsText(t)
}

function clearTenantBalance(e) {
	confirm(`ফ্ল্যাট ${e}-এর গত মাসের বকেয়া ও জমা কি শূন্য করতে চান?`) && (document.getElementById(`lastTotal-${e}`).value = 0, document.getElementById(`lastPaid-${e}`).value = 0, document.getElementById(`label-${e}`).innerHTML = "<b class='text-danger'>রিসেট করা হয়েছে (সেভ করতে ভুলবেন চিহ্নিত)!</b>")
}

async function resetLastInput() {
	let e = currentSelectedMonth,
		t = document.getElementById("pin-input").value;
	if (confirm(getBnMonthName(e) + " মাসের সব ডাটা শিট থেকে মুছে ফেলতে চান?")) {
		showGlobalLoader("ডাটা মোছা হচ্ছে...");
		try {
			let l = await (await fetch(`${SHEET_URL}?action=deleteLast&month=${e}&pin=${t}`)).text();
			"Success" === l ? (showGlobalLoader("✅ ডাটা সফলভাবে মোছা হয়েছে। রিলোড হচ্ছে..."), await new Promise(e => setTimeout(e, 2e3)), window.location.reload()) : "Unauthorized" === l ? (hideGlobalLoader(), alert("ভুল পিন! ডাটা মোছার অনুমতি নেই।")) : (hideGlobalLoader(), alert("এরর: " + l))
		} catch (n) {
			hideGlobalLoader(), alert("সার্ভার এরর!")
		}
	}
}
window.onload = () => {
	document.getElementById("pin-input") && document.getElementById("pin-input").focus(), document.querySelectorAll(".slab-limit").forEach((e, t, l) => {
		e.addEventListener("input", () => {
			if (t < l.length - 1) {
				let n = document.querySelectorAll(".slab-start")[t + 1],
					a = parseInt(e.value);
				isNaN(a) || (n.textContent = a + 1)
			}
		})
	})
};
let currentAdvanceId = null;

async function openAdvanceModal(e) {
	currentAdvanceId = e, document.getElementById("adv-modal-id").innerText = e, document.getElementById("new-advance-input").value = "", showGlobalLoader("অ্যাডভান্স ব্যালেন্স চেক করা হচ্ছে...");
	try {
		let t = await (await fetch(`${SHEET_URL}?action=getAdvance&id=${e}`)).json();
		document.getElementById("current-advance-display").innerText = t.amount || 0, document.getElementById("advanceModal").style.display = "flex"
	} catch (l) {
		alert("অ্যাডভান্স ডাটা লোড করা যায়নি!")
	} finally {
		hideGlobalLoader()
	}
}

function closeAdvanceModal() {
	document.getElementById("advanceModal").style.display = "none"
}

async function saveAdvanceData() {
	let e = document.getElementById("pin-input").value;
	if (!e) {
		alert("আগে পিন নম্বর দিন!");
		return
	}
	let t = parseFloat(document.getElementById("new-advance-input").value);
	if (isNaN(t)) {
		alert("সঠিক টাকার পরিমাণ দিন!");
		return
	}
	showGlobalLoader("অ্যাডভান্স সেভ হচ্ছে...");
	try {
		await fetch(SHEET_URL, {
			method: "POST",
			body: JSON.stringify({
				pin: e,
				action: "updateAdvance",
				id: currentAdvanceId,
				amount: t
			})
		}), document.getElementById("current-advance-display").innerText = t, document.getElementById("new-advance-input").value = "", showGlobalLoader("✅ অ্যাডভান্স সেভ হয়েছে!"), await new Promise(e => setTimeout(e, 1200))
	} catch (l) {
		alert("সেভ এরর!")
	} finally {
		hideGlobalLoader()
	}
}

async function deductFromTotal() {
	let e = document.getElementById("pin-input").value;
	if (!e) {
		alert("আগে পিন নম্বর দিন!");
		return
	}
	let t = parseFloat(document.getElementById("current-advance-display").innerText);
	if (t <= 0) {
		alert("কাটার মতো কোনো অ্যাডভান্স টাকা নেই!");
		return
	}
	if (confirm(`আপনি কি মোট বিল থেকে ৳${t} কমাতে চান? এটি স্বয়ংক্রিয়ভাবে সার্ভারে সেভ হবে।`)) {
		closeAdvanceModal(), showGlobalLoader(`ফ্ল্যাট ${currentAdvanceId}-এর অ্যাডভান্স অ্যাডজাস্ট ও সেভ হচ্ছে...`);
		try {
			await fetch(SHEET_URL, {
				method: "POST",
				body: JSON.stringify({
					pin: e,
					action: "updateAdvance",
					id: currentAdvanceId,
					amount: 0
				})
			});
			let l = document.getElementById(`lastPaid-${currentAdvanceId}`),
				n = parseFloat(l.value) || 0;
			l.value = n + t, adjustedAdvances[currentAdvanceId] = t, localStorage.setItem(`adv_${currentSelectedMonth}_${currentAdvanceId}`, t), await saveDepositEntryAfterAdvance(currentAdvanceId);
			let a = parseFloat(document.getElementById(`currM-${currentAdvanceId}`).value) || 0,
				i = parseFloat(document.getElementById(`prevM-${currentAdvanceId}`).value) || 0,
				r = parseFloat(document.getElementById(`rent-${currentAdvanceId}`).value) || 0,
				d = parseFloat(document.getElementById(`gas-${currentAdvanceId}`).value) || 0,
				o = parseFloat(document.getElementById(`lastTotal-${currentAdvanceId}`).value) || 0,
				c = parseFloat(l.value),
				s = a - i,
				u = db[currentAdvanceId] && void 0 !== db[currentAdvanceId].serverEBill ? parseFloat(db[currentAdvanceId].serverEBill).toFixed(0) : calculateElectricityBill(s).toFixed(0),
				p = (o - c).toFixed(0),
				g = (parseFloat(u) + r + d + parseFloat(p)).toFixed(0);
			updateHeaderLabel(currentAdvanceId, s, u, p, g), document.getElementById("current-advance-display").innerText = "0", showGlobalLoader(`✅ সফল হয়েছে! ৳${t} অ্যাডজাস্ট করে মোট বিল ৳${g} করা হয়েছে।`), await new Promise(e => setTimeout(e, 2e3))
		} catch (m) {
			console.error(m), alert("সার্ভার এরর!")
		} finally {
			hideGlobalLoader()
		}
	}
}

async function saveDepositEntryAfterAdvance(e) {
	let t = document.getElementById("pin-input").value,
		l = [],
		n = currentSelectedMonth;
	tenantIDs.forEach(e => {
		let t = parseFloat(document.getElementById(`currM-${e}`).value) || 0,
			a = parseFloat(document.getElementById(`prevM-${e}`).value) || 0,
			i = parseFloat(document.getElementById(`rent-${e}`).value) || 0,
			r = parseFloat(document.getElementById(`gas-${e}`).value) || 0,
			d = parseFloat(document.getElementById(`lastTotal-${e}`).value) || 0,
			o = parseFloat(document.getElementById(`lastPaid-${e}`).value) || 0,
			c = t - a,
			s = db[e] && void 0 !== db[e].serverEBill ? parseFloat(db[e].serverEBill) : calculateElectricityBill(c),
			u = (s + i + r + (d - o)).toFixed(0);
		l.push({
			id: e,
			month: n,
			prevM: a,
			currM: t,
			units: c,
			eBill: s.toFixed(0),
			rent: i,
			service: r,
			dues: d,
			paid: o,
			total: u
		})
	}), await fetch(SHEET_URL, {
		method: "POST",
		mode: "no-cors",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			pin: t,
			data: l
		})
	})
}

function calculateElectricityBill(e) {
	if (e <= 0) return 0;
	let t = 0,
		l = e;
	if (l > 0) {
		let n = Math.min(l, 75);
		t += 8.5 * n, l -= n
	}
	if (l > 0) {
		let a = Math.min(l, 75);
		t += 9 * a, l -= a
	}
	if (l > 0) {
		let i = Math.min(l, 75);
		t += 11 * i, l -= i
	}
	if (l > 0) {
		let r = Math.min(l, 75);
		t += 13 * r, l -= r
	}
	if (l > 0) {
		let d = Math.min(l, 75);
		t += 15 * d, l -= d
	}
	return l > 0 && (t += 17.5 * l, l = 0), t
}

function getPreviousMonth(e) {
	let t = new Date(e + "-01");
	t.setMonth(t.getMonth() - 1);
	return `${t.getFullYear()}-${(t.getMonth()+1).toString().padStart(2,"0")}`
}

function getBnMonthName(e) {
	if (!e) return "";
	let [t, l] = e.split("-");
	return `${["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"][parseInt(l)-1]} - ${enToBnNumber(t)}`
}

function enToBnNumber(e) {
	if (null == e) return "০";
	let t = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
	return e.toString().replace(/\d/g, e => t[e])
}

function setupBillingDate() {
	let e = document.getElementById("billingMonth"),
		t = document.getElementById("dynamicDateContainer"),
		l = new Date,
		n = `${l.getFullYear()}-${(l.getMonth()+1).toString().padStart(2,"0")}`;
	/Chrome|Edg/.test(navigator.userAgent) ? (e.style.display = "block", t.style.display = "none", e.value = currentSelectedMonth, e.max = n, e.onchange = e => {
		currentSelectedMonth = e.target.value, handleMonthChange()
	}) : (e.style.display = "none", t.style.display = "flex", renderDynamicDateControls())
}

function renderDynamicDateControls() {
	let e = document.getElementById("dynamicDateContainer"),
		t = (new Date).getFullYear(),
		l = '<select id="billingMonth_Year" onchange="updateSelectedYear(this.value)">';
	for (let n = t; n >= 2015; n--) l += `<option value="${n}" ${currentSelectedMonth.split("-")[0]==n?"selected":""}>${enToBnNumber(n)}</option>`;
	e.innerHTML = '<span id="monthDropdownContainer"></span>' + l + "</select>", updateMonthOptions()
}

function updateMonthOptions() {
	let e = document.getElementById("monthDropdownContainer"),
		t = new Date,
		l = t.getFullYear(),
		n = t.getMonth(),
		a = parseInt(currentSelectedMonth.split("-")[0]),
		i = '<select id="billingMonth_Month" onchange="updateSelectedMonth(this.value)">';
	["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"].forEach((e, t) => {
		let r = (t + 1).toString().padStart(2, "0");
		i += `<option value="${r}" ${currentSelectedMonth.split("-")[1]==r?"selected":""} ${a===l&&t>n?"disabled":""}>${e}</option>`
	}), e.innerHTML = i + "</select>"
}

function updateSelectedYear(e) {
	currentSelectedMonth = `${e}-${currentSelectedMonth.split("-")[1]||"01"}`, updateMonthOptions()
}

function updateSelectedMonth(e) {
	currentSelectedMonth = `${currentSelectedMonth.split("-")[0]}-${e}`, handleMonthChange()
}

function generatePrintView() {
	let e = currentSelectedMonth,
		t = getBnMonthName(e);
	t.split(" ")[0];
	let l = document.querySelector(".print-only") || document.createElement("div");
	l.className = "print-only", document.querySelector(".print-only") || document.body.appendChild(l), l.innerHTML = "";
	let n = /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
		a = document.createElement("style");
	a.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
    @media print {
        @page { margin: ${n?"5mm":"0mm"} !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .bill-cell { font-family: 'Noto Sans Bengali', sans-serif; line-height: 1.2; color: #000; padding: 3px; border: 1px solid #ccc; }
        .bill-cell h4 { margin: 0 0 2px 0; font-size: 17px !important; font-weight: 500; text-align: center; border-bottom: 2px solid #000; padding-bottom: 3px; }
        .bill-cell p { margin: 3px 0; font-size: 15px !important; font-weight: 500; display: flex; }
        .bill-cell p.total-row { font-size: 16px !important; font-weight: 700 !important; border-top: 1.5px solid #000; margin-top: 2px !important; padding-top: 12px; padding-bottom: 2px; }
    }`, document.head.appendChild(a);
	[tenantIDs.slice(0, 9), tenantIDs.slice(9, 18)].forEach((n, a) => {
		let i = document.createElement("div");
		i.className = "page-container " + (0 === a ? "page-break" : "");
		let r = `<div class="page-header"><h4>ভাড়া ও বিদ্যুৎ বিল : ${t}</h4></div><div class="print-grid">`;
		n.forEach(l => {
			let n = parseFloat(document.getElementById(`currM-${l}`).value) || 0,
				a = parseFloat(document.getElementById(`prevM-${l}`).value) || 0,
				i = parseFloat(document.getElementById(`rent-${l}`).value) || 0,
				d = parseFloat(document.getElementById(`gas-${l}`).value) || 0,
				o = parseFloat(document.getElementById(`lastTotal-${l}`).value) || 0,
				c = parseFloat(document.getElementById(`lastPaid-${l}`).value) || 0,
				s = n - a,
				u = calculateElectricityBill(s),
				p = o - c,
				g = void 0 !== adjustedAdvances && adjustedAdvances[l] ? adjustedAdvances[l] : localStorage.getItem(`adv_${e}_${l}`),
				m = g ? `<p class="adv-note-print">* অ্যাডভান্স ৳${enToBnNumber(g)} বাদ দেয়া হয়েছে।</p>` : "";
			r += `
            <div class="bill-cell">
            <h4>${enToBnNumber(l)} (${t.replace(" - ২০"," - '")}) এর জন্যঃ</h4>
            <p>মাস শেষের মিটার রিডিংঃ ${enToBnNumber(n)}</p>
            <p>মাস শুরুর মিটার রিডিংঃ ${enToBnNumber(a)}</p>
            <p>ব্যবহৃত ইউনিটঃ ${enToBnNumber(s.toFixed(0))}</p>
            <p><strong>বিদ্যুৎ বিল</strong> (স্ল্যাব রেট)<span class="print-justify-span">বঃ</span> <strong>${enToBnNumber(u.toFixed(0))}/-</strong></p>
            <p>মাসিক ভাড়াঃ ${enToBnNumber(i)}/-</p>
            <p>${"6B"===l?"গ্যাস বিল ও সিঁড়ি ঝাড়ু":"সিঁড়ি ঝাড়ু"}ঃ ${enToBnNumber(d)}/-</p>
            <p><strong>আগের মাসের বকেয়াঃ ${enToBnNumber(p.toFixed(0))}৳</strong></p>
            ${m}
            <p class="total-row"><strong>এই মাসে পাওনাঃ ${enToBnNumber((u+i+d+p).toFixed(0))}৳</strong></p>
            <div style="margin-top:10px; font-size:12px; font-style: italic; border-top: 2px dashed #000; padding-top:4px; text-align: center; line-height: 1.3;">
            <strong>প্রতি মাসের ৫ তারিখের মধ্যে কারেন্ট বিলের টাকা বিকাশ করতে হবে। বিকাশ নাম্বারঃ 01944529442 রেফারেন্স(Ref): ${l}</strong>
            </div>
            </div>`
		}), r += "</div>", i.innerHTML = r, l.appendChild(i)
	}), window.print()
}

function getSlabs() {
	let e = [];
	return document.querySelectorAll(".slab-item").forEach(t => {
		let l = t.querySelector(".slab-limit"),
			n = t.querySelector(".slab-rate"),
			a = "Infinity" === l.value ? 1 / 0 : parseInt(l.value),
			i = parseFloat(n.value);
		e.push({
			limit: a,
			rate: i
		})
	}), e
}

function calculateSlabBill(e) {
	let t = getSlabs(),
		l = e,
		n = 0,
		a = [],
		i = 0;
	for (let r = 0; r < t.length; r++) {
		let d = t[r],
			o = Math.min(l, d.limit === 1 / 0 ? 1 / 0 : d.limit - i);
		if (o > 0) {
			let c = o * d.rate;
			n += c, a.push({
				units: o,
				rate: d.rate,
				cost: c
			}), l -= o
		}
		if (i = d.limit, l <= 0) break
	}
	return {
		totalBill: n,
		breakdown: a
	}
}

function generatePrintViewBack() {
	let e = currentSelectedMonth,
		t = getBnMonthName(e),
		l = document.querySelector(".print-only") || document.createElement("div");
	l.innerHTML = "", l.className = "print-only print-back-only", document.querySelector(".print-only") || document.body.appendChild(l);
	let n = getSlabs(),
		a = 0,
		i = `<div class="slab-rate-wrapper">
      <table class="slab-rate-table">
        <tr class="slab-rate-header">
          <td class="text-left">ইউনিট রেঞ্জ</td>
          <td class="text-center" style="width: 20px;">→</td>
          <td class="text-right">রেট</td>
        </tr>`;
	n.forEach(e => {
		let t = e.limit === 1 / 0 ? `${enToBnNumber(a+1)}+` : `${enToBnNumber(0===a?0:a+1)}–${enToBnNumber(e.limit)}`;
		i += `<tr>
          <td class="text-left">${t}</td>
          <td class="text-center" style="width: 20px;">→</td>
          <td class="text-right">${enToBnNumber(e.rate)} ৳</td>
      </tr>`, a = e.limit
	}), i += "</table></div>";
	[tenantIDs.slice(0, 9), tenantIDs.slice(9, 18)].forEach((e, n) => {
		let a = document.createElement("div");
		a.className = "page-container " + (0 === n ? "page-break" : "");
		let r = `<div class="page-header"><h4>${t} এর বিদ্যুৎ বিল বিস্তারিত ভেঙে দেখানোঃ</h4></div><div class="print-grid">`;
		[2, 1, 0, 5, 4, 3, 8, 7, 6].forEach(t => {
			let l = e[t];
			if (l) {
				let n = parseFloat(document.getElementById(`currM-${l}`).value) || 0,
					a = parseFloat(document.getElementById(`prevM-${l}`).value) || 0,
					d = n - a,
					o = calculateSlabBill(d),
					c = `<table class="calc-table">
                                <tr><td colspan="3" class="calc-table-header">স্ল্যাব রেট অনুযায়ী বিদ্যুৎ বিলঃ</td></tr>`;
				o.breakdown.forEach(e => {
					c += `<tr>
                      <td class="text-left">${enToBnNumber(e.units)} × ${enToBnNumber(e.rate)}</td>
                      <td class="text-center" style="width: 20px;">=</td>
                      <td class="text-right">${enToBnNumber(e.cost.toFixed(1))}</td>
                  </tr>`
				}), c += "</table>", r += `
              <div class="bill-cell">
                  ${i}
                  <div class="calc-breakdown-print">
                      ${c}
                      <hr class="calc-divider">
                      <table class="calc-total-table">
                          <tr>
                              <td class="text-left">মোটঃ ${enToBnNumber(d.toFixed(0))} ইউনিট</td>
                              <td class="text-center" style="width: 20px;">=</td>
                              <td class="text-right">${enToBnNumber(o.totalBill.toFixed(0))} ৳</td>
                          </tr>
                      </table>
                  </div>
              </div>`
			} else r += '<div class="bill-cell"></div>'
		}), r += "</div>", a.innerHTML = r, l.appendChild(a)
	}), window.print()
}
