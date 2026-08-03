async function test() {
  const res = await fetch('https://api.quran.com/api/v4/quran/translations/84');
  const data = await res.json();
  const sample = data.translations.slice(0, 10).map(t => t.text);
  console.log('Taqi Usmani (84):', sample);
  
  const res2 = await fetch('https://api.quran.com/api/v4/quran/translations/95');
  const data2 = await res2.json();
  const sample2 = data2.translations.slice(0, 10).map(t => t.text);
  console.log('Maududi (95):', sample2);
}
test();
