import { apiOk } from "@/lib/api-error";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "MyInstantAI Agent Marketplace API",
    version: "1.0.0",
    description:
      "Versioned public contract under /api/v1. Legacy unversioned routes (e.g. /api/embed/chat) remain supported.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/embed/chat": {
      post: {
        summary: "Embed widget chat turn",
        operationId: "embedChat",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["key", "message"],
                properties: {
                  key: { type: "string", description: "Embed public key for the agent rental" },
                  message: { type: "string" },
                  sessionId: { type: "string" },
                  replyLanguage: { type: "string" },
                  correlationId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Assistant reply",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reply: { type: "string" },
                    paused: { type: "boolean" },
                    balance: { type: "number" },
                    correlationId: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid request body" },
          "429": { description: "Rate limited" },
        },
      },
      options: {
        summary: "CORS preflight for embed chat",
        responses: { "204": { description: "No content" } },
      },
    },
    "/rent": {
      post: {
        summary: "Rent an agent (admin)",
        operationId: "rentAgent",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["agentId"],
                properties: {
                  agentId: { type: "string" },
                  tier: { type: "string", enum: ["standard", "pro", "enterprise"] },
                  workspaceId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Rental created" },
          "400": { description: "Invalid request body" },
          "401": { description: "Unauthorized" },
          "404": { description: "Unknown agent" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
} as const;

export async function GET() {
  return apiOk(spec);
}
