export const dynamic = "force-dynamic";

const SCRIPT = `
(function () {
  var current = document.currentScript;
  var key = current && current.getAttribute("data-key");
  if (!key) return;
  var origin = (current && current.src) ? new URL(current.src).origin : window.location.origin;
  if (document.getElementById("miai-agent-root")) return;

  var root = document.createElement("div");
  root.id = "miai-agent-root";
  root.innerHTML = [
    '<style>',
    '#miai-agent-root{all:initial;font-family:system-ui,sans-serif}',
    '#miai-fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;background:#2bb8a8;color:#06201c;border:0;border-radius:999px;padding:14px 18px;font-weight:600;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)}',
    '#miai-panel{display:none;position:fixed;right:20px;bottom:76px;z-index:2147483000;width:340px;max-width:calc(100vw - 32px);height:460px;background:#121821;color:#e8eef7;border:1px solid #243041;border-radius:14px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.45);flex-direction:column}',
    '#miai-panel.open{display:flex}',
    '#miai-head{padding:12px 14px;border-bottom:1px solid #243041;font-size:14px;font-weight:600}',
    '#miai-msgs{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}',
    '.miai-m{max-width:90%;padding:8px 10px;border-radius:10px;font-size:13px;line-height:1.4;white-space:pre-wrap}',
    '.miai-u{align-self:flex-end;background:rgba(43,184,168,.28)}',
    '.miai-a{align-self:flex-start;background:#161d28}',
    '#miai-form{display:flex;gap:8px;padding:10px;border-top:1px solid #243041}',
    '#miai-input{flex:1;background:#0d1219;border:1px solid #243041;border-radius:8px;color:#e8eef7;padding:8px 10px;font-size:13px}',
    '#miai-send{background:#2bb8a8;border:0;border-radius:8px;color:#06201c;padding:8px 12px;font-weight:600;cursor:pointer}',
    '</style>',
    '<button id="miai-fab" type="button">Chat</button>',
    '<div id="miai-panel">',
    '  <div id="miai-head">MyInstantAI Agent</div>',
    '  <div id="miai-msgs"></div>',
    '  <form id="miai-form"><input id="miai-input" placeholder="Ask us anything…" autocomplete="off"/><button id="miai-send" type="submit">Send</button></form>',
    '</div>'
  ].join("");
  document.body.appendChild(root);

  var panel = root.querySelector("#miai-panel");
  var fab = root.querySelector("#miai-fab");
  var msgs = root.querySelector("#miai-msgs");
  var form = root.querySelector("#miai-form");
  var input = root.querySelector("#miai-input");

  fab.addEventListener("click", function () {
    panel.classList.toggle("open");
  });

  function add(role, text) {
    var el = document.createElement("div");
    el.className = "miai-m " + (role === "user" ? "miai-u" : "miai-a");
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    add("user", text);
    fetch(origin + "/api/embed/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: key, message: text })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        add("assistant", data.paused
          ? (data.reply || "We're temporarily paused — please try again after tokens are topped up.")
          : (data.reply || "…"));
      })
      .catch(function () {
        add("assistant", "Connection issue — please try again.");
      });
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
