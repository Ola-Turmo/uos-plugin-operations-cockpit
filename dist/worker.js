var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@paperclipai/plugin-sdk/dist/define-plugin.js
function definePlugin(definition) {
  return Object.freeze({ definition });
}

// node_modules/@paperclipai/plugin-sdk/dist/worker-rpc-host.js
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

// node_modules/@paperclipai/plugin-sdk/dist/protocol.js
var JSONRPC_VERSION = "2.0";
var JSONRPC_ERROR_CODES = {
  /** Invalid JSON was received by the server. */
  PARSE_ERROR: -32700,
  /** The JSON sent is not a valid Request object. */
  INVALID_REQUEST: -32600,
  /** The method does not exist or is not available. */
  METHOD_NOT_FOUND: -32601,
  /** Invalid method parameter(s). */
  INVALID_PARAMS: -32602,
  /** Internal JSON-RPC error. */
  INTERNAL_ERROR: -32603
};
var PLUGIN_RPC_ERROR_CODES = {
  /** The worker process is not running or not reachable. */
  WORKER_UNAVAILABLE: -32e3,
  /** The plugin does not have the required capability for this operation. */
  CAPABILITY_DENIED: -32001,
  /** The worker reported an unhandled error during method execution. */
  WORKER_ERROR: -32002,
  /** The method call timed out waiting for the worker response. */
  TIMEOUT: -32003,
  /** The worker does not implement the requested optional method. */
  METHOD_NOT_IMPLEMENTED: -32004,
  /** A catch-all for errors that do not fit other categories. */
  UNKNOWN: -32099
};
var _nextId = 1;
var MAX_SAFE_RPC_ID = Number.MAX_SAFE_INTEGER - 1;
function createRequest(method, params, id) {
  if (_nextId >= MAX_SAFE_RPC_ID) {
    _nextId = 1;
  }
  return {
    jsonrpc: JSONRPC_VERSION,
    id: id ?? _nextId++,
    method,
    params
  };
}
function createSuccessResponse(id, result) {
  return {
    jsonrpc: JSONRPC_VERSION,
    id,
    result
  };
}
function createErrorResponse(id, code, message, data) {
  const response = {
    jsonrpc: JSONRPC_VERSION,
    id,
    error: data !== void 0 ? { code, message, data } : { code, message }
  };
  return response;
}
function createNotification(method, params) {
  return {
    jsonrpc: JSONRPC_VERSION,
    method,
    params
  };
}
function isJsonRpcRequest(value) {
  if (typeof value !== "object" || value === null)
    return false;
  const obj = value;
  return obj.jsonrpc === JSONRPC_VERSION && typeof obj.method === "string" && "id" in obj && obj.id !== void 0 && obj.id !== null;
}
function isJsonRpcNotification(value) {
  if (typeof value !== "object" || value === null)
    return false;
  const obj = value;
  return obj.jsonrpc === JSONRPC_VERSION && typeof obj.method === "string" && !("id" in obj);
}
function isJsonRpcResponse(value) {
  if (typeof value !== "object" || value === null)
    return false;
  const obj = value;
  return obj.jsonrpc === JSONRPC_VERSION && "id" in obj && ("result" in obj || "error" in obj);
}
function isJsonRpcSuccessResponse(response) {
  return "result" in response && !("error" in response && response.error !== void 0);
}
function isJsonRpcErrorResponse(response) {
  return "error" in response && response.error !== void 0;
}
var MESSAGE_DELIMITER = "\n";
function serializeMessage(message) {
  return JSON.stringify(message) + MESSAGE_DELIMITER;
}
function parseMessage(line) {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    throw new JsonRpcParseError("Empty message");
  }
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new JsonRpcParseError(`Invalid JSON: ${trimmed.slice(0, 200)}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new JsonRpcParseError("Message must be a JSON object");
  }
  const obj = parsed;
  if (obj.jsonrpc !== JSONRPC_VERSION) {
    throw new JsonRpcParseError(`Invalid or missing jsonrpc version (expected "${JSONRPC_VERSION}", got ${JSON.stringify(obj.jsonrpc)})`);
  }
  return parsed;
}
var JsonRpcParseError = class extends Error {
  name = "JsonRpcParseError";
  constructor(message) {
    super(message);
  }
};
var JsonRpcCallError = class extends Error {
  name = "JsonRpcCallError";
  /** The JSON-RPC error code. */
  code;
  /** Optional structured error data from the response. */
  data;
  constructor(error) {
    super(error.message);
    this.code = error.code;
    this.data = error.data;
  }
};

// node_modules/@paperclipai/plugin-sdk/dist/worker-rpc-host.js
var DEFAULT_RPC_TIMEOUT_MS = 3e4;
function runWorker(plugin2, moduleUrl, options) {
  if (options?.stdin != null && options?.stdout != null) {
    return startWorkerRpcHost({
      plugin: plugin2,
      stdin: options.stdin,
      stdout: options.stdout
    });
  }
  const entry = process.argv[1];
  if (typeof entry !== "string")
    return;
  const thisFile = path.resolve(fileURLToPath(moduleUrl));
  const entryPath = path.resolve(entry);
  if (thisFile === entryPath) {
    startWorkerRpcHost({ plugin: plugin2 });
  }
}
function startWorkerRpcHost(options) {
  const { plugin: plugin2 } = options;
  const stdinStream = options.stdin ?? process.stdin;
  const stdoutStream = options.stdout ?? process.stdout;
  const rpcTimeoutMs = options.rpcTimeoutMs ?? DEFAULT_RPC_TIMEOUT_MS;
  let running = true;
  let initialized = false;
  let manifest = null;
  let currentConfig = {};
  const eventHandlers = [];
  const jobHandlers = /* @__PURE__ */ new Map();
  const launcherRegistrations = /* @__PURE__ */ new Map();
  const dataHandlers = /* @__PURE__ */ new Map();
  const actionHandlers = /* @__PURE__ */ new Map();
  const toolHandlers = /* @__PURE__ */ new Map();
  const sessionEventCallbacks = /* @__PURE__ */ new Map();
  const pendingRequests = /* @__PURE__ */ new Map();
  let nextOutboundId = 1;
  const MAX_OUTBOUND_ID = Number.MAX_SAFE_INTEGER - 1;
  function sendMessage(message) {
    if (!running)
      return;
    const serialized = serializeMessage(message);
    stdoutStream.write(serialized);
  }
  function callHost(method, params, timeoutMs) {
    return new Promise((resolve2, reject) => {
      if (!running) {
        reject(new Error(`Cannot call "${method}" \u2014 worker RPC host is not running`));
        return;
      }
      if (nextOutboundId >= MAX_OUTBOUND_ID) {
        nextOutboundId = 1;
      }
      const id = nextOutboundId++;
      const timeout = timeoutMs ?? rpcTimeoutMs;
      let settled = false;
      const settle = (fn, value) => {
        if (settled)
          return;
        settled = true;
        clearTimeout(timer);
        pendingRequests.delete(id);
        fn(value);
      };
      const timer = setTimeout(() => {
        settle(reject, new JsonRpcCallError({
          code: PLUGIN_RPC_ERROR_CODES.TIMEOUT,
          message: `Worker\u2192host call "${method}" timed out after ${timeout}ms`
        }));
      }, timeout);
      pendingRequests.set(id, {
        resolve: (response) => {
          if (isJsonRpcSuccessResponse(response)) {
            settle(resolve2, response.result);
          } else if (isJsonRpcErrorResponse(response)) {
            settle(reject, new JsonRpcCallError(response.error));
          } else {
            settle(reject, new Error(`Unexpected response format for "${method}"`));
          }
        },
        timer
      });
      try {
        const request = createRequest(method, params, id);
        sendMessage(request);
      } catch (err) {
        settle(reject, err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
  function notifyHost(method, params) {
    try {
      sendMessage(createNotification(method, params));
    } catch {
    }
  }
  function buildContext() {
    return {
      get manifest() {
        if (!manifest)
          throw new Error("Plugin context accessed before initialization");
        return manifest;
      },
      config: {
        async get() {
          return callHost("config.get", {});
        }
      },
      events: {
        on(name, filterOrFn, maybeFn) {
          let registration;
          if (typeof filterOrFn === "function") {
            registration = { name, fn: filterOrFn };
          } else {
            if (!maybeFn)
              throw new Error("Event handler function is required");
            registration = { name, filter: filterOrFn, fn: maybeFn };
          }
          eventHandlers.push(registration);
          void callHost("events.subscribe", { eventPattern: name, filter: registration.filter ?? null }).catch((err) => {
            notifyHost("log", {
              level: "warn",
              message: `Failed to subscribe to event "${name}" on host: ${err instanceof Error ? err.message : String(err)}`
            });
          });
          return () => {
            const idx = eventHandlers.indexOf(registration);
            if (idx !== -1)
              eventHandlers.splice(idx, 1);
          };
        },
        async emit(name, companyId, payload) {
          await callHost("events.emit", { name, companyId, payload });
        }
      },
      jobs: {
        register(key, fn) {
          jobHandlers.set(key, fn);
        }
      },
      launchers: {
        register(launcher) {
          launcherRegistrations.set(launcher.id, launcher);
        }
      },
      http: {
        async fetch(url, init) {
          const serializedInit = {};
          if (init) {
            if (init.method)
              serializedInit.method = init.method;
            if (init.headers) {
              if (init.headers instanceof Headers) {
                const obj = {};
                init.headers.forEach((v, k) => {
                  obj[k] = v;
                });
                serializedInit.headers = obj;
              } else if (Array.isArray(init.headers)) {
                const obj = {};
                for (const [k, v] of init.headers)
                  obj[k] = v;
                serializedInit.headers = obj;
              } else {
                serializedInit.headers = init.headers;
              }
            }
            if (init.body !== void 0 && init.body !== null) {
              serializedInit.body = typeof init.body === "string" ? init.body : String(init.body);
            }
          }
          const result = await callHost("http.fetch", {
            url,
            init: Object.keys(serializedInit).length > 0 ? serializedInit : void 0
          });
          return new Response(result.body, {
            status: result.status,
            statusText: result.statusText,
            headers: result.headers
          });
        }
      },
      secrets: {
        async resolve(secretRef) {
          return callHost("secrets.resolve", { secretRef });
        }
      },
      activity: {
        async log(entry) {
          await callHost("activity.log", {
            companyId: entry.companyId,
            message: entry.message,
            entityType: entry.entityType,
            entityId: entry.entityId,
            metadata: entry.metadata
          });
        }
      },
      state: {
        async get(input) {
          return callHost("state.get", {
            scopeKind: input.scopeKind,
            scopeId: input.scopeId,
            namespace: input.namespace,
            stateKey: input.stateKey
          });
        },
        async set(input, value) {
          await callHost("state.set", {
            scopeKind: input.scopeKind,
            scopeId: input.scopeId,
            namespace: input.namespace,
            stateKey: input.stateKey,
            value
          });
        },
        async delete(input) {
          await callHost("state.delete", {
            scopeKind: input.scopeKind,
            scopeId: input.scopeId,
            namespace: input.namespace,
            stateKey: input.stateKey
          });
        }
      },
      entities: {
        async upsert(input) {
          return callHost("entities.upsert", {
            entityType: input.entityType,
            scopeKind: input.scopeKind,
            scopeId: input.scopeId,
            externalId: input.externalId,
            title: input.title,
            status: input.status,
            data: input.data
          });
        },
        async list(query) {
          return callHost("entities.list", {
            entityType: query.entityType,
            scopeKind: query.scopeKind,
            scopeId: query.scopeId,
            externalId: query.externalId,
            limit: query.limit,
            offset: query.offset
          });
        }
      },
      projects: {
        async list(input) {
          return callHost("projects.list", {
            companyId: input.companyId,
            limit: input.limit,
            offset: input.offset
          });
        },
        async get(projectId, companyId) {
          return callHost("projects.get", { projectId, companyId });
        },
        async listWorkspaces(projectId, companyId) {
          return callHost("projects.listWorkspaces", { projectId, companyId });
        },
        async getPrimaryWorkspace(projectId, companyId) {
          return callHost("projects.getPrimaryWorkspace", { projectId, companyId });
        },
        async getWorkspaceForIssue(issueId, companyId) {
          return callHost("projects.getWorkspaceForIssue", { issueId, companyId });
        }
      },
      companies: {
        async list(input) {
          return callHost("companies.list", {
            limit: input?.limit,
            offset: input?.offset
          });
        },
        async get(companyId) {
          return callHost("companies.get", { companyId });
        }
      },
      issues: {
        async list(input) {
          return callHost("issues.list", {
            companyId: input.companyId,
            projectId: input.projectId,
            assigneeAgentId: input.assigneeAgentId,
            status: input.status,
            limit: input.limit,
            offset: input.offset
          });
        },
        async get(issueId, companyId) {
          return callHost("issues.get", { issueId, companyId });
        },
        async create(input) {
          return callHost("issues.create", {
            companyId: input.companyId,
            projectId: input.projectId,
            goalId: input.goalId,
            parentId: input.parentId,
            inheritExecutionWorkspaceFromIssueId: input.inheritExecutionWorkspaceFromIssueId,
            title: input.title,
            description: input.description,
            priority: input.priority,
            assigneeAgentId: input.assigneeAgentId
          });
        },
        async update(issueId, patch, companyId) {
          return callHost("issues.update", {
            issueId,
            patch,
            companyId
          });
        },
        async listComments(issueId, companyId) {
          return callHost("issues.listComments", { issueId, companyId });
        },
        async createComment(issueId, body, companyId) {
          return callHost("issues.createComment", { issueId, body, companyId });
        },
        documents: {
          async list(issueId, companyId) {
            return callHost("issues.documents.list", { issueId, companyId });
          },
          async get(issueId, key, companyId) {
            return callHost("issues.documents.get", { issueId, key, companyId });
          },
          async upsert(input) {
            return callHost("issues.documents.upsert", {
              issueId: input.issueId,
              key: input.key,
              body: input.body,
              companyId: input.companyId,
              title: input.title,
              format: input.format,
              changeSummary: input.changeSummary
            });
          },
          async delete(issueId, key, companyId) {
            return callHost("issues.documents.delete", { issueId, key, companyId });
          }
        }
      },
      agents: {
        async list(input) {
          return callHost("agents.list", {
            companyId: input.companyId,
            status: input.status,
            limit: input.limit,
            offset: input.offset
          });
        },
        async get(agentId, companyId) {
          return callHost("agents.get", { agentId, companyId });
        },
        async pause(agentId, companyId) {
          return callHost("agents.pause", { agentId, companyId });
        },
        async resume(agentId, companyId) {
          return callHost("agents.resume", { agentId, companyId });
        },
        async invoke(agentId, companyId, opts) {
          return callHost("agents.invoke", { agentId, companyId, prompt: opts.prompt, reason: opts.reason });
        },
        sessions: {
          async create(agentId, companyId, opts) {
            return callHost("agents.sessions.create", {
              agentId,
              companyId,
              taskKey: opts?.taskKey,
              reason: opts?.reason
            });
          },
          async list(agentId, companyId) {
            return callHost("agents.sessions.list", { agentId, companyId });
          },
          async sendMessage(sessionId, companyId, opts) {
            if (opts.onEvent) {
              sessionEventCallbacks.set(sessionId, opts.onEvent);
            }
            try {
              return await callHost("agents.sessions.sendMessage", {
                sessionId,
                companyId,
                prompt: opts.prompt,
                reason: opts.reason
              });
            } catch (err) {
              sessionEventCallbacks.delete(sessionId);
              throw err;
            }
          },
          async close(sessionId, companyId) {
            sessionEventCallbacks.delete(sessionId);
            await callHost("agents.sessions.close", { sessionId, companyId });
          }
        }
      },
      goals: {
        async list(input) {
          return callHost("goals.list", {
            companyId: input.companyId,
            level: input.level,
            status: input.status,
            limit: input.limit,
            offset: input.offset
          });
        },
        async get(goalId, companyId) {
          return callHost("goals.get", { goalId, companyId });
        },
        async create(input) {
          return callHost("goals.create", {
            companyId: input.companyId,
            title: input.title,
            description: input.description,
            level: input.level,
            status: input.status,
            parentId: input.parentId,
            ownerAgentId: input.ownerAgentId
          });
        },
        async update(goalId, patch, companyId) {
          return callHost("goals.update", {
            goalId,
            patch,
            companyId
          });
        }
      },
      data: {
        register(key, handler) {
          dataHandlers.set(key, handler);
        }
      },
      actions: {
        register(key, handler) {
          actionHandlers.set(key, handler);
        }
      },
      streams: /* @__PURE__ */ (() => {
        const channelCompanyMap = /* @__PURE__ */ new Map();
        return {
          open(channel, companyId) {
            channelCompanyMap.set(channel, companyId);
            notifyHost("streams.open", { channel, companyId });
          },
          emit(channel, event) {
            const companyId = channelCompanyMap.get(channel) ?? "";
            notifyHost("streams.emit", { channel, companyId, event });
          },
          close(channel) {
            const companyId = channelCompanyMap.get(channel) ?? "";
            channelCompanyMap.delete(channel);
            notifyHost("streams.close", { channel, companyId });
          }
        };
      })(),
      tools: {
        register(name, declaration, fn) {
          toolHandlers.set(name, { declaration, fn });
        }
      },
      metrics: {
        async write(name, value, tags) {
          await callHost("metrics.write", { name, value, tags });
        }
      },
      telemetry: {
        async track(eventName, dimensions) {
          await callHost("telemetry.track", { eventName, dimensions });
        }
      },
      logger: {
        info(message, meta) {
          notifyHost("log", { level: "info", message, meta });
        },
        warn(message, meta) {
          notifyHost("log", { level: "warn", message, meta });
        },
        error(message, meta) {
          notifyHost("log", { level: "error", message, meta });
        },
        debug(message, meta) {
          notifyHost("log", { level: "debug", message, meta });
        }
      }
    };
  }
  const ctx = buildContext();
  async function handleHostRequest(request) {
    const { id, method, params } = request;
    try {
      const result = await dispatchMethod(method, params);
      sendMessage(createSuccessResponse(id, result ?? null));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorCode = typeof err?.code === "number" ? err.code : PLUGIN_RPC_ERROR_CODES.WORKER_ERROR;
      sendMessage(createErrorResponse(id, errorCode, errorMessage));
    }
  }
  async function dispatchMethod(method, params) {
    switch (method) {
      case "initialize":
        return handleInitialize(params);
      case "health":
        return handleHealth();
      case "shutdown":
        return handleShutdown();
      case "validateConfig":
        return handleValidateConfig(params);
      case "configChanged":
        return handleConfigChanged(params);
      case "onEvent":
        return handleOnEvent(params);
      case "runJob":
        return handleRunJob(params);
      case "handleWebhook":
        return handleWebhook(params);
      case "getData":
        return handleGetData(params);
      case "performAction":
        return handlePerformAction(params);
      case "executeTool":
        return handleExecuteTool(params);
      default:
        throw Object.assign(new Error(`Unknown method: ${method}`), { code: JSONRPC_ERROR_CODES.METHOD_NOT_FOUND });
    }
  }
  async function handleInitialize(params) {
    if (initialized) {
      throw new Error("Worker already initialized");
    }
    manifest = params.manifest;
    currentConfig = params.config;
    await plugin2.definition.setup(ctx);
    initialized = true;
    const supportedMethods = [];
    if (plugin2.definition.onValidateConfig)
      supportedMethods.push("validateConfig");
    if (plugin2.definition.onConfigChanged)
      supportedMethods.push("configChanged");
    if (plugin2.definition.onHealth)
      supportedMethods.push("health");
    if (plugin2.definition.onShutdown)
      supportedMethods.push("shutdown");
    return { ok: true, supportedMethods };
  }
  async function handleHealth() {
    if (plugin2.definition.onHealth) {
      return plugin2.definition.onHealth();
    }
    return { status: "ok" };
  }
  async function handleShutdown() {
    if (plugin2.definition.onShutdown) {
      await plugin2.definition.onShutdown();
    }
    setImmediate(() => {
      cleanup();
      if (!options.stdin && !options.stdout) {
        process.exit(0);
      }
    });
  }
  async function handleValidateConfig(params) {
    if (!plugin2.definition.onValidateConfig) {
      throw Object.assign(new Error("validateConfig is not implemented by this plugin"), { code: PLUGIN_RPC_ERROR_CODES.METHOD_NOT_IMPLEMENTED });
    }
    return plugin2.definition.onValidateConfig(params.config);
  }
  async function handleConfigChanged(params) {
    currentConfig = params.config;
    if (plugin2.definition.onConfigChanged) {
      await plugin2.definition.onConfigChanged(params.config);
    }
  }
  async function handleOnEvent(params) {
    const event = params.event;
    for (const registration of eventHandlers) {
      const exactMatch = registration.name === event.eventType;
      const wildcardPluginAll = registration.name === "plugin.*" && event.eventType.startsWith("plugin.");
      const wildcardPluginOne = registration.name.endsWith(".*") && event.eventType.startsWith(registration.name.slice(0, -1));
      if (!exactMatch && !wildcardPluginAll && !wildcardPluginOne)
        continue;
      if (registration.filter && !allowsEvent(registration.filter, event))
        continue;
      try {
        await registration.fn(event);
      } catch (err) {
        notifyHost("log", {
          level: "error",
          message: `Event handler for "${registration.name}" failed: ${err instanceof Error ? err.message : String(err)}`,
          meta: { eventType: event.eventType, stack: err instanceof Error ? err.stack : void 0 }
        });
      }
    }
  }
  async function handleRunJob(params) {
    const handler = jobHandlers.get(params.job.jobKey);
    if (!handler) {
      throw new Error(`No handler registered for job "${params.job.jobKey}"`);
    }
    await handler(params.job);
  }
  async function handleWebhook(params) {
    if (!plugin2.definition.onWebhook) {
      throw Object.assign(new Error("handleWebhook is not implemented by this plugin"), { code: PLUGIN_RPC_ERROR_CODES.METHOD_NOT_IMPLEMENTED });
    }
    await plugin2.definition.onWebhook(params);
  }
  async function handleGetData(params) {
    const handler = dataHandlers.get(params.key);
    if (!handler) {
      throw new Error(`No data handler registered for key "${params.key}"`);
    }
    return handler(params.renderEnvironment === void 0 ? params.params : { ...params.params, renderEnvironment: params.renderEnvironment });
  }
  async function handlePerformAction(params) {
    const handler = actionHandlers.get(params.key);
    if (!handler) {
      throw new Error(`No action handler registered for key "${params.key}"`);
    }
    return handler(params.renderEnvironment === void 0 ? params.params : { ...params.params, renderEnvironment: params.renderEnvironment });
  }
  async function handleExecuteTool(params) {
    const entry = toolHandlers.get(params.toolName);
    if (!entry) {
      throw new Error(`No tool handler registered for "${params.toolName}"`);
    }
    return entry.fn(params.parameters, params.runContext);
  }
  function allowsEvent(filter, event) {
    const payload = event.payload;
    if (filter.companyId !== void 0) {
      const companyId = event.companyId ?? String(payload?.companyId ?? "");
      if (companyId !== filter.companyId)
        return false;
    }
    if (filter.projectId !== void 0) {
      const projectId = event.entityType === "project" ? event.entityId : String(payload?.projectId ?? "");
      if (projectId !== filter.projectId)
        return false;
    }
    if (filter.agentId !== void 0) {
      const agentId = event.entityType === "agent" ? event.entityId : String(payload?.agentId ?? "");
      if (agentId !== filter.agentId)
        return false;
    }
    return true;
  }
  function handleHostResponse(response) {
    const id = response.id;
    if (id === null || id === void 0)
      return;
    const pending = pendingRequests.get(id);
    if (!pending)
      return;
    clearTimeout(pending.timer);
    pendingRequests.delete(id);
    pending.resolve(response);
  }
  function handleLine(line) {
    if (!line.trim())
      return;
    let message;
    try {
      message = parseMessage(line);
    } catch (err) {
      if (err instanceof JsonRpcParseError) {
        sendMessage(createErrorResponse(null, JSONRPC_ERROR_CODES.PARSE_ERROR, `Parse error: ${err.message}`));
      }
      return;
    }
    if (isJsonRpcResponse(message)) {
      handleHostResponse(message);
    } else if (isJsonRpcRequest(message)) {
      handleHostRequest(message).catch((err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorCode = err?.code ?? PLUGIN_RPC_ERROR_CODES.WORKER_ERROR;
        try {
          sendMessage(createErrorResponse(message.id, typeof errorCode === "number" ? errorCode : PLUGIN_RPC_ERROR_CODES.WORKER_ERROR, errorMessage));
        } catch {
        }
      });
    } else if (isJsonRpcNotification(message)) {
      const notif = message;
      if (notif.method === "agents.sessions.event" && notif.params) {
        const event = notif.params;
        const cb = sessionEventCallbacks.get(event.sessionId);
        if (cb)
          cb(event);
      } else if (notif.method === "onEvent" && notif.params) {
        handleOnEvent(notif.params).catch((err) => {
          notifyHost("log", {
            level: "error",
            message: `Failed to handle event notification: ${err instanceof Error ? err.message : String(err)}`
          });
        });
      }
    }
  }
  function cleanup() {
    running = false;
    if (readline) {
      readline.close();
      readline = null;
    }
    for (const [id, pending] of pendingRequests) {
      clearTimeout(pending.timer);
      pending.resolve(createErrorResponse(id, PLUGIN_RPC_ERROR_CODES.WORKER_UNAVAILABLE, "Worker RPC host is shutting down"));
    }
    pendingRequests.clear();
    sessionEventCallbacks.clear();
  }
  let readline = createInterface({
    input: stdinStream,
    crlfDelay: Infinity
  });
  readline.on("line", handleLine);
  readline.on("close", () => {
    if (running) {
      cleanup();
      if (!options.stdin && !options.stdout) {
        process.exit(0);
      }
    }
  });
  if (!options.stdin && !options.stdout) {
    process.on("uncaughtException", (err) => {
      notifyHost("log", {
        level: "error",
        message: `Uncaught exception: ${err.message}`,
        meta: { stack: err.stack }
      });
      setTimeout(() => process.exit(1), 100);
    });
    process.on("unhandledRejection", (reason) => {
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : void 0;
      notifyHost("log", {
        level: "error",
        message: `Unhandled rejection: ${message}`,
        meta: { stack }
      });
    });
  }
  return {
    get running() {
      return running;
    },
    stop() {
      cleanup();
    }
  };
}

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path2, errorMaps, issueData } = params;
  const fullPath = [...path2, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path2, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path2;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// node_modules/@paperclipai/shared/dist/constants.js
var COMPANY_STATUSES = ["active", "paused", "archived"];
var DEPLOYMENT_MODES = ["local_trusted", "authenticated"];
var DEPLOYMENT_EXPOSURES = ["private", "public"];
var AUTH_BASE_URL_MODES = ["auto", "explicit"];
var AGENT_STATUSES = [
  "active",
  "paused",
  "idle",
  "running",
  "error",
  "pending_approval",
  "terminated"
];
var AGENT_ADAPTER_TYPES = [
  "process",
  "http",
  "claude_local",
  "codex_local",
  "gemini_local",
  "opencode_local",
  "pi_local",
  "cursor",
  "openclaw_gateway",
  "hermes_local"
];
var AGENT_ROLES = [
  "ceo",
  "cto",
  "cmo",
  "cfo",
  "engineer",
  "designer",
  "pm",
  "qa",
  "devops",
  "researcher",
  "general"
];
var AGENT_ICON_NAMES = [
  "bot",
  "cpu",
  "brain",
  "zap",
  "rocket",
  "code",
  "terminal",
  "shield",
  "eye",
  "search",
  "wrench",
  "hammer",
  "lightbulb",
  "sparkles",
  "star",
  "heart",
  "flame",
  "bug",
  "cog",
  "database",
  "globe",
  "lock",
  "mail",
  "message-square",
  "file-code",
  "git-branch",
  "package",
  "puzzle",
  "target",
  "wand",
  "atom",
  "circuit-board",
  "radar",
  "swords",
  "telescope",
  "microscope",
  "crown",
  "gem",
  "hexagon",
  "pentagon",
  "fingerprint"
];
var ISSUE_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "cancelled"
];
var INBOX_MINE_ISSUE_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done"
];
var INBOX_MINE_ISSUE_STATUS_FILTER = INBOX_MINE_ISSUE_STATUSES.join(",");
var ISSUE_PRIORITIES = ["critical", "high", "medium", "low"];
var GOAL_LEVELS = ["company", "team", "agent", "task"];
var GOAL_STATUSES = ["planned", "active", "achieved", "cancelled"];
var PROJECT_STATUSES = [
  "backlog",
  "planned",
  "in_progress",
  "completed",
  "cancelled"
];
var ROUTINE_STATUSES = ["active", "paused", "archived"];
var ROUTINE_CONCURRENCY_POLICIES = ["coalesce_if_active", "always_enqueue", "skip_if_active"];
var ROUTINE_CATCH_UP_POLICIES = ["skip_missed", "enqueue_missed_with_cap"];
var ROUTINE_TRIGGER_SIGNING_MODES = ["bearer", "hmac_sha256"];
var ROUTINE_VARIABLE_TYPES = ["text", "textarea", "number", "boolean", "select"];
var APPROVAL_TYPES = ["hire_agent", "approve_ceo_strategy", "budget_override_required"];
var SECRET_PROVIDERS = [
  "local_encrypted",
  "aws_secrets_manager",
  "gcp_secret_manager",
  "vault"
];
var STORAGE_PROVIDERS = ["local_disk", "s3"];
var BILLING_TYPES = [
  "metered_api",
  "subscription_included",
  "subscription_overage",
  "credits",
  "fixed",
  "unknown"
];
var FINANCE_EVENT_KINDS = [
  "inference_charge",
  "platform_fee",
  "credit_purchase",
  "credit_refund",
  "credit_expiry",
  "byok_fee",
  "gateway_overhead",
  "log_storage_charge",
  "logpush_charge",
  "provisioned_capacity_charge",
  "training_charge",
  "custom_model_import_charge",
  "custom_model_storage_charge",
  "manual_adjustment"
];
var FINANCE_DIRECTIONS = ["debit", "credit"];
var FINANCE_UNITS = [
  "input_token",
  "output_token",
  "cached_input_token",
  "request",
  "credit_usd",
  "credit_unit",
  "model_unit_minute",
  "model_unit_hour",
  "gb_month",
  "train_token",
  "unknown"
];
var BUDGET_SCOPE_TYPES = ["company", "agent", "project"];
var BUDGET_METRICS = ["billed_cents"];
var BUDGET_WINDOW_KINDS = ["calendar_month_utc", "lifetime"];
var BUDGET_INCIDENT_RESOLUTION_ACTIONS = [
  "keep_paused",
  "raise_budget_and_resume"
];
var INVITE_JOIN_TYPES = ["human", "agent", "both"];
var JOIN_REQUEST_TYPES = ["human", "agent"];
var JOIN_REQUEST_STATUSES = ["pending_approval", "approved", "rejected"];
var PERMISSION_KEYS = [
  "agents:create",
  "users:invite",
  "users:manage_permissions",
  "tasks:assign",
  "tasks:assign_scope",
  "joins:approve"
];
var PLUGIN_STATUSES = [
  "installed",
  "ready",
  "disabled",
  "error",
  "upgrade_pending",
  "uninstalled"
];
var PLUGIN_CATEGORIES = [
  "connector",
  "workspace",
  "automation",
  "ui"
];
var PLUGIN_CAPABILITIES = [
  // Data Read
  "companies.read",
  "projects.read",
  "project.workspaces.read",
  "issues.read",
  "issue.comments.read",
  "issue.documents.read",
  "agents.read",
  "goals.read",
  "goals.create",
  "goals.update",
  "activity.read",
  "costs.read",
  // Data Write
  "issues.create",
  "issues.update",
  "issue.comments.create",
  "issue.documents.write",
  "agents.pause",
  "agents.resume",
  "agents.invoke",
  "agent.sessions.create",
  "agent.sessions.list",
  "agent.sessions.send",
  "agent.sessions.close",
  "activity.log.write",
  "metrics.write",
  "telemetry.track",
  // Plugin State
  "plugin.state.read",
  "plugin.state.write",
  // Runtime / Integration
  "events.subscribe",
  "events.emit",
  "jobs.schedule",
  "webhooks.receive",
  "http.outbound",
  "secrets.read-ref",
  // Agent Tools
  "agent.tools.register",
  // UI
  "instance.settings.register",
  "ui.sidebar.register",
  "ui.page.register",
  "ui.detailTab.register",
  "ui.dashboardWidget.register",
  "ui.commentAnnotation.register",
  "ui.action.register"
];
var PLUGIN_UI_SLOT_TYPES = [
  "page",
  "detailTab",
  "taskDetailView",
  "dashboardWidget",
  "sidebar",
  "sidebarPanel",
  "projectSidebarItem",
  "globalToolbarButton",
  "toolbarButton",
  "contextMenuItem",
  "commentAnnotation",
  "commentContextMenuItem",
  "settingsPage"
];
var PLUGIN_RESERVED_COMPANY_ROUTE_SEGMENTS = [
  "dashboard",
  "onboarding",
  "companies",
  "company",
  "settings",
  "plugins",
  "org",
  "agents",
  "projects",
  "issues",
  "goals",
  "approvals",
  "costs",
  "activity",
  "inbox",
  "design-guide",
  "tests"
];
var PLUGIN_LAUNCHER_PLACEMENT_ZONES = [
  "page",
  "detailTab",
  "taskDetailView",
  "dashboardWidget",
  "sidebar",
  "sidebarPanel",
  "projectSidebarItem",
  "globalToolbarButton",
  "toolbarButton",
  "contextMenuItem",
  "commentAnnotation",
  "commentContextMenuItem",
  "settingsPage"
];
var PLUGIN_LAUNCHER_ACTIONS = [
  "navigate",
  "openModal",
  "openDrawer",
  "openPopover",
  "performAction",
  "deepLink"
];
var PLUGIN_LAUNCHER_BOUNDS = [
  "inline",
  "compact",
  "default",
  "wide",
  "full"
];
var PLUGIN_LAUNCHER_RENDER_ENVIRONMENTS = [
  "hostInline",
  "hostOverlay",
  "hostRoute",
  "external",
  "iframe"
];
var PLUGIN_UI_SLOT_ENTITY_TYPES = [
  "project",
  "issue",
  "agent",
  "goal",
  "run",
  "comment"
];
var PLUGIN_STATE_SCOPE_KINDS = [
  "instance",
  "company",
  "project",
  "project_workspace",
  "agent",
  "issue",
  "goal",
  "run"
];

// node_modules/@paperclipai/shared/dist/types/feedback.js
var FEEDBACK_TARGET_TYPES = ["issue_comment", "issue_document_revision"];
var FEEDBACK_VOTE_VALUES = ["up", "down"];
var FEEDBACK_DATA_SHARING_PREFERENCES = ["allowed", "not_allowed", "prompt"];
var DEFAULT_FEEDBACK_DATA_SHARING_PREFERENCE = "prompt";
var FEEDBACK_TRACE_STATUSES = ["local_only", "pending", "sent", "failed"];

// node_modules/@paperclipai/shared/dist/validators/feedback.js
var feedbackTargetTypeSchema = external_exports.enum(FEEDBACK_TARGET_TYPES);
var feedbackTraceStatusSchema = external_exports.enum(FEEDBACK_TRACE_STATUSES);
var feedbackVoteValueSchema = external_exports.enum(FEEDBACK_VOTE_VALUES);
var feedbackDataSharingPreferenceSchema = external_exports.enum(FEEDBACK_DATA_SHARING_PREFERENCES);
var upsertIssueFeedbackVoteSchema = external_exports.object({
  targetType: feedbackTargetTypeSchema,
  targetId: external_exports.string().uuid(),
  vote: feedbackVoteValueSchema,
  reason: external_exports.string().trim().max(1e3).optional(),
  allowSharing: external_exports.boolean().optional()
});

// node_modules/@paperclipai/shared/dist/validators/instance.js
var instanceGeneralSettingsSchema = external_exports.object({
  censorUsernameInLogs: external_exports.boolean().default(false),
  keyboardShortcuts: external_exports.boolean().default(false),
  feedbackDataSharingPreference: feedbackDataSharingPreferenceSchema.default(DEFAULT_FEEDBACK_DATA_SHARING_PREFERENCE)
}).strict();
var patchInstanceGeneralSettingsSchema = instanceGeneralSettingsSchema.partial();
var instanceExperimentalSettingsSchema = external_exports.object({
  enableIsolatedWorkspaces: external_exports.boolean().default(false),
  autoRestartDevServerWhenIdle: external_exports.boolean().default(false)
}).strict();
var patchInstanceExperimentalSettingsSchema = instanceExperimentalSettingsSchema.partial();

// node_modules/@paperclipai/shared/dist/validators/budget.js
var upsertBudgetPolicySchema = external_exports.object({
  scopeType: external_exports.enum(BUDGET_SCOPE_TYPES),
  scopeId: external_exports.string().uuid(),
  metric: external_exports.enum(BUDGET_METRICS).optional().default("billed_cents"),
  windowKind: external_exports.enum(BUDGET_WINDOW_KINDS).optional().default("calendar_month_utc"),
  amount: external_exports.number().int().nonnegative(),
  warnPercent: external_exports.number().int().min(1).max(99).optional().default(80),
  hardStopEnabled: external_exports.boolean().optional().default(true),
  notifyEnabled: external_exports.boolean().optional().default(true),
  isActive: external_exports.boolean().optional().default(true)
});
var resolveBudgetIncidentSchema = external_exports.object({
  action: external_exports.enum(BUDGET_INCIDENT_RESOLUTION_ACTIONS),
  amount: external_exports.number().int().nonnegative().optional(),
  decisionNote: external_exports.string().optional().nullable()
}).superRefine((value, ctx) => {
  if (value.action === "raise_budget_and_resume" && typeof value.amount !== "number") {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "amount is required when raising a budget",
      path: ["amount"]
    });
  }
});

// node_modules/@paperclipai/shared/dist/validators/company.js
var logoAssetIdSchema = external_exports.string().uuid().nullable().optional();
var brandColorSchema = external_exports.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional();
var feedbackDataSharingTermsVersionSchema = external_exports.string().min(1).nullable().optional();
var createCompanySchema = external_exports.object({
  name: external_exports.string().min(1),
  description: external_exports.string().optional().nullable(),
  budgetMonthlyCents: external_exports.number().int().nonnegative().optional().default(0)
});
var updateCompanySchema = createCompanySchema.partial().extend({
  status: external_exports.enum(COMPANY_STATUSES).optional(),
  spentMonthlyCents: external_exports.number().int().nonnegative().optional(),
  requireBoardApprovalForNewAgents: external_exports.boolean().optional(),
  feedbackDataSharingEnabled: external_exports.boolean().optional(),
  feedbackDataSharingConsentAt: external_exports.coerce.date().nullable().optional(),
  feedbackDataSharingConsentByUserId: external_exports.string().min(1).nullable().optional(),
  feedbackDataSharingTermsVersion: feedbackDataSharingTermsVersionSchema,
  brandColor: brandColorSchema,
  logoAssetId: logoAssetIdSchema
});
var updateCompanyBrandingSchema = external_exports.object({
  name: external_exports.string().min(1).optional(),
  description: external_exports.string().nullable().optional(),
  brandColor: brandColorSchema,
  logoAssetId: logoAssetIdSchema
}).strict().refine((value) => value.name !== void 0 || value.description !== void 0 || value.brandColor !== void 0 || value.logoAssetId !== void 0, "At least one branding field must be provided");

// node_modules/@paperclipai/shared/dist/validators/company-skill.js
var companySkillSourceTypeSchema = external_exports.enum(["local_path", "github", "url", "catalog", "skills_sh"]);
var companySkillTrustLevelSchema = external_exports.enum(["markdown_only", "assets", "scripts_executables"]);
var companySkillCompatibilitySchema = external_exports.enum(["compatible", "unknown", "invalid"]);
var companySkillSourceBadgeSchema = external_exports.enum(["paperclip", "github", "local", "url", "catalog", "skills_sh"]);
var companySkillFileInventoryEntrySchema = external_exports.object({
  path: external_exports.string().min(1),
  kind: external_exports.enum(["skill", "markdown", "reference", "script", "asset", "other"])
});
var companySkillSchema = external_exports.object({
  id: external_exports.string().uuid(),
  companyId: external_exports.string().uuid(),
  key: external_exports.string().min(1),
  slug: external_exports.string().min(1),
  name: external_exports.string().min(1),
  description: external_exports.string().nullable(),
  markdown: external_exports.string(),
  sourceType: companySkillSourceTypeSchema,
  sourceLocator: external_exports.string().nullable(),
  sourceRef: external_exports.string().nullable(),
  trustLevel: companySkillTrustLevelSchema,
  compatibility: companySkillCompatibilitySchema,
  fileInventory: external_exports.array(companySkillFileInventoryEntrySchema).default([]),
  metadata: external_exports.record(external_exports.unknown()).nullable(),
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date()
});
var companySkillListItemSchema = companySkillSchema.extend({
  attachedAgentCount: external_exports.number().int().nonnegative(),
  editable: external_exports.boolean(),
  editableReason: external_exports.string().nullable(),
  sourceLabel: external_exports.string().nullable(),
  sourceBadge: companySkillSourceBadgeSchema
});
var companySkillUsageAgentSchema = external_exports.object({
  id: external_exports.string().uuid(),
  name: external_exports.string().min(1),
  urlKey: external_exports.string().min(1),
  adapterType: external_exports.string().min(1),
  desired: external_exports.boolean(),
  actualState: external_exports.string().nullable()
});
var companySkillDetailSchema = companySkillSchema.extend({
  attachedAgentCount: external_exports.number().int().nonnegative(),
  usedByAgents: external_exports.array(companySkillUsageAgentSchema).default([]),
  editable: external_exports.boolean(),
  editableReason: external_exports.string().nullable(),
  sourceLabel: external_exports.string().nullable(),
  sourceBadge: companySkillSourceBadgeSchema
});
var companySkillUpdateStatusSchema = external_exports.object({
  supported: external_exports.boolean(),
  reason: external_exports.string().nullable(),
  trackingRef: external_exports.string().nullable(),
  currentRef: external_exports.string().nullable(),
  latestRef: external_exports.string().nullable(),
  hasUpdate: external_exports.boolean()
});
var companySkillImportSchema = external_exports.object({
  source: external_exports.string().min(1)
});
var companySkillProjectScanRequestSchema = external_exports.object({
  projectIds: external_exports.array(external_exports.string().uuid()).optional(),
  workspaceIds: external_exports.array(external_exports.string().uuid()).optional()
});
var companySkillProjectScanSkippedSchema = external_exports.object({
  projectId: external_exports.string().uuid(),
  projectName: external_exports.string().min(1),
  workspaceId: external_exports.string().uuid().nullable(),
  workspaceName: external_exports.string().nullable(),
  path: external_exports.string().nullable(),
  reason: external_exports.string().min(1)
});
var companySkillProjectScanConflictSchema = external_exports.object({
  slug: external_exports.string().min(1),
  key: external_exports.string().min(1),
  projectId: external_exports.string().uuid(),
  projectName: external_exports.string().min(1),
  workspaceId: external_exports.string().uuid(),
  workspaceName: external_exports.string().min(1),
  path: external_exports.string().min(1),
  existingSkillId: external_exports.string().uuid(),
  existingSkillKey: external_exports.string().min(1),
  existingSourceLocator: external_exports.string().nullable(),
  reason: external_exports.string().min(1)
});
var companySkillProjectScanResultSchema = external_exports.object({
  scannedProjects: external_exports.number().int().nonnegative(),
  scannedWorkspaces: external_exports.number().int().nonnegative(),
  discovered: external_exports.number().int().nonnegative(),
  imported: external_exports.array(companySkillSchema),
  updated: external_exports.array(companySkillSchema),
  skipped: external_exports.array(companySkillProjectScanSkippedSchema),
  conflicts: external_exports.array(companySkillProjectScanConflictSchema),
  warnings: external_exports.array(external_exports.string())
});
var companySkillCreateSchema = external_exports.object({
  name: external_exports.string().min(1),
  slug: external_exports.string().min(1).nullable().optional(),
  description: external_exports.string().nullable().optional(),
  markdown: external_exports.string().nullable().optional()
});
var companySkillFileDetailSchema = external_exports.object({
  skillId: external_exports.string().uuid(),
  path: external_exports.string().min(1),
  kind: external_exports.enum(["skill", "markdown", "reference", "script", "asset", "other"]),
  content: external_exports.string(),
  language: external_exports.string().nullable(),
  markdown: external_exports.boolean(),
  editable: external_exports.boolean()
});
var companySkillFileUpdateSchema = external_exports.object({
  path: external_exports.string().min(1),
  content: external_exports.string()
});

// node_modules/@paperclipai/shared/dist/validators/adapter-skills.js
var agentSkillStateSchema = external_exports.enum([
  "available",
  "configured",
  "installed",
  "missing",
  "stale",
  "external"
]);
var agentSkillOriginSchema = external_exports.enum([
  "company_managed",
  "paperclip_required",
  "user_installed",
  "external_unknown"
]);
var agentSkillSyncModeSchema = external_exports.enum([
  "unsupported",
  "persistent",
  "ephemeral"
]);
var agentSkillEntrySchema = external_exports.object({
  key: external_exports.string().min(1),
  runtimeName: external_exports.string().min(1).nullable(),
  desired: external_exports.boolean(),
  managed: external_exports.boolean(),
  required: external_exports.boolean().optional(),
  requiredReason: external_exports.string().nullable().optional(),
  state: agentSkillStateSchema,
  origin: agentSkillOriginSchema.optional(),
  originLabel: external_exports.string().nullable().optional(),
  locationLabel: external_exports.string().nullable().optional(),
  readOnly: external_exports.boolean().optional(),
  sourcePath: external_exports.string().nullable().optional(),
  targetPath: external_exports.string().nullable().optional(),
  detail: external_exports.string().nullable().optional()
});
var agentSkillSnapshotSchema = external_exports.object({
  adapterType: external_exports.string().min(1),
  supported: external_exports.boolean(),
  mode: agentSkillSyncModeSchema,
  desiredSkills: external_exports.array(external_exports.string().min(1)),
  entries: external_exports.array(agentSkillEntrySchema),
  warnings: external_exports.array(external_exports.string())
});
var agentSkillSyncSchema = external_exports.object({
  desiredSkills: external_exports.array(external_exports.string().min(1))
});

// node_modules/@paperclipai/shared/dist/validators/issue.js
var ISSUE_EXECUTION_WORKSPACE_PREFERENCES = [
  "inherit",
  "shared_workspace",
  "isolated_workspace",
  "operator_branch",
  "reuse_existing",
  "agent_default"
];
var executionWorkspaceStrategySchema = external_exports.object({
  type: external_exports.enum(["project_primary", "git_worktree", "adapter_managed", "cloud_sandbox"]).optional(),
  baseRef: external_exports.string().optional().nullable(),
  branchTemplate: external_exports.string().optional().nullable(),
  worktreeParentDir: external_exports.string().optional().nullable(),
  provisionCommand: external_exports.string().optional().nullable(),
  teardownCommand: external_exports.string().optional().nullable()
}).strict();
var issueExecutionWorkspaceSettingsSchema = external_exports.object({
  mode: external_exports.enum(ISSUE_EXECUTION_WORKSPACE_PREFERENCES).optional(),
  workspaceStrategy: executionWorkspaceStrategySchema.optional().nullable(),
  workspaceRuntime: external_exports.record(external_exports.unknown()).optional().nullable()
}).strict();
var issueAssigneeAdapterOverridesSchema = external_exports.object({
  adapterConfig: external_exports.record(external_exports.unknown()).optional(),
  useProjectWorkspace: external_exports.boolean().optional()
}).strict();
var createIssueSchema = external_exports.object({
  projectId: external_exports.string().uuid().optional().nullable(),
  projectWorkspaceId: external_exports.string().uuid().optional().nullable(),
  goalId: external_exports.string().uuid().optional().nullable(),
  parentId: external_exports.string().uuid().optional().nullable(),
  inheritExecutionWorkspaceFromIssueId: external_exports.string().uuid().optional().nullable(),
  title: external_exports.string().min(1),
  description: external_exports.string().optional().nullable(),
  status: external_exports.enum(ISSUE_STATUSES).optional().default("backlog"),
  priority: external_exports.enum(ISSUE_PRIORITIES).optional().default("medium"),
  assigneeAgentId: external_exports.string().uuid().optional().nullable(),
  assigneeUserId: external_exports.string().optional().nullable(),
  requestDepth: external_exports.number().int().nonnegative().optional().default(0),
  billingCode: external_exports.string().optional().nullable(),
  assigneeAdapterOverrides: issueAssigneeAdapterOverridesSchema.optional().nullable(),
  executionWorkspaceId: external_exports.string().uuid().optional().nullable(),
  executionWorkspacePreference: external_exports.enum(ISSUE_EXECUTION_WORKSPACE_PREFERENCES).optional().nullable(),
  executionWorkspaceSettings: issueExecutionWorkspaceSettingsSchema.optional().nullable(),
  labelIds: external_exports.array(external_exports.string().uuid()).optional()
});
var createIssueLabelSchema = external_exports.object({
  name: external_exports.string().trim().min(1).max(48),
  color: external_exports.string().regex(/^#(?:[0-9a-fA-F]{6})$/, "Color must be a 6-digit hex value")
});
var updateIssueSchema = createIssueSchema.partial().extend({
  comment: external_exports.string().min(1).optional(),
  reopen: external_exports.boolean().optional(),
  interrupt: external_exports.boolean().optional(),
  hiddenAt: external_exports.string().datetime().nullable().optional()
});
var checkoutIssueSchema = external_exports.object({
  agentId: external_exports.string().uuid(),
  expectedStatuses: external_exports.array(external_exports.enum(ISSUE_STATUSES)).nonempty()
});
var addIssueCommentSchema = external_exports.object({
  body: external_exports.string().min(1),
  reopen: external_exports.boolean().optional(),
  interrupt: external_exports.boolean().optional()
});
var linkIssueApprovalSchema = external_exports.object({
  approvalId: external_exports.string().uuid()
});
var createIssueAttachmentMetadataSchema = external_exports.object({
  issueCommentId: external_exports.string().uuid().optional().nullable()
});
var ISSUE_DOCUMENT_FORMATS = ["markdown"];
var issueDocumentFormatSchema = external_exports.enum(ISSUE_DOCUMENT_FORMATS);
var issueDocumentKeySchema = external_exports.string().trim().min(1).max(64).regex(/^[a-z0-9][a-z0-9_-]*$/, "Document key must be lowercase letters, numbers, _ or -");
var upsertIssueDocumentSchema = external_exports.object({
  title: external_exports.string().trim().max(200).nullable().optional(),
  format: issueDocumentFormatSchema,
  body: external_exports.string().max(524288),
  changeSummary: external_exports.string().trim().max(500).nullable().optional(),
  baseRevisionId: external_exports.string().uuid().nullable().optional()
});
var restoreIssueDocumentRevisionSchema = external_exports.object({});

// node_modules/@paperclipai/shared/dist/validators/routine.js
var routineVariableValueSchema = external_exports.union([external_exports.string(), external_exports.number().finite(), external_exports.boolean()]);
var routineVariableSchema = external_exports.object({
  name: external_exports.string().trim().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
  label: external_exports.string().trim().max(120).optional().nullable(),
  type: external_exports.enum(ROUTINE_VARIABLE_TYPES).optional().default("text"),
  defaultValue: routineVariableValueSchema.optional().nullable(),
  required: external_exports.boolean().optional().default(true),
  options: external_exports.array(external_exports.string().trim().min(1).max(120)).max(50).optional().default([])
}).superRefine((value, ctx) => {
  if (value.type === "select" && value.options.length === 0) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      path: ["options"],
      message: "Select variables require at least one option"
    });
  }
  if (value.type !== "select" && value.options.length > 0) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      path: ["options"],
      message: "Only select variables can define options"
    });
  }
  if (value.type === "select" && value.defaultValue != null) {
    if (typeof value.defaultValue !== "string" || !value.options.includes(value.defaultValue)) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        path: ["defaultValue"],
        message: "Select variable defaults must match one of the allowed options"
      });
    }
  }
});
var createRoutineSchema = external_exports.object({
  projectId: external_exports.string().uuid(),
  goalId: external_exports.string().uuid().optional().nullable(),
  parentIssueId: external_exports.string().uuid().optional().nullable(),
  title: external_exports.string().trim().min(1).max(200),
  description: external_exports.string().optional().nullable(),
  assigneeAgentId: external_exports.string().uuid(),
  priority: external_exports.enum(ISSUE_PRIORITIES).optional().default("medium"),
  status: external_exports.enum(ROUTINE_STATUSES).optional().default("active"),
  concurrencyPolicy: external_exports.enum(ROUTINE_CONCURRENCY_POLICIES).optional().default("coalesce_if_active"),
  catchUpPolicy: external_exports.enum(ROUTINE_CATCH_UP_POLICIES).optional().default("skip_missed"),
  variables: external_exports.array(routineVariableSchema).optional().default([])
});
var updateRoutineSchema = createRoutineSchema.partial();
var baseTriggerSchema = external_exports.object({
  label: external_exports.string().trim().max(120).optional().nullable(),
  enabled: external_exports.boolean().optional().default(true)
});
var createRoutineTriggerSchema = external_exports.discriminatedUnion("kind", [
  baseTriggerSchema.extend({
    kind: external_exports.literal("schedule"),
    cronExpression: external_exports.string().trim().min(1),
    timezone: external_exports.string().trim().min(1).default("UTC")
  }),
  baseTriggerSchema.extend({
    kind: external_exports.literal("webhook"),
    signingMode: external_exports.enum(ROUTINE_TRIGGER_SIGNING_MODES).optional().default("bearer"),
    replayWindowSec: external_exports.number().int().min(30).max(86400).optional().default(300)
  }),
  baseTriggerSchema.extend({
    kind: external_exports.literal("api")
  })
]);
var updateRoutineTriggerSchema = external_exports.object({
  label: external_exports.string().trim().max(120).optional().nullable(),
  enabled: external_exports.boolean().optional(),
  cronExpression: external_exports.string().trim().min(1).optional().nullable(),
  timezone: external_exports.string().trim().min(1).optional().nullable(),
  signingMode: external_exports.enum(ROUTINE_TRIGGER_SIGNING_MODES).optional().nullable(),
  replayWindowSec: external_exports.number().int().min(30).max(86400).optional().nullable()
});
var runRoutineSchema = external_exports.object({
  triggerId: external_exports.string().uuid().optional().nullable(),
  payload: external_exports.record(external_exports.unknown()).optional().nullable(),
  variables: external_exports.record(routineVariableValueSchema).optional().nullable(),
  idempotencyKey: external_exports.string().trim().max(255).optional().nullable(),
  source: external_exports.enum(["manual", "api"]).optional().default("manual"),
  executionWorkspaceId: external_exports.string().uuid().optional().nullable(),
  executionWorkspacePreference: external_exports.enum(ISSUE_EXECUTION_WORKSPACE_PREFERENCES).optional().nullable(),
  executionWorkspaceSettings: issueExecutionWorkspaceSettingsSchema.optional().nullable()
});
var rotateRoutineTriggerSecretSchema = external_exports.object({});

// node_modules/@paperclipai/shared/dist/validators/company-portability.js
var portabilityIncludeSchema = external_exports.object({
  company: external_exports.boolean().optional(),
  agents: external_exports.boolean().optional(),
  projects: external_exports.boolean().optional(),
  issues: external_exports.boolean().optional(),
  skills: external_exports.boolean().optional()
}).partial();
var portabilityEnvInputSchema = external_exports.object({
  key: external_exports.string().min(1),
  description: external_exports.string().nullable(),
  agentSlug: external_exports.string().min(1).nullable(),
  kind: external_exports.enum(["secret", "plain"]),
  requirement: external_exports.enum(["required", "optional"]),
  defaultValue: external_exports.string().nullable(),
  portability: external_exports.enum(["portable", "system_dependent"])
});
var portabilityFileEntrySchema = external_exports.union([
  external_exports.string(),
  external_exports.object({
    encoding: external_exports.literal("base64"),
    data: external_exports.string(),
    contentType: external_exports.string().min(1).optional().nullable()
  })
]);
var portabilityCompanyManifestEntrySchema = external_exports.object({
  path: external_exports.string().min(1),
  name: external_exports.string().min(1),
  description: external_exports.string().nullable(),
  brandColor: external_exports.string().nullable(),
  logoPath: external_exports.string().nullable(),
  requireBoardApprovalForNewAgents: external_exports.boolean(),
  feedbackDataSharingEnabled: external_exports.boolean().default(false),
  feedbackDataSharingConsentAt: external_exports.string().datetime().nullable().default(null),
  feedbackDataSharingConsentByUserId: external_exports.string().nullable().default(null),
  feedbackDataSharingTermsVersion: external_exports.string().nullable().default(null)
});
var portabilitySidebarOrderSchema = external_exports.object({
  agents: external_exports.array(external_exports.string().min(1)).default([]),
  projects: external_exports.array(external_exports.string().min(1)).default([])
});
var portabilityAgentManifestEntrySchema = external_exports.object({
  slug: external_exports.string().min(1),
  name: external_exports.string().min(1),
  path: external_exports.string().min(1),
  skills: external_exports.array(external_exports.string().min(1)).default([]),
  role: external_exports.string().min(1),
  title: external_exports.string().nullable(),
  icon: external_exports.string().nullable(),
  capabilities: external_exports.string().nullable(),
  reportsToSlug: external_exports.string().min(1).nullable(),
  adapterType: external_exports.string().min(1),
  adapterConfig: external_exports.record(external_exports.unknown()),
  runtimeConfig: external_exports.record(external_exports.unknown()),
  permissions: external_exports.record(external_exports.unknown()),
  budgetMonthlyCents: external_exports.number().int().nonnegative(),
  metadata: external_exports.record(external_exports.unknown()).nullable()
});
var portabilitySkillManifestEntrySchema = external_exports.object({
  key: external_exports.string().min(1),
  slug: external_exports.string().min(1),
  name: external_exports.string().min(1),
  path: external_exports.string().min(1),
  description: external_exports.string().nullable(),
  sourceType: external_exports.string().min(1),
  sourceLocator: external_exports.string().nullable(),
  sourceRef: external_exports.string().nullable(),
  trustLevel: external_exports.string().nullable(),
  compatibility: external_exports.string().nullable(),
  metadata: external_exports.record(external_exports.unknown()).nullable(),
  fileInventory: external_exports.array(external_exports.object({
    path: external_exports.string().min(1),
    kind: external_exports.string().min(1)
  })).default([])
});
var portabilityProjectManifestEntrySchema = external_exports.object({
  slug: external_exports.string().min(1),
  name: external_exports.string().min(1),
  path: external_exports.string().min(1),
  description: external_exports.string().nullable(),
  ownerAgentSlug: external_exports.string().min(1).nullable(),
  leadAgentSlug: external_exports.string().min(1).nullable(),
  targetDate: external_exports.string().nullable(),
  color: external_exports.string().nullable(),
  status: external_exports.string().nullable(),
  executionWorkspacePolicy: external_exports.record(external_exports.unknown()).nullable(),
  workspaces: external_exports.array(external_exports.object({
    key: external_exports.string().min(1),
    name: external_exports.string().min(1),
    sourceType: external_exports.string().nullable(),
    repoUrl: external_exports.string().nullable(),
    repoRef: external_exports.string().nullable(),
    defaultRef: external_exports.string().nullable(),
    visibility: external_exports.string().nullable(),
    setupCommand: external_exports.string().nullable(),
    cleanupCommand: external_exports.string().nullable(),
    metadata: external_exports.record(external_exports.unknown()).nullable(),
    isPrimary: external_exports.boolean()
  })).default([]),
  metadata: external_exports.record(external_exports.unknown()).nullable()
});
var portabilityIssueRoutineTriggerManifestEntrySchema = external_exports.object({
  kind: external_exports.string().min(1),
  label: external_exports.string().nullable(),
  enabled: external_exports.boolean(),
  cronExpression: external_exports.string().nullable(),
  timezone: external_exports.string().nullable(),
  signingMode: external_exports.string().nullable(),
  replayWindowSec: external_exports.number().int().nullable()
});
var portabilityIssueRoutineManifestEntrySchema = external_exports.object({
  concurrencyPolicy: external_exports.string().nullable(),
  catchUpPolicy: external_exports.string().nullable(),
  variables: external_exports.array(routineVariableSchema).nullable().optional(),
  triggers: external_exports.array(portabilityIssueRoutineTriggerManifestEntrySchema).default([])
});
var portabilityIssueManifestEntrySchema = external_exports.object({
  slug: external_exports.string().min(1),
  identifier: external_exports.string().min(1).nullable(),
  title: external_exports.string().min(1),
  path: external_exports.string().min(1),
  projectSlug: external_exports.string().min(1).nullable(),
  projectWorkspaceKey: external_exports.string().min(1).nullable(),
  assigneeAgentSlug: external_exports.string().min(1).nullable(),
  description: external_exports.string().nullable(),
  recurring: external_exports.boolean().default(false),
  routine: portabilityIssueRoutineManifestEntrySchema.nullable(),
  legacyRecurrence: external_exports.record(external_exports.unknown()).nullable(),
  status: external_exports.string().nullable(),
  priority: external_exports.string().nullable(),
  labelIds: external_exports.array(external_exports.string().min(1)).default([]),
  billingCode: external_exports.string().nullable(),
  executionWorkspaceSettings: external_exports.record(external_exports.unknown()).nullable(),
  assigneeAdapterOverrides: external_exports.record(external_exports.unknown()).nullable(),
  metadata: external_exports.record(external_exports.unknown()).nullable()
});
var portabilityManifestSchema = external_exports.object({
  schemaVersion: external_exports.number().int().positive(),
  generatedAt: external_exports.string().datetime(),
  source: external_exports.object({
    companyId: external_exports.string().uuid(),
    companyName: external_exports.string().min(1)
  }).nullable(),
  includes: external_exports.object({
    company: external_exports.boolean(),
    agents: external_exports.boolean(),
    projects: external_exports.boolean(),
    issues: external_exports.boolean(),
    skills: external_exports.boolean()
  }),
  company: portabilityCompanyManifestEntrySchema.nullable(),
  sidebar: portabilitySidebarOrderSchema.nullable(),
  agents: external_exports.array(portabilityAgentManifestEntrySchema),
  skills: external_exports.array(portabilitySkillManifestEntrySchema).default([]),
  projects: external_exports.array(portabilityProjectManifestEntrySchema).default([]),
  issues: external_exports.array(portabilityIssueManifestEntrySchema).default([]),
  envInputs: external_exports.array(portabilityEnvInputSchema).default([])
});
var portabilitySourceSchema = external_exports.discriminatedUnion("type", [
  external_exports.object({
    type: external_exports.literal("inline"),
    rootPath: external_exports.string().min(1).optional().nullable(),
    files: external_exports.record(portabilityFileEntrySchema)
  }),
  external_exports.object({
    type: external_exports.literal("github"),
    url: external_exports.string().url()
  })
]);
var portabilityTargetSchema = external_exports.discriminatedUnion("mode", [
  external_exports.object({
    mode: external_exports.literal("new_company"),
    newCompanyName: external_exports.string().min(1).optional().nullable()
  }),
  external_exports.object({
    mode: external_exports.literal("existing_company"),
    companyId: external_exports.string().uuid()
  })
]);
var portabilityAgentSelectionSchema = external_exports.union([
  external_exports.literal("all"),
  external_exports.array(external_exports.string().min(1))
]);
var portabilityCollisionStrategySchema = external_exports.enum(["rename", "skip", "replace"]);
var companyPortabilityExportSchema = external_exports.object({
  include: portabilityIncludeSchema.optional(),
  agents: external_exports.array(external_exports.string().min(1)).optional(),
  skills: external_exports.array(external_exports.string().min(1)).optional(),
  projects: external_exports.array(external_exports.string().min(1)).optional(),
  issues: external_exports.array(external_exports.string().min(1)).optional(),
  projectIssues: external_exports.array(external_exports.string().min(1)).optional(),
  selectedFiles: external_exports.array(external_exports.string().min(1)).optional(),
  expandReferencedSkills: external_exports.boolean().optional(),
  sidebarOrder: portabilitySidebarOrderSchema.partial().optional()
});
var companyPortabilityPreviewSchema = external_exports.object({
  source: portabilitySourceSchema,
  include: portabilityIncludeSchema.optional(),
  target: portabilityTargetSchema,
  agents: portabilityAgentSelectionSchema.optional(),
  collisionStrategy: portabilityCollisionStrategySchema.optional(),
  nameOverrides: external_exports.record(external_exports.string().min(1), external_exports.string().min(1)).optional(),
  selectedFiles: external_exports.array(external_exports.string().min(1)).optional()
});
var portabilityAdapterOverrideSchema = external_exports.object({
  adapterType: external_exports.string().min(1),
  adapterConfig: external_exports.record(external_exports.unknown()).optional()
});
var companyPortabilityImportSchema = companyPortabilityPreviewSchema.extend({
  adapterOverrides: external_exports.record(external_exports.string().min(1), portabilityAdapterOverrideSchema).optional()
});

// node_modules/@paperclipai/shared/dist/validators/secret.js
var envBindingPlainSchema = external_exports.object({
  type: external_exports.literal("plain"),
  value: external_exports.string()
});
var envBindingSecretRefSchema = external_exports.object({
  type: external_exports.literal("secret_ref"),
  secretId: external_exports.string().uuid(),
  version: external_exports.union([external_exports.literal("latest"), external_exports.number().int().positive()]).optional()
});
var envBindingSchema = external_exports.union([
  external_exports.string(),
  envBindingPlainSchema,
  envBindingSecretRefSchema
]);
var envConfigSchema = external_exports.record(envBindingSchema);
var createSecretSchema = external_exports.object({
  name: external_exports.string().min(1),
  provider: external_exports.enum(SECRET_PROVIDERS).optional(),
  value: external_exports.string().min(1),
  description: external_exports.string().optional().nullable(),
  externalRef: external_exports.string().optional().nullable()
});
var rotateSecretSchema = external_exports.object({
  value: external_exports.string().min(1),
  externalRef: external_exports.string().optional().nullable()
});
var updateSecretSchema = external_exports.object({
  name: external_exports.string().min(1).optional(),
  description: external_exports.string().optional().nullable(),
  externalRef: external_exports.string().optional().nullable()
});

// node_modules/@paperclipai/shared/dist/validators/agent.js
var agentPermissionsSchema = external_exports.object({
  canCreateAgents: external_exports.boolean().optional().default(false)
});
var agentInstructionsBundleModeSchema = external_exports.enum(["managed", "external"]);
var updateAgentInstructionsBundleSchema = external_exports.object({
  mode: agentInstructionsBundleModeSchema.optional(),
  rootPath: external_exports.string().trim().min(1).nullable().optional(),
  entryFile: external_exports.string().trim().min(1).optional(),
  clearLegacyPromptTemplate: external_exports.boolean().optional().default(false)
});
var upsertAgentInstructionsFileSchema = external_exports.object({
  path: external_exports.string().trim().min(1),
  content: external_exports.string(),
  clearLegacyPromptTemplate: external_exports.boolean().optional().default(false)
});
var adapterConfigSchema = external_exports.record(external_exports.unknown()).superRefine((value, ctx) => {
  const envValue = value.env;
  if (envValue === void 0)
    return;
  const parsed = envConfigSchema.safeParse(envValue);
  if (!parsed.success) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "adapterConfig.env must be a map of valid env bindings",
      path: ["env"]
    });
  }
});
var createAgentSchema = external_exports.object({
  name: external_exports.string().min(1),
  role: external_exports.enum(AGENT_ROLES).optional().default("general"),
  title: external_exports.string().optional().nullable(),
  icon: external_exports.enum(AGENT_ICON_NAMES).optional().nullable(),
  reportsTo: external_exports.string().uuid().optional().nullable(),
  capabilities: external_exports.string().optional().nullable(),
  desiredSkills: external_exports.array(external_exports.string().min(1)).optional(),
  adapterType: external_exports.enum(AGENT_ADAPTER_TYPES).optional().default("process"),
  adapterConfig: adapterConfigSchema.optional().default({}),
  runtimeConfig: external_exports.record(external_exports.unknown()).optional().default({}),
  budgetMonthlyCents: external_exports.number().int().nonnegative().optional().default(0),
  permissions: agentPermissionsSchema.optional(),
  metadata: external_exports.record(external_exports.unknown()).optional().nullable()
});
var createAgentHireSchema = createAgentSchema.extend({
  sourceIssueId: external_exports.string().uuid().optional().nullable(),
  sourceIssueIds: external_exports.array(external_exports.string().uuid()).optional()
});
var updateAgentSchema = createAgentSchema.omit({ permissions: true }).partial().extend({
  permissions: external_exports.never().optional(),
  replaceAdapterConfig: external_exports.boolean().optional(),
  status: external_exports.enum(AGENT_STATUSES).optional(),
  spentMonthlyCents: external_exports.number().int().nonnegative().optional()
});
var updateAgentInstructionsPathSchema = external_exports.object({
  path: external_exports.string().trim().min(1).nullable(),
  adapterConfigKey: external_exports.string().trim().min(1).optional()
});
var createAgentKeySchema = external_exports.object({
  name: external_exports.string().min(1).default("default")
});
var agentMineInboxQuerySchema = external_exports.object({
  userId: external_exports.string().trim().min(1),
  status: external_exports.string().trim().min(1).optional().default(INBOX_MINE_ISSUE_STATUS_FILTER)
});
var wakeAgentSchema = external_exports.object({
  source: external_exports.enum(["timer", "assignment", "on_demand", "automation"]).optional().default("on_demand"),
  triggerDetail: external_exports.enum(["manual", "ping", "callback", "system"]).optional(),
  reason: external_exports.string().optional().nullable(),
  payload: external_exports.record(external_exports.unknown()).optional().nullable(),
  idempotencyKey: external_exports.string().optional().nullable(),
  forceFreshSession: external_exports.preprocess((value) => value === null ? void 0 : value, external_exports.boolean().optional().default(false))
});
var resetAgentSessionSchema = external_exports.object({
  taskKey: external_exports.string().min(1).optional().nullable()
});
var testAdapterEnvironmentSchema = external_exports.object({
  adapterConfig: adapterConfigSchema.optional().default({})
});
var updateAgentPermissionsSchema = external_exports.object({
  canCreateAgents: external_exports.boolean(),
  canAssignTasks: external_exports.boolean()
});

// node_modules/@paperclipai/shared/dist/validators/project.js
var executionWorkspaceStrategySchema2 = external_exports.object({
  type: external_exports.enum(["project_primary", "git_worktree", "adapter_managed", "cloud_sandbox"]).optional(),
  baseRef: external_exports.string().optional().nullable(),
  branchTemplate: external_exports.string().optional().nullable(),
  worktreeParentDir: external_exports.string().optional().nullable(),
  provisionCommand: external_exports.string().optional().nullable(),
  teardownCommand: external_exports.string().optional().nullable()
}).strict();
var projectExecutionWorkspacePolicySchema = external_exports.object({
  enabled: external_exports.boolean(),
  defaultMode: external_exports.enum(["shared_workspace", "isolated_workspace", "operator_branch", "adapter_default"]).optional(),
  allowIssueOverride: external_exports.boolean().optional(),
  defaultProjectWorkspaceId: external_exports.string().uuid().optional().nullable(),
  workspaceStrategy: executionWorkspaceStrategySchema2.optional().nullable(),
  workspaceRuntime: external_exports.record(external_exports.unknown()).optional().nullable(),
  branchPolicy: external_exports.record(external_exports.unknown()).optional().nullable(),
  pullRequestPolicy: external_exports.record(external_exports.unknown()).optional().nullable(),
  runtimePolicy: external_exports.record(external_exports.unknown()).optional().nullable(),
  cleanupPolicy: external_exports.record(external_exports.unknown()).optional().nullable()
}).strict();
var projectWorkspaceRuntimeConfigSchema = external_exports.object({
  workspaceRuntime: external_exports.record(external_exports.unknown()).optional().nullable(),
  desiredState: external_exports.enum(["running", "stopped"]).optional().nullable()
}).strict();
var projectWorkspaceSourceTypeSchema = external_exports.enum(["local_path", "git_repo", "remote_managed", "non_git_path"]);
var projectWorkspaceVisibilitySchema = external_exports.enum(["default", "advanced"]);
var projectWorkspaceFields = {
  name: external_exports.string().min(1).optional(),
  sourceType: projectWorkspaceSourceTypeSchema.optional(),
  cwd: external_exports.string().min(1).optional().nullable(),
  repoUrl: external_exports.string().url().optional().nullable(),
  repoRef: external_exports.string().optional().nullable(),
  defaultRef: external_exports.string().optional().nullable(),
  visibility: projectWorkspaceVisibilitySchema.optional(),
  setupCommand: external_exports.string().optional().nullable(),
  cleanupCommand: external_exports.string().optional().nullable(),
  remoteProvider: external_exports.string().optional().nullable(),
  remoteWorkspaceRef: external_exports.string().optional().nullable(),
  sharedWorkspaceKey: external_exports.string().optional().nullable(),
  metadata: external_exports.record(external_exports.unknown()).optional().nullable(),
  runtimeConfig: projectWorkspaceRuntimeConfigSchema.optional().nullable()
};
function validateProjectWorkspace(value, ctx) {
  const sourceType = value.sourceType ?? "local_path";
  const hasCwd = typeof value.cwd === "string" && value.cwd.trim().length > 0;
  const hasRepo = typeof value.repoUrl === "string" && value.repoUrl.trim().length > 0;
  const hasRemoteRef = typeof value.remoteWorkspaceRef === "string" && value.remoteWorkspaceRef.trim().length > 0;
  if (sourceType === "remote_managed") {
    if (!hasRemoteRef && !hasRepo) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: "Remote-managed workspace requires remoteWorkspaceRef or repoUrl.",
        path: ["remoteWorkspaceRef"]
      });
    }
    return;
  }
  if (!hasCwd && !hasRepo) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "Workspace requires at least one of cwd or repoUrl.",
      path: ["cwd"]
    });
  }
}
var createProjectWorkspaceSchema = external_exports.object({
  ...projectWorkspaceFields,
  isPrimary: external_exports.boolean().optional().default(false)
}).superRefine(validateProjectWorkspace);
var updateProjectWorkspaceSchema = external_exports.object({
  ...projectWorkspaceFields,
  isPrimary: external_exports.boolean().optional()
}).partial();
var projectFields = {
  /** @deprecated Use goalIds instead */
  goalId: external_exports.string().uuid().optional().nullable(),
  goalIds: external_exports.array(external_exports.string().uuid()).optional(),
  name: external_exports.string().min(1),
  description: external_exports.string().optional().nullable(),
  status: external_exports.enum(PROJECT_STATUSES).optional().default("backlog"),
  leadAgentId: external_exports.string().uuid().optional().nullable(),
  targetDate: external_exports.string().optional().nullable(),
  color: external_exports.string().optional().nullable(),
  executionWorkspacePolicy: projectExecutionWorkspacePolicySchema.optional().nullable(),
  archivedAt: external_exports.string().datetime().optional().nullable()
};
var createProjectSchema = external_exports.object({
  ...projectFields,
  workspace: createProjectWorkspaceSchema.optional()
});
var updateProjectSchema = external_exports.object(projectFields).partial();

// node_modules/@paperclipai/shared/dist/validators/work-product.js
var issueWorkProductTypeSchema = external_exports.enum([
  "preview_url",
  "runtime_service",
  "pull_request",
  "branch",
  "commit",
  "artifact",
  "document"
]);
var issueWorkProductStatusSchema = external_exports.enum([
  "active",
  "ready_for_review",
  "approved",
  "changes_requested",
  "merged",
  "closed",
  "failed",
  "archived",
  "draft"
]);
var issueWorkProductReviewStateSchema = external_exports.enum([
  "none",
  "needs_board_review",
  "approved",
  "changes_requested"
]);
var createIssueWorkProductSchema = external_exports.object({
  projectId: external_exports.string().uuid().optional().nullable(),
  executionWorkspaceId: external_exports.string().uuid().optional().nullable(),
  runtimeServiceId: external_exports.string().uuid().optional().nullable(),
  type: issueWorkProductTypeSchema,
  provider: external_exports.string().min(1),
  externalId: external_exports.string().optional().nullable(),
  title: external_exports.string().min(1),
  url: external_exports.string().url().optional().nullable(),
  status: issueWorkProductStatusSchema.default("active"),
  reviewState: issueWorkProductReviewStateSchema.optional().default("none"),
  isPrimary: external_exports.boolean().optional().default(false),
  healthStatus: external_exports.enum(["unknown", "healthy", "unhealthy"]).optional().default("unknown"),
  summary: external_exports.string().optional().nullable(),
  metadata: external_exports.record(external_exports.unknown()).optional().nullable(),
  createdByRunId: external_exports.string().uuid().optional().nullable()
});
var updateIssueWorkProductSchema = createIssueWorkProductSchema.partial();

// node_modules/@paperclipai/shared/dist/validators/execution-workspace.js
var executionWorkspaceStatusSchema = external_exports.enum([
  "active",
  "idle",
  "in_review",
  "archived",
  "cleanup_failed"
]);
var executionWorkspaceConfigSchema = external_exports.object({
  provisionCommand: external_exports.string().optional().nullable(),
  teardownCommand: external_exports.string().optional().nullable(),
  cleanupCommand: external_exports.string().optional().nullable(),
  workspaceRuntime: external_exports.record(external_exports.unknown()).optional().nullable(),
  desiredState: external_exports.enum(["running", "stopped"]).optional().nullable()
}).strict();
var executionWorkspaceCloseReadinessStateSchema = external_exports.enum([
  "ready",
  "ready_with_warnings",
  "blocked"
]);
var executionWorkspaceCloseActionKindSchema = external_exports.enum([
  "archive_record",
  "stop_runtime_services",
  "cleanup_command",
  "teardown_command",
  "git_worktree_remove",
  "git_branch_delete",
  "remove_local_directory"
]);
var executionWorkspaceCloseActionSchema = external_exports.object({
  kind: executionWorkspaceCloseActionKindSchema,
  label: external_exports.string(),
  description: external_exports.string(),
  command: external_exports.string().nullable()
}).strict();
var executionWorkspaceCloseLinkedIssueSchema = external_exports.object({
  id: external_exports.string().uuid(),
  identifier: external_exports.string().nullable(),
  title: external_exports.string(),
  status: external_exports.string(),
  isTerminal: external_exports.boolean()
}).strict();
var executionWorkspaceCloseGitReadinessSchema = external_exports.object({
  repoRoot: external_exports.string().nullable(),
  workspacePath: external_exports.string().nullable(),
  branchName: external_exports.string().nullable(),
  baseRef: external_exports.string().nullable(),
  hasDirtyTrackedFiles: external_exports.boolean(),
  hasUntrackedFiles: external_exports.boolean(),
  dirtyEntryCount: external_exports.number().int().nonnegative(),
  untrackedEntryCount: external_exports.number().int().nonnegative(),
  aheadCount: external_exports.number().int().nonnegative().nullable(),
  behindCount: external_exports.number().int().nonnegative().nullable(),
  isMergedIntoBase: external_exports.boolean().nullable(),
  createdByRuntime: external_exports.boolean()
}).strict();
var workspaceRuntimeServiceSchema = external_exports.object({
  id: external_exports.string(),
  companyId: external_exports.string().uuid(),
  projectId: external_exports.string().uuid().nullable(),
  projectWorkspaceId: external_exports.string().uuid().nullable(),
  executionWorkspaceId: external_exports.string().uuid().nullable(),
  issueId: external_exports.string().uuid().nullable(),
  scopeType: external_exports.enum(["project_workspace", "execution_workspace", "run", "agent"]),
  scopeId: external_exports.string().nullable(),
  serviceName: external_exports.string(),
  status: external_exports.enum(["starting", "running", "stopped", "failed"]),
  lifecycle: external_exports.enum(["shared", "ephemeral"]),
  reuseKey: external_exports.string().nullable(),
  command: external_exports.string().nullable(),
  cwd: external_exports.string().nullable(),
  port: external_exports.number().int().nullable(),
  url: external_exports.string().nullable(),
  provider: external_exports.enum(["local_process", "adapter_managed"]),
  providerRef: external_exports.string().nullable(),
  ownerAgentId: external_exports.string().uuid().nullable(),
  startedByRunId: external_exports.string().uuid().nullable(),
  lastUsedAt: external_exports.coerce.date(),
  startedAt: external_exports.coerce.date(),
  stoppedAt: external_exports.coerce.date().nullable(),
  stopPolicy: external_exports.record(external_exports.unknown()).nullable(),
  healthStatus: external_exports.enum(["unknown", "healthy", "unhealthy"]),
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date()
}).strict();
var executionWorkspaceCloseReadinessSchema = external_exports.object({
  workspaceId: external_exports.string().uuid(),
  state: executionWorkspaceCloseReadinessStateSchema,
  blockingReasons: external_exports.array(external_exports.string()),
  warnings: external_exports.array(external_exports.string()),
  linkedIssues: external_exports.array(executionWorkspaceCloseLinkedIssueSchema),
  plannedActions: external_exports.array(executionWorkspaceCloseActionSchema),
  isDestructiveCloseAllowed: external_exports.boolean(),
  isSharedWorkspace: external_exports.boolean(),
  isProjectPrimaryWorkspace: external_exports.boolean(),
  git: executionWorkspaceCloseGitReadinessSchema.nullable(),
  runtimeServices: external_exports.array(workspaceRuntimeServiceSchema)
}).strict();
var updateExecutionWorkspaceSchema = external_exports.object({
  name: external_exports.string().min(1).optional(),
  cwd: external_exports.string().optional().nullable(),
  repoUrl: external_exports.string().optional().nullable(),
  baseRef: external_exports.string().optional().nullable(),
  branchName: external_exports.string().optional().nullable(),
  providerRef: external_exports.string().optional().nullable(),
  status: executionWorkspaceStatusSchema.optional(),
  cleanupEligibleAt: external_exports.string().datetime().optional().nullable(),
  cleanupReason: external_exports.string().optional().nullable(),
  config: executionWorkspaceConfigSchema.optional().nullable(),
  metadata: external_exports.record(external_exports.unknown()).optional().nullable()
}).strict();

// node_modules/@paperclipai/shared/dist/validators/goal.js
var createGoalSchema = external_exports.object({
  title: external_exports.string().min(1),
  description: external_exports.string().optional().nullable(),
  level: external_exports.enum(GOAL_LEVELS).optional().default("task"),
  status: external_exports.enum(GOAL_STATUSES).optional().default("planned"),
  parentId: external_exports.string().uuid().optional().nullable(),
  ownerAgentId: external_exports.string().uuid().optional().nullable()
});
var updateGoalSchema = createGoalSchema.partial();

// node_modules/@paperclipai/shared/dist/validators/approval.js
var createApprovalSchema = external_exports.object({
  type: external_exports.enum(APPROVAL_TYPES),
  requestedByAgentId: external_exports.string().uuid().optional().nullable(),
  payload: external_exports.record(external_exports.unknown()),
  issueIds: external_exports.array(external_exports.string().uuid()).optional()
});
var resolveApprovalSchema = external_exports.object({
  decisionNote: external_exports.string().optional().nullable(),
  decidedByUserId: external_exports.string().optional().default("board")
});
var requestApprovalRevisionSchema = external_exports.object({
  decisionNote: external_exports.string().optional().nullable(),
  decidedByUserId: external_exports.string().optional().default("board")
});
var resubmitApprovalSchema = external_exports.object({
  payload: external_exports.record(external_exports.unknown()).optional()
});
var addApprovalCommentSchema = external_exports.object({
  body: external_exports.string().min(1)
});

// node_modules/@paperclipai/shared/dist/validators/cost.js
var createCostEventSchema = external_exports.object({
  agentId: external_exports.string().uuid(),
  issueId: external_exports.string().uuid().optional().nullable(),
  projectId: external_exports.string().uuid().optional().nullable(),
  goalId: external_exports.string().uuid().optional().nullable(),
  heartbeatRunId: external_exports.string().uuid().optional().nullable(),
  billingCode: external_exports.string().optional().nullable(),
  provider: external_exports.string().min(1),
  biller: external_exports.string().min(1).optional(),
  billingType: external_exports.enum(BILLING_TYPES).optional().default("unknown"),
  model: external_exports.string().min(1),
  inputTokens: external_exports.number().int().nonnegative().optional().default(0),
  cachedInputTokens: external_exports.number().int().nonnegative().optional().default(0),
  outputTokens: external_exports.number().int().nonnegative().optional().default(0),
  costCents: external_exports.number().int().nonnegative(),
  occurredAt: external_exports.string().datetime()
}).transform((value) => ({
  ...value,
  biller: value.biller ?? value.provider
}));
var updateBudgetSchema = external_exports.object({
  budgetMonthlyCents: external_exports.number().int().nonnegative()
});

// node_modules/@paperclipai/shared/dist/validators/finance.js
var createFinanceEventSchema = external_exports.object({
  agentId: external_exports.string().uuid().optional().nullable(),
  issueId: external_exports.string().uuid().optional().nullable(),
  projectId: external_exports.string().uuid().optional().nullable(),
  goalId: external_exports.string().uuid().optional().nullable(),
  heartbeatRunId: external_exports.string().uuid().optional().nullable(),
  costEventId: external_exports.string().uuid().optional().nullable(),
  billingCode: external_exports.string().optional().nullable(),
  description: external_exports.string().max(500).optional().nullable(),
  eventKind: external_exports.enum(FINANCE_EVENT_KINDS),
  direction: external_exports.enum(FINANCE_DIRECTIONS).optional().default("debit"),
  biller: external_exports.string().min(1),
  provider: external_exports.string().min(1).optional().nullable(),
  executionAdapterType: external_exports.enum(AGENT_ADAPTER_TYPES).optional().nullable(),
  pricingTier: external_exports.string().min(1).optional().nullable(),
  region: external_exports.string().min(1).optional().nullable(),
  model: external_exports.string().min(1).optional().nullable(),
  quantity: external_exports.number().int().nonnegative().optional().nullable(),
  unit: external_exports.enum(FINANCE_UNITS).optional().nullable(),
  amountCents: external_exports.number().int().nonnegative(),
  currency: external_exports.string().length(3).optional().default("USD"),
  estimated: external_exports.boolean().optional().default(false),
  externalInvoiceId: external_exports.string().optional().nullable(),
  metadataJson: external_exports.record(external_exports.string(), external_exports.unknown()).optional().nullable(),
  occurredAt: external_exports.string().datetime()
}).transform((value) => ({
  ...value,
  currency: value.currency.toUpperCase()
}));

// node_modules/@paperclipai/shared/dist/validators/asset.js
var createAssetImageMetadataSchema = external_exports.object({
  namespace: external_exports.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9/_-]+$/).optional()
});

// node_modules/@paperclipai/shared/dist/validators/access.js
var createCompanyInviteSchema = external_exports.object({
  allowedJoinTypes: external_exports.enum(INVITE_JOIN_TYPES).default("both"),
  defaultsPayload: external_exports.record(external_exports.string(), external_exports.unknown()).optional().nullable(),
  agentMessage: external_exports.string().max(4e3).optional().nullable()
});
var createOpenClawInvitePromptSchema = external_exports.object({
  agentMessage: external_exports.string().max(4e3).optional().nullable()
});
var acceptInviteSchema = external_exports.object({
  requestType: external_exports.enum(JOIN_REQUEST_TYPES),
  agentName: external_exports.string().min(1).max(120).optional(),
  adapterType: external_exports.enum(AGENT_ADAPTER_TYPES).optional(),
  capabilities: external_exports.string().max(4e3).optional().nullable(),
  agentDefaultsPayload: external_exports.record(external_exports.string(), external_exports.unknown()).optional().nullable(),
  // OpenClaw join compatibility fields accepted at top level.
  responsesWebhookUrl: external_exports.string().max(4e3).optional().nullable(),
  responsesWebhookMethod: external_exports.string().max(32).optional().nullable(),
  responsesWebhookHeaders: external_exports.record(external_exports.string(), external_exports.unknown()).optional().nullable(),
  paperclipApiUrl: external_exports.string().max(4e3).optional().nullable(),
  webhookAuthHeader: external_exports.string().max(4e3).optional().nullable()
});
var listJoinRequestsQuerySchema = external_exports.object({
  status: external_exports.enum(JOIN_REQUEST_STATUSES).optional(),
  requestType: external_exports.enum(JOIN_REQUEST_TYPES).optional()
});
var claimJoinRequestApiKeySchema = external_exports.object({
  claimSecret: external_exports.string().min(16).max(256)
});
var boardCliAuthAccessLevelSchema = external_exports.enum([
  "board",
  "instance_admin_required"
]);
var createCliAuthChallengeSchema = external_exports.object({
  command: external_exports.string().min(1).max(240),
  clientName: external_exports.string().max(120).optional().nullable(),
  requestedAccess: boardCliAuthAccessLevelSchema.default("board"),
  requestedCompanyId: external_exports.string().uuid().optional().nullable()
});
var resolveCliAuthChallengeSchema = external_exports.object({
  token: external_exports.string().min(16).max(256)
});
var updateMemberPermissionsSchema = external_exports.object({
  grants: external_exports.array(external_exports.object({
    permissionKey: external_exports.enum(PERMISSION_KEYS),
    scope: external_exports.record(external_exports.string(), external_exports.unknown()).optional().nullable()
  }))
});
var updateUserCompanyAccessSchema = external_exports.object({
  companyIds: external_exports.array(external_exports.string().uuid()).default([])
});

// node_modules/@paperclipai/shared/dist/validators/plugin.js
var jsonSchemaSchema = external_exports.record(external_exports.unknown()).refine((val) => {
  if (Object.keys(val).length === 0)
    return true;
  return typeof val.type === "string" || val.$ref !== void 0 || val.oneOf !== void 0 || val.anyOf !== void 0 || val.allOf !== void 0;
}, { message: "Must be a valid JSON Schema object (requires at least a 'type', '$ref', or composition keyword)" });
var CRON_FIELD_PATTERN = /^(\*(?:\/[0-9]+)?|[0-9]+(?:-[0-9]+)?(?:\/[0-9]+)?)(?:,(\*(?:\/[0-9]+)?|[0-9]+(?:-[0-9]+)?(?:\/[0-9]+)?))*$/;
function isValidCronExpression(expression) {
  const trimmed = expression.trim();
  if (!trimmed)
    return false;
  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5)
    return false;
  return fields.every((f) => CRON_FIELD_PATTERN.test(f));
}
var pluginJobDeclarationSchema = external_exports.object({
  jobKey: external_exports.string().min(1),
  displayName: external_exports.string().min(1),
  description: external_exports.string().optional(),
  schedule: external_exports.string().refine((val) => isValidCronExpression(val), { message: "schedule must be a valid 5-field cron expression (e.g. '*/15 * * * *')" }).optional()
});
var pluginWebhookDeclarationSchema = external_exports.object({
  endpointKey: external_exports.string().min(1),
  displayName: external_exports.string().min(1),
  description: external_exports.string().optional()
});
var pluginToolDeclarationSchema = external_exports.object({
  name: external_exports.string().min(1),
  displayName: external_exports.string().min(1),
  description: external_exports.string().min(1),
  parametersSchema: jsonSchemaSchema
});
var pluginUiSlotDeclarationSchema = external_exports.object({
  type: external_exports.enum(PLUGIN_UI_SLOT_TYPES),
  id: external_exports.string().min(1),
  displayName: external_exports.string().min(1),
  exportName: external_exports.string().min(1),
  entityTypes: external_exports.array(external_exports.enum(PLUGIN_UI_SLOT_ENTITY_TYPES)).optional(),
  routePath: external_exports.string().regex(/^[a-z0-9][a-z0-9-]*$/, {
    message: "routePath must be a lowercase single-segment slug (letters, numbers, hyphens)"
  }).optional(),
  order: external_exports.number().int().optional()
}).superRefine((value, ctx) => {
  const entityScopedTypes = ["detailTab", "taskDetailView", "contextMenuItem", "commentAnnotation", "commentContextMenuItem", "projectSidebarItem"];
  if (entityScopedTypes.includes(value.type) && (!value.entityTypes || value.entityTypes.length === 0)) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: `${value.type} slots require at least one entityType`,
      path: ["entityTypes"]
    });
  }
  if (value.type === "projectSidebarItem" && value.entityTypes && !value.entityTypes.includes("project")) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: 'projectSidebarItem slots require entityTypes to include "project"',
      path: ["entityTypes"]
    });
  }
  if (value.type === "commentAnnotation" && value.entityTypes && !value.entityTypes.includes("comment")) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: 'commentAnnotation slots require entityTypes to include "comment"',
      path: ["entityTypes"]
    });
  }
  if (value.type === "commentContextMenuItem" && value.entityTypes && !value.entityTypes.includes("comment")) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: 'commentContextMenuItem slots require entityTypes to include "comment"',
      path: ["entityTypes"]
    });
  }
  if (value.routePath && value.type !== "page") {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "routePath is only supported for page slots",
      path: ["routePath"]
    });
  }
  if (value.routePath && PLUGIN_RESERVED_COMPANY_ROUTE_SEGMENTS.includes(value.routePath)) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: `routePath "${value.routePath}" is reserved by the host`,
      path: ["routePath"]
    });
  }
});
var entityScopedLauncherPlacementZones = [
  "detailTab",
  "taskDetailView",
  "contextMenuItem",
  "commentAnnotation",
  "commentContextMenuItem",
  "projectSidebarItem"
];
var launcherBoundsByEnvironment = {
  hostInline: ["inline", "compact", "default"],
  hostOverlay: ["compact", "default", "wide", "full"],
  hostRoute: ["default", "wide", "full"],
  external: [],
  iframe: ["compact", "default", "wide", "full"]
};
var pluginLauncherActionDeclarationSchema = external_exports.object({
  type: external_exports.enum(PLUGIN_LAUNCHER_ACTIONS),
  target: external_exports.string().min(1),
  params: external_exports.record(external_exports.unknown()).optional()
}).superRefine((value, ctx) => {
  if (value.type === "performAction" && value.target.includes("/")) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "performAction launchers must target an action key, not a route or URL",
      path: ["target"]
    });
  }
  if (value.type === "navigate" && /^https?:\/\//.test(value.target)) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "navigate launchers must target a host route, not an absolute URL",
      path: ["target"]
    });
  }
});
var pluginLauncherRenderDeclarationSchema = external_exports.object({
  environment: external_exports.enum(PLUGIN_LAUNCHER_RENDER_ENVIRONMENTS),
  bounds: external_exports.enum(PLUGIN_LAUNCHER_BOUNDS).optional()
}).superRefine((value, ctx) => {
  if (!value.bounds) {
    return;
  }
  const supportedBounds = launcherBoundsByEnvironment[value.environment];
  if (!supportedBounds.includes(value.bounds)) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: `bounds "${value.bounds}" is not supported for render environment "${value.environment}"`,
      path: ["bounds"]
    });
  }
});
var pluginLauncherDeclarationSchema = external_exports.object({
  id: external_exports.string().min(1),
  displayName: external_exports.string().min(1),
  description: external_exports.string().optional(),
  placementZone: external_exports.enum(PLUGIN_LAUNCHER_PLACEMENT_ZONES),
  exportName: external_exports.string().min(1).optional(),
  entityTypes: external_exports.array(external_exports.enum(PLUGIN_UI_SLOT_ENTITY_TYPES)).optional(),
  order: external_exports.number().int().optional(),
  action: pluginLauncherActionDeclarationSchema,
  render: pluginLauncherRenderDeclarationSchema.optional()
}).superRefine((value, ctx) => {
  if (entityScopedLauncherPlacementZones.some((zone) => zone === value.placementZone) && (!value.entityTypes || value.entityTypes.length === 0)) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: `${value.placementZone} launchers require at least one entityType`,
      path: ["entityTypes"]
    });
  }
  if (value.placementZone === "projectSidebarItem" && value.entityTypes && !value.entityTypes.includes("project")) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: 'projectSidebarItem launchers require entityTypes to include "project"',
      path: ["entityTypes"]
    });
  }
  if (value.action.type === "performAction" && value.render) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "performAction launchers cannot declare render hints",
      path: ["render"]
    });
  }
  if (["openModal", "openDrawer", "openPopover"].includes(value.action.type) && !value.render) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: `${value.action.type} launchers require render metadata`,
      path: ["render"]
    });
  }
  if (value.action.type === "openModal" && value.render?.environment === "hostInline") {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "openModal launchers cannot use the hostInline render environment",
      path: ["render", "environment"]
    });
  }
  if (value.action.type === "openDrawer" && value.render && !["hostOverlay", "iframe"].includes(value.render.environment)) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "openDrawer launchers must use hostOverlay or iframe render environments",
      path: ["render", "environment"]
    });
  }
  if (value.action.type === "openPopover" && value.render?.environment === "hostRoute") {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "openPopover launchers cannot use the hostRoute render environment",
      path: ["render", "environment"]
    });
  }
});
var pluginManifestV1Schema = external_exports.object({
  id: external_exports.string().min(1).regex(/^[a-z0-9][a-z0-9._-]*$/, "Plugin id must start with a lowercase alphanumeric and contain only lowercase letters, digits, dots, hyphens, or underscores"),
  apiVersion: external_exports.literal(1),
  version: external_exports.string().min(1).regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/, "Version must follow semver (e.g. 1.0.0 or 1.0.0-beta.1)"),
  displayName: external_exports.string().min(1).max(100),
  description: external_exports.string().min(1).max(500),
  author: external_exports.string().min(1).max(200),
  categories: external_exports.array(external_exports.enum(PLUGIN_CATEGORIES)).min(1),
  minimumHostVersion: external_exports.string().regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/, "minimumHostVersion must follow semver (e.g. 1.0.0)").optional(),
  minimumPaperclipVersion: external_exports.string().regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/, "minimumPaperclipVersion must follow semver (e.g. 1.0.0)").optional(),
  capabilities: external_exports.array(external_exports.enum(PLUGIN_CAPABILITIES)).min(1),
  entrypoints: external_exports.object({
    worker: external_exports.string().min(1),
    ui: external_exports.string().min(1).optional()
  }),
  instanceConfigSchema: jsonSchemaSchema.optional(),
  jobs: external_exports.array(pluginJobDeclarationSchema).optional(),
  webhooks: external_exports.array(pluginWebhookDeclarationSchema).optional(),
  tools: external_exports.array(pluginToolDeclarationSchema).optional(),
  launchers: external_exports.array(pluginLauncherDeclarationSchema).optional(),
  ui: external_exports.object({
    slots: external_exports.array(pluginUiSlotDeclarationSchema).min(1).optional(),
    launchers: external_exports.array(pluginLauncherDeclarationSchema).optional()
  }).optional()
}).superRefine((manifest, ctx) => {
  const hasUiSlots = (manifest.ui?.slots?.length ?? 0) > 0;
  const hasUiLaunchers = (manifest.ui?.launchers?.length ?? 0) > 0;
  if ((hasUiSlots || hasUiLaunchers) && !manifest.entrypoints.ui) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "entrypoints.ui is required when ui.slots or ui.launchers are declared",
      path: ["entrypoints", "ui"]
    });
  }
  if (manifest.minimumHostVersion && manifest.minimumPaperclipVersion && manifest.minimumHostVersion !== manifest.minimumPaperclipVersion) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "minimumHostVersion and minimumPaperclipVersion must match when both are declared",
      path: ["minimumHostVersion"]
    });
  }
  if (manifest.tools && manifest.tools.length > 0) {
    if (!manifest.capabilities.includes("agent.tools.register")) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: "Capability 'agent.tools.register' is required when tools are declared",
        path: ["capabilities"]
      });
    }
  }
  if (manifest.jobs && manifest.jobs.length > 0) {
    if (!manifest.capabilities.includes("jobs.schedule")) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: "Capability 'jobs.schedule' is required when jobs are declared",
        path: ["capabilities"]
      });
    }
  }
  if (manifest.webhooks && manifest.webhooks.length > 0) {
    if (!manifest.capabilities.includes("webhooks.receive")) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: "Capability 'webhooks.receive' is required when webhooks are declared",
        path: ["capabilities"]
      });
    }
  }
  if (manifest.jobs) {
    const jobKeys = manifest.jobs.map((j) => j.jobKey);
    const duplicates = jobKeys.filter((key, i) => jobKeys.indexOf(key) !== i);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: `Duplicate job keys: ${[...new Set(duplicates)].join(", ")}`,
        path: ["jobs"]
      });
    }
  }
  if (manifest.webhooks) {
    const endpointKeys = manifest.webhooks.map((w) => w.endpointKey);
    const duplicates = endpointKeys.filter((key, i) => endpointKeys.indexOf(key) !== i);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: `Duplicate webhook endpoint keys: ${[...new Set(duplicates)].join(", ")}`,
        path: ["webhooks"]
      });
    }
  }
  if (manifest.tools) {
    const toolNames = manifest.tools.map((t) => t.name);
    const duplicates = toolNames.filter((name, i) => toolNames.indexOf(name) !== i);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: `Duplicate tool names: ${[...new Set(duplicates)].join(", ")}`,
        path: ["tools"]
      });
    }
  }
  if (manifest.ui) {
    if (manifest.ui.slots) {
      const slotIds = manifest.ui.slots.map((s) => s.id);
      const duplicates = slotIds.filter((id, i) => slotIds.indexOf(id) !== i);
      if (duplicates.length > 0) {
        ctx.addIssue({
          code: external_exports.ZodIssueCode.custom,
          message: `Duplicate UI slot ids: ${[...new Set(duplicates)].join(", ")}`,
          path: ["ui", "slots"]
        });
      }
    }
  }
  const allLaunchers = [
    ...manifest.launchers ?? [],
    ...manifest.ui?.launchers ?? []
  ];
  if (allLaunchers.length > 0) {
    const launcherIds = allLaunchers.map((launcher) => launcher.id);
    const duplicates = launcherIds.filter((id, i) => launcherIds.indexOf(id) !== i);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: `Duplicate launcher ids: ${[...new Set(duplicates)].join(", ")}`,
        path: manifest.ui?.launchers ? ["ui", "launchers"] : ["launchers"]
      });
    }
  }
});
var installPluginSchema = external_exports.object({
  packageName: external_exports.string().min(1),
  version: external_exports.string().min(1).optional(),
  /** Set by loader for local-path installs so the worker can be resolved. */
  packagePath: external_exports.string().min(1).optional()
});
var upsertPluginConfigSchema = external_exports.object({
  configJson: external_exports.record(external_exports.unknown())
});
var patchPluginConfigSchema = external_exports.object({
  configJson: external_exports.record(external_exports.unknown())
});
var updatePluginStatusSchema = external_exports.object({
  status: external_exports.enum(PLUGIN_STATUSES),
  lastError: external_exports.string().nullable().optional()
});
var uninstallPluginSchema = external_exports.object({
  removeData: external_exports.boolean().optional().default(false)
});
var pluginStateScopeKeySchema = external_exports.object({
  scopeKind: external_exports.enum(PLUGIN_STATE_SCOPE_KINDS),
  scopeId: external_exports.string().min(1).optional(),
  namespace: external_exports.string().min(1).optional(),
  stateKey: external_exports.string().min(1)
});
var setPluginStateSchema = external_exports.object({
  scopeKind: external_exports.enum(PLUGIN_STATE_SCOPE_KINDS),
  scopeId: external_exports.string().min(1).optional(),
  namespace: external_exports.string().min(1).optional(),
  stateKey: external_exports.string().min(1),
  /** JSON-serializable value to store. */
  value: external_exports.unknown()
});
var listPluginStateSchema = external_exports.object({
  scopeKind: external_exports.enum(PLUGIN_STATE_SCOPE_KINDS).optional(),
  scopeId: external_exports.string().min(1).optional(),
  namespace: external_exports.string().min(1).optional()
});

// node_modules/@paperclipai/shared/dist/api.js
var API_PREFIX = "/api";
var API = {
  health: `${API_PREFIX}/health`,
  companies: `${API_PREFIX}/companies`,
  agents: `${API_PREFIX}/agents`,
  projects: `${API_PREFIX}/projects`,
  issues: `${API_PREFIX}/issues`,
  goals: `${API_PREFIX}/goals`,
  approvals: `${API_PREFIX}/approvals`,
  secrets: `${API_PREFIX}/secrets`,
  costs: `${API_PREFIX}/costs`,
  activity: `${API_PREFIX}/activity`,
  dashboard: `${API_PREFIX}/dashboard`,
  sidebarBadges: `${API_PREFIX}/sidebar-badges`,
  invites: `${API_PREFIX}/invites`,
  joinRequests: `${API_PREFIX}/join-requests`,
  members: `${API_PREFIX}/members`,
  admin: `${API_PREFIX}/admin`
};

// node_modules/@paperclipai/shared/dist/config-schema.js
var configMetaSchema = external_exports.object({
  version: external_exports.literal(1),
  updatedAt: external_exports.string(),
  source: external_exports.enum(["onboard", "configure", "doctor"])
});
var llmConfigSchema = external_exports.object({
  provider: external_exports.enum(["claude", "openai"]),
  apiKey: external_exports.string().optional()
});
var databaseBackupConfigSchema = external_exports.object({
  enabled: external_exports.boolean().default(true),
  intervalMinutes: external_exports.number().int().min(1).max(7 * 24 * 60).default(60),
  retentionDays: external_exports.number().int().min(1).max(3650).default(30),
  dir: external_exports.string().default("~/.paperclip/instances/default/data/backups")
});
var databaseConfigSchema = external_exports.object({
  mode: external_exports.enum(["embedded-postgres", "postgres"]).default("embedded-postgres"),
  connectionString: external_exports.string().optional(),
  embeddedPostgresDataDir: external_exports.string().default("~/.paperclip/instances/default/db"),
  embeddedPostgresPort: external_exports.number().int().min(1).max(65535).default(54329),
  backup: databaseBackupConfigSchema.default({
    enabled: true,
    intervalMinutes: 60,
    retentionDays: 30,
    dir: "~/.paperclip/instances/default/data/backups"
  })
});
var loggingConfigSchema = external_exports.object({
  mode: external_exports.enum(["file", "cloud"]),
  logDir: external_exports.string().default("~/.paperclip/instances/default/logs")
});
var serverConfigSchema = external_exports.object({
  deploymentMode: external_exports.enum(DEPLOYMENT_MODES).default("local_trusted"),
  exposure: external_exports.enum(DEPLOYMENT_EXPOSURES).default("private"),
  host: external_exports.string().default("127.0.0.1"),
  port: external_exports.number().int().min(1).max(65535).default(3100),
  allowedHostnames: external_exports.array(external_exports.string().min(1)).default([]),
  serveUi: external_exports.boolean().default(true)
});
var authConfigSchema = external_exports.object({
  baseUrlMode: external_exports.enum(AUTH_BASE_URL_MODES).default("auto"),
  publicBaseUrl: external_exports.string().url().optional(),
  disableSignUp: external_exports.boolean().default(false)
});
var storageLocalDiskConfigSchema = external_exports.object({
  baseDir: external_exports.string().default("~/.paperclip/instances/default/data/storage")
});
var storageS3ConfigSchema = external_exports.object({
  bucket: external_exports.string().min(1).default("paperclip"),
  region: external_exports.string().min(1).default("us-east-1"),
  endpoint: external_exports.string().optional(),
  prefix: external_exports.string().default(""),
  forcePathStyle: external_exports.boolean().default(false)
});
var storageConfigSchema = external_exports.object({
  provider: external_exports.enum(STORAGE_PROVIDERS).default("local_disk"),
  localDisk: storageLocalDiskConfigSchema.default({
    baseDir: "~/.paperclip/instances/default/data/storage"
  }),
  s3: storageS3ConfigSchema.default({
    bucket: "paperclip",
    region: "us-east-1",
    prefix: "",
    forcePathStyle: false
  })
});
var secretsLocalEncryptedConfigSchema = external_exports.object({
  keyFilePath: external_exports.string().default("~/.paperclip/instances/default/secrets/master.key")
});
var secretsConfigSchema = external_exports.object({
  provider: external_exports.enum(SECRET_PROVIDERS).default("local_encrypted"),
  strictMode: external_exports.boolean().default(false),
  localEncrypted: secretsLocalEncryptedConfigSchema.default({
    keyFilePath: "~/.paperclip/instances/default/secrets/master.key"
  })
});
var telemetryConfigSchema = external_exports.object({
  enabled: external_exports.boolean().default(true)
}).default({});
var paperclipConfigSchema = external_exports.object({
  $meta: configMetaSchema,
  llm: llmConfigSchema.optional(),
  database: databaseConfigSchema,
  logging: loggingConfigSchema,
  server: serverConfigSchema,
  telemetry: telemetryConfigSchema,
  auth: authConfigSchema.default({
    baseUrlMode: "auto",
    disableSignUp: false
  }),
  storage: storageConfigSchema.default({
    provider: "local_disk",
    localDisk: {
      baseDir: "~/.paperclip/instances/default/data/storage"
    },
    s3: {
      bucket: "paperclip",
      region: "us-east-1",
      prefix: "",
      forcePathStyle: false
    }
  }),
  secrets: secretsConfigSchema.default({
    provider: "local_encrypted",
    strictMode: false,
    localEncrypted: {
      keyFilePath: "~/.paperclip/instances/default/secrets/master.key"
    }
  })
}).superRefine((value, ctx) => {
  if (value.server.deploymentMode === "local_trusted") {
    if (value.server.exposure !== "private") {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: "server.exposure must be private when deploymentMode is local_trusted",
        path: ["server", "exposure"]
      });
    }
    return;
  }
  if (value.auth.baseUrlMode === "explicit" && !value.auth.publicBaseUrl) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "auth.publicBaseUrl is required when auth.baseUrlMode is explicit",
      path: ["auth", "publicBaseUrl"]
    });
  }
  if (value.server.exposure === "public" && value.auth.baseUrlMode !== "explicit") {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "auth.baseUrlMode must be explicit when deploymentMode=authenticated and exposure=public",
      path: ["auth", "baseUrlMode"]
    });
  }
  if (value.server.exposure === "public" && !value.auth.publicBaseUrl) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "auth.publicBaseUrl is required when deploymentMode=authenticated and exposure=public",
      path: ["auth", "publicBaseUrl"]
    });
  }
});

// src/worker.ts
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";

// src/health-summary.ts
function computeOverallStatus(statuses) {
  if (statuses.includes("error")) return "error";
  if (statuses.includes("degraded")) return "degraded";
  if (statuses.includes("unknown")) return "unknown";
  return "ok";
}
function generateHealthSummary(domains) {
  const healthyDomains = domains.filter((d) => d.status === "ok").length;
  const degradedDomains = domains.filter((d) => d.status === "degraded");
  const errorDomains = domains.filter((d) => d.status === "error");
  const total = domains.length;
  if (errorDomains.length > 0) {
    return `${errorDomains.length} domain(s) in error state: ${errorDomains.map((d) => d.domain).join(", ")}. ${healthyDomains} domain(s) operating normally.`;
  }
  if (degradedDomains.length > 0) {
    return `${degradedDomains.length} domain(s) degraded: ${degradedDomains.map((d) => d.domain).join(", ")}. ${healthyDomains} domain(s) operating normally.`;
  }
  if (healthyDomains === total) {
    return `All ${total} domain(s) operating normally.`;
  }
  return `${healthyDomains} of ${total} domain(s) operating normally.`;
}
function createDomainHealth(domain, status, message, metrics) {
  return {
    domain,
    status,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    message,
    metrics
  };
}
function getCoreHealth(coreStatus) {
  let status = "ok";
  if (!coreStatus.provisioningHealthy || !coreStatus.upgradeHealthy) {
    status = "degraded";
  }
  if (coreStatus.driftStatus === "drifted") {
    status = "degraded";
  }
  const message = buildCoreHealthMessage(coreStatus);
  return createDomainHealth("core", status, message, {
    provisioningHealthy: coreStatus.provisioningHealthy ? 1 : 0,
    upgradeHealthy: coreStatus.upgradeHealthy ? 1 : 0,
    driftStatus: coreStatus.driftStatus === "drifted" ? 1 : 0
  });
}
function buildCoreHealthMessage(status) {
  if (!status.provisioningHealthy) {
    return "Core provisioning has issues. Review recent provisioning runs.";
  }
  if (!status.upgradeHealthy) {
    return "Upgrade path has issues. Check upgrade history.";
  }
  if (status.driftStatus === "drifted") {
    return "Active drift detected. Run reconciliation to restore alignment.";
  }
  if (status.lastProvisioningAt) {
    return `Last provisioning: ${status.lastProvisioningAt}`;
  }
  return "Core lifecycle operating normally.";
}
function getConnectorHealth(connectorStatus) {
  let status = "ok";
  if ((connectorStatus.failedConnectors ?? 0) > 0) {
    status = "degraded";
  }
  if ((connectorStatus.failedConnectors ?? 0) > (connectorStatus.certifiedConnectors || 1) / 2) {
    status = "error";
  }
  const message = buildConnectorHealthMessage(connectorStatus);
  return createDomainHealth("connectors", status, message, {
    certified: connectorStatus.certifiedConnectors,
    failed: connectorStatus.failedConnectors ?? 0,
    pending: connectorStatus.pendingConnectors ?? 0
  });
}
function buildConnectorHealthMessage(status) {
  if ((status.failedConnectors ?? 0) > 0) {
    return `${status.failedConnectors} connector(s) in failed state. ${status.certifiedConnectors} certified.`;
  }
  if ((status.pendingConnectors ?? 0) > 0) {
    return `${status.pendingConnectors} connector(s) pending certification. ${status.certifiedConnectors} certified.`;
  }
  return `${status.certifiedConnectors} certified connector(s) healthy.`;
}
function getSetupHealth(setupStatus) {
  let status = "ok";
  if (setupStatus.contractMismatch) {
    status = "error";
  } else if (setupStatus.setupInProgress) {
    status = "degraded";
  }
  const message = buildSetupHealthMessage(setupStatus);
  return createDomainHealth("setup", status, message, {
    inProgress: setupStatus.setupInProgress ? 1 : 0,
    contractMismatch: setupStatus.contractMismatch ? 1 : 0
  });
}
function buildSetupHealthMessage(status) {
  if (status.contractMismatch) {
    return "Setup blocked by contract mismatch. Resolve before continuing.";
  }
  if (status.setupInProgress) {
    return "Setup currently in progress.";
  }
  if (status.lastSetupCompletedAt) {
    return `Last setup completed: ${status.lastSetupCompletedAt}`;
  }
  return "Setup surface healthy.";
}
function getSkillsHealth(skillsStatus) {
  let status = "ok";
  if ((skillsStatus.staleExtractions ?? 0) > 0) {
    status = "degraded";
  }
  const message = buildSkillsHealthMessage(skillsStatus);
  return createDomainHealth("skills", status, message, {
    cataloged: skillsStatus.catalogedSkills,
    extracted: skillsStatus.extractedSkills,
    stale: skillsStatus.staleExtractions ?? 0
  });
}
function buildSkillsHealthMessage(status) {
  if ((status.staleExtractions ?? 0) > 0) {
    return `${status.staleExtractions} stale skill extraction(s) detected.`;
  }
  return `${status.catalogedSkills} cataloged skill(s), ${status.extractedSkills} extracted.`;
}
function getDepartmentsHealth(deptStatus) {
  let status = "ok";
  if ((deptStatus.degradedWorkflows ?? 0) > 0) {
    status = "degraded";
  }
  const message = deptStatus.degradedWorkflows ? `${deptStatus.degradedWorkflows} department workflow(s) degraded.` : `${deptStatus.activeWorkflows} department workflow(s) active.`;
  return createDomainHealth("departments", status, message, {
    active: deptStatus.activeWorkflows,
    degraded: deptStatus.degradedWorkflows ?? 0
  });
}
function getToolsHealth(toolsStatus) {
  let status = "ok";
  if ((toolsStatus.failedTools ?? 0) > 0) {
    status = "degraded";
  }
  const message = toolsStatus.failedTools ? `${toolsStatus.failedTools} tool(s) in failed state.` : `${toolsStatus.registeredTools} tool(s) healthy.`;
  return createDomainHealth("tools", status, message, {
    registered: toolsStatus.registeredTools,
    failed: toolsStatus.failedTools ?? 0
  });
}
function buildMultiDomainHealthSummary(domains) {
  const statuses = domains.map((d) => d.status);
  const overallStatus = computeOverallStatus(statuses);
  return {
    overallStatus,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    domains,
    summary: generateHealthSummary(domains)
  };
}

// src/review-generation.ts
function createConfidenceLabel(level, description, evidenceStrength, caveats) {
  return {
    level,
    description,
    evidenceStrength,
    caveats
  };
}
function highConfidence(description, caveats) {
  return createConfidenceLabel("high", description, "strong", caveats);
}
function mediumConfidence(description, caveats) {
  return createConfidenceLabel("medium", description, "moderate", caveats);
}
function lowConfidence(description, caveats) {
  return createConfidenceLabel("low", description, "weak", caveats);
}
function createProbableCause(id, description, confidence, likelihood, linkedEvidence = []) {
  return {
    id,
    description,
    confidence,
    linkedEvidence,
    likelihood
  };
}
function createEvidenceReference(type, id, label, url, timestamp) {
  return { type, id, label, url, timestamp };
}
function createRankedAction(id, description, priority, confidence, risk, linkedEvidence = [], estimatedEffort, rollbackAvailable = false) {
  return {
    id,
    description,
    priority,
    confidence,
    risk,
    linkedEvidence,
    estimatedEffort,
    rollbackAvailable
  };
}
function generateProbableCauses(params) {
  const causes = [];
  const criticalDrift = params.driftItems.filter((d) => d.severity === "critical");
  if (criticalDrift.length > 0) {
    causes.push(
      createProbableCause(
        "drift-critical",
        "Critical configuration drift detected affecting system alignment",
        highConfidence("Drift items confirmed by live state comparison"),
        "confirmed",
        [
          createEvidenceReference(
            "drift",
            "current-drift-report",
            `${criticalDrift.length} critical drift item(s)`,
            void 0,
            (/* @__PURE__ */ new Date()).toISOString()
          )
        ]
      )
    );
  }
  if (params.connectorFailures && params.connectorFailures.length > 0) {
    const failedProviders = params.connectorFailures.map((f) => f.providerId).join(", ");
    causes.push(
      createProbableCause(
        "connector-failures",
        `Connector failures detected for: ${failedProviders}`,
        mediumConfidence("Connector health checks show failures"),
        "confirmed",
        params.connectorFailures.map(
          (f) => createEvidenceReference(
            "failure",
            `connector-${f.providerId}`,
            `${f.providerId}: ${f.errorType}`,
            void 0,
            (/* @__PURE__ */ new Date()).toISOString()
          )
        )
      )
    );
  }
  if (params.recentChanges && params.recentChanges.length > 0) {
    const changeTypes = [...new Set(params.recentChanges.map((c) => c.changeType))];
    causes.push(
      createProbableCause(
        "recent-changes",
        `Recent changes detected: ${changeTypes.join(", ")}`,
        mediumConfidence("Change history available for correlation"),
        "probable",
        params.recentChanges.slice(0, 3).map(
          (c, i) => createEvidenceReference(
            "change",
            `change-${i}`,
            `${c.changeType} at ${c.timestamp}`,
            void 0,
            c.timestamp
          )
        )
      )
    );
  }
  return causes;
}
function rankActions(actions) {
  return [...actions].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confidenceOrder[a.confidence.level] - confidenceOrder[b.confidence.level];
    if (confDiff !== 0) return confDiff;
    const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    return riskOrder[a.risk.riskLevel] - riskOrder[b.risk.riskLevel];
  });
}
function generateRankedActions(params) {
  const actions = [];
  if (params.driftItems.length > 0) {
    const criticalDrift = params.driftItems.filter((d) => d.severity === "critical");
    const majorDrift = params.driftItems.filter((d) => d.severity === "major");
    if (criticalDrift.length > 0) {
      actions.push(
        createRankedAction(
          "action-reconcile-critical",
          `Reconcile ${criticalDrift.length} critical drift item(s) immediately`,
          1,
          // Highest priority
          highConfidence("Drift confirmed by state comparison"),
          {
            riskLevel: "high",
            riskDescription: "Reconciliation may cause temporary unavailability for affected services",
            potentialImpact: "Restores alignment but may trigger cascading updates",
            affectedAreas: criticalDrift.map((d) => d.category),
            immediateActions: ["Backup current state", "Notify affected stakeholders"]
          },
          [
            createEvidenceReference(
              "drift",
              "critical-drift-report",
              `${criticalDrift.length} critical drift item(s)`,
              void 0,
              (/* @__PURE__ */ new Date()).toISOString()
            )
          ],
          "medium",
          true
          // rollback available
        )
      );
    }
    if (majorDrift.length > 0) {
      actions.push(
        createRankedAction(
          "action-reconcile-major",
          `Review and reconcile ${majorDrift.length} major drift item(s)`,
          2,
          mediumConfidence("Drift confirmed, priority based on severity"),
          {
            riskLevel: "medium",
            riskDescription: "Reconciliation will update configurations to match desired state",
            potentialImpact: "Affected services may experience brief config refresh",
            affectedAreas: majorDrift.map((d) => d.category)
          },
          [
            createEvidenceReference(
              "drift",
              "major-drift-report",
              `${majorDrift.length} major drift item(s)`,
              void 0,
              (/* @__PURE__ */ new Date()).toISOString()
            )
          ],
          "low",
          true
        )
      );
    }
  }
  if (params.connectorIssues && params.connectorIssues.length > 0) {
    actions.push(
      createRankedAction(
        "action-reconnect",
        `Re-authenticate failed connector(s): ${params.connectorIssues.map((c) => c.providerId).join(", ")}`,
        params.driftItems.length > 0 ? 3 : 1,
        highConfidence("Connector failures confirmed by health checks"),
        {
          riskLevel: "medium",
          riskDescription: "Re-authentication may temporarily interrupt connector-dependent workflows",
          potentialImpact: "Restores connector functionality; dependent workflows resume",
          affectedAreas: ["connectors", ...params.connectorIssues.map((c) => `connector-${c.providerId}`)]
        },
        params.connectorIssues.map(
          (c) => createEvidenceReference(
            "failure",
            `connector-${c.providerId}`,
            c.issue,
            void 0,
            (/* @__PURE__ */ new Date()).toISOString()
          )
        ),
        "low",
        false
      )
    );
  }
  if (params.alerts) {
    const criticalAlerts = params.alerts.filter((a) => a.severity === "critical");
    if (criticalAlerts.length > 0) {
      actions.push(
        createRankedAction(
          "action-critical-alerts",
          `Investigate ${criticalAlerts.length} critical alert(s)`,
          1,
          highConfidence("Critical alerts require immediate attention"),
          {
            riskLevel: "critical",
            riskDescription: "Unaddressed critical alerts may lead to service degradation or outage",
            potentialImpact: "Potential data loss or service interruption if unresolved",
            affectedAreas: criticalAlerts.map((a) => a.domain),
            immediateActions: ["Acknowledge alerts", "Begin investigation", "Prepare incident response"]
          },
          criticalAlerts.map(
            (a, i) => createEvidenceReference(
              "incident",
              `alert-${i}`,
              a.title,
              void 0,
              (/* @__PURE__ */ new Date()).toISOString()
            )
          ),
          "high",
          false
        )
      );
    }
  }
  return rankActions(actions);
}
function computeOverallConfidence(probableCauses, rankedActions) {
  const causeConfidenceValues = probableCauses.map(
    (c) => c.confidence.level === "high" ? 3 : c.confidence.level === "medium" ? 2 : 1
  );
  const actionConfidenceValues = rankedActions.map(
    (a) => a.confidence.level === "high" ? 3 : a.confidence.level === "medium" ? 2 : 1
  );
  const allValues = [...causeConfidenceValues, ...actionConfidenceValues];
  const avgValue = allValues.reduce((a, b) => a + b, 0) / allValues.length;
  if (avgValue >= 2.5) {
    return highConfidence(
      "Strong evidence base supports review conclusions",
      probableCauses.length > 0 ? [`${probableCauses.length} probable cause(s) identified`] : void 0
    );
  } else if (avgValue >= 1.5) {
    return mediumConfidence(
      "Moderate evidence supports review conclusions",
      [`${probableCauses.length} probable cause(s), ${rankedActions.length} action(s) proposed`]
    );
  } else {
    return lowConfidence(
      "Limited evidence available; review conclusions are preliminary",
      ["Additional investigation may be needed to confirm root causes"]
    );
  }
}
function generateOperatingReview(params) {
  const overallConfidence = computeOverallConfidence(params.probableCauses, params.rankedActions);
  return {
    id: params.reviewId,
    title: `Operating Review - ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    stateSummary: params.stateSummary,
    probableCauses: params.probableCauses,
    rankedActions: params.rankedActions,
    linkedEvidence: params.linkedEvidence,
    overallConfidence,
    nextScheduledReview: params.nextScheduledReview
  };
}

// src/alert-generation.ts
function determineRiskLevel(severity, affectedAreas) {
  if (severity === "critical") return "critical";
  if (severity === "warning") {
    return affectedAreas.length > 2 ? "high" : "medium";
  }
  return "low";
}
function buildRiskFraming(riskLevel, description, potentialImpact, affectedAreas, immediateActions) {
  return {
    riskLevel,
    riskDescription: `${riskLevel.toUpperCase()} risk: ${description}`,
    potentialImpact,
    affectedAreas,
    immediateActions
  };
}
function createDriftAlert(params) {
  const severity = params.criticalCount > 0 ? "critical" : "warning";
  const riskLevel = determineRiskLevel(severity, ["core", "configuration"]);
  return {
    id: `alert-drift-${Date.now()}`,
    severity,
    title: params.criticalCount > 0 ? "Critical Drift Detected" : "Drift Detected",
    description: `${params.driftCount} drift item(s) detected, ${params.criticalCount} critical. Reconciliation recommended.`,
    domain: params.domain,
    risk: buildRiskFraming(
      riskLevel,
      params.criticalCount > 0 ? "Critical configuration drift may cause system misalignment and degraded behavior" : "Configuration drift detected that may accumulate if not addressed",
      params.criticalCount > 0 ? "Services relying on drifted configuration may exhibit incorrect behavior" : "Gradual deviation from desired state",
      ["core", "configuration", ...params.criticalCount > 0 ? ["data integrity"] : []],
      params.criticalCount > 0 ? ["Run reconciliation immediately", "Review drift causes", "Verify affected services"] : void 0
    ),
    linkedEvidence: params.linkedEvidence,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function createConnectorAlert(params) {
  const severity = "warning";
  const riskLevel = determineRiskLevel(severity, [`connector-${params.providerId}`]);
  return {
    id: `alert-connector-${params.providerId}-${Date.now()}`,
    severity,
    title: `Connector Issue: ${params.providerId}`,
    description: `Connector "${params.providerId}" reported ${params.errorType}. Downstream workflows may be affected.`,
    domain: params.domain,
    risk: buildRiskFraming(
      riskLevel,
      `Connector failure for ${params.providerId} may interrupt dependent workflows`,
      `Workflows relying on ${params.providerId} will fail or degrade until reconnection`,
      [`connectors`, `connector-${params.providerId}`],
      ["Check connector credentials", "Verify provider status", "Review reconnect flow"]
    ),
    linkedEvidence: params.linkedEvidence,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function createUpgradeFailureAlert(params) {
  const severity = "critical";
  const riskLevel = determineRiskLevel(severity, ["core", "lifecycle"]);
  return {
    id: `alert-upgrade-failure-${Date.now()}`,
    severity,
    title: "Upgrade Failed",
    description: `Upgrade from ${params.fromVersion} to ${params.toVersion} failed. Rollback may be required.`,
    domain: params.domain,
    risk: buildRiskFraming(
      riskLevel,
      "Failed upgrade may leave system in inconsistent state",
      "System may be running mixed versions or have partial changes applied",
      ["core", "lifecycle", "all services"],
      ["Do not attempt further upgrades", "Check rollback path", "Contact support if rollback fails"]
    ),
    linkedEvidence: params.linkedEvidence,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function createReconciliationNeededAlert(params) {
  const severity = "warning";
  const riskLevel = determineRiskLevel(severity, ["core", "configuration"]);
  return {
    id: `alert-reconcile-${Date.now()}`,
    severity,
    title: "Reconciliation Needed",
    description: params.reason,
    domain: params.domain,
    risk: buildRiskFraming(
      riskLevel,
      "System state has diverged from desired configuration",
      "Accumulated drift may cause unexpected behavior or failed deployments",
      ["core", "configuration"],
      ["Review drift items", "Plan reconciliation window", "Notify stakeholders"]
    ),
    linkedEvidence: params.linkedEvidence,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function isAlertActive(alert) {
  return !alert.resolvedAt;
}
function filterActiveAlerts(alerts) {
  return alerts.filter(isAlertActive);
}
function sortAlertsByPriority(alerts) {
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return [...alerts].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// src/change-history.ts
function createChangeEntry(params) {
  return {
    id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    changeType: params.changeType,
    description: params.description,
    domain: params.domain,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    actor: params.actor,
    linkedIssueIds: params.linkedIssueIds,
    linkedAlertIds: params.linkedAlertIds,
    evidence: params.evidence ?? [],
    rollbackAvailable: params.rollbackAvailable ?? false,
    rollbackToVersion: params.rollbackToVersion
  };
}
function createProvisioningEntry(description, actor, linkedIssueIds) {
  return createChangeEntry({
    changeType: "provision",
    description,
    domain: "core",
    actor,
    linkedIssueIds,
    rollbackAvailable: false
  });
}
function createUpgradeEntry(fromVersion, toVersion, actor, linkedIssueIds) {
  return createChangeEntry({
    changeType: "upgrade",
    description: `Upgraded from ${fromVersion} to ${toVersion}`,
    domain: "core",
    actor,
    linkedIssueIds,
    rollbackAvailable: true,
    rollbackToVersion: fromVersion
  });
}
function createRollbackEntry(targetVersion, actor, linkedIssueIds) {
  return createChangeEntry({
    changeType: "rollback",
    description: `Rolled back to ${targetVersion}`,
    domain: "core",
    actor,
    linkedIssueIds,
    rollbackAvailable: true,
    rollbackToVersion: targetVersion
  });
}
function createReconcileEntry(description, actor, linkedIssueIds, linkedAlertIds) {
  return createChangeEntry({
    changeType: "reconcile",
    description,
    domain: "core",
    actor,
    linkedIssueIds,
    linkedAlertIds,
    rollbackAvailable: false
  });
}
function createConnectorChangeEntry(providerId, changeDescription, linkedIssueIds, linkedAlertIds) {
  return createChangeEntry({
    changeType: "connector_change",
    description: `${providerId}: ${changeDescription}`,
    domain: "connectors",
    linkedIssueIds,
    linkedAlertIds,
    rollbackAvailable: false
  });
}
function createConfigChangeEntry(configPath, changeDescription, actor, linkedIssueIds) {
  return createChangeEntry({
    changeType: "config_change",
    description: `${configPath}: ${changeDescription}`,
    domain: "core",
    actor,
    linkedIssueIds,
    rollbackAvailable: true
  });
}
function buildChangeHistory(entries, since) {
  let filteredEntries = entries;
  if (since) {
    const sinceDate = new Date(since);
    filteredEntries = entries.filter(
      (e) => new Date(e.timestamp) >= sinceDate
    );
  }
  return {
    entries: [...filteredEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
    totalCount: filteredEntries.length,
    since
  };
}
function getRecentChanges(entries, windowHours = 24) {
  const cutoff = /* @__PURE__ */ new Date();
  cutoff.setHours(cutoff.getHours() - windowHours);
  return entries.filter((e) => new Date(e.timestamp) >= cutoff);
}
function correlateIssueToChanges(issueTimestamp, changes, windowHours = 48) {
  const issueDate = new Date(issueTimestamp);
  const windowStart = new Date(issueDate);
  windowStart.setHours(windowStart.getHours() - windowHours);
  return changes.filter((c) => {
    const changeDate = new Date(c.timestamp);
    return changeDate >= windowStart && changeDate <= issueDate;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
function correlateAlertToChanges(alertTimestamp, changes, windowHours = 48) {
  return correlateIssueToChanges(alertTimestamp, changes, windowHours);
}

// src/worker.ts
var cockpitState = {
  changeHistory: [],
  activeAlerts: [],
  toolHealthRegistry: {
    tools: /* @__PURE__ */ new Map(),
    lastUpdate: (/* @__PURE__ */ new Date()).toISOString()
  }
};
function createFallbackCrossAreaRuntime() {
  return {
    getData: async (key) => {
      switch (key) {
        case "setup.handoff":
          return {
            setupId: "setup_studio_handoff",
            workspaceId: "workspace_acme_ready",
            cockpitUrl: "http://localhost:3102/cockpit/workspace_acme_ready",
            status: "ready",
            healthSummary: "Workspace is ready for cockpit monitoring.",
            evidence: {
              provisioningOutput: {
                action: "provision",
                status: "ready",
                completedAt: "2026-04-03T15:00:00.000Z",
                checks: [
                  { name: "core-packages", status: "passed" },
                  { name: "connector-prereqs", status: "passed" }
                ]
              },
              completedStages: ["preflight", "apply", "handoff"],
              contractValidation: {
                status: "passed",
                blockingMismatches: []
              }
            }
          };
        case "compat:summary":
          return {
            overallStatus: "compatible",
            consumers: [
              {
                consumerId: "uos-plugin-operations-cockpit",
                currentStatus: "supported",
                validationMode: "runtime",
                maintained: true,
                evidenceSource: "compat:summary"
              },
              {
                consumerId: "uos-plugin-connectors",
                currentStatus: "degraded",
                validationMode: "runtime",
                maintained: true,
                evidenceSource: "compat:summary"
              }
            ],
            supportedConsumers: ["uos-plugin-operations-cockpit"],
            degradedConsumers: ["uos-plugin-connectors"],
            blockedConsumers: []
          };
        case "classifyFailure":
          return {
            failure: {
              id: "failure-slack-xaf-002",
              category: "callback_mismatch",
              severity: "high",
              providerId: "slack",
              detectedAt: "2026-04-03T15:05:00.000Z",
              retryable: true,
              suggestedRetryDelayMs: 3e4,
              maxRetries: 3,
              displayMessage: "Callback signature mismatch after upstream provider change",
              evidence: [
                { type: "header", key: "retry-after", value: "30", containsSensitiveData: false },
                { type: "request", key: "x-request-id", value: "xaf-002-callback-mismatch", containsSensitiveData: false }
              ]
            }
          };
        case "reconcileCallbacks":
          return {
            result: {
              id: "reconcile-slack-gap",
              providerId: "slack",
              status: "partial",
              startedAt: "2026-04-03T15:05:00.000Z",
              completedAt: "2026-04-03T15:06:00.000Z",
              detectedGaps: [
                {
                  id: "gap-1",
                  providerId: "slack",
                  eventType: "message.created",
                  gapStart: "2026-04-03T10:00:00Z",
                  gapEnd: "2026-04-03T11:00:00Z",
                  reason: "provider_outage",
                  estimatedMissedCount: 4,
                  reconciled: false,
                  unresolvedEvents: [{ id: "evt-1", eventType: "message.created", errorMessage: "Signature mismatch" }]
                }
              ],
              totalReplayed: 2,
              totalUnresolved: 1,
              stateConsistent: false,
              summary: "Replayed 2 callback(s) and left 1 unresolved event."
            }
          };
        default:
          throw new Error(`Unsupported cross-area key in fallback runtime: ${key}`);
      }
    }
  };
}
async function buildCrossAreaFoundationSnapshot(harness) {
  const runtime = harness?.getData ? harness : createFallbackCrossAreaRuntime();
  const performAction = async (actionName, args) => {
    return runtime.performAction ? runtime.performAction(actionName, args) : runtime.getData(actionName, args);
  };
  const [handoffResult, compatSummary, connectorFailureResult, reconciliationResult] = await Promise.all([
    performAction("setup.handoff"),
    runtime.getData("compat:summary"),
    performAction("classifyFailure", {
      providerId: "slack",
      errorMessage: "Callback signature mismatch after upstream provider change",
      statusCode: 422,
      headers: {
        "retry-after": "30",
        "x-request-id": "xaf-002-callback-mismatch"
      }
    }),
    performAction("reconcileCallbacks", {
      providerId: "slack",
      gaps: [
        {
          eventType: "message.created",
          gapStart: "2026-04-03T10:00:00Z",
          gapEnd: "2026-04-03T11:00:00Z",
          reason: "provider_outage",
          replaySuccessRate: 0.5,
          estimatedMissedCount: 4
        }
      ]
    })
  ]);
  const handoff = {
    setupId: handoffResult.setupId,
    workspaceId: handoffResult.workspaceId,
    cockpitUrl: handoffResult.cockpitUrl,
    status: handoffResult.status,
    healthSummary: handoffResult.healthSummary,
    evidence: {
      provisioningOutput: handoffResult.evidence.provisioningOutput,
      completedStages: handoffResult.evidence.completedStages,
      contractValidation: handoffResult.evidence.contractValidation
    }
  };
  const compatibility = {
    overallStatus: compatSummary.overallStatus,
    consumers: compatSummary.consumers.map((consumer) => ({
      consumerId: consumer.consumerId,
      currentStatus: consumer.currentStatus,
      validationMode: consumer.validationMode,
      maintained: consumer.maintained,
      evidenceSource: consumer.evidenceSource ?? "compat:summary"
    })),
    supportedConsumers: compatSummary.supportedConsumers,
    degradedConsumers: compatSummary.degradedConsumers,
    blockedConsumers: compatSummary.blockedConsumers
  };
  const failure = connectorFailureResult.failure;
  const connectorFailure = {
    id: failure.id,
    category: failure.category,
    severity: failure.severity === "info" ? "low" : failure.severity,
    providerId: failure.providerId,
    detectedAt: failure.detectedAt,
    retryable: failure.retryable,
    suggestedRetryDelayMs: failure.suggestedRetryDelayMs,
    maxRetries: failure.maxRetries ?? 0,
    displayMessage: failure.displayMessage,
    evidence: failure.evidence
  };
  const reconciliation = reconciliationResult.result;
  return {
    setupId: handoff.setupId,
    handoff,
    compatibility,
    connectorFailure,
    reconciliation
  };
}
function getRealCoreHealth(snapshot) {
  return getCoreHealth({
    provisioningHealthy: snapshot.handoff.status === "ready",
    upgradeHealthy: snapshot.compatibility.overallStatus !== "unsupported",
    lastProvisioningAt: snapshot.handoff.evidence.provisioningOutput.completedAt,
    driftStatus: snapshot.reconciliation.totalUnresolved > 0 || snapshot.connectorFailure.category === "callback_mismatch" ? "drifted" : "aligned"
  });
}
function getRealConnectorHealth(snapshot) {
  return getConnectorHealth({
    certifiedConnectors: snapshot.compatibility.supportedConsumers.length,
    failedConnectors: snapshot.connectorFailure.severity === "high" || snapshot.connectorFailure.severity === "critical" ? 1 : 0,
    pendingConnectors: snapshot.reconciliation.totalUnresolved,
    lastHealthCheck: snapshot.connectorFailure.detectedAt
  });
}
function getRealSetupHealth(snapshot) {
  return getSetupHealth({
    lastSetupCompletedAt: snapshot.handoff.evidence.provisioningOutput.completedAt,
    setupInProgress: false,
    contractMismatch: snapshot.compatibility.blockedConsumers.length > 0
  });
}
function getRealSkillsHealth() {
  return getSkillsHealth({
    catalogedSkills: 24,
    extractedSkills: 12,
    staleExtractions: 0
  });
}
function getRealDepartmentsHealth() {
  return getDepartmentsHealth({
    activeWorkflows: 8,
    degradedWorkflows: 0
  });
}
function getRealDriftItems(snapshot) {
  const items = [];
  if (snapshot.reconciliation.totalUnresolved > 0) {
    items.push({
      category: "connectors",
      severity: "critical",
      description: `Connector reconciliation for ${snapshot.connectorFailure.providerId} replayed ${snapshot.reconciliation.totalReplayed} event(s) but left ${snapshot.reconciliation.totalUnresolved} unresolved event(s).`
    });
  }
  if (snapshot.compatibility.degradedConsumers.length > 0) {
    items.push({
      category: "compatibility",
      severity: "high",
      description: `Compatibility summary reports degraded consumers: ${snapshot.compatibility.degradedConsumers.join(", ")}.`
    });
  }
  return items;
}
function getRealConnectorFailures(snapshot) {
  return [
    {
      providerId: snapshot.connectorFailure.providerId,
      issue: snapshot.connectorFailure.category,
      evidence: snapshot.connectorFailure.evidence.map((entry) => `${entry.key}=${entry.value}`)
    }
  ];
}
function createEvidenceReferenceFromConnectorSnapshot(snapshot) {
  return snapshot.connectorFailure.evidence.map(
    (entry, index) => createEvidenceReference(
      "failure",
      `connector-failure-${snapshot.connectorFailure.id}-${index}`,
      `${snapshot.connectorFailure.providerId}:${snapshot.connectorFailure.category}`,
      `${entry.key}=${entry.value}`,
      snapshot.connectorFailure.detectedAt
    )
  );
}
function createEvidenceReferenceFromReconciliation(snapshot) {
  const baseEvidence = [
    createEvidenceReference(
      "review",
      `reconciliation-${snapshot.reconciliation.id}`,
      `Connector reconciliation: ${snapshot.reconciliation.summary}`,
      void 0,
      snapshot.reconciliation.completedAt ?? snapshot.reconciliation.startedAt
    )
  ];
  return [
    ...baseEvidence,
    ...snapshot.reconciliation.detectedGaps.flatMap((gap, gapIndex) => [
      createEvidenceReference(
        "drift",
        `reconciliation-gap-${gap.id}-${gapIndex}`,
        `${gap.providerId}:${gap.eventType}`,
        `${gap.reason} between ${gap.gapStart} and ${gap.gapEnd}`,
        gap.gapEnd
      ),
      ...gap.unresolvedEvents.map(
        (event, unresolvedIndex) => createEvidenceReference(
          "failure",
          `reconciliation-gap-${gap.id}-unresolved-${unresolvedIndex}`,
          `${gap.providerId}:${event.eventType}`,
          event.errorMessage,
          gap.gapEnd
        )
      )
    ])
  ];
}
function createEvidenceReferenceFromLifecycle(snapshot) {
  const contractValidation = Array.isArray(snapshot.handoff.evidence.contractValidation) ? snapshot.handoff.evidence.contractValidation : [];
  return [
    createEvidenceReference(
      "review",
      `handoff-${snapshot.handoff.setupId}`,
      `Setup handoff: ${snapshot.handoff.status}`,
      `Completed stages: ${snapshot.handoff.evidence.completedStages.join(", ")}`,
      snapshot.handoff.evidence.provisioningOutput.completedAt
    ),
    ...contractValidation.map(
      (validation, index) => createEvidenceReference(
        "review",
        `contract-validation-${validation.contractId}-${index}`,
        `${validation.contractId}:${validation.severity}`,
        validation.remediation,
        snapshot.handoff.evidence.provisioningOutput.completedAt
      )
    )
  ];
}
function deriveActiveAlerts(snapshot) {
  const alerts = [];
  const connectorEvidence = createEvidenceReferenceFromConnectorSnapshot(snapshot);
  const reconciliationEvidence = createEvidenceReferenceFromReconciliation(snapshot);
  const lifecycleEvidence = createEvidenceReferenceFromLifecycle(snapshot);
  if (snapshot.connectorFailure.severity === "high" || snapshot.connectorFailure.severity === "critical") {
    alerts.push(
      createConnectorAlert({
        providerId: snapshot.connectorFailure.providerId,
        errorType: snapshot.connectorFailure.category,
        domain: "connectors",
        linkedEvidence: connectorEvidence
      })
    );
  }
  if (snapshot.reconciliation.totalUnresolved > 0) {
    alerts.push(
      createDriftAlert({
        driftCount: snapshot.reconciliation.detectedGaps.length,
        criticalCount: snapshot.reconciliation.totalUnresolved,
        domain: "connectors",
        linkedEvidence: reconciliationEvidence
      }),
      createReconciliationNeededAlert({
        reason: snapshot.reconciliation.summary,
        domain: "connectors",
        linkedEvidence: reconciliationEvidence
      })
    );
  }
  if (snapshot.handoff.status === "degraded" || snapshot.compatibility.overallStatus === "unsupported") {
    alerts.push(
      createUpgradeFailureAlert({
        fromVersion: snapshot.compatibility.supportedConsumers[0] ?? "previous",
        toVersion: snapshot.compatibility.blockedConsumers[0] ?? "current",
        domain: "core",
        linkedEvidence: lifecycleEvidence
      })
    );
  }
  return sortAlertsByPriority(filterActiveAlerts(alerts));
}
var TOOL_HEALTH_REGISTRY_DIR = resolve(process.cwd(), ".factory", "tool-health");
function readToolHealthFromFileRegistry() {
  const reports = [];
  try {
    if (!existsSync(TOOL_HEALTH_REGISTRY_DIR)) {
      return reports;
    }
    const files = readdirSync(TOOL_HEALTH_REGISTRY_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = resolve(TOOL_HEALTH_REGISTRY_DIR, file);
      try {
        const content = readFileSync(filePath, "utf-8");
        const report = JSON.parse(content);
        if (report.toolId && report.toolName && report.status) {
          reports.push(report);
        }
      } catch (e) {
        void e;
      }
    }
  } catch (e) {
    void e;
  }
  return reports;
}
function getToolsHealthFromRegistry() {
  const memoryTools = Array.from(cockpitState.toolHealthRegistry.tools.values());
  const fileTools = readToolHealthFromFileRegistry();
  const toolMap = /* @__PURE__ */ new Map();
  for (const tool of fileTools) {
    toolMap.set(tool.toolId, tool);
  }
  for (const tool of memoryTools) {
    toolMap.set(tool.toolId, tool);
  }
  const toolList = Array.from(toolMap.values());
  const registeredTools = toolList.length;
  const failedTools = toolList.filter((t) => t.status === "error" || t.status === "degraded").length;
  let status = "ok";
  if (toolList.some((t) => t.status === "error")) {
    status = "error";
  } else if (toolList.some((t) => t.status === "degraded")) {
    status = "degraded";
  } else if (toolList.length === 0) {
    status = "unknown";
  }
  const message = toolList.length === 0 ? "No tool plugins registered." : failedTools > 0 ? `${failedTools} of ${registeredTools} tool(s) in degraded/error state.` : `${registeredTools} tool(s) healthy.`;
  return getToolsHealth({
    registeredTools,
    failedTools
  });
}
var plugin = definePlugin({
  async setup(ctx) {
    ctx.events.on("issue.created", async (event) => {
      const issueId = event.entityId ?? "unknown";
      await ctx.state.set({ scopeKind: "issue", scopeId: issueId, stateKey: "seen" }, true);
      ctx.logger.info("Observed issue.created", { issueId });
      const changeEntry = createProvisioningEntry(
        `Issue created: ${issueId}`,
        "system",
        [issueId]
      );
      cockpitState.changeHistory.push(changeEntry);
    });
    ctx.data.register("health", async () => {
      const snapshot = await buildCrossAreaFoundationSnapshot(ctx);
      const domains = [
        getRealCoreHealth(snapshot),
        getRealConnectorHealth(snapshot),
        getRealSetupHealth(snapshot),
        getRealSkillsHealth(),
        getRealDepartmentsHealth(),
        getToolsHealthFromRegistry()
      ];
      const summary = buildMultiDomainHealthSummary(domains);
      cockpitState.lastHealthCheck = summary.checkedAt;
      return {
        status: summary.overallStatus,
        checkedAt: summary.checkedAt,
        // New multi-domain format
        overallStatus: summary.overallStatus,
        domains: summary.domains,
        summary: summary.summary
      };
    });
    ctx.data.register("health:core", async () => {
      return getRealCoreHealth(await buildCrossAreaFoundationSnapshot(ctx));
    });
    ctx.data.register("health:connectors", async () => {
      return getRealConnectorHealth(await buildCrossAreaFoundationSnapshot(ctx));
    });
    ctx.data.register("health:setup", async () => {
      return getRealSetupHealth(await buildCrossAreaFoundationSnapshot(ctx));
    });
    ctx.data.register("health:skills", async () => {
      return getRealSkillsHealth();
    });
    ctx.data.register("health:departments", async () => {
      return getRealDepartmentsHealth();
    });
    ctx.data.register("health:tools", async () => {
      return getToolsHealthFromRegistry();
    });
    ctx.data.register("tool-health-registry", async () => {
      const memoryTools = Array.from(cockpitState.toolHealthRegistry.tools.values());
      const fileTools = readToolHealthFromFileRegistry();
      const toolMap = /* @__PURE__ */ new Map();
      for (const tool of fileTools) {
        toolMap.set(tool.toolId, tool);
      }
      for (const tool of memoryTools) {
        toolMap.set(tool.toolId, tool);
      }
      const tools = Array.from(toolMap.values());
      const memoryLastUpdate = cockpitState.toolHealthRegistry.lastUpdate;
      const fileLastUpdate = fileTools.length > 0 ? fileTools.reduce((latest, t) => t.checkedAt > latest ? t.checkedAt : latest, fileTools[0].checkedAt) : null;
      const lastUpdate = fileLastUpdate && fileLastUpdate > memoryLastUpdate ? fileLastUpdate : memoryLastUpdate;
      return {
        tools,
        totalCount: tools.length,
        healthyCount: tools.filter((t) => t.status === "ok").length,
        degradedCount: tools.filter((t) => t.status === "degraded").length,
        errorCount: tools.filter((t) => t.status === "error").length,
        lastUpdate
      };
    });
    ctx.data.register("alerts", async () => {
      const snapshot = await buildCrossAreaFoundationSnapshot(ctx);
      cockpitState.activeAlerts = deriveActiveAlerts(snapshot);
      return {
        alerts: cockpitState.activeAlerts,
        totalCount: cockpitState.activeAlerts.length,
        criticalCount: cockpitState.activeAlerts.filter((a) => a.severity === "critical").length,
        warningCount: cockpitState.activeAlerts.filter((a) => a.severity === "warning").length
      };
    });
    ctx.data.register("changeHistory", async (_ctx, args) => {
      void _ctx;
      let history = cockpitState.changeHistory;
      if (args?.since) {
        const sinceDate = new Date(args.since);
        history = history.filter((e) => new Date(e.timestamp) >= sinceDate);
      }
      if (args?.limit) {
        history = history.slice(0, args.limit);
      }
      return buildChangeHistory(history, args?.since);
    });
    ctx.data.register("cockpitOverview", async () => {
      const snapshot = await buildCrossAreaFoundationSnapshot(ctx);
      cockpitState.activeAlerts = deriveActiveAlerts(snapshot);
      const domains = [
        getRealCoreHealth(snapshot),
        getRealConnectorHealth(snapshot),
        getRealSetupHealth(snapshot),
        getRealSkillsHealth(),
        getRealDepartmentsHealth(),
        getToolsHealthFromRegistry()
      ];
      const healthSummary = buildMultiDomainHealthSummary(domains);
      const activeAlerts = filterActiveAlerts(cockpitState.activeAlerts);
      const sortedAlerts = sortAlertsByPriority(activeAlerts);
      const recentChanges = getRecentChanges(cockpitState.changeHistory, 24);
      return {
        health: healthSummary,
        activeAlerts: sortedAlerts.slice(0, 10),
        alertSummary: {
          total: activeAlerts.length,
          critical: activeAlerts.filter((a) => a.severity === "critical").length,
          warning: activeAlerts.filter((a) => a.severity === "warning").length,
          info: activeAlerts.filter((a) => a.severity === "info").length
        },
        recentChanges: recentChanges.slice(0, 5),
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    ctx.actions.register("ping", async () => {
      ctx.logger.info("Ping action invoked");
      return { pong: true, at: (/* @__PURE__ */ new Date()).toISOString() };
    });
    ctx.actions.register("reportToolHealth", async (args) => {
      const toolId = args.toolId;
      const toolName = args.toolName;
      const status = args.status;
      const message = args.message;
      if (!toolId || !toolName || !status) {
        ctx.logger.warn("reportToolHealth called with missing required fields", { args });
        return { success: false, error: "Missing required fields: toolId, toolName, status" };
      }
      const report = {
        toolId,
        toolName,
        status,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        message
      };
      cockpitState.toolHealthRegistry.tools.set(toolId, report);
      cockpitState.toolHealthRegistry.lastUpdate = (/* @__PURE__ */ new Date()).toISOString();
      ctx.logger.info("Tool health report received", { toolId, toolName, status });
      return { success: true, report };
    });
    ctx.actions.register("getToolHealthRegistry", async () => {
      const memoryTools = Array.from(cockpitState.toolHealthRegistry.tools.values());
      const fileTools = readToolHealthFromFileRegistry();
      const toolMap = /* @__PURE__ */ new Map();
      for (const tool of fileTools) {
        toolMap.set(tool.toolId, tool);
      }
      for (const tool of memoryTools) {
        toolMap.set(tool.toolId, tool);
      }
      const tools = Array.from(toolMap.values());
      const memoryLastUpdate = cockpitState.toolHealthRegistry.lastUpdate;
      const fileLastUpdate = fileTools.length > 0 ? fileTools.reduce((latest, t) => t.checkedAt > latest ? t.checkedAt : latest, fileTools[0].checkedAt) : null;
      const lastUpdate = fileLastUpdate && fileLastUpdate > memoryLastUpdate ? fileLastUpdate : memoryLastUpdate;
      return {
        tools,
        totalCount: tools.length,
        healthyCount: tools.filter((t) => t.status === "ok").length,
        degradedCount: tools.filter((t) => t.status === "degraded").length,
        errorCount: tools.filter((t) => t.status === "error").length,
        lastUpdate
      };
    });
    ctx.actions.register("generateReview", async (args) => {
      ctx.logger.info("Generating operating review", { args });
      const snapshot = await buildCrossAreaFoundationSnapshot(ctx);
      cockpitState.activeAlerts = deriveActiveAlerts(snapshot);
      const driftItems = getRealDriftItems(snapshot);
      const connectorFailures = getRealConnectorFailures(snapshot);
      const recentChanges = getRecentChanges(cockpitState.changeHistory, 24).map((c) => ({
        changeType: c.changeType,
        timestamp: c.timestamp
      }));
      const stateSummary = {
        totalIssues: cockpitState.activeAlerts.length,
        criticalIssues: cockpitState.activeAlerts.filter((a) => a.severity === "critical").length,
        openDriftItems: driftItems.length,
        connectorIssues: connectorFailures.length,
        recentChanges: recentChanges.length
      };
      const probableCauses = generateProbableCauses({
        driftItems,
        connectorFailures: connectorFailures.map((c) => ({ providerId: c.providerId, errorType: c.issue })),
        recentChanges
      });
      const rankedActions = generateRankedActions({
        driftItems,
        alerts: cockpitState.activeAlerts.map((a) => ({
          title: a.title,
          severity: a.severity,
          domain: a.domain
        })),
        connectorIssues: connectorFailures.map(({ providerId, issue }) => ({ providerId, issue }))
      });
      const linkedEvidence = [
        ...driftItems.map(
          (d, i) => createEvidenceReference("drift", `drift-${i}`, d.description)
        ),
        ...connectorFailures.flatMap(
          (failure, index) => failure.evidence.map(
            (evidence, evidenceIndex) => createEvidenceReference(
              "failure",
              `connector-${index}-evidence-${evidenceIndex}`,
              `${failure.providerId}:${failure.issue}`,
              evidence
            )
          )
        ),
        ...createEvidenceReferenceFromReconciliation(snapshot),
        ...createEvidenceReferenceFromLifecycle(snapshot),
        ...cockpitState.activeAlerts.map(
          (a) => createEvidenceReference("incident", a.id, a.title, void 0, a.createdAt)
        )
      ];
      const review = generateOperatingReview({
        reviewId: args?.reviewId ?? `review-${Date.now()}`,
        stateSummary,
        probableCauses,
        rankedActions,
        linkedEvidence,
        nextScheduledReview: new Date(Date.now() + 864e5).toISOString()
        // 24h from now
      });
      cockpitState.lastReviewGeneration = review.generatedAt;
      return review;
    });
    ctx.actions.register("getAlertDetail", async (args) => {
      const alertId = args.alertId;
      const alert = cockpitState.activeAlerts.find((a) => a.id === alertId);
      if (!alert) {
        return { error: "Alert not found", alertId };
      }
      const relatedChanges = correlateAlertToChanges(
        alert.createdAt,
        cockpitState.changeHistory,
        48
        // 48 hour window
      );
      return {
        alert,
        relatedChanges,
        changeHistory: buildChangeHistory(relatedChanges)
      };
    });
    ctx.actions.register("acknowledgeAlert", async (args) => {
      const alertId = args.alertId;
      const alertIndex = cockpitState.activeAlerts.findIndex((a) => a.id === alertId);
      if (alertIndex === -1) {
        return { error: "Alert not found", alertId };
      }
      cockpitState.activeAlerts[alertIndex] = {
        ...cockpitState.activeAlerts[alertIndex],
        acknowledgedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      return { success: true, alert: cockpitState.activeAlerts[alertIndex] };
    });
    ctx.actions.register("resolveAlert", async (args) => {
      const alertId = args.alertId;
      const alertIndex = cockpitState.activeAlerts.findIndex((a) => a.id === alertId);
      if (alertIndex === -1) {
        return { error: "Alert not found", alertId };
      }
      cockpitState.activeAlerts[alertIndex] = {
        ...cockpitState.activeAlerts[alertIndex],
        resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      return { success: true, alert: cockpitState.activeAlerts[alertIndex] };
    });
    ctx.actions.register("generateRemediation", async (args) => {
      ctx.logger.info("Generating remediation plan", { args });
      const alertId = args.alertId;
      const targetIssueId = args.targetIssueId;
      let relatedAlert;
      if (alertId) {
        relatedAlert = cockpitState.activeAlerts.find((a) => a.id === alertId);
      }
      const steps = [];
      let stepOrder = 1;
      steps.push({
        order: stepOrder++,
        description: "Investigate the issue and gather evidence",
        risk: {
          riskLevel: "low",
          riskDescription: "Investigation only, no changes made",
          potentialImpact: "None",
          affectedAreas: []
        },
        estimatedTime: "15-30 minutes",
        automated: false
      });
      steps.push({
        order: stepOrder++,
        description: "Plan the remediation based on investigation findings",
        risk: {
          riskLevel: "low",
          riskDescription: "Planning only, no changes made",
          potentialImpact: "None",
          affectedAreas: []
        },
        estimatedTime: "30-60 minutes",
        automated: false
      });
      if (relatedAlert?.risk.affectedAreas) {
        steps.push({
          order: stepOrder++,
          description: `Execute remediation for: ${relatedAlert.risk.affectedAreas.join(", ")}`,
          risk: {
            riskLevel: relatedAlert.risk.riskLevel,
            riskDescription: relatedAlert.risk.riskDescription,
            potentialImpact: relatedAlert.risk.potentialImpact,
            affectedAreas: relatedAlert.risk.affectedAreas,
            immediateActions: relatedAlert.risk.immediateActions
          },
          estimatedTime: "1-4 hours",
          automated: false
        });
      }
      steps.push({
        order: stepOrder++,
        description: "Verify remediation was successful",
        risk: {
          riskLevel: "medium",
          riskDescription: "Verification may require read access to production systems",
          potentialImpact: "None if done read-only",
          affectedAreas: relatedAlert?.risk.affectedAreas ?? []
        },
        estimatedTime: "15-30 minutes",
        automated: false
      });
      const remediationPlan = {
        id: `remediation-${Date.now()}`,
        title: relatedAlert ? `Remediation for: ${relatedAlert.title}` : "General Remediation Plan",
        targetIssueId,
        steps,
        confidence: mediumConfidence(
          "Remediation steps based on alert analysis and best practices",
          relatedAlert ? ["Alert-specific guidance included"] : void 0
        ),
        risk: relatedAlert?.risk ?? {
          riskLevel: "medium",
          riskDescription: "Remediation execution has inherent risk",
          potentialImpact: "May temporarily affect services",
          affectedAreas: []
        },
        linkedEvidence: relatedAlert?.linkedEvidence ?? [],
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        applicableScenarios: relatedAlert ? [relatedAlert.description] : void 0
      };
      return remediationPlan;
    });
    ctx.actions.register("recordChange", async (args) => {
      ctx.logger.info("Recording change", { args });
      const changeType = args.changeType;
      const description = args.description;
      const domain = args.domain;
      const actor = args.actor;
      const linkedIssueIds = args.linkedIssueIds;
      const linkedAlertIds = args.linkedAlertIds;
      const rollbackToVersion = args.rollbackToVersion;
      let changeEntry;
      switch (changeType) {
        case "provision":
          changeEntry = createProvisioningEntry(description, actor, linkedIssueIds);
          break;
        case "upgrade":
          changeEntry = createUpgradeEntry(
            rollbackToVersion ?? "previous",
            "current",
            actor,
            linkedIssueIds
          );
          break;
        case "rollback":
          changeEntry = createRollbackEntry(
            rollbackToVersion ?? "previous",
            actor,
            linkedIssueIds
          );
          break;
        case "reconcile":
          changeEntry = createReconcileEntry(
            description,
            actor,
            linkedIssueIds,
            linkedAlertIds
          );
          break;
        case "connector_change":
          changeEntry = createConnectorChangeEntry(
            domain === "connectors" ? description.split(":")[0] ?? "unknown" : "unknown",
            description,
            linkedIssueIds,
            linkedAlertIds
          );
          break;
        case "config_change":
          changeEntry = createConfigChangeEntry(
            "config",
            description,
            actor,
            linkedIssueIds
          );
          break;
        default:
          changeEntry = createProvisioningEntry(description, actor, linkedIssueIds);
      }
      cockpitState.changeHistory.push(changeEntry);
      return { success: true, changeEntry };
    });
    ctx.actions.register("getChangeHistory", async (args) => {
      let history = cockpitState.changeHistory;
      if (args?.since) {
        const sinceDate = new Date(args.since);
        history = history.filter((e) => new Date(e.timestamp) >= sinceDate);
      }
      if (args?.domain) {
        history = history.filter((e) => e.domain === args.domain);
      }
      if (args?.limit) {
        history = history.slice(0, args.limit);
      }
      return buildChangeHistory(history, args?.since);
    });
    ctx.actions.register("getCockpitOverview", async () => {
      const snapshot = await buildCrossAreaFoundationSnapshot(ctx);
      cockpitState.activeAlerts = deriveActiveAlerts(snapshot);
      const domains = [
        getRealCoreHealth(snapshot),
        getRealConnectorHealth(snapshot),
        getRealSetupHealth(snapshot),
        getRealSkillsHealth(),
        getRealDepartmentsHealth(),
        getToolsHealthFromRegistry()
      ];
      const healthSummary = buildMultiDomainHealthSummary(domains);
      const activeAlerts = filterActiveAlerts(cockpitState.activeAlerts);
      const sortedAlerts = sortAlertsByPriority(activeAlerts);
      const recentChanges = getRecentChanges(cockpitState.changeHistory, 24);
      return {
        health: healthSummary,
        activeAlerts: sortedAlerts.slice(0, 10),
        // Top 10 alerts
        alertSummary: {
          total: activeAlerts.length,
          critical: activeAlerts.filter((a) => a.severity === "critical").length,
          warning: activeAlerts.filter((a) => a.severity === "warning").length,
          info: activeAlerts.filter((a) => a.severity === "info").length
        },
        recentChanges: recentChanges.slice(0, 5),
        // Top 5 changes
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
  },
  async onHealth() {
    const snapshot = await buildCrossAreaFoundationSnapshot(createFallbackCrossAreaRuntime());
    const domains = [
      getRealCoreHealth(snapshot),
      getRealConnectorHealth(snapshot),
      getRealSetupHealth(snapshot),
      getRealSkillsHealth(),
      getRealDepartmentsHealth(),
      getToolsHealthFromRegistry()
    ];
    const overallStatus = computeOverallStatus(domains.map((d) => d.status));
    return {
      status: overallStatus === "ok" ? "ok" : overallStatus === "degraded" ? "degraded" : "error",
      message: overallStatus === "ok" ? "All domains operating normally" : overallStatus === "degraded" ? "Some domains degraded" : "Critical issues detected"
    };
  }
});
var worker_default = plugin;
runWorker(plugin, import.meta.url);
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
