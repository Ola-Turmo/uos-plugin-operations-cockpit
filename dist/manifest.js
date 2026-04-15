const manifest = {
  id: "uos.plugin-operations-cockpit",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Plugin Operations Cockpit",
  description: "Paperclip operations cockpit for drift, review, and portfolio surfaces.",
  author: "turmo.dev",
  categories: ["ui"],
  capabilities: [
    "events.subscribe",
    "plugin.state.read",
    "plugin.state.write",
    "ui.dashboardWidget.register"
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui"
  },
  ui: {
    slots: [
      {
        type: "dashboardWidget",
        id: "health-widget",
        displayName: "Plugin Operations Cockpit Health",
        exportName: "DashboardWidget"
      }
    ]
  }
};
var manifest_default = manifest;
export {
  manifest_default as default
};
//# sourceMappingURL=manifest.js.map
