# Security policy

Geode is an active-alpha, local-first desktop application that reads and writes folders selected by its users. Security reports are welcome.

## Supported versions

Security fixes are handled on the default development branch first. Until a formal support window is published, assume older alpha builds may not receive backported fixes.

## Report a vulnerability privately

The existing policy points to GitHub Security Advisories:

<https://github.com/AlexHercules/geode/security/advisories/new>

Do not open a public issue for a vulnerability that could expose or modify user files, bypass a native-command boundary, execute an untrusted plugin, compromise the updater, or leak secrets. Confirm this URL points to the intended canonical repository before publishing the policy from a different repository.

Include, when safe:

- Geode version or commit and operating system.
- Minimal reproduction steps and expected versus actual behavior.
- Whether exploitation requires a malicious vault, plugin, or ordinary user action.
- Relevant logs with private paths, vault contents, tokens, and credentials removed.

## Security-sensitive areas

- Vault path traversal and validation of file paths.
- File writes, deletion, rename, external modification, and autosave races.
- Tauri command permissions and native filesystem/network boundaries.
- Plugin discovery, execution, and compatibility shims.
- Updater endpoint, signatures, release assets, and signing-key handling.
- Accidental commits of private vault data, local diagnostics, credentials, or key material.

## Contributor rule

Make the narrowest safe change, add a regression test when practical, and document any remaining limitation. Never paste a private key or its password into an issue, chat, terminal transcript, or committed Markdown file.
