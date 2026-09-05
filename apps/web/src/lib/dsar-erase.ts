import { deleteToken, listConnected } from "@miai/connectors";
import { deleteCustomRequestsForWorkspace } from "@/lib/custom-requests";
import { deleteKnowledgeForWorkspace } from "@/lib/knowledge";
import { databaseUrl, query } from "@/lib/pg";
import { clearWorkspaceRentals, redactWorkspaceAuditDetails } from "@/lib/store";
import { deleteTurnTranscriptsForWorkspace } from "@/lib/traceability";
import { clearWorkspaceMembers } from "@/lib/workspace-members";

export type ErasureCounts = Record<string, number>;

/**
 * Best-effort workspace data erasure for DSAR / offboarding.
 * Audit rows are retained append-only (type/agent/timestamp) but their personal-data
 * detail is redacted in both memory and Postgres; tombstones are appended by the API
 * route before/after this call.
 */
export async function eraseWorkspaceData(
  workspaceId: string,
): Promise<{ deleted: ErasureCounts }> {
  const deleted: ErasureCounts = {
    rentals: 0,
    turnTranscripts: 0,
    knowledgeSources: 0,
    oauthTokens: 0,
    workspaceMembers: 0,
    customRequests: 0,
    auditDetailsRedacted: 0,
  };

  deleted.rentals = await clearWorkspaceRentals(workspaceId);
  deleted.turnTranscripts = await deleteTurnTranscriptsForWorkspace(workspaceId);
  deleted.knowledgeSources = await deleteKnowledgeForWorkspace(workspaceId);
  deleted.oauthTokens = await eraseOAuthTokens(workspaceId);
  deleted.workspaceMembers = await clearWorkspaceMembers(workspaceId);
  deleted.customRequests = await deleteCustomRequestsForWorkspace(workspaceId);
  deleted.auditDetailsRedacted = await redactWorkspaceAuditDetails(workspaceId);

  return { deleted };
}

/**
 * Delete every stored OAuth connector token for an owner (workspace OR consumer — both key
 * the token store by their own id). Shared by the workspace and consumer DSAR erasers.
 */
export async function eraseOAuthTokens(ownerId: string): Promise<number> {
  const connectors = await listConnected(ownerId);
  for (const connectorId of connectors) {
    try {
      await deleteToken(ownerId, connectorId);
    } catch (err) {
      console.error("[dsar-erase] oauth token delete failed", connectorId, err);
    }
  }

  if (databaseUrl()) {
    try {
      const res = await query("DELETE FROM miai_oauth_tokens WHERE workspace_id = $1", [
        ownerId,
      ]);
      return Math.max(connectors.length, res.rowCount ?? 0);
    } catch (err) {
      console.error("[dsar-erase] postgres oauth bulk delete failed", err);
    }
  }

  return connectors.length;
}
