import {
  getDictionaries,
  getWordMorphology,
  searchRoots,
  getLexiconEntriesForRoot,
} from '../lib/lexicon/service';

console.log('--- Testing Dictionaries ---');
const dicts = getDictionaries();
console.log(`Found ${dicts.length} dictionaries:`);
dicts.forEach((d) => console.log(`  [${d.id}] ${d.name} (${d.ident}) - English: ${d.ar_en}`));

console.log('\n--- Testing Word Morphology (Surah 1, Ayah 1, Word 3: الرحمن) ---');
const morph = getWordMorphology(1, 1, 3);
console.log('Morphology result:', morph);

console.log('\n--- Testing Root Search ("رحم") ---');
const roots = searchRoots('رحم');
console.log('Matched roots:', roots);

console.log('\n--- Testing Lexicon Entries for Root ("رحم") ---');
const entries = getLexiconEntriesForRoot('رحم');
console.log('Root query:', entries.root, 'Normalized:', entries.normalizedRoot);
console.log('Structured Lane found?', Boolean(entries.structuredLane));
if (entries.structuredLane) {
  console.log('  Lane summary (en):', entries.structuredLane.summary_en);
  console.log('  Morphological forms count:', entries.structuredLane.morphological_forms.length);
}
console.log(`Found entries in ${entries.entries.length} dictionaries:`);
entries.entries.forEach((e) => {
  console.log(`  - [${e.dictName}] (${e.definitions.length} definitions)`);
  console.log(`    Sample def preview: ${e.definitions[0]?.substring(0, 100)}...`);
});
