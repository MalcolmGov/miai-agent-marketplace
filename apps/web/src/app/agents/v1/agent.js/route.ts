export const dynamic = "force-dynamic";

/** Embeddable chat widget. Premium treatment, zero dependencies, ~9KB.
 *
 *  Theming via script-tag data attributes (all optional):
 *    data-key         (required) publishable embed key
 *    data-accent      primary accent hex        (default #2bb8a8)
 *    data-accent-2    gradient partner hex      (default #157f8d)
 *    data-title       header title              (default "Assistant")
 *    data-greeting    first message from agent
 *    data-suggestions comma-separated quick-reply chips
 */
const SCRIPT = String.raw`
(function () {
  var current = document.currentScript;
  var key = current && current.getAttribute("data-key");
  if (!key) return;
  if (document.getElementById("miai-agent-root")) return;
  var origin = (current && current.src) ? new URL(current.src).origin : window.location.origin;

  var accent  = (current && current.getAttribute("data-accent"))   || "#2bb8a8";
  var accent2 = (current && current.getAttribute("data-accent-2")) || "#157f8d";
  var title   = (current && current.getAttribute("data-title"))    || "Assistant";
  var greeting = (current && current.getAttribute("data-greeting")) ||
    "Hi! I'm the AI assistant. Ask me anything about our products and services, or say you'd like a human.";
  var sugAttr = (current && current.getAttribute("data-suggestions")) || "What do you offer?,How does it work?,What does it cost?,Talk to a human";
  var suggestions = sugAttr.split(",").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4);

  var css = [
    '#miai-agent-root{all:initial;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;--mi-a:' + accent + ';--mi-a2:' + accent2 + '}',
    '#miai-agent-root *{box-sizing:border-box;margin:0;padding:0}',

    /* ---- launcher ---- */
    '#miai-fab{position:fixed;right:22px;bottom:22px;z-index:2147483000;width:58px;height:58px;border:0;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--mi-a),var(--mi-a2));box-shadow:0 6px 22px rgba(0,0,0,.38),0 2px 8px ' + accent + '55;transition:transform .18s ease,box-shadow .18s ease}',
    '#miai-fab:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 10px 30px rgba(0,0,0,.42),0 4px 14px ' + accent + '66}',
    '#miai-fab:active{transform:scale(.96)}',
    '#miai-fab svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:opacity .15s ease,transform .2s ease}',
    '#miai-fab .mi-ic-x{position:absolute;opacity:0;transform:rotate(-90deg) scale(.6)}',
    '#miai-fab.open .mi-ic-chat{opacity:0;transform:rotate(90deg) scale(.6)}',
    '#miai-fab.open .mi-ic-x{opacity:1;transform:rotate(0) scale(1)}',
    '#miai-dot{position:absolute;top:3px;right:3px;width:12px;height:12px;border-radius:50%;background:#34d399;border:2px solid #0d1420}',

    /* ---- panel ---- */
    '#miai-panel{position:fixed;right:22px;bottom:92px;z-index:2147483000;width:384px;max-width:calc(100vw - 24px);height:min(74vh,620px);display:flex;flex-direction:column;overflow:hidden;border-radius:20px;background:linear-gradient(180deg,#101826 0%,#0d141f 100%);border:1px solid rgba(255,255,255,.09);box-shadow:0 24px 64px rgba(0,0,0,.5),0 4px 16px rgba(0,0,0,.3);opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;transition:opacity .22s ease,transform .22s cubic-bezier(.34,1.4,.64,1)}',
    '#miai-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',
    '@media (max-width:480px){#miai-panel{right:0;left:0;bottom:0;max-width:100vw;width:100vw;height:82vh;border-radius:20px 20px 0 0}}',
    '@media (prefers-reduced-motion:reduce){#miai-panel,#miai-fab,#miai-fab svg{transition:none}}',

    /* ---- header ---- */
    '#miai-head{display:flex;align-items:center;gap:11px;padding:16px 16px 14px;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02)}',
    '#miai-ava{width:38px;height:38px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--mi-a),var(--mi-a2));box-shadow:0 2px 8px ' + accent + '44}',
    '#miai-ava svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '#miai-ttl{flex:1;min-width:0}',
    '#miai-ttl b{display:block;font-size:14.5px;font-weight:650;color:#f2f6fb;letter-spacing:-.01em}',
    '#miai-sub{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#8fa1b8;margin-top:1px}',
    '#miai-pulse{width:7px;height:7px;border-radius:50%;background:#34d399;animation:miai-pulse 2s infinite}',
    '@keyframes miai-pulse{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}50%{box-shadow:0 0 0 4px rgba(52,211,153,0)}}',
    '#miai-close{width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:#8fa1b8;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s ease,color .12s ease}',
    '#miai-close:hover{background:rgba(255,255,255,.07);color:#e8eef7}',

    /* ---- messages ---- */
    '#miai-msgs{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.14) transparent}',
    '#miai-msgs::-webkit-scrollbar{width:5px}',
    '#miai-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:4px}',
    '.miai-m{max-width:86%;padding:10px 13px;font-size:13.5px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word;animation:miai-in .22s ease both}',
    '@keyframes miai-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}',
    '.miai-u{align-self:flex-end;color:#fff;background:linear-gradient(135deg,var(--mi-a),var(--mi-a2));border-radius:16px 16px 5px 16px;box-shadow:0 2px 8px ' + accent + '33}',
    '.miai-a{align-self:flex-start;color:#dce6f2;background:#192333;border:1px solid rgba(255,255,255,.06);border-radius:16px 16px 16px 5px}',

    /* ---- typing ---- */
    '#miai-typing{align-self:flex-start;display:none;padding:12px 15px;background:#192333;border:1px solid rgba(255,255,255,.06);border-radius:16px 16px 16px 5px}',
    '#miai-typing.on{display:flex;gap:4px}',
    '#miai-typing i{width:6px;height:6px;border-radius:50%;background:#7f93ab;animation:miai-b 1.2s infinite}',
    '#miai-typing i:nth-child(2){animation-delay:.15s}',
    '#miai-typing i:nth-child(3){animation-delay:.3s}',
    '@keyframes miai-b{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}',

    /* ---- suggestion chips ---- */
    '#miai-sugs{display:flex;flex-wrap:wrap;gap:8px;row-gap:9px;padding:2px 14px 8px;max-width:100%}',
    '.miai-chip{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;border:0;background:linear-gradient(135deg,var(--mi-a),var(--mi-a2));color:#fff;border-radius:999px;padding:9px 16px;font-size:12px;font-weight:600;line-height:1.2;letter-spacing:.01em;cursor:pointer;white-space:nowrap;max-width:100%;box-shadow:0 2px 8px ' + accent + '3d;transition:all .14s ease}',
    '.miai-chip:hover{filter:brightness(1.12);transform:translateY(-1px);box-shadow:0 5px 14px ' + accent + '55}',

    /* ---- input ---- */
    '#miai-form{display:flex;align-items:center;gap:9px;padding:12px 14px;border-top:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02)}',
    '#miai-input{flex:1;background:#0a1019;border:1px solid rgba(255,255,255,.1);border-radius:22px;color:#e8eef7;padding:11px 16px;font-size:13.5px;outline:none;transition:border-color .15s ease,box-shadow .15s ease}',
    '#miai-input::placeholder{color:#66788e}',
    '#miai-input:focus{border-color:var(--mi-a);box-shadow:0 0 0 3px ' + accent + '26}',
    '#miai-send{width:42px;height:42px;flex:none;border:0;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--mi-a),var(--mi-a2));transition:transform .13s ease,opacity .13s ease}',
    '#miai-send:hover{transform:scale(1.06)}',
    '#miai-send:disabled{opacity:.45;cursor:default;transform:none}',
    '#miai-send svg{width:17px;height:17px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;margin-left:2px}',

    /* ---- footer ---- */
    '#miai-foot{text-align:center;font-size:10px;color:#5b6c82;padding:0 0 9px;letter-spacing:.02em}',
    '#miai-foot a{color:#7f93ab;text-decoration:none}'
  ].join("\n");

  var chatIcon = '<svg class="mi-ic-chat" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var xIcon = '<svg class="mi-ic-x" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var sparkIcon = '<svg viewBox="0 0 24 24"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/></svg>';
  var sendIcon = '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  var root = document.createElement("div");
  root.id = "miai-agent-root";
  root.innerHTML =
    '<style>' + css + '</style>' +
    '<button id="miai-fab" type="button" aria-label="Open chat">' + chatIcon + xIcon + '<span id="miai-dot"></span></button>' +
    '<div id="miai-panel" role="dialog" aria-label="Chat with ' + title.replace(/[<>&"]/g, "") + '">' +
    '  <div id="miai-head">' +
    '    <div id="miai-ava">' + sparkIcon + '</div>' +
    '    <div id="miai-ttl"><b></b><span id="miai-sub"><span id="miai-pulse"></span>AI assistant &middot; Online</span></div>' +
    '    <button id="miai-close" type="button" aria-label="Close chat">&#10005;</button>' +
    '  </div>' +
    '  <div id="miai-msgs"></div>' +
    '  <div id="miai-sugs"></div>' +
    '  <form id="miai-form">' +
    '    <input id="miai-input" placeholder="Ask us anything…" autocomplete="off" aria-label="Message"/>' +
    '    <button id="miai-send" type="submit" aria-label="Send">' + sendIcon + '</button>' +
    '  </form>' +
    '  <div id="miai-foot">Powered by MyInstantAI</div>' +
    '</div>';
  document.body.appendChild(root);

  var panel = root.querySelector("#miai-panel");
  var fab = root.querySelector("#miai-fab");
  var msgs = root.querySelector("#miai-msgs");
  var sugs = root.querySelector("#miai-sugs");
  var form = root.querySelector("#miai-form");
  var input = root.querySelector("#miai-input");
  var send = root.querySelector("#miai-send");
  var typing = null;
  var opened = false;
  var sessionId = newSession();

  function newSession() {
    return "ms_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function resetConversation() {
    msgs.innerHTML = "";
    sugs.innerHTML = "";
    opened = false;
    sessionId = newSession();
  }

  root.querySelector("#miai-ttl b").textContent = title;

  function toggle(openState) {
    var willOpen = typeof openState === "boolean" ? openState : !panel.classList.contains("open");
    if (!willOpen) resetConversation();
    panel.classList.toggle("open", willOpen);
    fab.classList.toggle("open", willOpen);
    fab.setAttribute("aria-label", willOpen ? "Close chat" : "Open chat");
    if (willOpen && !opened) {
      opened = true;
      add("assistant", greeting);
      renderSuggestions();
    }
    if (willOpen) setTimeout(function () { input.focus(); }, 220);
  }
  fab.addEventListener("click", function () { toggle(); });
  root.querySelector("#miai-close").addEventListener("click", function () { toggle(false); });

  function renderSuggestions() {
    sugs.innerHTML = "";
    suggestions.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "miai-chip";
      b.textContent = s;
      b.addEventListener("click", function () {
        sugs.innerHTML = "";
        submit(s);
      });
      sugs.appendChild(b);
    });
  }

  function add(role, text) {
    var el = document.createElement("div");
    el.className = "miai-m " + (role === "user" ? "miai-u" : "miai-a");
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping(on) {
    if (!typing) {
      typing = document.createElement("div");
      typing.id = "miai-typing";
      typing.innerHTML = "<i></i><i></i><i></i>";
    }
    if (on) {
      msgs.appendChild(typing);
      typing.classList.add("on");
      msgs.scrollTop = msgs.scrollHeight;
    } else {
      typing.classList.remove("on");
      if (typing.parentNode) typing.parentNode.removeChild(typing);
    }
  }

  function submit(text) {
    text = (text || "").trim();
    if (!text) return;
    sugs.innerHTML = "";
    add("user", text);
    send.disabled = true;
    showTyping(true);
    fetch(origin + "/api/embed/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: key, message: text, sessionId: sessionId })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        showTyping(false);
        add("assistant", data.paused
          ? (data.reply || "We're briefly paused — please try again shortly.")
          : (data.reply || "…"));
      })
      .catch(function () {
        showTyping(false);
        add("assistant", "Connection issue — please try again.");
      })
      .then(function () {
        send.disabled = false;
        input.focus();
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var t = input.value;
    input.value = "";
    submit(t);
  });
})();
`;

export async function GET() {
  return new Response(SCRIPT, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=60",
      "access-control-allow-origin": "*",
    },
  });
}
