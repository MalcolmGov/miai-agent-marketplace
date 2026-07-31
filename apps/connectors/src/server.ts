import { listConnectors, WEBHOOK_TEMPLATES } from "@miai/connectors";
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 4080);

createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url === "/v1/connectors") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ connectors: listConnectors(), templates: WEBHOOK_TEMPLATES }));
    return;
  }
  res.writeHead(404);
  res.end("not found");
}).listen(port, () => {
  console.log(`[miai-connectors] listening on :${port}`);
});
