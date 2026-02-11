// ==========================================
// FINAL VERSION 
// ==========================================
// ১. গ্লোবাল ভেরিয়েবল
const tenantIDs = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D", "4A", "4B", "4C", "4D", "5A", "5B", "5C", "5D", "6A", "6B"];
let db =  {
};
let savedUnitRate = localStorage.getItem("globalUnitRate") || "8.5";
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxVc2HhrkCu1ttnnWJw5_AqiMxTqgnaGlc3xZxGmLxzzdmQhAj6HwVw6Lrrrtrmz16SOA/exec";
let currentSelectedMonth = "";
let adjustedAdvances =  {
};
let typeInterval;
// টাইপিং এনিমেশনের জন্য
// ==========================================
// ২. লোডার ফাংশন (Manually Added HTML Control)
// ==========================================
function showGlobalLoader(message)  {
  const loader = document.getElementById('global-loader');
  const textEl = document.getElementById('loader-text');
  if (loader && textEl)  {
    loader.style.display = 'flex';
    // টাইপিং ইফেক্ট শুরু
    textEl.textContent = "";
    let i = 0;
    clearInterval(typeInterval);
    // আগের ইন্টারভাল থাকলে ক্লিয়ার করবে
    typeInterval = setInterval(() =>  {
      if (i < message.length)  {
        // textContent ব্যবহার করলে স্পেস ঠিকমতো কাজ করে
        textEl.textContent += message.charAt(i);
        i++;
      }
      else  {
        // লেখা শেষ হলে ডট অ্যানিমেশন (...)
        if (textEl.textContent.length < message.length + 3)  {
          textEl.textContent += ".";
        }
        else  {
          // ৩টি ডট হয়ে গেলে আবার মেইন মেসেজে ফিরে যাবে (লুপ হবে)
          textEl.textContent = message;
        }
      }
    }, 80);
  }
}
function hideGlobalLoader()  {
  const loader = document.getElementById('global-loader');
  if (loader)  {
    loader.style.display = 'none';
    // লোডার লুকিয়ে ফেলবে
  }
  clearInterval(typeInterval);
}
// ==========================================
// ৩. অথেন্টিকেশন ও স্টার্টআপ
// ==========================================
// পেজ লোড হলে পিন ইনপুটে ফোকাস করবে 
window.onload = () =>  {
  if (document.getElementById('pin-input'))  {
    document.getElementById('pin-input').focus();
  }
};
function checkPin()  {
  const pinEntered = document.getElementById("pin-input").value;
  if (pinEntered !== "")  {
    document.getElementById("login-screen").style.display = "none";
    loadDataFromSheet();
  }
  else  {
    alert("দয়া করে পিন দিন!");
  }
}
async function loadDataFromSheet()  {
  if (!currentSelectedMonth)  {
    const now = new Date();
    currentSelectedMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  }
  // ডিফল্ট ভ্যালু সেটআপ
  tenantIDs.forEach(id =>  {
    let defaultRent = 0;
    if (id === "1A" || id === "2A" || id === "4A" || id === "5A" || id === "6A") defaultRent = 4000;
    else if (id === "1B" || id === "4B" || id === "6B") defaultRent = 5700;
    else if (id === "2B" || id === "1C" || id === "2C" || id === "4C") defaultRent = 5000;
    else if (id.includes("D")) defaultRent = 4500;
    else if (id === "5B" || id === "5C") defaultRent = 6000;
    db[id] =  {
      id,rent: defaultRent,gas: 0,service: (id.includes("A") || id.includes("D") ? 50 : 70),prevMeter: 0,totalLastMonth: 0
    };
  });
  init();
  // UI তৈরি
  handleMonthChange();
  // ডাটা ফেচ
}
// ==========================================
// ৪. ডাটা ফেচিং (লোডার সহ)
// ==========================================
async function handleMonthChange()  {
  const selectedMonth = currentSelectedMonth;
  const pin = document.getElementById("pin-input").value;
  showGlobalLoader("সার্ভার থেকে ডাটা লোড করা হচ্ছে...");
  try  {
    const response = await fetch(`${SHEET_URL}?action=getMonthData&month=${selectedMonth}&pin=${pin}`);
    const currentData = await response.json();
    if (currentData && currentData.length > 0)  {
      renderDataToUI(currentData);
    }
    else  {
      // যদি কারেন্ট মাসে ডাটা না থাকে
      showGlobalLoader("বর্তমান ডাটা নেই! আগের মাসের ডাটা খোঁজা হচ্ছে...");
      const prevMonth = getPreviousMonth(selectedMonth);
      const prevResponse = await fetch(`${SHEET_URL}?action=getMonthData&month=${prevMonth}&pin=${pin}`);
      const prevData = await prevResponse.json();
      if (prevData && prevData.length > 0)  {
        // এখানে আগের মাসের রিডিং, ভাড়া এবং সার্ভিস চার্জ - সবই নিয়ে আসবে
        populateFromPrevious(prevData);
        showGlobalLoader(`${getBnMonthName(prevMonth)} মাসের রিডিং ও ভাড়া অটোমেটিক বসানো হয়েছে...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      else  {
        // যদি আগের মাসেও ডাটা না থাকে, তবেই হার্ডকোডেড ডিফল্ট বসাবে
        resetToDefaults();
        showGlobalLoader("কোনো পূর্ববর্তী ডাটা পাওয়া যায়নি। ডিফল্ট সেট করা হচ্ছে...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  catch (e)  {
    console.error("Load Error:", e);
    alert("ডাটা লোড করতে সমস্যা হয়েছে।");
  }
  finally  {
    hideGlobalLoader();
  }
}
// ==========================================
// ৫. UI রেন্ডারিং
// ==========================================
function renderDataToUI(data)  {
  const rate = parseFloat(document.getElementById("globalUnitRate").value) || 8.5;
  data.forEach(row =>  {
    const id = row.id;
    if (document.getElementById(`currM-${id}`))  {
      document.getElementById(`prevM-${id}`).value = row.prevM;
      document.getElementById(`currM-${id}`).value = row.currM;
      document.getElementById(`rent-${id}`).value = row.rent;
      document.getElementById(`gas-${id}`).value = row.service;
      // সরাসরি শিটের ভ্যালু বসবে (যা এখন অরিজিনাল পাওনা)
      document.getElementById(`lastTotal-${id}`).value = row.dues || 0;
      document.getElementById(`lastPaid-${id}`).value = row.paid || 0;
      const units = row.currM - row.prevM;
      const eBill = (units * rate).toFixed(0);
      const netDues = (parseFloat(row.dues) - parseFloat(row.paid)).toFixed(0);
      updateHeaderLabel(id, units, eBill, netDues, row.total);
    }
  });
}
function populateFromPrevious(prevData)  {
  resetToDefaults();
  prevData.forEach(row =>  {
    const id = row.id;
    if (document.getElementById(`prevM-${id}`))  {
      document.getElementById(`prevM-${id}`).value = row.currM;
    }
    // ফেব্রুয়ারি মাসের "গত মাসের পাওনা" হবে জানুয়ারির (Total - Paid)
    if (document.getElementById(`lastTotal-${id}`))  {
      const remainingDues = parseFloat(row.total || 0) - parseFloat(row.paid || 0);
      document.getElementById(`lastTotal-${id}`).value = remainingDues.toFixed(0);
    }
    if (document.getElementById(`rent-${id}`))  {
      document.getElementById(`rent-${id}`).value = row.rent;
    }
    if (document.getElementById(`gas-${id}`))  {
      document.getElementById(`gas-${id}`).value = row.service;
    }
    if (document.getElementById(`label-${id}`))  {
      document.getElementById(`label-${id}`).innerHTML = "<span style='color: #008080;'>আগের মাসের ডাটা লোড হয়েছে...</span>";
    }
  });
}
function resetToDefaults()  {
  tenantIDs.forEach(id =>  {
    if (document.getElementById(`prevM-${id}`)) document.getElementById(`prevM-${id}`).value = 0;
    if (document.getElementById(`currM-${id}`)) document.getElementById(`currM-${id}`).value = 0;
    if (document.getElementById(`lastTotal-${id}`)) document.getElementById(`lastTotal-${id}`).value = 0;
    if (document.getElementById(`lastPaid-${id}`)) document.getElementById(`lastPaid-${id}`).value = 0;
    // যদি ডাটাবেজে ডিফল্ট ভ্যালু থাকে (db[id])
    if (db[id])  {
      if (document.getElementById(`rent-${id}`)) document.getElementById(`rent-${id}`).value = db[id].rent;
      if (document.getElementById(`gas-${id}`)) document.getElementById(`gas-${id}`).value = db[id].gas + db[id].service;
    }
    if (document.getElementById(`label-${id}`))  {
      document.getElementById(`label-${id}`).innerHTML = "ডাটা ইনপুট করুন...";
    }
  });
}
function updateHeaderLabel(id, units, eBill, dues, total)  {
  const label = document.getElementById(`label-${id}`);
  if (label)  {
    label.innerHTML = `
        <span style="font-size: 0.9em;">E.Bill: ৳${eBill}, Dues: ৳${dues},</span>
        <span style="color: #ff007f; font-weight: bold; margin-left: 5px;"> Total: ৳${total}</span>`;
  }
}
function init()  {
  setupBillingDate();
  const container = document.getElementById("tenantAccordion");
  container.innerHTML = "";
  document.getElementById("globalUnitRate").value = savedUnitRate;
  tenantIDs.forEach((id) =>  {
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
                    রিসেট (0)
                </button>
                <button type="button" class="btn-advance" onclick="openAdvanceModal('${t.id}')">
                    ⚡ অ্যাডভান্স
                </button>
                <button type="button" class="btn-paid" onclick="saveDepositEntry('${t.id}')">
                    💰 জমা সেভ
                </button>
            </div>
        </div>`;
    container.appendChild(card);
  });
}
function togglePanel(id)  {
  const allPanels = document.querySelectorAll('.details-panel');
  const targetPanel = document.getElementById(`panel-${id}`);
  allPanels.forEach(panel =>  {
    if (panel !== targetPanel)  {
      panel.classList.remove('active');
    }
  });
  targetPanel.classList.toggle('active');
}
// ==========================================
// ৬. মেইন ক্যালকুলেশন ও সেভ (লোডার সহ)
// ==========================================
async function calculateAll()  {
  if (!confirm("আপনি কি নিশ্চিত যে হিসাব সেভ করতে চান?")) return;
  const rate = parseFloat(document.getElementById("globalUnitRate").value) || 8.5;
  localStorage.setItem("globalUnitRate", rate);
  const pin = document.getElementById("pin-input").value;
  showGlobalLoader("সব ফ্ল্যাটের হিসাব তৈরি ও সেভ হচ্ছে...");
  const syncData = [];
  const month = currentSelectedMonth;
  tenantIDs.forEach((id) =>  {
    const curr = parseFloat(document.getElementById(`currM-${id}`).value) || 0;
    const prev = parseFloat(document.getElementById(`prevM-${id}`).value) || 0;
    const rent = parseFloat(document.getElementById(`rent-${id}`).value) || 0;
    const serv = parseFloat(document.getElementById(`gas-${id}`).value) || 0;
    const lTot = parseFloat(document.getElementById(`lastTotal-${id}`).value) || 0;
    const lPad = parseFloat(document.getElementById(`lastPaid-${id}`).value) || 0;
    const units = curr - prev;
    const eBill = (units * rate).toFixed(0);
    // নিট বকেয়া (জমা বাদ দিয়ে) যা শুধু লেবেলে ও টোটালে ব্যবহার হবে
    const netDues = (lTot - lPad);
    const total = (parseFloat(eBill) + rent + serv + netDues).toFixed(0);
    updateHeaderLabel(id, units, eBill, netDues.toFixed(0), total);
    syncData.push( {
      id, month, prevM: prev, currM: curr, units, eBill, rent, service: serv, dues: lTot, // এখানে সরাসরি গত মাসের পাওনা সেভ হচ্ছে (জমা বাদ না দিয়ে)
      paid: lPad, total: total
    });
  });
  try  {
    await fetch(SHEET_URL,  {
      method: "POST", mode: "no-cors",headers:  {
         "Content-Type": "application/json"
      },body: JSON.stringify( {
         pin: pin, data: syncData
      })
    });
    showGlobalLoader("✅ হিসাব সম্পন্ন এবং সার্ভারে সেভ হয়েছে!");
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
   catch (e)  {
    alert("সার্ভার এরর!");
  }
   finally  {
    hideGlobalLoader();
  }
}
// ==========================================
// ৭. জমা এন্ট্রি (Individual Deposit)
// ==========================================
async function saveDepositEntry(targetId)  {
  const pin = document.getElementById("pin-input").value;
  if (!pin)  {
     alert("আগে পিন নম্বর দিন!");
     return;
  }
  const paidAmount = document.getElementById(`lastPaid-${targetId}`).value;
  if (!confirm(`ফ্ল্যাট ${targetId}-এর জমা: ৳${paidAmount} সেভ করতে চাচ্ছেন?`)) return;
  showGlobalLoader(`ফ্ল্যাট ${targetId} এর জমা লিপিবদ্ধ হচ্ছে...`);
  const syncData = [];
  const month = currentSelectedMonth;
  const rate = parseFloat(document.getElementById("globalUnitRate").value) || 8.5;
  tenantIDs.forEach((id) =>  {
    const cM = parseFloat(document.getElementById(`currM-${id}`).value) || 0;
    const pM = parseFloat(document.getElementById(`prevM-${id}`).value) || 0;
    const rnt = parseFloat(document.getElementById(`rent-${id}`).value) || 0;
    const srv = parseFloat(document.getElementById(`gas-${id}`).value) || 0;
    const lTt = parseFloat(document.getElementById(`lastTotal-${id}`).value) || 0;
    const lPd = parseFloat(document.getElementById(`lastPaid-${id}`).value) || 0;
    const units = cM - pM;
    const eB = (units * rate);
    const total = (eB + rnt + srv + (lTt - lPd)).toFixed(0);
    syncData.push( {
      id: id, month: month, prevM: pM, currM: cM, units: units, eBill: eB.toFixed(0),rent: rnt, service: srv, dues: lTt, // অরিজিনাল পাওনা অপরিবর্তিত থাকবে
      paid: lPd, total: total
    });
  });
  try  {
    await fetch(SHEET_URL,  {
      method: "POST", mode: "no-cors",headers:  {
         "Content-Type": "application/json"
      },body: JSON.stringify( {
         pin: pin, data: syncData
      })
    });
    showGlobalLoader(`✅ জমা সাকসেসফুল!`);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
   catch (e)  {
     alert("এরর!");
  }
   finally  {
     hideGlobalLoader();
  }
}
// ==========================================
// ৮. ব্যাকআপ ও রিস্টোর (লোডার সহ)
// ==========================================
async function downloadBackup()  {
  if (!confirm("আপনি কি সব মাসের ব্যাকআপ ডাটা ডাউনলোড করতে চান?")) return;
  showGlobalLoader("ব্যাকআপ ফাইল তৈরি হচ্ছে...");
  try  {
    const response = await fetch(`${SHEET_URL}?action=getAllData`);
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)],  {
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
  }
  catch (e)  {
    alert("ডাউনলোড এরর! সার্ভার থেকে ডাটা পাওয়া যায়নি।");
  }
  finally  {
    hideGlobalLoader();
  }
}
function importData(input)  {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e)  {
    try  {
      const backupData = JSON.parse(e.target.result);
      if (!confirm(`ফাইলে ${backupData.length} টি এন্ট্রি পাওয়া গেছে। আপলোড করবেন?`)) return;
      const pin = document.getElementById("pin-input").value;
      showGlobalLoader("ব্যাকআপ ডাটা সার্ভারে আপলোড হচ্ছে...");
      await fetch(SHEET_URL,  {
        method: "POST",mode: "no-cors",headers:  {
          "Content-Type": "application/json"
        },body: JSON.stringify(  {
          pin: pin,data: backupData
        })
      });
      // সাকসেস মেসেজ ও রিলোড
      showGlobalLoader("✅ ব্যাকআপ আপলোড সম্পন্ন! পেজ রিলোড হচ্ছে...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      // ২ সেকেন্ড দেখাবে
      location.reload();
    }
    catch (err)  {
      hideGlobalLoader();
      alert("ভুল ফাইল ফরম্যাট বা আপলোড এরর!");
    }
  };
  reader.readAsText(file);
}
// ==========================================
// ৯. রিসেট ফাংশনস (লোডার সহ)
// ==========================================
function clearTenantBalance(id)  {
  if (confirm(`ফ্ল্যাট ${id}-এর গত মাসের বকেয়া ও জমা কি শূন্য করতে চান?`))  {
    document.getElementById(`lastTotal-${id}`).value = 0;
    document.getElementById(`lastPaid-${id}`).value = 0;
    document.getElementById(`label-${id}`).innerHTML = "<b style='color:#ff4d4d;'>রিসেট করা হয়েছে (সেভ করতে ভুলবেন না)!</b>";
  }
}
async function resetLastInput()  {
  const month = currentSelectedMonth;
  const pin = document.getElementById("pin-input").value;
  if (!confirm(getBnMonthName(month) + " মাসের সব ডাটা শিট থেকে মুছে ফেলতে চান?")) return;
  showGlobalLoader("ডাটা মোছা হচ্ছে...");
  try  {
    const response = await fetch(`${SHEET_URL}?action=deleteLast&month=${month}&pin=${pin}`);
    const result = await response.text();
    if (result === "Success")  {
      showGlobalLoader("✅ ডাটা সফলভাবে মোছা হয়েছে। রিলোড হচ্ছে...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      window.location.reload();
    }
    else if (result === "Unauthorized")  {
      hideGlobalLoader();
      alert("ভুল পিন! ডাটা মোছার অনুমতি নেই।");
    }
    else  {
      hideGlobalLoader();
      alert("এরর: " + result);
    }
  }
  catch (e)  {
    hideGlobalLoader();
    alert("সার্ভার এরর!");
  }
}
// ==========================================
// ১০. Advance logic and function
// ==========================================
let currentAdvanceId = null;
// ১. মডাল ওপেন করা এবং ডাটা ফেচ করা
async function openAdvanceModal(id)  {
  currentAdvanceId = id;
  document.getElementById("adv-modal-id").innerText = id;
  document.getElementById("new-advance-input").value = "";
  showGlobalLoader("অ্যাডভান্স ব্যালেন্স চেক করা হচ্ছে...");
  try  {
    const response = await fetch(`${SHEET_URL}?action=getAdvance&id=${id}`);
    const data = await response.json();
    document.getElementById("current-advance-display").innerText = data.amount || 0;
    document.getElementById("advanceModal").style.display = "flex";
  }
  catch (e)  {
    alert("অ্যাডভান্স ডাটা লোড করা যায়নি!");
  }
  finally  {
    hideGlobalLoader();
  }
}
// ২. মডাল বন্ধ করা
function closeAdvanceModal()  {
  document.getElementById("advanceModal").style.display = "none";
}
// ৩. নতুন অ্যাডভান্স সেভ করা
async function saveAdvanceData()  {
  const pin = document.getElementById("pin-input").value;
  if (!pin)  {
    alert("আগে পিন নম্বর দিন!");
    return;
  }
  const amount = parseFloat(document.getElementById("new-advance-input").value);
  if (isNaN(amount))  {
    alert("সঠিক টাকার পরিমাণ দিন!");
    return;
  }
  showGlobalLoader("অ্যাডভান্স সেভ হচ্ছে...");
  try  {
    // mode: "no-cors" সরালাম কারণ এতে সাকসেস বোঝা যায় না
    await fetch(SHEET_URL,  {
      method: "POST",body: JSON.stringify(  {
        pin: pin,action: "updateAdvance",id: currentAdvanceId, amount: amount
      })
    });
    document.getElementById("current-advance-display").innerText = amount;
    document.getElementById("new-advance-input").value = "";
    showGlobalLoader("✅ অ্যাডভান্স সেভ হয়েছে!");
    await new Promise(r => setTimeout(r, 1200));
  }
  catch (e)  {
    alert("সেভ এরর!");
  }
  finally  {
    hideGlobalLoader();
  }
}
// ৪. অ্যাডভান্স টাকা বিল থেকে কেটে নেওয়া (সম্পূর্ণ ফিক্সড ও অটোমেটেড)
async function deductFromTotal()  {
  const pin = document.getElementById("pin-input").value;
  if (!pin)  {
    alert("আগে পিন নম্বর দিন!");
    return;
  }
  const advanceAmount = parseFloat(document.getElementById("current-advance-display").innerText);
  if (advanceAmount <= 0)  {
    alert("কাটার মতো কোনো অ্যাডভান্স টাকা নেই!");
    return;
  }
  if(!confirm(`আপনি কি মোট বিল থেকে ৳${advanceAmount} কমাতে চান? এটি স্বয়ংক্রিয়ভাবে সার্ভারে সেভ হবে।`)) return;
  closeAdvanceModal();
  showGlobalLoader(`ফ্ল্যাট ${currentAdvanceId}-এর অ্যাডভান্স অ্যাডজাস্ট ও সেভ হচ্ছে...`);
  try  {
    await fetch(SHEET_URL,  {
      method: "POST",body: JSON.stringify(  {
        pin: pin,action: "updateAdvance",id: currentAdvanceId, amount: 0
      })
    });
    const lastPaidEl = document.getElementById(`lastPaid-${currentAdvanceId}`);
    let currentPaid = parseFloat(lastPaidEl.value) || 0;
    lastPaidEl.value = currentPaid + advanceAmount;
    // প্রিন্ট নোটের জন্য ডাটা সেভ রাখা
    adjustedAdvances[currentAdvanceId] = advanceAmount;
    await saveDepositEntryAfterAdvance(currentAdvanceId);
    const rate = parseFloat(document.getElementById("globalUnitRate").value) || 8.5;
    const curr = parseFloat(document.getElementById(`currM-${currentAdvanceId}`).value) || 0;
    const prev = parseFloat(document.getElementById(`prevM-${currentAdvanceId}`).value) || 0;
    const rent = parseFloat(document.getElementById(`rent-${currentAdvanceId}`).value) || 0;
    const serv = parseFloat(document.getElementById(`gas-${currentAdvanceId}`).value) || 0;
    const lTot = parseFloat(document.getElementById(`lastTotal-${currentAdvanceId}`).value) || 0;
    const lPad = parseFloat(lastPaidEl.value);
    const units = curr - prev;
    const eBill = (units * rate).toFixed(0);
    const dues = (lTot - lPad).toFixed(0);
    const finalTotal = (parseFloat(eBill) + rent + serv + parseFloat(dues)).toFixed(0);
    updateHeaderLabel(currentAdvanceId, units, eBill, dues, finalTotal);
    document.getElementById("current-advance-display").innerText = "0";
    showGlobalLoader(`✅ সফল হয়েছে! ৳${advanceAmount} অ্যাডজাস্ট করে মোট বিল ৳${finalTotal} করা হয়েছে।`);
    await new Promise(r => setTimeout(r, 2000));
  }
  catch (e)  {
    console.error(e);
    alert("সার্ভার এরর!");
  }
  finally  {
    hideGlobalLoader();
  }
}
// এটি একটি সহায়ক ফাংশন যা deductFromTotal থেকে কল হবে (confirm prompt ছাড়া সেভ করার জন্য)
async function saveDepositEntryAfterAdvance(targetId)  {
  const pin = document.getElementById("pin-input").value;
  const syncData = [];
  const month = currentSelectedMonth;
  const rate = parseFloat(document.getElementById("globalUnitRate").value) || 8.5;
  tenantIDs.forEach((id) =>  {
    const cM = parseFloat(document.getElementById(`currM-${id}`).value) || 0;
    const pM = parseFloat(document.getElementById(`prevM-${id}`).value) || 0;
    const rnt = parseFloat(document.getElementById(`rent-${id}`).value) || 0;
    const srv = parseFloat(document.getElementById(`gas-${id}`).value) || 0;
    const lTt = parseFloat(document.getElementById(`lastTotal-${id}`).value) || 0;
    const lPd = parseFloat(document.getElementById(`lastPaid-${id}`).value) || 0;
    const units = cM - pM;
    const eB = (units * rate);
    // টোটাল বের করার সময় অবশ্যই জমা (lPd) বাদ দিতে হবে
    const currentTotal = (eB + rnt + srv + (lTt - lPd)).toFixed(0);
    syncData.push( {
      id: id,month: month,prevM: pM,currM: cM,units: units,eBill: eB.toFixed(0),rent: rnt,service: srv,dues: lTt, // এখানেও আমরা অরিজিনাল পাওনা সেভ করছি (জমা বাদ না দিয়ে)
      paid: lPd, total: currentTotal
    });
  });
  await fetch(SHEET_URL,  {
    method: "POST",mode: "no-cors",headers:  {
       "Content-Type": "application/json"
    },body: JSON.stringify( {
       pin: pin, data: syncData
    })
  });
}
// ==========================================
// 11. হেল্পার ও প্রিন্ট লজিক
// ==========================================
function getPreviousMonth(currentMonthStr)  {
  const date = new Date(currentMonthStr + "-01");
  date.setMonth(date.getMonth() - 1);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}
function getBnMonthName(str)  {
  if (!str) return "";
  const months = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const [y, m] = str.split("-");
  return `${months[parseInt(m) - 1]} - ${enToBnNumber(y)}`;
}
function enToBnNumber(n)  {
  if (n === undefined || n === null) return "০";
  const bn = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return n.toString().replace(/\d/g, (d) => bn[d]);
}
function setupBillingDate()  {
  const cal = document.getElementById("billingMonth");
  const drop = document.getElementById("dynamicDateContainer");
  const now = new Date();
  const maxVal = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  if (/Chrome|Edg/.test(navigator.userAgent))  {
    cal.style.display = "block";
    drop.style.display = "none";
    cal.value = currentSelectedMonth;
    cal.max = maxVal;
    cal.onchange = (e) =>  {
      currentSelectedMonth = e.target.value;
      handleMonthChange();
    };
  }
  else  {
    cal.style.display = "none";
    drop.style.display = "flex";
    renderDynamicDateControls();
  }
}
function renderDynamicDateControls()  {
  const container = document.getElementById("dynamicDateContainer");
  const now = new Date();
  const curYear = now.getFullYear();
  let html = `<select id="billingMonth_Year" onchange="updateSelectedYear(this.value)">`;
  for (let i = curYear;
  i >= 2015;
  i--)  {
    const isSelected = currentSelectedMonth.split('-')[0] == i ? "selected" : "";
    html += `<option value="${i}" ${isSelected}>${enToBnNumber(i)}</option>`;
  }
  container.innerHTML = `<span id="monthDropdownContainer"></span>` + html + `</select>`;
  updateMonthOptions();
}
function updateMonthOptions()  {
  const container = document.getElementById("monthDropdownContainer");
  const names = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const selectedYear = parseInt(currentSelectedMonth.split('-')[0]);
  let html = `<select id="billingMonth_Month" onchange="updateSelectedMonth(this.value)">`;
  names.forEach((name, i) =>  {
    const val = (i + 1).toString().padStart(2, "0");
    const isSelected = currentSelectedMonth.split('-')[1] == val ? "selected" : "";
    let isDisabled = (selectedYear === curYear && i > curMonth) ? "disabled" : "";
    html += `<option value="${val}" ${isSelected} ${isDisabled}>${name}</option>`;
  });
  container.innerHTML = html + `</select>`;
}
function updateSelectedYear(year)  {
  const month = currentSelectedMonth.split('-')[1] || "01";
  currentSelectedMonth = `${year}-${month}`;
  updateMonthOptions();
}
function updateSelectedMonth(month)  {
  const year = currentSelectedMonth.split('-')[0];
  currentSelectedMonth = `${year}-${month}`;
  handleMonthChange();
}
function generatePrintView()  {
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
        .total-row { font-size: 15px !important; font-weight: 700 !important; border-top: 1.5px solid #000 !important; margin-top: 6px !important; padding-top: 8px; }
    }`;
  document.head.appendChild(style);
  const chunks = [tenantIDs.slice(0, 9), tenantIDs.slice(9, 18)];
  chunks.forEach((chunk, index) =>  {
    let pageDiv = document.createElement("div");
    pageDiv.className = "page-container " + (index === 0 ? "page-break" : "");
    let html = `<div class="page-header"><h4>ভাড়া ও বিদ্যুৎ বিল : ${formattedMonth}</h4></div><div class="print-grid">`;
    chunk.forEach((id) =>  {
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
      // অ্যাডভান্স নোট লজিক
      const advNote = (typeof adjustedAdvances !== 'undefined' && adjustedAdvances[id]) ? `<p style="color: #006666; font-size: 12px; font-style: italic; margin: 2px 0; text-align: center;">* অ্যাডভান্স ৳${enToBnNumber(adjustedAdvances[id])} বাদ দেয়া হয়েছে।</p>` : "";
      const shortFormattedMonth = formattedMonth.replace(" - ২০", " - '");
      html += `
            <div class="bill-cell">
            <h4>${enToBnNumber(id)} (${shortFormattedMonth}) এর জন্যঃ</h4>
            <p>মাস শেষের মিটার রিডিংঃ ${enToBnNumber(curr)}</p>
            <p>মাস শুরুর মিটার রিডিংঃ ${enToBnNumber(prev)}</p>
            <p>ব্যবহৃত ইউনিটঃ ${enToBnNumber(units.toFixed(0))}</p>
            <p><strong>বিদ্যুৎ বিল</strong>&nbsp;(${enToBnNumber(rate)}৳ হারে)：&nbsp;<strong>${enToBnNumber(eBill.toFixed(0))}/-</strong></p>
            <p>মাসিক ভাড়াঃ ${enToBnNumber(rent)}/-</p>
            <p>${id === "6B" ? "গ্যাস বিল ও সিঁড়ি ঝাড়ু" : "সিঁড়ি ঝাড়ু"}ঃ ${enToBnNumber(serv)}/-</p>
            <p><strong>${targetMonthName} মাসের বকেয়াঃ ${enToBnNumber(dues.toFixed(0))}৳</strong></p>
            ${advNote}
            <p class="total-row"><strong>এই মাসে মোট পাওনাঃ ${enToBnNumber(total.toFixed(0))}৳</strong></p>
            <div style="margin-top:10px; font-size:12px; font-style: italic; border-top: 1.5px dashed #000; padding-top:6px; text-align: center; line-height: 1.3;">
            <strong>প্রতি মাসের ৫ তারিখের মধ্যে কারেন্ট বিলের টাকা বিকাশ করতে হবে। বিকাশ নাম্বারঃ 01944529442 রেফারেন্স (Ref)： ${id}</strong>
            </div>
            </div>`;
    });
    html += `</div>`;
    pageDiv.innerHTML = html;
    printArea.appendChild(pageDiv);
  });
  window.print();
}


