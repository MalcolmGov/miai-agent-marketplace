/** Embeddable chat widget. Premium treatment, zero dependencies, ~12KB.
 *
 *  Theming via script-tag data attributes (all optional except data-key):
 *    data-key         (required) publishable embed key
 *    data-accent      primary accent hex        (default #2bb8a8)
 *    data-accent-2    gradient partner hex      (default #157f8d)
 *    data-title       header title / agent name (default "Assistant")
 *    data-subtitle    status subtitle           (default "Online")
 *    data-greeting    first message from agent
 *    data-suggestions comma-separated quick-reply chips
 *    data-footer      brand name shown before "· Powered by MyInstantAI"
 *    data-theme       "dark" | "light"          (default "dark")
 */
export const AGENT_JS_SCRIPT = String.raw`
(function () {
  var current = document.currentScript;
  var key = current && current.getAttribute("data-key");
  if (!key) return;
  if (document.getElementById("miai-agent-root")) return;
  var origin = (current && current.src) ? new URL(current.src).origin : window.location.origin;
  function attr(n, d) { return (current && current.getAttribute(n)) || d; }

  var accent  = attr("data-accent", "#2bb8a8");
  var accent2 = attr("data-accent-2", "#157f8d");
  var title    = attr("data-title", "Assistant");
  var subtitle = attr("data-subtitle", "Online");
  var greeting = attr("data-greeting", "Hi — I'm an AI assistant (not a human). I can help with questions about our products and services, or connect you to a person.");
  var footer   = attr("data-footer", "");
  var theme    = (attr("data-theme", "dark") === "light") ? "light" : "dark";
  var sugAttr  = attr("data-suggestions", "What do you offer?,How does it work?,What does it cost?,Talk to a human");
  var suggestions = sugAttr.split(",").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4);
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  // Derive accent shades in JS (no color-mix) so the widget renders correctly on any client browser.
  function rgb(hex) { var m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return [43,184,168]; var n = parseInt(m[1],16); return [(n>>16)&255,(n>>8)&255,n&255]; }
  var ar = rgb(accent);
  function rgba(a) { return "rgba(" + ar[0] + "," + ar[1] + "," + ar[2] + "," + a + ")"; }
  var accentInk  = "rgb(" + Math.round(ar[0]*.12) + "," + Math.round(ar[1]*.12) + "," + Math.round(ar[2]*.12) + ")";
  var accentSoft = rgba(".12"), accentBorder = rgba(".34"), accentGlow = rgba(".42");

  var css = [
    ':host{all:initial;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
      '--mi-a:' + accent + ';--mi-a2:' + accent2 + ';--mi-ink:' + accentInk + ';--mi-soft:' + accentSoft + ';--mi-bd:' + accentBorder + ';' +
      '--mi-panel:#111826;--mi-panel-2:#0d141f;--mi-card:#1b2537;--mi-in:#0a1019;--mi-text:#e9eef6;--mi-sub:#8fa1b8;--mi-bord:rgba(255,255,255,.09)}',
    ':host([data-theme="light"]){--mi-panel:#ffffff;--mi-panel-2:#f4f7fb;--mi-card:#eef2f8;--mi-in:#f4f7fb;--mi-text:#15212f;--mi-sub:#5f7085;--mi-bord:rgba(6,20,40,.10)}',
    '*{box-sizing:border-box;margin:0;padding:0;font-family:inherit}',
    'button{border:none;background:none;color:inherit;font:inherit;line-height:normal}',

    /* ---- launcher ---- */
    '#miai-fab{position:fixed;right:22px;bottom:22px;z-index:2147483000;width:60px;height:60px;border:0;border-radius:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(140deg,var(--mi-a),var(--mi-a2));color:var(--mi-ink);box-shadow:0 12px 30px ' + accentGlow + ',0 4px 10px rgba(0,0,0,.28);transition:transform .18s ease,box-shadow .18s ease}',
    '#miai-fab:hover{transform:translateY(-2px) scale(1.03)}',
    '#miai-fab:active{transform:scale(.96)}',
    '#miai-fab svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:opacity .15s ease,transform .2s ease}',
    '#miai-fab .mi-ic-x{position:absolute;opacity:0;transform:rotate(-90deg) scale(.6)}',
    '#miai-fab.open .mi-ic-chat{opacity:0;transform:rotate(90deg) scale(.6)}',
    '#miai-fab.open .mi-ic-x{opacity:1;transform:rotate(0) scale(1)}',
    '#miai-dot{position:absolute;top:-2px;right:-2px;width:16px;height:16px;border-radius:50%;background:#ff5d6c;border:2.5px solid var(--mi-panel-2);color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center}',

    /* ---- panel ---- */
    '#miai-panel{position:fixed;right:22px;bottom:96px;z-index:2147483000;width:384px;max-width:calc(100vw - 24px);height:min(74vh,620px);display:flex;flex-direction:column;overflow:hidden;border-radius:22px;background:var(--mi-panel);border:1px solid var(--mi-bord);box-shadow:0 28px 70px rgba(0,0,0,.5),0 4px 16px rgba(0,0,0,.28);opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;transform-origin:bottom right;transition:opacity .22s ease,transform .22s cubic-bezier(.2,.9,.3,1.15)}',
    '#miai-panel.open{opacity:1;transform:none;pointer-events:auto}',
    '@media (max-width:480px){#miai-panel{right:0;left:0;bottom:0;max-width:100vw;width:100vw;height:84vh;border-radius:20px 20px 0 0}}',
    '@media (prefers-reduced-motion:reduce){#miai-panel,#miai-fab,#miai-fab svg,.miai-row{transition:none;animation:none}}',

    /* ---- header ---- */
    '#miai-head{display:flex;align-items:center;gap:11px;padding:15px 14px 14px;border-bottom:1px solid var(--mi-bord);background:linear-gradient(180deg,' + rgba(".10") + ',transparent)}',
    '#miai-ava{width:42px;height:42px;border-radius:13px;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(140deg,var(--mi-a),var(--mi-a2));color:var(--mi-ink);box-shadow:0 6px 16px ' + rgba(".4") + '}',
    '#miai-ava svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '#miai-ttl{flex:1;min-width:0}',
    '#miai-ttl b{display:block;font-size:15.5px;font-weight:700;color:var(--mi-text);letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#miai-sub{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--mi-sub);margin-top:2px}',
    '#miai-pulse{width:7px;height:7px;border-radius:50%;background:#34d399;animation:miai-pulse 2s infinite}',
    '@keyframes miai-pulse{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}50%{box-shadow:0 0 0 5px rgba(52,211,153,0)}}',
    '.miai-hb{width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--mi-sub);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s ease,color .12s ease}',
    '.miai-hb:hover{background:' + rgba(".14") + ';color:var(--mi-text)}',
    '.miai-hb svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',

    /* ---- messages ---- */
    '#miai-msgs{flex:1;overflow-y:auto;padding:16px 14px 8px;display:flex;flex-direction:column;gap:11px;background:var(--mi-panel-2);scrollbar-width:thin;scrollbar-color:var(--mi-bord) transparent}',
    '#miai-msgs::-webkit-scrollbar{width:6px}',
    '#miai-msgs::-webkit-scrollbar-thumb{background:var(--mi-bord);border-radius:5px}',
    '.miai-row{display:flex;gap:8px;max-width:100%;animation:miai-in .24s ease both}',
    '.miai-row.u{justify-content:flex-end}',
    '@keyframes miai-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}',
    '.miai-bav{width:26px;height:26px;border-radius:8px;flex:none;margin-top:auto;display:flex;align-items:center;justify-content:center;background:linear-gradient(140deg,var(--mi-a),var(--mi-a2));color:var(--mi-ink)}',
    '.miai-bav svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.miai-m{padding:11px 14px;font-size:13.5px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word;max-width:262px}',
    '.miai-u .miai-m{color:var(--mi-ink);background:linear-gradient(135deg,var(--mi-a),var(--mi-a2));border-radius:16px 16px 5px 16px;font-weight:500}',
    '.miai-a .miai-m{color:var(--mi-text);background:var(--mi-card);border:1px solid var(--mi-bord);border-radius:16px 16px 16px 5px}',

    /* ---- typing ---- */
    '#miai-typing{display:none;padding:13px 15px;background:var(--mi-card);border:1px solid var(--mi-bord);border-radius:16px 16px 16px 5px}',
    '.miai-row.t #miai-typing{display:flex;gap:4px}',
    '#miai-typing i{width:6px;height:6px;border-radius:50%;background:var(--mi-sub);animation:miai-b 1.2s infinite}',
    '#miai-typing i:nth-child(2){animation-delay:.15s}',
    '#miai-typing i:nth-child(3){animation-delay:.3s}',
    '@keyframes miai-b{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}',

    /* ---- suggestion chips ---- */
    '#miai-sugs{display:flex;flex-direction:column;gap:8px;padding:2px 14px 10px 48px}',
    '.miai-chip{align-self:flex-start;text-align:left;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--mi-bd);background:var(--mi-soft);color:var(--mi-a);border-radius:12px;padding:9px 14px;font-size:12.5px;font-weight:600;line-height:1.25;cursor:pointer;max-width:100%;transition:background .14s ease,transform .12s ease}',
    '.miai-chip::before{content:"›";font-weight:800;opacity:.7}',
    '.miai-chip:hover{background:' + rgba(".2") + ';transform:translateX(2px)}',

    /* ---- input ---- */
    '#miai-form{display:flex;align-items:center;gap:9px;padding:12px 13px;border-top:1px solid var(--mi-bord);background:var(--mi-panel)}',
    '#miai-input{flex:1;background:var(--mi-in);border:1px solid var(--mi-bord);border-radius:14px;color:var(--mi-text);padding:12px 15px;font-size:13.5px;outline:none;transition:border-color .15s ease,box-shadow .15s ease}',
    '#miai-input::placeholder{color:var(--mi-sub)}',
    '#miai-input:focus{border-color:var(--mi-a);box-shadow:0 0 0 3px ' + rgba(".2") + '}',
    '#miai-send{width:44px;height:44px;flex:none;border:0;border-radius:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--mi-a),var(--mi-a2));color:var(--mi-ink);transition:transform .13s ease,opacity .13s ease}',
    '#miai-send:hover{transform:scale(1.05)}',
    '#miai-send:disabled{opacity:.45;cursor:default;transform:none}',
    '#miai-send svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',

    /* ---- footer ---- */
    '#miai-foot{text-align:center;font-size:10.5px;color:var(--mi-sub);padding:9px 12px;background:var(--mi-panel);border-top:1px solid var(--mi-bord);letter-spacing:.01em}',
    '#miai-foot b{color:var(--mi-text);opacity:.75;font-weight:600}',
    '#miai-foot span{color:var(--mi-a)}'
  ].join("\n");

  var chatIcon = '<svg class="mi-ic-chat" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var xIcon = '<svg class="mi-ic-x" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var botIcon = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var resetIcon = '<svg viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
  var minIcon = '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>';
  var sendIcon = '<svg viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  function esc(s) { return String(s).replace(/[<>&"]/g, function (c) { return { "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[c]; }); }
  var footHtml = (footer ? "<b>" + esc(footer) + "</b> &middot; " : "") + "Powered by <span>MyInstantAI</span>";

  var root = document.createElement("div");
  root.id = "miai-agent-root";
  root.setAttribute("data-theme", theme);
  var shadow = root.attachShadow({ mode: "open" });
  shadow.innerHTML =
    '<style>' + css + '</style>' +
    '<button id="miai-fab" type="button" aria-label="Open chat" style="position:relative">' + chatIcon + xIcon + '<span id="miai-dot">1</span></button>' +
    '<div id="miai-panel" role="dialog" aria-label="Chat with ' + esc(title) + '">' +
    '  <div id="miai-head">' +
    '    <div id="miai-ava">' + botIcon + '</div>' +
    '    <div id="miai-ttl"><b></b><span id="miai-sub"><span id="miai-pulse"></span>Online &middot; <em id="miai-substr" style="font-style:normal"></em></span></div>' +
    '    <button class="miai-hb" id="miai-reset" type="button" aria-label="Restart chat">' + resetIcon + '</button>' +
    '    <button class="miai-hb" id="miai-close" type="button" aria-label="Minimize chat">' + minIcon + '</button>' +
    '  </div>' +
    '  <div id="miai-msgs"></div>' +
    '  <div id="miai-sugs"></div>' +
    '  <form id="miai-form">' +
    '    <input id="miai-input" type="text" enterkeyhint="send" placeholder="Ask us anything…" autocomplete="off" aria-label="Message"/>' +
    '    <button id="miai-send" type="submit" aria-label="Send">' + sendIcon + '</button>' +
    '  </form>' +
    '  <div id="miai-foot">' + footHtml + '</div>' +
    '</div>';
  document.body.appendChild(root);

  var panel = shadow.querySelector("#miai-panel");
  var fab = shadow.querySelector("#miai-fab");
  var dot = shadow.querySelector("#miai-dot");
  var msgs = shadow.querySelector("#miai-msgs");
  var sugs = shadow.querySelector("#miai-sugs");
  var form = shadow.querySelector("#miai-form");
  var input = shadow.querySelector("#miai-input");
  var send = shadow.querySelector("#miai-send");
  var opened = false, busy = false;
  var sessionId = newSession();

  function newSession() { return "ms_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  shadow.querySelector("#miai-ttl b").textContent = title;
  shadow.querySelector("#miai-substr").textContent = subtitle;
  input.placeholder = "Ask " + title + " anything…";

  function greet() {
    msgs.innerHTML = "";
    addBot(greeting);
    renderSuggestions();
  }

  function toggle(openState) {
    var willOpen = typeof openState === "boolean" ? openState : !panel.classList.contains("open");
    panel.classList.toggle("open", willOpen);
    fab.classList.toggle("open", willOpen);
    fab.setAttribute("aria-label", willOpen ? "Close chat" : "Open chat");
    if (willOpen) { dot.style.display = "none"; if (!opened) { opened = true; greet(); } setTimeout(function () { input.focus(); }, 220); }
  }
  fab.addEventListener("click", function () { toggle(); });
  shadow.querySelector("#miai-close").addEventListener("click", function () { toggle(false); });
  shadow.querySelector("#miai-reset").addEventListener("click", function () { if (busy) return; sessionId = newSession(); greet(); });

  function renderSuggestions() {
    sugs.innerHTML = "";
    suggestions.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "miai-chip"; b.textContent = s;
      b.addEventListener("click", function () { if (busy) return; sugs.innerHTML = ""; submit(s); });
      sugs.appendChild(b);
    });
  }

  function addUser(text) {
    var row = document.createElement("div");
    row.className = "miai-row u";
    row.innerHTML = '<div class="miai-m"></div>';
    row.querySelector(".miai-m").textContent = text;
    msgs.appendChild(row); msgs.scrollTop = msgs.scrollHeight;
  }
  function botRow() {
    var row = document.createElement("div");
    row.className = "miai-row";
    row.innerHTML = '<div class="miai-bav">' + botIcon + '</div><div class="miai-m"></div>';
    msgs.appendChild(row);
    return row.querySelector(".miai-m");
  }
  function addBot(text) { var b = botRow(); b.textContent = text; msgs.scrollTop = msgs.scrollHeight; }

  function showTyping(on) {
    var row = shadow.querySelector(".miai-row.t");
    if (on) {
      if (!row) { row = document.createElement("div"); row.className = "miai-row t"; row.innerHTML = '<div class="miai-bav">' + botIcon + '</div><div id="miai-typing"><i></i><i></i><i></i></div>'; msgs.appendChild(row); }
      msgs.scrollTop = msgs.scrollHeight;
    } else if (row) { row.remove(); }
  }

  // Reveal the reply word-by-word for a live, streaming feel (the endpoint is one-shot today).
  function reveal(text, done) {
    var b = botRow();
    if (reduce) { b.textContent = text; msgs.scrollTop = msgs.scrollHeight; done && done(); return; }
    var words = text.split(/(\s+)/), i = 0;
    (function tick() {
      if (i >= words.length) { done && done(); return; }
      b.textContent += words[i++]; msgs.scrollTop = msgs.scrollHeight;
      setTimeout(tick, 16 + Math.random() * 38);
    })();
  }

  function finish() { busy = false; send.disabled = false; input.focus(); }
  function submit(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    busy = true; sugs.innerHTML = "";
    addUser(text);
    send.disabled = true; showTyping(true);
    fetch(origin + "/api/embed/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: key, message: text, sessionId: sessionId })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (data) {
        showTyping(false);
        reveal((data && data.reply) || "We're briefly unavailable — please try again in a moment.", finish);
      })
      .catch(function () { showTyping(false); addBot("Connection issue — please try again."); finish(); });
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); var t = input.value; input.value = ""; submit(t); });
})();
`;

export function buildEmbedScriptTag(options: {
  src: string;
  key: string;
  integrity: string;
}): string {
  return `<script src="${options.src}" data-key="${options.key}" integrity="${options.integrity}" crossorigin="anonymous" async></script>`;
}
