/**
 * Obsidian plugin compatibility loader.
 *
 * Discovers plugins installed in a vault, checks their manifests, evaluates
 * their `main.js` bundles through Geode's compatibility require map, and
 * registers them with the host plugin manager. It also keeps enabled state,
 * adapts a few legacy APIs, and publishes a report for the Settings UI.
 */

// -------------------- Imports and shared types --------------------
import * as cmAutocomplete from "@codemirror/autocomplete";
import * as cmCommands from "@codemirror/commands";
import * as cmLanguage from "@codemirror/language";
import * as cmSearch from "@codemirror/search";
import * as cmState from "@codemirror/state";
import * as cmView from "@codemirror/view";
import { NodeProp } from "@lezer/common";
import * as lezerHighlight from "@lezer/highlight";
import type { AppHandle, GeodePlugin, PluginManager } from "@core/plugins";
import { Store } from "@core/store";
import type { ObsidianPluginSource, Vault } from "@core/vault";
import { loadComponentAsync } from "./component";
import { createCompatContext, type CompatContext } from "./context";
import { installDomAugmentation } from "./dom";
import { FIXTURE_PLUGIN, FIXTURE_PLUGIN_ID } from "./fixture";
import { es5Callable } from "./es5compat";
import { drainGaps, resetGaps } from "./gaps";
import * as obsidianModule from "./index";
import { pathShim } from "./path-shim";
import type { Plugin as ObsidianPlugin, PluginManifest } from "./plugin";
import { apiVersion, moment, semverCompare } from "./util";

// -------------------- Obsidian API compatibility --------------------

/**
 * Most of Geode's Obsidian API shim can be shared directly with plugins.
 * These selected base classes need ES5-callable wrappers because some older
 * plugins transpile inheritance to `Base.apply(this)` instead of `super()`.
 */
const obsidianForPlugins = {
  ...obsidianModule,
  Component: es5Callable(obsidianModule.Component),
  MarkdownRenderChild: es5Callable(obsidianModule.MarkdownRenderChild),
  Plugin: es5Callable(obsidianModule.Plugin),
  PluginSettingTab: es5Callable(obsidianModule.PluginSettingTab),
  View: es5Callable(obsidianModule.View),
  ItemView: es5Callable(obsidianModule.ItemView),
  FileView: es5Callable(obsidianModule.FileView),
};

// -------------------- CodeMirror compatibility --------------------

/**
 * Older Obsidian plugins may expect `tokenClassNodeProp`, which newer
 * CodeMirror versions no longer export. `Reflect.get` checks for the legacy
 * property at runtime without making the bundler resolve a missing export.
 * If it is absent, provide a real but unset NodeProp so calls such as
 * `node.type.prop(...)` remain safe. This fallback does not restore the old
 * token-class styling behavior for Geode's CodeMirror 6 editor.
 */
const legacyTokenClassNodeProp = Reflect.get(
  cmLanguage,
  "tokenClassNodeProp",
);

const cmLanguageForPlugins = {
  ...cmLanguage,
  tokenClassNodeProp: legacyTokenClassNodeProp ?? new NodeProp(),
};

// -------------------- Controlled plugin module resolution --------------------

/**
 * Modules exposed to a plugin's `require()` call. Keeping this map explicit
 * makes the compatibility surface visible and avoids resolving arbitrary
 * package names from a plugin bundle.
 */
const HOST_MODULES: Record<string, unknown> = {
  obsidian: obsidianForPlugins,
  path: pathShim,
  "@codemirror/state": cmState,
  "@codemirror/view": cmView,
  "@codemirror/language": cmLanguageForPlugins,
  "@codemirror/commands": cmCommands,
  "@codemirror/search": cmSearch,
  "@codemirror/autocomplete": cmAutocomplete,
  "@lezer/highlight": lezerHighlight,
};

/** Resolve one of the compatibility modules listed in HOST_MODULES. */
function hostRequire(id: string): unknown {
  const mod = HOST_MODULES[id];
  if (mod === undefined) throw new Error(`module not available in Geode: ${id}`);
  return mod;
}

// -------------------- Persisted community-plugin state --------------------

/** Vault config file containing the IDs the user has enabled. */
const COMMUNITY_PLUGINS = "community-plugins.json";

/**
 * Read enabled plugin IDs from the vault. Missing, unreadable, or malformed
 * config is treated as an empty enabled list so plugin loading can continue.
 */
async function readEnabledIds(vault: Vault): Promise<string[]> {
  try {
    const raw = await vault.adapter.readConfig(COMMUNITY_PLUGINS);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch (err) {
    console.error(`[obsidian-compat] failed to parse ${COMMUNITY_PLUGINS}`, err);
    return [];
  }
}

/**
 * Serialize read-modify-write operations. Without this promise chain, two fast
 * enable/disable actions could read the same old list and overwrite each other.
 */
let persistChain: Promise<void> = Promise.resolve();

/**
 * Persist one plugin's enabled state while preserving other IDs and their
 * order. If the file is unreadable or invalid, the next write rebuilds it.
 */
function persistEnabledId(vault: Vault, id: string, enabled: boolean): void {
  persistChain = persistChain
    .then(async () => {
      let list: unknown[] = [];
      try {
        const raw = await vault.adapter.readConfig(COMMUNITY_PLUGINS);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch (err) {
        console.error(`[obsidian-compat] failed to parse ${COMMUNITY_PLUGINS}`, err);
      }
      const next = enabled
        ? list.includes(id)
          ? list
          : [...list, id]
        : list.filter((x) => x !== id);
      await vault.adapter.writeConfig(COMMUNITY_PLUGINS, JSON.stringify(next, null, 2));
    })
    .catch((err) => {
      console.error(`[obsidian-compat] failed to persist enabled state for "${id}"`, err);
    });
}

// -------------------- Manifest validation helpers --------------------

/** Manifest shape parsed from plugin-provided JSON, before validation. */
interface RawManifest extends Partial<PluginManifest> {
  id?: string;
  name?: string;
  version?: string;
}

/** Narrow unknown manifest values to non-empty strings. */
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// -------------------- Loader lifecycle and status reporting --------------------

/** Context and plugin IDs from the previous load, cleaned up before a reload. */
let previousContext: CompatContext | null = null;
let loadedIds: string[] = [];

/** Outcome recorded for each discovered plugin and shown to the user. */
export interface ObsidianPluginReport {
  id: string;
  status: "enabled" | "disabled" | "failed" | "skipped";
  detail?: string;
  minAppWarning?: string;
}

/** Reactive snapshot of the latest load results. */
export const obsidianLoadReport = new Store<ReadonlyArray<ObsidianPluginReport>>([]);

/**
 * Queue load requests so two reloads cannot dispose/register the same context
 * concurrently. A failed run is caught on the queue so a later run can proceed.
 */
let loadChain: Promise<void> = Promise.resolve();

/**
 * Public entry point. Queue the load and return this run's promise to the caller.
 */
export function loadObsidianPlugins(
  app: Omit<AppHandle, "ui"> & { plugins: PluginManager },
  vault: Vault,
): Promise<void> {
  const run = loadChain.then(() => runLoad(app, vault));
  loadChain = run.catch(() => undefined);
  return run;
}

// -------------------- Main load orchestration --------------------

/** Discover plugins, prepare compatibility globals, load each plugin, and report results. */
async function runLoad(
  app: Omit<AppHandle, "ui"> & { plugins: PluginManager },
  vault: Vault,
): Promise<void> {
  const plugins = app.plugins;

  // Install DOM additions expected by legacy Obsidian plugins before their code runs.
  installDomAugmentation();

  // Share Geode's Moment instance with plugins; do not overwrite an existing global.
  window.moment ??= moment;

  // Obsidian historically exposed CodeMirror 5 globally. Geode uses CodeMirror 6,
  // so provide only the small no-op surface observed by older plugins at load time.
  // The "null" mode name lets compatible plugins detect that no syntax mode exists.
  (window as { CodeMirror?: unknown }).CodeMirror ??= {
    defineMode: () => undefined,
    defineMIME: () => undefined,
    registerHelper: () => undefined,
    getMode: () => ({
      name: "null",
      startState: () => ({}),
      copyState: (s: unknown) => s,
      token: (stream: { skipToEnd?: () => void; next?: () => unknown }) => {
        if (typeof stream?.skipToEnd === "function") stream.skipToEnd();
        else if (typeof stream?.next === "function") stream.next();
        return null;
      },
    }),
  };

  // Some Node-targeted bundles reference the Node `global` name in the WebView.
  // Point it at globalThis when absent, without replacing an existing value.
  (globalThis as { global?: unknown }).global ??= globalThis;
  // Unregister the previous plugin set and dispose its context before rebuilding it.
  for (const id of loadedIds.splice(0)) plugins.unregister(id);
  previousContext?.dispose();
  resetGaps(); // warn-once + report state is per load
  const ctx = (previousContext = createCompatContext(app, plugins, vault));
  window.app = ctx.app;

  // Ask the active vault adapter for installed Obsidian community plugins.
  let sources: ObsidianPluginSource[] = [];
  try {
    sources = await vault.adapter.listObsidianPlugins();
  } catch (err) {
    console.error("[obsidian-compat] failed to list obsidian plugins", err);
  }

  // A query flag enables the built-in fixture plugin for compatibility testing only.
  const fixtureRequested =
    typeof location !== "undefined" && /[?&]obsfixture=1/.test(location.search);
  if (fixtureRequested && !sources.some((s) => s.dir === FIXTURE_PLUGIN.dir)) {
    sources = [...sources, FIXTURE_PLUGIN];
  }

  // Load the saved enabled state once, then collect one report entry per source.
  const enabledIds = await readEnabledIds(vault);
  const seenIds = new Set<string>();
  const report: ObsidianPluginReport[] = [];

  // Load sequentially so plugin registration and shared-context side effects are ordered.
  for (const source of sources) {
    const entry = await loadOne(source);
    report.push(entry);
  }

  // Publish existing files to the vault event system after plugins have registered.
  for (const f of ctx.registry.allLoadedFiles()) {
    if (f !== ctx.registry.root) ctx.vault.trigger("create", f);
  }
  ctx.workspace._flushLayoutReady();

  if (app.metadata.revision.get() > 0) ctx.metadataCache.trigger("resolved");

  // Publish and log a single summary after the entire load attempt finishes.
  obsidianLoadReport.set(report);
  logReport(report);
  // -------------------- Load and register one plugin --------------------
  /**
   * Validate one plugin's manifest and entry point, wrap its lifecycle in a
   * GeodePlugin record, then register it with the host manager. Errors are
   * returned as this plugin's report entry so one bad plugin does not stop the list.
   */
  async function loadOne(source: ObsidianPluginSource): Promise<ObsidianPluginReport> {
    // 1. Parse and validate required manifest fields before executing plugin code.
    let raw: RawManifest;
    try {
      raw = JSON.parse(source.manifestJson) as RawManifest;
    } catch (err) {
      console.error(`[obsidian-compat] ${source.dir}: manifest.json is not valid JSON`, err);
      return { id: source.dir, status: "skipped", detail: "invalid manifest JSON" };
    }
    if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.name) || !isNonEmptyString(raw.version)) {
      console.error(
        `[obsidian-compat] ${source.dir}: manifest must have non-empty id, name and version — skipped`,
      );
      return { id: source.dir, status: "skipped", detail: "missing id/name/version" };
    }
    const id = raw.id;
    if (seenIds.has(id)) {
      console.error(`[obsidian-compat] ${source.dir}: duplicate plugin id "${id}" — skipped`);
      return { id, status: "skipped", detail: "duplicate id" };
    }
    seenIds.add(id);
    if (source.dir !== id) {
      console.warn(`[obsidian-compat] folder "${source.dir}" does not match manifest id "${id}"`);
    }
    const missing = (["author", "minAppVersion", "description"] as const).filter(
      (k) => !isNonEmptyString(raw[k]),
    );
    if (missing.length > 0) {
      console.warn(
        `[obsidian-compat] ${id}: manifest missing ${missing.join(", ")} — defaulting to ""`,
      );
    }
    // A newer minAppVersion is reported as a warning, not a hard rejection.
    let minAppWarning: string | undefined;
    if (isNonEmptyString(raw.minAppVersion) && semverCompare(raw.minAppVersion, apiVersion) > 0) {
      minAppWarning = `requires app ${raw.minAppVersion} (Geode reports ${apiVersion})`;
      console.warn(`[obsidian-compat] ${id}: ${minAppWarning} — loading anyway`);
    }
    if (plugins.list().some((r) => r.plugin.id === id)) {
      console.error(`[obsidian-compat] ${id}: collides with an existing Geode plugin — skipped`);
      return { id, status: "skipped", detail: "id collision with a host plugin" };
    }

    // Fill optional manifest fields with defaults and normalize the vault-relative path.
    const manifest: PluginManifest = {
      author: "",
      minAppVersion: "",
      description: "",
      ...raw,
      id,
      name: raw.name,
      version: raw.version,
      dir: `.obsidian/plugins/${source.dir}`,
    };

    // Evaluate main.js as CommonJS-like code. This supplies a restricted require map,
    // but `new Function` is not a security sandbox: plugin code still runs in the WebView.
    let ctor: new (app: obsidianModule.App, manifest: PluginManifest) => ObsidianPlugin;
    try {
      const moduleObj: { exports: unknown } = { exports: {} };
      const run = new Function(
        "require",
        "module",
        "exports",
        `${source.mainJs}\n//# sourceURL=obsidian:${id}`,
      ) as (require: (id: string) => unknown, module: { exports: unknown }, exports: unknown) => void;
      run(hostRequire, moduleObj, moduleObj.exports);
      // Support both common bundle styles: `exports.default = Plugin` and `module.exports = Plugin`.
      const exported = moduleObj.exports as { default?: unknown } | null;
      const candidate =
        typeof exported?.default === "function" ? exported.default : moduleObj.exports;
      if (typeof candidate !== "function") {
        throw new Error("main.js did not export a plugin constructor (exports.default / module.exports)");
      }
      ctor = candidate as typeof ctor;
    } catch (err) {
      console.error(`[obsidian-compat] ${id}: failed to evaluate main.js`, err);
      return {
        id,
        status: "failed",
        detail: err instanceof Error ? err.message : String(err),
        ...(minAppWarning ? { minAppWarning } : {}),
      };
    }

    // Keep runtime resources with this wrapper so they can be released on unload/failure.
    let instance: ObsidianPlugin | null = null;
    let styleEl: HTMLStyleElement | null = null;
    // Remove only the stylesheet injected for this plugin; repeated calls are safe.
    const removeStyles = (): void => {
      styleEl?.remove();
      styleEl = null;
    };
    // Adapt the Obsidian plugin lifecycle to the host's GeodePlugin interface.
    const wrapper: GeodePlugin = {
      id,
      name: manifest.name,
      description: manifest.description || undefined,
      version: manifest.version,
      // Inject the plugin CSS, construct its API instance, and hydrate its components.
      onload: async () => {
        if (source.stylesCss) {
          styleEl = document.createElement("style");
          styleEl.setAttribute("data-obsidian-plugin", id);
          styleEl.textContent = source.stylesCss;
          document.head.appendChild(styleEl);
        }
        try {
          instance = new ctor(ctx.app, { ...manifest });
          if (typeof (instance as { load?: unknown }).load !== "function") {
            throw new Error("exported class does not extend obsidian.Plugin");
          }
          await loadComponentAsync(instance);
        } catch (err) {
          // If startup fails partway through, attempt plugin cleanup before propagating
          // the error to PluginManager; also remove injected CSS and discard the instance.
          try {
            if (instance && typeof (instance as { unload?: unknown }).unload === "function") {
              instance.unload();
            }
          } catch (cleanupErr) {
            console.error(
              `[obsidian-compat] ${id}: cleanup after failed onload threw`,
              cleanupErr,
            );
          }
          instance = null;
          removeStyles();
          throw err;
        }
      },
      // Always release the instance and its stylesheet, even if plugin unload throws.
      onunload: () => {
        try {
          instance?.unload();
        } finally {
          instance = null;
          removeStyles();
        }
      },
      onUserEnable: () => {
        instance?.onUserEnable?.();
      },
    };

    // Fixture plugins are enabled only when explicitly requested; real plugins follow saved state.
    const enabled = enabledIds.includes(id) || (fixtureRequested && id === FIXTURE_PLUGIN_ID);
    try {
      // Register the adapter with its original directory name, which may differ from manifest.id.
      await plugins.register(wrapper, "obsidian", {
        enabled,
        persistEnabled: (on) => persistEnabledId(vault, id, on),
        installDir: source.dir, // R166: real folder name (may differ from id) for uninstall
      });
      loadedIds.push(id);
    } catch (err) {
      console.error(`[obsidian-compat] ${id}: registration failed`, err);
      return {
        id,
        status: "failed",
        detail: err instanceof Error ? err.message : String(err),
        ...(minAppWarning ? { minAppWarning } : {}),
      };
    }
    // Registration can resolve without throwing even when onload fails; check the manager's state.
    if (enabled && !plugins.isEnabled(id)) {
      return {
        id,
        status: "failed",
        detail: plugins.getLastError(id) ?? "onload failed (see error above)",
        ...(minAppWarning ? { minAppWarning } : {}),
      };
    }
    return {
      id,
      status: enabled ? "enabled" : "disabled",
      ...(minAppWarning ? { minAppWarning } : {}),
    };
  }
}

// -------------------- Status report and API-gap summary --------------------

/** Log a compact summary of plugin outcomes and compatibility APIs used. */

function logReport(report: ObsidianPluginReport[]): void {
  const gaps = drainGaps();
  const enabled = report.filter((r) => r.status === "enabled").length;
  const failed = report.filter((r) => r.status === "failed" || r.status === "skipped").length;
  console.groupCollapsed(
    `[obsidian-compat] ${report.length} plugin(s): ${enabled} enabled, ` +
      `${report.length - enabled - failed} disabled, ${failed} failed/skipped — ${gaps.length} API gap(s)`,
  );
  for (const r of report) {
    console.log(`${r.status.padEnd(8)} ${r.id}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  if (gaps.length > 0) {
    console.log("API gaps hit during this load:");
    for (const g of gaps) {
      console.log(`  ${g.scope}: ${g.api}${g.detail ? ` (${g.detail})` : ""}`);
    }
  }
  console.groupEnd();
}
