# Set aside at the pause of 12 November 2026: P-127 and the hidden-tab rule

Work in progress from the boot builder, kept here so the pause loses nothing. The branch's code changes (on top of
build/boot-l2 at 5861d15) are the re-entry strip (P-127: after a day or more away, one line each for the clan's week,
the weekend event, the week's Trial and a "what's new" hook, behind a `reentry` disclosure) and the hidden-tab rule (a
gap that began while the page was hidden opens no report there; back in view, a gap under an hour is a toast, longer
is the welcome-back). test/reentry.test.mjs passed (7 tests).

Still to do before it is merged: a direct test of `gapTelling`; the browser flows in scripts/flows.mjs; the `reentry`
screenshot; DESIGN's §3.16 entries (drafts in docs/); the full suite. `main.strip-only.js` is src/main.js with the
strip and without the hidden-tab rule, in case the owner prefers today's report in a hidden tab. This folder goes
before the merge.
