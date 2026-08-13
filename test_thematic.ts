import { searchHybrid } from './lib/ai/rag/hybrid-search';
async function test() {
  const docs = await searchHybrid('patience', {
    mode: 'default',
    suggestedVerses: [{surah: 2, ayah: 153}, {surah: 3, ayah: 200}]
  }, 8);
  console.log('Docs found:', docs.length);
  docs.forEach(d => console.log(d.id, d.authorName, d.surahId, d.ayahId));
}
test().catch(console.error);
