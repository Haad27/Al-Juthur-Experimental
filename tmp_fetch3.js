async function test() {
  const res = await fetch('https://api.quran.com/api/v4/quran/translations/97');
  const data = await res.json();
  const sample = data.translations.slice(0, 5).map(t => t.text);
  console.log('Maududi Urdu (97):', sample);
}
test();
