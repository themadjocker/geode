# Plugin development

Geode has two plugin paths. They serve different contracts and should remain clearly separated.

## Native Geode plugins

Native plugins use Geode's own plugin API and are the recommended path for new Geode-specific integrations. External plugin files are loaded from the active vault at:

```text
<vault>/.geode/plugins/*.js
```

Start by inspecting the existing examples and the current plugin API in the source. Confirm the exact lifecycle and available methods from the implementation rather than copying an old example blindly. A plugin should handle unavailable context, clean up registrations and event listeners when unloaded, and avoid writing files unless the user-facing behavior requires it.

## Obsidian-style plugins

The compatibility path adapts a growing subset of Obsidian APIs. See [Obsidian compatibility](OBSIDIAN-COMPAT.md) before depending on an API. Plugin loading does not imply full API parity.

## Quality and safety checklist

- Keep plugin identifiers stable and validate manifest data before loading.
- Register commands, views, settings, and event listeners through the supported API.
- Clean up timers, listeners, DOM handlers, and other resources during unload.
- Treat vault paths and note content as untrusted input.
- Never assume a filesystem write is safe because the request came from a plugin.
- For compatibility changes, add a test that proves behavior beyond merely loading the plugin.
- Do not commit private vaults, user data, or third-party plugin code without checking the license.

## Testing

Use browser mode for fast UI tests and a real Tauri desktop run for behavior that depends on the native filesystem, dialogs, updater, or WebView. A DOM screenshot can document appearance, but it cannot prove lifecycle cleanup, plugin API semantics, or safe file operations.
