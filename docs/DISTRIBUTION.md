# Distribution and updater

## Release model

The current workflow is `.github/workflows/geode.yml`. A version tag matching `v*` triggers the Windows release job after the quality job succeeds. The release action creates a **draft** GitHub Release and uploads the Windows installer plus updater metadata/signatures. Review and install-test the draft before publishing it.

Do not rely on this page alone to establish the current workflow behavior. Check `geode.yml` and `src-tauri/tauri.conf.json` before a release, especially after changes to actions or Tauri plugins.

## Pre-release checklist

1. Update `package.json` and `src-tauri/tauri.conf.json` to the same product version.
2. Review `src-tauri/Cargo.toml` separately. It currently has distinct Rust crate version metadata in the supplied working-tree snapshot; the current release guard compares the package and Tauri config versions, not all three files.
3. Confirm the tag exactly matches the product version, for example `vX.Y.Z` for version `X.Y.Z`.
4. Verify that the updater endpoint points to the **intended canonical repository** and that the configured public key matches the private key used by CI.
5. Confirm repository Actions secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` are present. Never print or paste their values into logs, issues, or documentation.
6. Confirm quality checks passed, then inspect the generated draft release and install the artifact on a clean Windows environment before publishing.

## Signing keys

Tauri's updater signature and Windows Authenticode code signing are different mechanisms. The updater signature authenticates the update artefact against the public key embedded in the installed application. Authenticode is Windows publisher signing and is a separate release concern.

- The **private updater key and its password are secrets**. Keep them in a password manager/secure backup and repository Actions secrets, not in Git.
- The public updater key belongs in Tauri configuration and must match the corresponding private key.
- Losing the private key or changing the public key can prevent existing installations from validating future updates. Plan key rotation as a migration, not a routine cleanup.
- Never document the actual key password, even when it is described as a development-only password.

## Repository URL requires confirmation

The supplied Git remotes were `origin = https://github.com/themadjocker/geode` and `upstream = https://github.com/AlexHercules/geode.git`, while the previously inspected Tauri updater configuration used a `geode-app/geode` releases URL. This may be intentional, but it must be confirmed before publishing. A successful build does not prove the endpoint, release owner, permissions, or update metadata are correct.

## Release recovery

If a draft release is wrong, keep it unpublished while diagnosing. Confirm the tag, version fields, installer architecture, signature file, `latest.json`, endpoint, and public/private key pairing. Do not delete or overwrite an already published update simply to make the pipeline green; established clients may already depend on that release metadata.
