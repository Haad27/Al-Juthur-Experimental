const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'database', 'downloaded_tafsirs', 'en-tafsir-as-saadi');

function deduplicateSurah(surahNum, ayahs) {
  if (!Array.isArray(ayahs) || ayahs.length === 0) return ayahs;

  const result = [];
  let clusterLeaderAyah = ayahs[0].ayah || 1;
  let clusterLeaderText = ayahs[0].text;

  result.push({
    ...ayahs[0],
    text: clusterLeaderText,
  });

  for (let i = 1; i < ayahs.length; i++) {
    const item = ayahs[i];
    const currentAyahNum = item.ayah || (i + 1);

    if (
      item.text &&
      item.text === clusterLeaderText &&
      !/^\d+:\d+$/.test(clusterLeaderText.trim())
    ) {
      result.push({
        ...item,
        text: `${surahNum}:${clusterLeaderAyah}`,
      });
    } else {
      clusterLeaderAyah = currentAyahNum;
      clusterLeaderText = item.text;
      result.push({
        ...item,
        text: clusterLeaderText,
      });
    }
  }

  return result;
}

function run() {
  let totalAyahs = 0;
  let totalConverted = 0;
  let surahsProcessed = 0;

  for (let s = 1; s <= 114; s++) {
    const filePath = path.join(DIR, `${s}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const ayahs = JSON.parse(raw);
    totalAyahs += ayahs.length;

    const deduped = deduplicateSurah(s, ayahs);
    const convertedInSurah = deduped.filter(a => /^\d+:\d+$/.test((a.text || '').trim())).length;
    totalConverted += convertedInSurah;
    surahsProcessed++;

    fs.writeFileSync(filePath, JSON.stringify(deduped, null, 2), 'utf8');
  }

  console.log(`Successfully processed ${surahsProcessed} surahs.`);
  console.log(`Total ayahs: ${totalAyahs}`);
  console.log(`Total cross references created: ${totalConverted}`);
  console.log(`Unique commentary entries preserved: ${totalAyahs - totalConverted}`);
}

run();
