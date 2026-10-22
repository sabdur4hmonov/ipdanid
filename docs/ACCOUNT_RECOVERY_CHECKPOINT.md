# C21 account continuity

## C21a: atomic server recovery contract

`account-recovery/1` is additive metadata outside immutable instructions. Authenticated GET/POST `/api/instructions/:id/recovery` uses the existing account, archive ownership and soft-deletion check. No new account or password scheme. A second login resolves to the same user and account-owned guide; no password export or device-ID migration.

The write atomically combines manually confirmed progress, the independently viewed cursor, pace, Rest flag, library name/folder and up to 100 bookmarks. The cursor never implies confirmation or starts audio. Input is strictly bounded and rejects extra keys including photos, tokens and playback authority. Private source-photo backup is a separate, still-open consent workflow.

One shared progress revision governs legacy progress writes and recovery metadata. A second client's stale expected revision receives 409. An identical latest request key and canonical body returns the exact previous result without advancing revision or consuming credits. Changing the body under that key conflicts. If a legacy client changes progress, old recovery details are unavailable until explicitly replaced; an old cursor must not be attached to new progress. Any metadata write failure rolls progress back as well. No client clocks decide conflicts.

Only the most recent request per guide is stored, bounding retry storage; older requests retain their stale expected revision and are refused. A retry cannot revive a tombstoned project, even when its key was previously accepted. Reopening the database and initializing the additive table repeatedly preserves data. Original guides, hashes, paid receipts and credits are unchanged.

## Required next C21b work

Wire explicit upload/restore to the customer UI with account/server-scoped pending requests, latest successful sync, failure/retry/conflict choice and fences against logout/session changes. Restore to the destination local project ID, always paused, without resetting confirmed progress or granting access. Exercise actual two-client browser/native-mode flow and receipt reissue without another charge. Add account-wide deletion/retention and private-photo consent backup separately; do not call C21 or all-field web-to-app migration complete on this server-only milestone.

Validation results are recorded in AGENT/LOG.md after execution. This checkpoint does not claim production or phone acceptance.
