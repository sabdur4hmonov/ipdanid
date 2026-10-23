# C21 account continuity

## C21a: atomic server recovery contract

`account-recovery/1` is additive metadata outside immutable instructions. Authenticated GET/POST `/api/instructions/:id/recovery` uses the existing account, archive ownership and soft-deletion check. No new account or password scheme. A second login resolves to the same user and account-owned guide; no password export or device-ID migration.

The write atomically combines manually confirmed progress, the independently viewed cursor, pace, Rest flag, library name/folder and up to 50 bookmarks. C21b uses a shared browser/server contract matching existing disk reload limits: name100, folder50, bookmark label80. The cursor never implies confirmation or starts audio. Input is strictly bounded and rejects extra keys including photos, tokens and playback authority. Private source-photo backup is a separate, still-open consent workflow.

One shared progress revision governs legacy progress writes and recovery metadata. A second client's stale expected revision receives 409. An identical latest request key and canonical body returns the exact previous result without advancing revision or consuming credits. Changing the body under that key conflicts. If a legacy client changes progress, old recovery details are unavailable until explicitly replaced; an old cursor must not be attached to new progress. Any metadata write failure rolls progress back as well. No client clocks decide conflicts.

Only the most recent request per guide is stored, bounding retry storage; older requests retain their stale expected revision and are refused. A retry cannot revive a tombstoned project, even when its key was previously accepted. Reopening the database and initializing the additive table repeatedly preserves data. Original guides, hashes, paid receipts and credits are unchanged.

## C21b1: explicit browser recovery UI accepted, 2026-10-23

The lazy Project sync panel now exposes refresh, save this device's copy, server-copy restore, last successful save, persistent retry and explicit discard of a pending copy. Pending records are scoped to API namespace/account and expire after seven days on read; only known owned remote IDs with matching local guides survive validation. Writes persist the exact body/key before sending. Offline/lost responses never cause a new inferred upload; retry is explicit. A stale revision remains a conflict until the customer refreshes/chooses. New metadata does not change the existing archive/unlock rules.

Logout invalidates pending callbacks before clearing the cache through a serialized disk queue. That listener survives switching away from Sync. A changed session/unmounted panel cannot restore a late response. Restore validates the guide and response, uses the destination local project ID, retains its immutable guide, saves through the existing disk-CAS library, and opens at the independent cursor with Rest on. Confirmed work is copied separately and audio never autostarts. Local storage failures are not reported as sync success. Account-wide local data erasure is a distinct remaining task.

Executed32/32 units (recovery store/client, old customer/session), TSC and isolated build2113/24.98s. Latest10 outcomes:8passed in mixed final run (4new UI +2API +2legacy offline/library) and2legacy commerce passes in isolated rerun42.1s. Initial new UI2passed2failed because the fresh second client needs the visible Customer menu; fixed test navigation. Next mixed run8passed2failed because an overly broad test-label edit changed unrelated commerce Refresh; narrowed that test edit and reran both successfully. These are not a single all-green10-case run. Both browser viewport families log in with the same real server password, restore a different local ID at cursor17/confirmed4 with folder/bookmark, reload paused, exercise network retry, stale conflict and logout cache scrubbing. No phone/native-bridge acceptance is claimed yet.

## Required next C21b2 and C21c work

Exercise browser→native-mode recovery through actual CapacitorHttp/Preferences mocks against the same isolated API and paid receipt reissue without another credit. Add delayed-response/session-switch checks, failed local persistence recovery, private source-photo consent/backup/restore and account-wide deletion/retention. The website-first continuity foundation is functional, but C21 and all-field migration remain open. Current4212 snapshot is intentionally unchanged; new source is not published to that protected preview.

Validation results are recorded in AGENT/LOG.md after execution. This checkpoint does not claim production or phone acceptance.
