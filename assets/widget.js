/* ============================================================
   ARIA — Solstice Heating & Air demo chat widget
   Demo sales assistant. Zero external requests. localStorage only.
   ============================================================ */
(function(){
"use strict";

/* ---------- business config (?biz=&tagline=&city=&address=&phone=) ---------- */
var qs = new URLSearchParams(location.search);
var BIZ      = qs.get("biz")      || "Solstice Heating & Air";
var TAGLINE  = qs.get("tagline")  || "Heating · Cooling · 24/7";
var CITY     = qs.get("city")     || "Phoenix, AZ";
var ADDRESS  = qs.get("addr") || qs.get("address")  || "4208 E Cactus Rd, Phoenix, AZ 85032";
var PHONE    = qs.get("phone")    || "(602) 555-0164";
var HOST     = "Aria";
var LEAD_KEY = "nmc_hvac_leads";
var FAST     = qs.get("fast") === "1";
var refPrefix = BIZ.replace(/^the\s+/i,"").split(/\s+/).filter(function(w){return /^[A-Za-z]/.test(w);}).slice(0,2).map(function(w){return w[0].toUpperCase();}).join("");

/* ---------- page personalization ---------- */
function setText(id, v){ var el = document.getElementById(id); if(el) el.textContent = v; }
setText("nav-biz", BIZ); setText("nav-tagline", TAGLINE); setText("foot-biz", BIZ); setText("foot-city", CITY);
setText("addr-line", ADDRESS); setText("strip-addr", ADDRESS);
setText("phone-line", PHONE); setText("strip-phone", PHONE);
setText("eyebrow-city", CITY); setText("hero-city", CITY.split(",")[0]);
var sp = document.getElementById("strip-phone"); if(sp) sp.href = "tel:+" + PHONE.replace(/\D/g,"");
var pl = document.getElementById("phone-line");  if(pl) pl.href = "tel:+" + PHONE.replace(/\D/g,"");
setText("maya-name", HOST); setText("maya-avatar-letter", HOST[0]);
setText("maya-credit", BIZ + " · " + CITY);
document.title = BIZ + " — AC Repair, Install & 24/7 Emergency in " + CITY;

/* ---------- deep personalization: ?services= ?hours= ----------
   services: pipe-separated REAL service names -> rendered into the services grid (max 8).
   hours: pipe-separated "Day(s): time" pairs -> rendered into the hours table (max 6).
   Graceful fallback: the page keeps its built-in fictional content when a param is absent. */
(function () {
  var svc = qs.get("services");
  if (svc) {
    var items = svc.split("|").map(function (s) { return s.trim(); }).filter(function (s) { return s; }).slice(0, 8);
    var grid = document.querySelector("#services .menu-grid, #practice .menu-grid");
    if (grid && items.length) {
      grid.innerHTML = items.map(function (name) {
        return '<div class="menu-card"><div class="cat">Service</div><h3>' + esc(name) + '</h3>' +
          '<p>Offered at ' + esc(BIZ) + ' &mdash; ask ' + esc(HOST) + ' below for details &amp; pricing.</p></div>';
      }).join("");
    }
  }
  var hrs = qs.get("hours");
  if (hrs) {
    var rows = hrs.split("|").map(function (s) { return s.trim(); }).filter(function (s) { return s; }).slice(0, 6);
    var table = document.querySelector("table.hours");
    if (table && rows.length) {
      var chatCell = null;
      Array.prototype.forEach.call(table.rows, function (r) {
        if (/chat/i.test(r.textContent) && r.cells[1]) chatCell = r.cells[1].innerHTML;
      });
      var html = rows.map(function (r) {
        var i = r.indexOf(":");
        var day = (i > 0 ? r.slice(0, i) : r).trim();
        var time = (i > 0 ? r.slice(i + 1) : "").trim();
        return "<tr><td>" + esc(day) + "</td><td>" + esc(time) + "</td></tr>";
      }).join("");
      if (chatCell) html += "<tr><td>Chat with " + esc(HOST) + "</td><td>" + chatCell + "</td></tr>";
      table.innerHTML = html;
    }
  }
})();


/* ---------- DOM ---------- */
var bubble = document.getElementById("maya-bubble"),
    panel  = document.getElementById("maya-panel"),
    msgs   = document.getElementById("maya-msgs"),
    chipsEl= document.getElementById("maya-chips"),
    inputEl= document.getElementById("maya-input"),
    sendBtn= document.getElementById("maya-send"),
    closeBtn= document.getElementById("maya-close"),
    unreadEl= document.getElementById("maya-unread");

/* ---------- state ---------- */
var step = { flow:null, i:0, data:{} };   // current guided flow
var leads = [];
try { leads = JSON.parse(localStorage.getItem(LEAD_KEY) || "[]"); } catch(e){ leads = []; }
var hasUnread = false, opened = false;

function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function digits(s){ return String(s||"").replace(/\D/g,""); }

/* word-start keyword match (proven standard, 2026-10-03): "loCATed" must not
   trip a "cat" keyword, "recall" must not trip "call", "anywhere" must not trip
   "where". Prefix keywords like 'schedul'/'estim' still match
   'schedule'/'estimate'; phrases keep substring match. */
function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function has(t){
  var words = Array.prototype.slice.call(arguments, 1);
  return words.some(function(w){ return new RegExp("(^|[^a-z])" + escRe(w)).test(t); });
}

/* ---------- lead persistence ---------- */
function saveLead(l){
  l.biz = BIZ; l.at = new Date().toISOString();
  leads.push(l);
  try { localStorage.setItem(LEAD_KEY, JSON.stringify(leads)); } catch(e){}
}

/* ---------- rendering ---------- */
function scrollDown(){ msgs.scrollTop = msgs.scrollHeight; }
function botRow(inner, cls){
  var row = document.createElement("div"); row.className = "mrow bot";
  row.innerHTML = '<div class="mavatar">'+esc(HOST[0])+'</div><div class="bubble '+(cls||"")+'">'+inner+'</div>';
  msgs.appendChild(row); scrollDown(); return row;
}
function userRow(text){
  var row = document.createElement("div"); row.className = "mrow user";
  row.innerHTML = '<div class="bubble">'+esc(text)+'</div>';
  msgs.appendChild(row); scrollDown();
}
function typingRow(){
  var row = document.createElement("div"); row.className = "mrow bot";
  row.innerHTML = '<div class="mavatar">'+esc(HOST[0])+'</div><div class="bubble typing"><i></i><i></i><i></i></div>';
  msgs.appendChild(row); scrollDown(); return row;
}
function say(html, cb, cls){
  var t = FAST ? 0 : 320 + Math.random()*380;
  var tr = typingRow();
  setTimeout(function(){ tr.remove(); botRow(html, cls); if(cb) cb(); }, t);
}
function sayMany(parts, done, cls){
  var i = 0;
  (function next(){ if(i >= parts.length){ if(done) done(); return; } say(parts[i++], next, cls); })();
}
function setChips(list){
  chipsEl.innerHTML = "";
  (list||[]).forEach(function(c){
    var b = document.createElement("button");
    b.className = "chip"; b.textContent = c.label;
    b.onclick = function(){ userSays(c.value || c.label, c.silent); };
    chipsEl.appendChild(b);
  });
}
function setStars(cb){
  chipsEl.innerHTML = "";
  var wrap = document.createElement("div"); wrap.className = "stars-row";
  for(var i=1;i<=5;i++){
    (function(n){
      var s = document.createElement("button"); s.className = "star-btn"; s.textContent = "⭐";
      s.onmouseenter = function(){ paint(n); };
      s.onclick = function(){ setChips([]); userRow(n + " stars"); cb(n); };
      wrap.appendChild(s);
    })(i);
  }
  function paint(n){ Array.prototype.forEach.call(wrap.children, function(s,idx){ s.classList.toggle("lit", idx < n); }); }
  chipsEl.appendChild(wrap);
}
function noticeRow(html){ var row = document.createElement("div"); row.className = "mrow bot"; row.innerHTML = '<div class="mavatar">'+esc(HOST[0])+'</div><div class="notice">'+html+'</div>'; msgs.appendChild(row); scrollDown(); }
function dashcard(rows){
  var html = '<div class="dashcard"><div class="dl-head">📋 Saved to your dashboard</div>';
  rows.forEach(function(r){ html += '<div class="dl-row"><span>'+esc(r[0])+':</span> <b>'+esc(r[1])+'</b></div>'; });
  html += '</div>';
  var row = document.createElement("div"); row.className = "mrow bot";
  row.innerHTML = '<div class="mavatar">'+esc(HOST[0])+'</div>'+html;
  msgs.appendChild(row); scrollDown();
}
function markUnread(){ if(opened) return; hasUnread = true; unreadEl.classList.remove("hidden"); }

/* ---------- panel open/close ---------- */
function openPanel(){ panel.classList.add("open"); bubble.classList.add("hidden"); opened = true; hasUnread = false; unreadEl.classList.add("hidden"); setTimeout(function(){ inputEl.focus(); }, 300); }
function closePanel(){ panel.classList.remove("open"); bubble.classList.remove("hidden"); }
bubble.addEventListener("click", openPanel);
closeBtn.addEventListener("click", closePanel);

/* ---------- content builders ---------- */
function hoursHtml(){
  return "Our hours at <b>"+esc(BIZ)+"</b>:<br>Mon–Fri · <b>7 AM – 7 PM</b><br>Saturday · <b>8 AM – 5 PM</b><br>Sunday · emergency line only<br><br>And honestly? The chat never closes — I'm here 24/7. 🚨";
}
function servicesHtml(){
  return "Here's what we do, with honest pricing:<br><br>❄️ <b>AC Repair</b> — $89 diagnostic (waived with repair)<br>🏠 <b>System Replacement</b> — from $4,900, free in-home quote<br>🔧 <b>Seasonal Tune-Up</b> — $129, 42-point inspection<br>🛡️ <b>Comfort Club</b> — $18/mo, priority dispatch<br>🌬️ <b>Duct Cleaning</b> — from $249<br>💨 <b>Indoor Air Quality</b> — free assessment<br>♨️ <b>Heat Pump Install</b> — from $5,400<br>🌡️ <b>Smart Thermostat</b> — from $199<br><br>Which one caught your eye?";
}
function repairHtml(){
  return "Warm air, dead compressor, weird noises, frozen coils — we've seen it all. 👍<br><br>Our diagnostic is <b>$89</b>, and it's <b>waived entirely</b> if you go ahead with the repair. Most fixes are done same-day.<br><br>Want me to book a tech visit?";
}
function installHtml(){
  return "Full system replacement <b>from $4,900</b>, installed — and we size it with a real load calculation, not a rule-of-thumb guess.<br><br>Every install includes a <b>10-year parts warranty</b> and a free in-home quote in writing — no pressure, no games.<br><br>Want the 20-second ballpark estimate, or book the free quote visit?";
}
function tuneupHtml(){
  return "Our <b>$129</b> seasonal tune-up is a 42-point inspection — refrigerant, coils, capacitors, airflow, the works. It's how we catch the $18 failure before it becomes a $400 emergency in August. 🛠️<br><br>Or join <b>Comfort Club at $18/mo</b>: two tune-ups a year, priority dispatch, 15% off repairs.<br><br>Shall I book a tune-up slot?";
}
function ductHtml(){
  return "Duct cleaning <b>from $249</b> — dust, dander and desert out of your air stream, camera-verified so you actually see the before and after. 🌬️<br><br>Want me to schedule it?";
}
function airHtml(){
  return "Our indoor air quality assessment is <b>free</b> — filtration, humidity and fresh-air check, especially good for allergy-prone homes. 💨<br><br>Want to add it to a tech visit?";
}
function pricesHtml(){
  return "Quick price guide, all in writing before any work:<br><br>❄️ AC Repair — <b>$89</b> diagnostic, waived with repair<br>🏠 Full Replacement — <b>from $4,900</b><br>🔧 Tune-Up — <b>$129</b> · Comfort Club <b>$18/mo</b><br>🌬️ Duct Cleaning — <b>from $249</b><br>🌡️ Smart Thermostat — <b>from $199</b><br><br>For an exact number on a new system, my ballpark estimator takes 20 seconds — say <b>quote</b>. 🙂";
}

/* ============================================================
   FLOW 1 — service booking
   ============================================================ */
var REASONS = ["AC repair","New system install","Tune-up","Duct cleaning","Air quality","Free quote"];
var DAYS = ["Tomorrow","Thursday","Friday","Saturday"];
var TIMES = ["8:00 AM","10:30 AM","1:00 PM","3:30 PM"];
function startBooking(prefill){
  step = { flow:"booking", i:0, data:{} };
  if(prefill){ step.data.reason = prefill; step.i = 1; askName(); return; }
  say("Of course — let's get a tech to you. 👍", function(){
    say("What's the visit for?", function(){
      setChips(REASONS.map(function(r){ return {label:r, value:r}; }));
    });
  });
}
function askName(){
  step.i = 1;
  say("Great — and what's your name?", function(){ setChips([]); });
}
function askPhone(){
  step.i = 2;
  say("Nice to meet you, <b>"+esc(step.data.name)+"</b>! Want text updates when the tech is on the way? Drop your number — or skip it.", function(){
    setChips([{label:"Skip", value:"__skip"}]);
  });
}
function askDay(){
  step.i = 3;
  say("Perfect. Which day works?", function(){
    setChips(DAYS.map(function(d){ return {label:d, value:d}; }));
  });
}
function askTime(){
  step.i = 4;
  say("And a time window for <b>"+esc(step.data.day)+"</b>?", function(){
    setChips(TIMES.map(function(t){ return {label:t, value:t}; }));
  });
}
function confirmBooking(){
  var ref = refPrefix + "-" + Math.floor(1000 + Math.random()*9000);
  step.data.ref = ref;
  sayMany([
    "✅ <b>You're booked!</b>",
    "🧊 <b>"+esc(step.data.reason)+"</b><br>📅 "+esc(step.data.day)+" at "+esc(step.data.time)+"<br>👤 "+esc(step.data.name)+"<br>🔖 Ref: <span class='ref'>"+ref+"</span>"
  ], function(){
    var extra = step.data.phone ? "We'll text <b>"+esc(step.data.phone)+"</b> when the tech is on the way. " : "";
    say(extra + "Please clear a path to the unit if you can — see you soon! 😊", function(){
      setChips([{label:"Book another", value:"book another"}]);
      step = { flow:null, i:0, data:{} };
    });
  });
}
function bookingStep(text){
  var d = step.data;
  if(step.i === 0){
    var t = text.toLowerCase(), reason = null;
    if(has(t, "repair", "fix", "broken", "not cool", "warm air", "warm", "not working", "leak", "noise", "frozen")) reason = "AC repair";
    else if(has(t, "install", "replac", "new system", "heat pump")) reason = "New system install";
    else if(has(t, "tune up", "tune-up", "tuneup", "mainten", "check up", "check-up", "checkup", "club")) reason = "Tune-up";
    else if(has(t, "duct")) reason = "Duct cleaning";
    else if(has(t, "air quality", "filter", "allerg", "humid")) reason = "Air quality";
    else if(has(t, "quote", "estim")){ startQuote(); return; }
    if(!reason){ say("I can book: <b>"+REASONS.join("</b>, <b>")+"</b> — which one is it?", function(){ setChips(REASONS.map(function(r){return {label:r,value:r};})); }); return; }
    d.reason = reason; askName(); return;
  }
  if(step.i === 1){
    var nm = text.trim();
    if(!nm || nm.length > 40){ say("Just your name is fine — 2 to 40 characters 🙂"); return; }
    d.name = nm; askPhone(); return;
  }
  if(step.i === 2){
    if(text !== "__skip"){
      var dg = digits(text);
      if(dg.length < 7){ say("Hmm, that doesn't look like a real number — could you double-check it? Or tap Skip below."); return; }
      d.phone = text.trim();
    }
    askDay(); return;
  }
  if(step.i === 3){ d.day = text; askTime(); return; }
  if(step.i === 4){ d.time = text; confirmBooking(); return; }
}

/* ============================================================
   FLOW 2 — emergency / after-hours lead capture (with urgency flag)
   ============================================================ */
function startAfterHours(){
  step = { flow:"afterhours", i:0, data:{ urgency:"Priority" } };
  noticeRow("🚨 <b>It's 11:42 PM</b> — still 96°F outside, and your AC just quit.<br>I'm <b>"+esc(HOST)+"</b>, "+esc(BIZ)+"'s comfort coordinator, and I'm still here. This is exactly what our 24/7 line is for.");
  setTimeout(function(){
    say("First — is this a <b>no-cooling emergency</b>?", function(){
      setChips([
        {label:"No cooling at all", value:"No cooling at all"},
        {label:"Blowing warm air", value:"Blowing warm air"},
        {label:"Strange noises", value:"Strange noises"},
        {label:"Water leak", value:"Water leak"}
      ]);
    });
  }, FAST ? 0 : 600);
}
function afterHoursStep(text){
  var d = step.data;
  if(step.i === 0){
    d.issue = text;
    d.urgency = (/no cooling/i.test(text)) ? "HIGH — no cooling" : "Priority";
    step.i = 1;
    say(d.urgency.indexOf("HIGH") === 0
        ? "Okay — flagged as a <b>HIGH-urgency no-cooling</b> call. Our on-call tech gets paged immediately. Who am I sending them to?"
        : "Got it — <b>"+esc(text)+"</b>. Flagged for priority dispatch. Who am I sending the tech to?",
      function(){ setChips([]); });
    return;
  }
  if(step.i === 1){
    var nm = text.trim();
    if(!nm || nm.length > 40 || /\d/.test(nm)){ say("Just the name for the dispatch — letters are fine 🙂"); return; }
    d.name = nm; step.i = 2;
    say("Thanks, <b>"+esc(nm)+"</b>. What's the best number to reach you on right now?", function(){ setChips([]); });
    return;
  }
  if(step.i === 2){
    var dg = digits(text);
    if(dg.length < 7){ say("That doesn't look like a real number — and I really need to reach you tonight. Could you check it?"); return; }
    d.phone = text.trim(); step.i = 3;
    saveLead({ name:d.name, phone:d.phone, issue:d.issue, urgency:d.urgency, captured:"11:42 PM (after hours)", kind:"emergency" });
    sayMany([
      "✅ <b>You're on the board.</b> Our on-call tech is paged and will call <b>"+esc(d.phone)+"</b> within minutes — not in the morning, <i>now</i>. 🧊",
    ], function(){
      dashcard([["New lead", d.name],["Phone", d.phone],["Issue", d.issue],["Urgency", d.urgency],["Captured", "11:42 PM (after hours)"]]);
      setTimeout(function(){
        say("See that card? That's what the owner wakes up to — <i>every midnight breakdown becomes a morning dispatch, not a customer lost to the company with the 24/7 line.</i> 💪", function(){
          setChips([{label:"Back to chat", value:"hi"}]);
          step = { flow:null, i:0, data:{} };
        });
      }, FAST ? 0 : 700);
    });
    return;
  }
}

/* ============================================================
   FLOW 3 — free quote estimator
   ============================================================ */
var QUOTE_RANGES = {
  "Under 1,500 sq ft":  ["$4,900","$6,500"],
  "1,500–2,500 sq ft":  ["$5,900","$7,900"],
  "2,500–3,500 sq ft":  ["$6,900","$9,200"],
  "Over 3,500 sq ft":   ["$8,400","$11,500"]
};
function startQuote(){
  step = { flow:"quote", i:0, data:{} };
  say("Love it — let's ballpark it in 20 seconds. 🏠<br>Roughly how big is your home?", function(){
    setChips(Object.keys(QUOTE_RANGES).map(function(k){ return {label:k, value:k}; }));
  });
}
function quoteStep(text){
  var d = step.data;
  if(step.i === 0){
    d.size = text; step.i = 1;
    say("And how old is your current system?", function(){
      setChips(["Under 8 years","8–12 years","12–15 years","15+ or not sure"].map(function(a){ return {label:a, value:a}; }));
    });
    return;
  }
  if(step.i === 1){
    d.age = text; step.i = 2;
    say("Last one — what are you thinking?", function(){
      setChips(["Full replacement","New install","Just exploring"].map(function(a){ return {label:a, value:a}; }));
    });
    return;
  }
  if(step.i === 2){
    d.intent = text;
    var r = QUOTE_RANGES[d.size] || QUOTE_RANGES["1,500–2,500 sq ft"];
    var line = (d.intent === "Just exploring")
      ? "For a <b>"+esc(d.size)+"</b> home, a full replacement typically lands <b>"+r[0]+" – "+r[1]+"</b> installed."
      : "Ballpark for <b>"+esc(d.intent.toLowerCase())+"</b> on a <b>"+esc(d.size)+"</b> home: <b>"+r[0]+" – "+r[1]+"</b> installed, 10-year warranty included.";
    var note = (/15\+|12–15/.test(d.age))
      ? "At "+esc(d.age)+", you're right in the replacement window — repairs start costing more than they're worth around here."
      : "Your current system may still have life in it — a $129 tune-up could buy you time.";
    sayMany([line, note + "<br><br>And remember: a <b>free in-home visit</b> nails it to the dollar — 20 minutes, in writing, zero pressure. 📝"], function(){
      setChips([{label:"Book free quote", value:"book"},{label:"Talk to "+HOST, value:"hi"}]);
      step = { flow:null, i:0, data:{} };
    });
    return;
  }
}

/* ============================================================
   FLOW 4 — review request
   ============================================================ */
function startReview(){
  step = { flow:"review", i:0, data:{} };
  say("We'd love your feedback! How many stars for "+esc(BIZ)+"?", function(){ setStars(function(n){ reviewStep(n); }); });
}
function reviewStep(n){
  if(step.i === 0){
    step.i = 1;
    step.data.rating = n;
    if(n === 5){
      say("That's wonderful — thank you! 🙏 Would you mind sharing it on Google? It helps neighbors find us.", function(){
        var row = document.createElement("div"); row.className = "mrow bot";
        row.innerHTML = '<div class="mavatar">'+esc(HOST[0])+'</div><div class="bubble"><a class="gbtn" href="#" onclick="return false">⭐ Leave a Google review</a></div>';
        msgs.appendChild(row); scrollDown();
        setTimeout(function(){ say("Either way — thank you for choosing "+esc(BIZ)+". Stay cool out there! ❄️", function(){ step = {flow:null,i:0,data:{}}; setChips([]); }); }, FAST?0:800);
      });
      return;
    }
    say("Thank you for being honest — "+n+" stars tells us something needs fixing. What could we have done better?", function(){ setChips([]); });
    return;
  }
  if(step.i === 1){
    saveLead({ kind:"review-feedback", rating:step.data.rating, feedback:text0(), note:"private, not posted" });
    say("Noted — and I'm sorry we missed the mark. 🙏 Our service manager will <b>personally follow up</b> within one business day to make this right.<br><br>Thank you for giving us the chance to fix it.", function(){
      step = { flow:null, i:0, data:{} }; setChips([]);
    });
    return;
  }
}
function text0(){ return lastUserText; }
var lastUserText = "";

/* ============================================================
   router
   ============================================================ */
function route(text){
  var t = text.toLowerCase();
  if(step.flow === "booking")    { bookingStep(text); return; }
  if(step.flow === "afterhours"){ afterHoursStep(text); return; }
  if(step.flow === "quote")     { quoteStep(text); return; }
  if(step.flow === "review")    { reviewStep(parseInt(text,10) || 0); return; }

  if(has(t, "emergency", "midnight", "after hour", "after-hour", "closed right now", "11:42", "no cool", "no-cool", "a/c died", "ac died", "unit died", "108")){ startAfterHours(); return; }
  /* location branch runs before service branches (word-start matching fixes the
     "loCATed"-style substring class; "anywhere" no longer trips "where") */
  if(has(t, "where", "location", "address", "park", "direction")){ say("You'll find us at <b>"+esc(ADDRESS)+"</b> 📍 — but honestly, our techs come to <i>you</i> anywhere in "+esc(CITY)+". Want me to book a visit?", function(){ setChips([{label:"Book service", value:"book"}]); }); return; }
  if(has(t, "book", "appoint", "schedul", "service call", "send a tech", "tech visit", "visit") && !/book another/.test(t)){ startBooking(); return; }
  if(/book another/.test(t)){ startBooking(); return; }
  if(has(t, "quote", "estim", "ballpark")){ startQuote(); return; }
  if(has(t, "review", "rate us", "stars", "feedback")){ startReview(); return; }
  if(has(t, "replac", "new system", "install", "heat pump")){ say(installHtml(), function(){ setChips([{label:"Free quote estimate", value:"quote"},{label:"Book service", value:"book"}]); }); return; }
  if(has(t, "repair", "fix", "broken", "not cool", "warm air", "not working", "leak", "noise", "frozen", "died")){ say(repairHtml(), function(){ setChips([{label:"Book a tech visit", value:"book"},{label:"Pricing", value:"pricing"}]); }); return; }
  if(has(t, "tune up", "tune-up", "tuneup", "mainten", "check up", "check-up", "checkup", "comfort club")){ say(tuneupHtml(), function(){ setChips([{label:"Book tune-up", value:"book"},{label:"Comfort Club info", value:"tune-up"}]); }); return; }
  if(has(t, "duct")){ say(ductHtml(), function(){ setChips([{label:"Book service", value:"book"}]); }); return; }
  if(has(t, "air quality", "filter", "allerg", "humid")){ say(airHtml(), function(){ setChips([{label:"Book service", value:"book"}]); }); return; }
  if(has(t, "price", "cost", "how much", "pricing")){ say(pricesHtml(), function(){ setChips([{label:"Free quote estimate", value:"quote"}]); }); return; }
  if(has(t, "hour", "open", "close", "when do you")){ say(hoursHtml()); return; }
  if(has(t, "human", "real person", "speak", "talk to someone", "call") || (has(t, "phone") && !/skip/.test(t))){ say("You can reach a human anytime at <b>"+esc(PHONE)+"</b> 📞 — 24/7 emergency line. Or I can keep helping right here — what's up?"); return; }
  if(has(t, "thank", "thanks", "thx")){ say("Anytime! 😊 Anything else — booking, pricing, or a quote estimate?"); return; }
  if(has(t, "goodbye", "good night") || /\bbye\b/.test(t)){ say("Stay cool out there! ❄️ I'll be here whenever you need "+esc(BIZ)+"."); setChips([]); step={flow:null,i:0,data:{}}; return; }
  if(/\b(hi|hello|hey)\b/.test(t) || /^yo$/.test(t)){ say("Hey! 👋 What can I do for you — book a tech, pricing, or a free quote estimate?", function(){ setChips([{label:"Book service",value:"book"},{label:"Free quote estimate",value:"quote"},{label:"🚨 Emergency",value:"emergency"}]); }); return; }

  /* graceful fallback */
  say("Hmm, I want to make sure I get this right — I'm best with <b>booking a tech</b>, <b>pricing &amp; services</b>, <b>free quote estimates</b>, and <b>emergencies</b>. Which one is it? 🤔", function(){
    setChips([{label:"Book service",value:"book"},{label:"Free quote estimate",value:"quote"},{label:"AC repair pricing",value:"repair pricing"},{label:"🚨 Emergency",value:"emergency"}]);
  });
}

function userSays(text, silent){
  if(!silent) userRow(text);
  lastUserText = text;
  if(FAST){ route(text); return; }
  var t = 250 + Math.random()*300;
  setTimeout(function(){ route(text); }, t);
}

/* ---------- input wiring ---------- */
function sendInput(){ var v = inputEl.value.trim(); if(!v) return; inputEl.value = ""; userSays(v); }
sendBtn.addEventListener("click", sendInput);
inputEl.addEventListener("keydown", function(e){ if(e.key === "Enter") sendInput(); });

/* ---------- CTA buttons on the page ---------- */
document.querySelectorAll("[data-action]").forEach(function(el){
  el.addEventListener("click", function(e){
    e.preventDefault();
    var a = el.getAttribute("data-action");
    openPanel();
    if(a === "book") startBooking();
    else if(a === "quote") startQuote();
    else if(a === "emergency") startAfterHours();
  });
});

/* ---------- greeting ---------- */
function greet(){
  sayMany([
    "Hi there! ❄️ I'm <b>"+esc(HOST)+"</b>, the comfort coordinator at <b>"+esc(BIZ)+"</b>.",
    "I can book a tech visit, answer pricing questions, run a free quote estimate — and if your AC dies at midnight, I'm still here. 🚨<br><br>How can I help?"
  ], function(){
    setChips([{label:"Book service",value:"book"},{label:"Free quote estimate",value:"quote"},{label:"AC repair pricing",value:"repair pricing"},{label:"🚨 Emergency",value:"emergency"}]);
  });
  setTimeout(function(){ markUnread(); }, FAST ? 100 : 2500);
}
setTimeout(greet, FAST ? 50 : 900);

/* ---------- test hooks ---------- */
window.__maya = {
  open: openPanel, close: closePanel, say: userSays, send: userSays,
  state: function(){ return { step: step, leads: leads }; },
  clearLeads: function(){ leads = []; try{ localStorage.removeItem(LEAD_KEY); }catch(e){} },
  leadKey: LEAD_KEY, host: HOST, biz: BIZ
};

})();
