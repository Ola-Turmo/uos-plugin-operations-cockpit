// Operations Cockpit Plugin Manifest
// This module defines the plugin manifest for the Operations Cockpit plugin

const pluginId = "@uos/plugin-operations-cockpit";

// Internal tool declarations (pre-SDK format)
interface ToolDeclaration {
  toolId: string;
  name: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

interface LauncherDeclaration {
  launcherId: string;
  name: string;
  description: string;
  placement: {
    zone: string;
    section: string;
  };
  icon: string;
}

interface InternalManifest {
  apiVersion: string;
  pluginId: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  tools: ToolDeclaration[];
  launchers: LauncherDeclaration[];
}

const manifest: InternalManifest = {
  apiVersion: "1.0",
  pluginId,
  name: "Operations Cockpit",
  description: "Mission Control for UOS — central monitoring hub",
  version: "1.0.0",
  capabilities: [
    "tools",
    "events.subscribe",
    "events.emit",
    "jobs.schedule",
    "http.outbound",
    "activity.log.write",
  ],
  tools: [
    {
      toolId: `${pluginId}/ping`,
      name: "ping",
      description: "Health check ping",
      parametersSchema: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          pong: { type: "string" },
          timestamp: { type: "string" },
        },
        required: ["pong", "timestamp"],
      },
    },
    {
      toolId: `${pluginId}/reportToolHealth`,
      name: "reportToolHealth",
      description: "Report health status for a tool in a specific domain",
      parametersSchema: {
        type: "object",
        properties: {
          toolId: { type: "string" },
          domain: { type: "string" },
          status: { type: "string", enum: ["ok", "degraded", "error"] },
          metrics: { type: "object" },
        },
        required: ["toolId", "domain", "status"],
      },
      outputSchema: {
        type: "object",
        properties: {
          recorded: { type: "boolean" },
        },
        required: ["recorded"],
      },
    },
    {
      toolId: `${pluginId}/getToolHealthRegistry`,
      name: "getToolHealthRegistry",
      description: "Get health registry for all tools, optionally filtered by domain",
      parametersSchema: {
        type: "object",
        properties: {
          domain: { type: "string" },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          tools: {
            type: "array",
            items: {
              type: "object",
              properties: {
                toolId: { type: "string" },
                domain: { type: "string" },
                status: { type: "string" },
                lastUpdated: { type: "string" },
                metrics: { type: "object" },
              },
            },
          },
        },
        required: ["tools"],
      },
    },
    {
      toolId: `${pluginId}/generateReview`,
      name: "generateReview",
      description: "Generate an operations review report for a given period",
      parametersSchema: {
        type: "object",
        properties: {
          period: { type: "string" },
          domain: { type: "string" },
        },
        required: ["period"],
      },
      outputSchema: {
        type: "object",
        properties: {
          report: { type: "string" },
          metrics: { type: "object" },
        },
        required: ["report", "metrics"],
      },
    },
    {
      toolId: `${pluginId}/getAlertDetail`,
      name: "getAlertDetail",
      description: "Get detailed information about a specific alert",
      parametersSchema: {
        type: "object",
        properties: {
          alertId: { type: "string" },
        },
        required: ["alertId"],
      },
      outputSchema: {
        type: "object",
        properties: {
          alert: { type: "object" },
        },
        required: ["alert"],
      },
    },
    {
      toolId: `${pluginId}/acknowledgeAlert`,
      name: "acknowledgeAlert",
      description: "Acknowledge an alert with an optional note",
      parametersSchema: {
        type: "object",
        properties: {
          alertId: { type: "string" },
          note: { type: "string" },
        },
        required: ["alertId"],
      },
      outputSchema: {
        type: "object",
        properties: {
          alert: { type: "object" },
        },
        required: ["alert"],
      },
    },
    {
      toolId: `${pluginId}/resolveAlert`,
      name: "resolveAlert",
      description: "Resolve an alert with an optional resolution description",
      parametersSchema: {
        type: "object",
        properties: {
          alertId: { type: "string" },
          resolution: { type: "string" },
        },
        required: ["alertId"],
      },
      outputSchema: {
        type: "object",
        properties: {
          alert: { type: "object" },
        },
        required: ["alert"],
      },
    },
    {
      toolId: `${pluginId}/generateRemediation`,
      name: "generateRemediation",
      description: "Generate remediation steps for an alert",
      parametersSchema: {
        type: "object",
        properties: {
          alertId: { type: "string" },
        },
        required: ["alertId"],
      },
      outputSchema: {
        type: "object",
        properties: {
          remediation: { type: "object" },
        },
        required: ["remediation"],
      },
    },
    {
      toolId: `${pluginId}/recordChange`,
      name: "recordChange",
      description: "Record a change in the system",
      parametersSchema: {
        type: "object",
        properties: {
          changeType: { type: "string" },
          description: { type: "string" },
          metadata: { type: "object" },
        },
        required: ["changeType", "description"],
      },
      outputSchema: {
        type: "object",
        properties: {
          changeId: { type: "string" },
        },
        required: ["changeId"],
      },
    },
    {
      toolId: `${pluginId}/getChangeHistory`,
      name: "getChangeHistory",
      description: "Get history of recorded changes",
      parametersSchema: {
        type: "object",
        properties: {
          limit: { type: "number" },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          changes: {
            type: "array",
            items: { type: "object" },
          },
        },
        required: ["changes"],
      },
    },
    {
      toolId: `${pluginId}/getCockpitOverview`,
      name: "getCockpitOverview",
      description: "Get the operations cockpit overview",
      parametersSchema: {
        type: "object",
        properties: {},
      },
      outputSchema: {
        type: "object",
        properties: {
          overview: { type: "object" },
        },
        required: ["overview"],
      },
    },
  ],
  launchers: [
    {
      launcherId: `${pluginId}/launcher`,
      name: "Operations Cockpit",
      description: "Mission Control for UOS — central monitoring hub",
      placement: {
        zone: "panel",
        section: "main",
      },
      icon: "monitoring",
    },
  ],
};

export { manifest };
export type { InternalManifest as PluginManifest };
