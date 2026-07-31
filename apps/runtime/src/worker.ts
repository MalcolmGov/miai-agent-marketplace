/**
 * Long-running turn worker scaffold.
 * Web app route handlers call @miai/runtime directly for MVP;
 * deploy this process when tool loops move to a queue.
 */
import { createWalletAdapter } from "@miai/wallet-adapter";

console.log("[miai-runtime] worker ready", {
  wallet: createWalletAdapter() ? "ok" : "missing",
  mode: "scaffold",
});

// Keep process alive in Container Apps when wired to a queue listener.
setInterval(() => {
  /* heartbeat */
}, 60_000);
