# Audit presentation and anchors

`readerRefs` in the original audit export describe surrounding review context.
They are not a claim that every referenced passage contains the defect.

After importing an audit, run `node scripts/refine-audit-anchors.mjs` before
refreshing the publication manifest and running the tests. This preserves all
original findings, descriptions, dispositions, context quotations and totals.
It adds `findingRefs` and source-bound `findingEvidence` for presentation.

- WH keeps its original, historical source-line anchors.
- Single-passage paired contexts retain their passage anchor.
- Multi-passage inherited findings require a unique match for the complete cited
  original Japanese inside the paired context. Matching normalizes Unicode,
  punctuation and spacing, not wording or meaning.
- Reviewed multi-passage contexts use explicit edition-specific passage receipts
  in `scripts/audit-anchor-overrides.json`. Every receipt fingerprints the original
  judgment, context, Japanese passage and comparator wording; changes fail the build.
- Unresolved or unsupported edition labels remain on the audit page with context
  links. They are not projected as red errors onto arbitrary reader rows.
- PC-material annotations remain separate from error judgments.

`audit-anchor-review.json` records narrowed and context-only edition/context
pairs. All 574 previously context-only edition/context pairs were reviewed:
571 now have explicit anchors, one was already corrected/not applicable in its
local disposition, and two remain unanchored because their published explanation
does not support the edition label (reasons are in the review receipts).
Context-only is not a withdrawn finding and must not be counted as a corrected
translation. Original judgments, quotations and totals remain unchanged.

`scripts/anchor-review-cases.json` freezes the original case numbering used by
the manual selections. `node scripts/compile-anchor-review.mjs` reproducibly
compiles those selections into stable finding/context/edition receipts. The
refiner consumes these receipts; it never infers anchors from category labels
or propagates a marker merely because a neighboring row was audited.

Regression tests cover the Eva/Krauss and Nanjo reports, matching projected
anchors to their source contexts, and asymmetric findings on identical displayed
MG/UP passages throughout all 163 PS3 scripts. These are presentation checks,
not a new semantic certification of the underlying audit.

## Corpus phrase receipts

`scripts/phrase-review-cases.json` freezes the 4,910 non-PC findings and their
edition-specific comparison passages. Candidate strings in that inventory are
only review aids. They are never published automatically.

The independently reviewed `phrase-selections-*.json` files select exact phrases
per passage. `node scripts/compile-phrase-review.mjs` rejects missing decisions,
changed source text or judgments, unmatched phrases, and ambiguous repeated
phrases. `--partial` reports outstanding work without changing publication data;
`--check` verifies that the complete reviewed projection is already compiled.

Pure omissions keep an explicitly labeled omission note rather than coloring
accurate surviving prose. Corrected or unrelated neighboring rows are excluded
only after a second review recorded in `phrase-exception-approvals.json`.
`phrase-additions.json` records separately reviewed missing occurrences with
their full Japanese and comparison text. These adjustments affect presentation
anchors and links, not the stored adjudications or counts.

After a complete phrase compile, regenerate `publication-manifest.json`, run the
full test suite, and verify browser interactions before publishing. Running the
earlier anchor refiner replaces chapter projections; always recompile the phrase
receipts afterward. The full-corpus test rejects missing or stale projections.
