async function test() {
  const res = await fetch('https://api.quran.com/api/v4/quran/translations/151');
  const data = await res.json();
  const sample = data.translations.slice(0, 5).map(t => t.text);
  console.log('Tafsir E Usmani (151):', sample);
}
test();
