---
name: Connector account access versus project access
description: Avoid repeated authorization and unnecessary scope changes when an active connector is not available to the project.
---

An account-level “Active” connection and an enabled GitHub `repo` scope do not establish that this project can use the connector.

**Why:** Repeated connection confirmations and account settings screenshots did not make the connector available to the project. Asking the user to repeat OAuth and inspect more scopes did not resolve that mismatch.

**How to apply:** Confirm project availability through the integration catalog. When it still requires connection despite account-level authorization, do not fetch credentials speculatively, broaden scopes, or keep repeating the same authorization prompt. Explain the observed mismatch, distinguish it from a proven GitHub permission error, and use a bounded editor refresh/retry or platform support rather than an indefinite setup loop.

Native Git remote operations in this environment also use Replit's secure GitHub proxy; they are not an independent route around missing project connector access.

**Why:** A native Git push dry run was rejected by the proxy for the same missing accessible GitHub connection, before any repository files were uploaded.

**How to apply:** Do not promise that switching from the integration API to native Git will fix this connection mismatch. Use manual upload or resolve project connection availability instead; never work around it by requesting credentials in chat.

For manual source handoffs, verify that the user receives the current task's files rather than assuming their editor or existing repository already includes the in-progress changes.

**Why:** A manual upload contained an older, incomplete worker despite the task workspace containing the complete version.

**How to apply:** Compare the uploaded file set and contents against the task workspace. If a download is needed, package only an explicit allowlist of source files, verify the archive and download, and exclude secrets and environment files.

The task-specific Git pane does not expose branch switching, remote synchronization, or Git settings. Direct users to the main app's Git pane for those controls.

**Why:** The user's task Git pane explicitly displayed a banner directing them to the main app; repeated instructions to find connection settings inside that task pane could not work.

**How to apply:** Leave the task panel or tab, then open Tools → Git in the main app. Do not complete or merge unfinished work just to expose Git controls. This UI restriction does not itself prove the cause of a separate authentication failure.
