// Editorial groupings of the existing adjudicated categories. These do not
// create findings, change judgments, or turn corrected examples into errors.
const dossier = (id, family, title, categories, claim, japanesePattern, translationEffect, limits) => ({
  id, family, title, categories: categories.split(' ').map(c => family + '.' + c), claim, japanesePattern, translationEffect, limits
});
export const DOSSIERS = [
  dossier('meaning-and-reference', 'linguistic', 'Meaning, reference, and who did what',
    'mistranslation word_choice wrong_subject reference_resolution',
    'The decisive question is what the sentence says happened, to whom, and with what meaning—not whether the English resembles the Japanese word for word.',
    'Lexical senses, omitted subjects, and references resolved through the surrounding exchange.',
    'A plausible English sentence can assign a different action, referent, or sense to the passage.',
    'An explicit English subject is not itself an addition. The local context must rule out the chosen referent or meaning.'),
  dossier('grammar-and-scope', 'linguistic', 'Grammar, scope, and certainty',
    'grammar logical_relation modality epistemic_status quantifier_scope scope_quantifier_negation tense_aspect',
    'Small grammatical choices can change the extent, timing, or certainty of a claim.',
    'Negation, quantification, aspect, conditionals, and distinctions between a claim and established knowledge.',
    'The translation asserts more, less, or something differently qualified than the source.',
    'English need not reproduce Japanese grammar mechanically. A finding requires a changed proposition or contextual force.'),
  dossier('addition-and-loss', 'linguistic', 'Added meaning and missing meaning',
    'addition omission overinterpretation overtranslation undertranslation',
    'Compression and clarification become defects when they remove a relevant distinction or supply one the source does not support.',
    'Explicit details, deliberately restricted statements, and information recoverable from the immediate context.',
    'Omitted content narrows the scene; unsupported elaboration gives the reader a different scene or explanation.',
    'Word-count differences prove nothing. Implicit information may be made explicit, and recoverable repetition may be compressed.'),
  dossier('idiom-and-literary-form', 'linguistic', 'Idiom, imagery, and verbal texture',
    'idiom_calque imagery_rhythm_recurrence register_voice wordplay',
    'A literal-looking phrase can lose the idiomatic or literary function that makes the original intelligible.',
    'Idioms, recurring images, marked register, rhythm, and verbal play in their narrative setting.',
    'An idiom becomes a physical event, an image changes, or a marked voice loses its function.',
    'A different image or idiom is not automatically wrong. The cited analysis must explain the lost or altered function.'),
  dossier('names-and-presentation', 'linguistic', 'Names, address, and presentation',
    'name_address presentation spelling typography',
    'Presentation matters where it changes identification, address, or how a passage is read.',
    'Names and forms of address, spelling distinctions, and source-significant textual presentation.',
    'The reader receives an incorrect name, relationship cue, or textual distinction.',
    'Romanization preferences and house style alone do not establish a defect; the example must identify a consequential mismatch.'),
  dossier('evidence-and-authority', 'mystery', 'Evidence, certainty, and authority',
    'epistemic_modality epistemic_status evidence truth_authority',
    'A statement, a suspicion, and a proof are different moves in the argument.',
    'Who claims a proposition, the evidence offered for it, and the authority attached to the statement.',
    'An assertion is promoted to proof, a possibility becomes a fact, or the basis for knowing is changed.',
    'Confidence of delivery is not proof of truth. Judge the proposition at this point in the story, without importing later knowledge.'),
  dossier('conditions-and-constraints', 'mystery', 'Arguments, conditions, and physical constraints',
    'argument_reconstruction logical_condition scope_quantifier_negation physical_constraint space_time_continuity category_flattening',
    'A mystery depends on the exact conditions under which an inference is permitted.',
    'Premises, exclusions, quantities, categories, and spatial or temporal constraints.',
    'The English permits a conclusion or possibility that the Japanese argument does not, or rules out one it leaves open.',
    'Do not repair a character’s mistaken argument. The task is to preserve the argument the character actually makes.'),
  dossier('clues-and-verbal-mechanisms', 'mystery', 'Clues and verbal mechanisms',
    'clue_erasure clue_into_nonsense clue_invention clue_loss puzzle_mechanism recurrence_discrimination',
    'A clue must be evaluated together with the later reasoning that uses it.',
    'Written components, recurring terms, discriminating details, and the stated mechanism of a puzzle.',
    'A required clue disappears, a new clue is invented, or the explanation no longer connects to the initial wording.',
    'An adapted puzzle is not disproved by lexical difference alone. Examine its initial clue and payoff together, and identify the precise broken connection.'),
  dossier('information-and-identity', 'mystery', 'Information timing and identity',
    'identity_attribution information_timing_salience misleads_beyond_original mystery_character_link premature_resolution retrospective_fairness',
    'Information can be accurate in retrospect and still be wrong to disclose at a particular moment.',
    'Restricted viewpoints, unresolved identities, withheld information, and retrospective reinterpretation.',
    'The translation resolves an ambiguity too early, attributes knowledge to the wrong participant, or changes the intended uncertainty.',
    'Not every ambiguity is deliberate. A finding needs local wording and later contextual evidence, not a speculative hidden meaning.'),
  dossier('agency-and-relationships', 'character', 'Agency, motive, and relationships',
    'agency agency_responsibility motivation_emotion psychology relationship_power',
    'Changing who acts, chooses, or feels changes characterization even when the external event remains recognizable.',
    'Agency, responsibility, motives, emotional direction, and the power relationship in an exchange.',
    'A character becomes more willing, hostile, passive, certain, or emotionally different than the source supports.',
    'Plausible characterization is not evidence by itself. Ground the claim in the specific words and actions of the passage.'),
  dossier('voice-and-performance', 'character', 'Voice, register, and performance',
    'irony_performance register_voice voice_register voice_state',
    'A character’s way of speaking is part of the action: it can be a joke, an act, or a change in composure.',
    'Marked speech, irony, performed personas, and changes in a speaker’s vocal or social register.',
    'The translation turns a performance into a plain assertion or gives the speaker a different attitude.',
    'Register need not be encoded with Japanese suffixes or a literal dialect. Assess the interpersonal effect in English.'),
  dossier('viewpoint-and-knowledge', 'character', 'Viewpoint and knowledge boundaries',
    'knowledge_boundary viewpoint_attribution',
    'The narration must preserve whose perception, judgment, and knowledge a sentence belongs to.',
    'Viewpoint transitions, reported thought, attribution, and limits on what a participant knows.',
    'A character’s judgment becomes narrator fact, or information is attributed to someone who does not possess it.',
    'Explicit attribution may be supplied when context makes it unambiguous. The defect is a changed owner or boundary of knowledge.'),
  dossier('material-world', 'world', 'Objects, places, and continuity',
    'world_fact space_time_continuity',
    'Concrete details constrain the scene and must remain consistent across the description.',
    'Objects, counts, physical relations, movement, locations, and temporal sequence.',
    'The English supplies different equipment, objects, positions, or events.',
    'Do not use real-world plausibility to silently correct the source. Preserve what this scene describes, including a character’s errors.'),
  dossier('cultural-and-literary-context', 'world', 'Cultural and literary context',
    'culture_history literary_reference',
    'A reference is not preserved merely by retaining its name, nor lost merely by translating it.',
    'Historical, cultural, and literary references with a specific local function.',
    'A reference is misidentified, its implication changes, or an unrelated concept replaces it.',
    'Explain the source-bound consequence. Foreignness, familiarity, and literal wording are not independent measures of accuracy.'),
  dossier('edition-and-terminology', 'world', 'Editions, recurring terms, and world layers',
    'edition_or_medium terminology_recurrence world_layer',
    'Textual lineage and recurring terminology must be separated from translation error.',
    'PC/PS3 revisions, medium-specific material, repeated terms, and distinctions between narrative layers.',
    'A translation may blur a recurring distinction or be judged against the wrong source edition.',
    'Genuine source revisions are not mistranslations. Yellow PC-material notes remain separate and are excluded from every defect total.')
];

export const corrected = value => /^(corrected(?:_|$)|correct$|core_error_corrected$)/.test(value || '') && !/edition|source/.test(value);
const matches = (f, d) => f.kind !== 'PC' && f.categories?.some(c => d.categories.includes(c));
export function dossierEvidence(definition, findings, corpus, edition) {
  const members = findings.filter(f => matches(f, definition));
  const confirmedContexts = f => (f.contexts || []).filter(c => (!c.editions || c.editions.includes(edition)) && (edition === 'WH' || !/^(correct|preserv|accept|not_this|no_|core_error_corrected|rephrased_no)|not_applicable|source_edition_changed|^not_recorded$/.test(c.dispositions?.[edition] || 'not_recorded')) && (c.findingRefs || c.readerRefs)?.[edition]?.length);
  const examples = [];
  const seenEpisodes = new Set();
  for (const f of members) {
    const c = confirmedContexts(f).find(c => !seenEpisodes.has(c.episode));
    if (c) { examples.push({finding: f, context: c, edition}); seenEpisodes.add(c.episode); }
    if (examples.length === 3) break;
  }
  if (examples.length < 3) for (const f of members) {
    const c = confirmedContexts(f)[0];
    if (c && !examples.some(e => e.finding.id === f.id)) examples.push({finding: f, context: c, edition});
    if (examples.length === 3) break;
  }
  const counterexamples = [];
  // WH has no paired clean WH judgment. Show explicitly labeled later repairs,
  // not invented WH counterexamples or a source-edition rewrite.
  for (const f of corpus.filter(f => matches(f, definition))) {
    for (const c of f.contexts || []) {
      const positiveEdition = (edition === 'WH' ? ['UP', 'MG'] : [edition]).find(e => corrected(c.dispositions?.[e]) && c[e] && c.note);
      if (positiveEdition) { counterexamples.push({finding: f, context: c, edition: positiveEdition}); break; }
    }
    if (counterexamples.length === 2) break;
  }
  return {...definition, findings: members, examples, counterexamples,
    episodes: new Set(members.flatMap(f => confirmedContexts(f).map(c => c.episode))).size,
    passages: new Set(members.flatMap(f => confirmedContexts(f).flatMap(c => (c.findingRefs || c.readerRefs)?.[edition] || []))).size};
}
