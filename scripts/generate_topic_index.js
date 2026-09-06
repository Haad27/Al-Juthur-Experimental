const fs = require('fs');
const path = require('path');

// Ensure output directory exists
const topicsDir = path.join(__dirname, '..', 'database', 'topics');
if (!fs.existsSync(topicsDir)) {
  fs.mkdirSync(topicsDir, { recursive: true });
}

console.log('Generating Topic & Subject Index for Al-Juthur...');

// -------------------------------------------------------------
// 1. EXTRACT SURAH THEMATIC OUTLINE FROM surah-info-en.json
// -------------------------------------------------------------
const surahInfoPath = path.join(__dirname, '..', 'database', 'surah-meta', 'surah-info-en.json');
const surahInfoData = JSON.parse(fs.readFileSync(surahInfoPath, 'utf8'));

const surahThematicOutline = {};

for (let s = 1; s <= 114; s++) {
  const info = surahInfoData[s] || surahInfoData[String(s)];
  if (!info) continue;

  const rawText = info.text || '';
  const sections = [];

  // Match paragraphs that end with verse range links like <a href="/2/1-20">1-20</a> or <a href="...">30-39</a>
  const pRegex = /<p>([\s\S]*?)<\/p>/gi;
  const pMatches = [...rawText.matchAll(pRegex)];

  for (const match of pMatches) {
    const pContent = match[1];
    // Find verse link
    const linkMatch = pContent.match(/<a\s+href=["'](?:\/?[^"']*?)["'][^>]*>(?:<strong>)?([\d\s\-–—:,]+)(?:<\/strong>)?<\/a>/i);
    if (linkMatch) {
      const rangeStr = linkMatch[1].replace(/<[^>]+>/g, '').trim();
      const cleanDesc = pContent
        .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanDesc.length > 15 && rangeStr) {
        // Parse start and end ayah numbers
        const parts = rangeStr.split(/[-–—]/).map(p => parseInt(p.trim().replace(/[^\d]/g, ''), 10)).filter(Boolean);
        if (parts.length >= 1) {
          const fromAyah = parts[0];
          const toAyah = parts.length > 1 ? parts[1] : fromAyah;
          sections.push({
            surahId: s,
            fromAyah,
            toAyah,
            rangeStr: `${fromAyah}${toAyah > fromAyah ? `-${toAyah}` : ''}`,
            description: cleanDesc
          });
        }
      }
    }
  }

  surahThematicOutline[s] = {
    surahNumber: s,
    surahName: info.surah_name || `Surah ${s}`,
    shortText: info.short_text || '',
    thematicSections: sections
  };
}

const thematicOutputPath = path.join(topicsDir, 'surah_thematic_outline.json');
fs.writeFileSync(thematicOutputPath, JSON.stringify(surahThematicOutline, null, 2));
console.log(`✓ Generated Surah Thematic Outlines (${Object.keys(surahThematicOutline).length} Surahs) -> ${thematicOutputPath}`);

// -------------------------------------------------------------
// 2. BUILD COMPREHENSIVE AYAH TOPIC & SUBJECT TAXONOMY
// -------------------------------------------------------------
// Scholarly verified mapping of topics & concepts to Ayahs
const CORE_TOPICS = [
  // --- AQEEDAH & THEOLOGY ---
  {
    topic: "Tawhid (Oneness of Allah)",
    category: "Faith & Theology",
    keywords: ["monotheism", "one god", "oneness", "la ilaha illa allah", "shirk", "idolatry", "partners", "creator", "lord", "divine"],
    verses: [
      { surah: 1, from: 1, to: 7 },
      { surah: 2, from: 163, to: 164 },
      { surah: 2, from: 255, to: 255 },
      { surah: 3, from: 1, to: 6 },
      { surah: 3, from: 18, to: 18 },
      { surah: 6, from: 101, to: 103 },
      { surah: 20, from: 14, to: 14 },
      { surah: 21, from: 22, to: 24 },
      { surah: 59, from: 22, to: 24 },
      { surah: 112, from: 1, to: 4 }
    ]
  },
  {
    topic: "Ayat al-Kursi (The Throne Verse)",
    category: "Faith & Theology",
    keywords: ["kursi", "throne", "hayy", "qayyum", "preservation", "sleep nor slumber", "sovereignty"],
    verses: [
      { surah: 2, from: 255, to: 255 }
    ]
  },
  {
    topic: "Creation of Universe & Heavens",
    category: "Creation & Signs",
    keywords: ["creation", "universe", "heavens", "earth", "six days", "stars", "sun", "moon", "orbits", "expansion"],
    verses: [
      { surah: 2, from: 21, to: 22 },
      { surah: 2, from: 29, to: 29 },
      { surah: 7, from: 54, to: 54 },
      { surah: 10, from: 3, to: 6 },
      { surah: 21, from: 30, to: 33 },
      { surah: 41, from: 9, to: 12 },
      { surah: 51, from: 47, to: 49 },
      { surah: 67, from: 1, to: 5 }
    ]
  },
  {
    topic: "Angels & The Unseen (Mala'ikah & Ghayb)",
    category: "Faith & Theology",
    keywords: ["angels", "jibril", "gabriel", "mika'il", "malak", "ghayb", "unseen", "kiraman katibin"],
    verses: [
      { surah: 2, from: 3, to: 3 },
      { surah: 2, from: 30, to: 34 },
      { surah: 2, from: 97, to: 98 },
      { surah: 16, from: 2, to: 2 },
      { surah: 35, from: 1, to: 1 },
      { surah: 66, from: 6, to: 6 },
      { surah: 82, from: 10, to: 12 }
    ]
  },
  {
    topic: "Taqwa (God-Consciousness & Piety)",
    category: "Spiritual & Ethics",
    keywords: ["taqwa", "muttaqin", "piety", "fear of god", "righteousness", "mindfulness", "ward off evil"],
    verses: [
      { surah: 2, from: 2, to: 5 },
      { surah: 2, from: 177, to: 177 },
      { surah: 2, from: 183, to: 183 },
      { surah: 3, from: 102, to: 103 },
      { surah: 3, from: 133, to: 136 },
      { surah: 49, from: 13, to: 13 },
      { surah: 65, from: 2, to: 3 }
    ]
  },

  // --- STORIES OF PROPHETS ---
  {
    topic: "Adam and Iblis (Creation & Fall)",
    category: "Stories of Prophets",
    keywords: ["adam", "iblis", "satan", "prostration", "tree", "forbidden fruit", "repentance", "khalifah", "angels bowed"],
    verses: [
      { surah: 2, from: 30, to: 39 },
      { surah: 7, from: 11, to: 25 },
      { surah: 15, from: 26, to: 44 },
      { surah: 17, from: 61, to: 65 },
      { surah: 18, from: 50, to: 50 },
      { surah: 20, from: 115, to: 126 }
    ]
  },
  {
    topic: "Prophet Ibrahim (Abraham)",
    category: "Stories of Prophets",
    keywords: ["ibrahim", "abraham", "kaaba", "building the house", "idols smashed", "fire made cool", "sacrifice", "ismail", "hanif"],
    verses: [
      { surah: 2, from: 124, to: 132 },
      { surah: 2, from: 258, to: 260 },
      { surah: 6, from: 74, to: 83 },
      { surah: 14, from: 35, to: 41 },
      { surah: 19, from: 41, to: 50 },
      { surah: 21, from: 51, to: 71 },
      { surah: 37, from: 83, to: 113 }
    ]
  },
  {
    topic: "Prophet Musa (Moses) & Bani Israel",
    category: "Stories of Prophets",
    keywords: ["musa", "moses", "pharaoh", "fir'awn", "children of israel", "bani israel", "parting of sea", "staff", "nine signs", "mount tur", "tablets"],
    verses: [
      { surah: 2, from: 40, to: 74 },
      { surah: 5, from: 20, to: 26 },
      { surah: 7, from: 103, to: 162 },
      { surah: 10, from: 75, to: 92 },
      { surah: 20, from: 9, to: 98 },
      { surah: 26, from: 10, to: 68 },
      { surah: 28, from: 3, to: 44 }
    ]
  },
  {
    topic: "Musa & Al-Khidr (Knowledge & Wisdom)",
    category: "Stories of Prophets",
    keywords: ["khidr", "musa and khidr", "boat scuttled", "boy killed", "wall repaired", "knowledge of unseen", "wisdom", "patience"],
    verses: [
      { surah: 18, from: 60, to: 82 }
    ]
  },
  {
    topic: "Prophet Yusuf (Joseph)",
    category: "Stories of Prophets",
    keywords: ["yusuf", "joseph", "eleven stars", "well", "caravan", "potiphar's wife", "prison", "dreams interpreted", "egypt treasury", "brothers reunite"],
    verses: [
      { surah: 12, from: 1, to: 101 }
    ]
  },
  {
    topic: "Prophet Isa (Jesus) & Maryam (Mary)",
    category: "Stories of Prophets",
    keywords: ["isa", "jesus", "maryam", "mary", "virgin birth", "cradle", "miracles", "crucifixion refuted", "spirit from god", "son of mary"],
    verses: [
      { surah: 3, from: 42, to: 59 },
      { surah: 4, from: 156, to: 159 },
      { surah: 4, from: 171, to: 172 },
      { surah: 5, from: 110, to: 120 },
      { surah: 19, from: 16, to: 36 },
      { surah: 43, from: 57, to: 65 }
    ]
  },
  {
    topic: "Prophet Muhammad ﷺ & His Mission",
    category: "Stories of Prophets",
    keywords: ["muhammad", "ahmad", "messenger", "prophethood", "seal of prophets", "khatam an-nabiyyin", "character", "night journey", "isra", "miraj", "quran revelation"],
    verses: [
      { surah: 2, from: 151, to: 151 },
      { surah: 3, from: 144, to: 144 },
      { surah: 9, from: 128, to: 129 },
      { surah: 17, from: 1, to: 1 },
      { surah: 21, from: 107, to: 107 },
      { surah: 33, from: 21, to: 21 },
      { surah: 33, from: 40, to: 40 },
      { surah: 48, from: 28, to: 29 },
      { surah: 68, from: 4, to: 4 }
    ]
  },
  {
    topic: "Ashab al-Kahf (People of the Cave)",
    category: "Stories & Parables",
    keywords: ["cave", "sleepers", "youth", "dog", "three hundred years", "persecution", "monotheism", "silver coins"],
    verses: [
      { surah: 18, from: 9, to: 26 }
    ]
  },
  {
    topic: "Dhul-Qarnayn & Gog and Magog (Yajuj wa Majuj)",
    category: "Stories & Parables",
    keywords: ["dhul qarnayn", "two horns", "iron barrier", "copper poured", "yajuj", "majuj", "gog and magog", "rampart"],
    verses: [
      { surah: 18, from: 83, to: 99 },
      { surah: 21, from: 96, to: 97 }
    ]
  },

  // --- FIQH & LEGAL INJUNCTIONS ---
  {
    topic: "Salat (Daily Prayers) & Qiblah",
    category: "Worship & Rulings",
    keywords: ["salat", "prayer", "qiblah", "direction of prayer", "kaaba", "prostration", "bowing", "friday prayer", "salat al-khawf", "ablution", "wudu"],
    verses: [
      { surah: 2, from: 43, to: 45 },
      { surah: 2, from: 142, to: 150 },
      { surah: 2, from: 238, to: 239 },
      { surah: 4, from: 101, to: 103 },
      { surah: 5, from: 6, to: 6 },
      { surah: 17, from: 78, to: 79 },
      { surah: 20, from: 130, to: 132 },
      { surah: 62, from: 9, to: 11 }
    ]
  },
  {
    topic: "Siyam (Fasting) & Ramadan",
    category: "Worship & Rulings",
    keywords: ["fasting", "siyam", "ramadan", "sawm", "laylat al-qadr", "night of decree", "sick and traveler", "fidya", "exemptions", "dawn till night"],
    verses: [
      { surah: 2, from: 183, to: 187 },
      { surah: 97, from: 1, to: 5 }
    ]
  },
  {
    topic: "Zakat, Sadaqah & Spending for Allah (Infaq)",
    category: "Worship & Rulings",
    keywords: ["zakat", "sadaqah", "charity", "alms", "infaq", "spending", "poor", "needy", "orphan", "recipients of zakat"],
    verses: [
      { surah: 2, from: 177, to: 177 },
      { surah: 2, from: 261, to: 274 },
      { surah: 9, from: 60, to: 60 },
      { surah: 57, from: 18, to: 18 },
      { surah: 76, from: 8, to: 9 }
    ]
  },
  {
    topic: "Hajj & Umrah (Pilgrimage)",
    category: "Worship & Rulings",
    keywords: ["hajj", "umrah", "pilgrimage", "safa", "marwah", "arafat", "mina", "sacrificial animal", "ihram", "house of god"],
    verses: [
      { surah: 2, from: 158, to: 158 },
      { surah: 2, from: 196, to: 203 },
      { surah: 3, from: 96, to: 97 },
      { surah: 22, from: 26, to: 37 }
    ]
  },
  {
    topic: "Prohibition of Riba (Usury & Interest)",
    category: "Financial & Social Laws",
    keywords: ["riba", "interest", "usury", "trade vs interest", "war with allah", "destroy riba", "capital sum"],
    verses: [
      { surah: 2, from: 275, to: 281 },
      { surah: 3, from: 130, to: 130 },
      { surah: 4, from: 161, to: 161 },
      { surah: 30, from: 39, to: 39 }
    ]
  },
  {
    topic: "Debt Contracts & Business Ethics (Ayah al-Dayn)",
    category: "Financial & Social Laws",
    keywords: ["debt", "financial contract", "witnesses", "recording debts", "writing contract", "trust", "pledge", "mortgage"],
    verses: [
      { surah: 2, from: 282, to: 283 },
      { surah: 83, from: 1, to: 6 }
    ]
  },
  {
    topic: "Inheritance Laws (Mawarith)",
    category: "Financial & Social Laws",
    keywords: ["inheritance", "mirath", "shares", "parents share", "children share", "spouses share", "kalalah", "orphans wealth", "will", "bequest"],
    verses: [
      { surah: 4, from: 7, to: 14 },
      { surah: 4, from: 176, to: 176 }
    ]
  },
  {
    topic: "Marriage & Family (Nikah)",
    category: "Family & Society",
    keywords: ["marriage", "nikah", "spouses", "mahr", "dowry", "lawful women", "prohibited degrees of marriage", "tranquility", "love and mercy"],
    verses: [
      { surah: 2, from: 221, to: 221 },
      { surah: 4, from: 3, to: 4 },
      { surah: 4, from: 19, to: 25 },
      { surah: 24, from: 32, to: 33 },
      { surah: 30, from: 21, to: 21 }
    ]
  },
  {
    topic: "Divorce & Custody (Talaq & Iddah)",
    category: "Family & Society",
    keywords: ["divorce", "talaq", "iddah", "waiting period", "khul", "reconciliation", "maintenance", "suckling", "nursing", "parting in honor"],
    verses: [
      { surah: 2, from: 226, to: 237 },
      { surah: 2, from: 241, to: 242 },
      { surah: 65, from: 1, to: 7 }
    ]
  },
  {
    topic: "Dietary Laws, Halal & Prohibition of Intoxicants (Khamr)",
    category: "Worship & Rulings",
    keywords: ["halal food", "pork", "carrion", "blood", "slaughter in allah's name", "alcohol", "wine", "khamr", "gambling", "maysir", "intoxicants"],
    verses: [
      { surah: 2, from: 172, to: 173 },
      { surah: 2, from: 219, to: 219 },
      { surah: 5, from: 1, to: 5 },
      { surah: 5, from: 90, to: 92 },
      { surah: 6, from: 145, to: 145 }
    ]
  },

  // --- MORALITY, ETHICS & CHARACTER ---
  {
    topic: "Kindness to Parents (Birr al-Walidayn)",
    category: "Ethics & Society",
    keywords: ["parents", "father", "mother", "kindness to parents", "old age", "say not uff", "wings of humility", "rearing in childhood"],
    verses: [
      { surah: 2, from: 83, to: 83 },
      { surah: 4, from: 36, to: 36 },
      { surah: 17, from: 23, to: 24 },
      { surah: 29, from: 8, to: 8 },
      { surah: 31, from: 14, to: 15 },
      { surah: 46, from: 15, to: 16 }
    ]
  },
  {
    topic: "Care for Orphans & The Needy (Yatama)",
    category: "Ethics & Society",
    keywords: ["orphans", "yatim", "yatama", "consuming orphan wealth", "justice for orphans", "do not oppress orphan", "shelter"],
    verses: [
      { surah: 2, from: 220, to: 220 },
      { surah: 4, from: 2, to: 3 },
      { surah: 4, from: 5, to: 6 },
      { surah: 4, from: 10, to: 10 },
      { surah: 89, from: 17, to: 18 },
      { surah: 93, from: 6, to: 10 },
      { surah: 107, from: 1, to: 3 }
    ]
  },
  {
    topic: "Patience & Perseverance (Sabr)",
    category: "Spiritual & Ethics",
    keywords: ["patience", "sabr", "perseverance", "trials", "tribulations", "with the patient", "uncounted reward", "constancy"],
    verses: [
      { surah: 2, from: 153, to: 157 },
      { surah: 3, from: 200, to: 200 },
      { surah: 11, from: 115, to: 115 },
      { surah: 39, from: 10, to: 10 },
      { surah: 103, from: 1, to: 3 }
    ]
  },
  {
    topic: "Justice & Fulfilling Oaths (Adl & Amanah)",
    category: "Ethics & Society",
    keywords: ["justice", "adl", "equity", "qist", "witnesses for justice", "trusts", "amanah", "covenants", "uqud", "scale", "fair dealing"],
    verses: [
      { surah: 4, from: 58, to: 58 },
      { surah: 4, from: 135, to: 135 },
      { surah: 5, from: 8, to: 8 },
      { surah: 16, from: 90, to: 92 },
      { surah: 55, from: 7, to: 9 }
    ]
  },
  {
    topic: "Repentance & Forgiveness (Tawbah & Maghfirah)",
    category: "Spiritual & Ethics",
    keywords: ["repentance", "tawbah", "forgiveness", "maghfirah", "all-forgiving", "merciful", "despair not", "turning to allah", "accepting repentance"],
    verses: [
      { surah: 2, from: 222, to: 222 },
      { surah: 3, from: 135, to: 136 },
      { surah: 4, from: 17, to: 18 },
      { surah: 24, from: 31, to: 31 },
      { surah: 39, from: 53, to: 54 },
      { surah: 42, from: 25, to: 25 },
      { surah: 66, from: 8, to: 8 }
    ]
  },
  {
    topic: "Hypocrisy & The Hypocrites (Munafiqin)",
    category: "Spiritual & Ethics",
    keywords: ["hypocrisy", "hypocrites", "munafiqin", "nifaq", "two-faced", "sick hearts", "lowest depths of fire", "deceiving believers"],
    verses: [
      { surah: 2, from: 8, to: 20 },
      { surah: 4, from: 142, to: 145 },
      { surah: 9, from: 67, to: 69 },
      { surah: 63, from: 1, to: 8 }
    ]
  },

  // --- THE HEREAFTER (AKHIRAH) ---
  {
    topic: "Day of Judgment & The Resurrection (Qiyamah & Ba'th)",
    category: "The Hereafter",
    keywords: ["day of judgment", "resurrection", "qiyamah", "trumpet blown", "graves opened", "records of deeds", "reckoning", "hisab", "scales", "mizan"],
    verses: [
      { surah: 21, from: 47, to: 47 },
      { surah: 22, from: 1, to: 7 },
      { surah: 39, from: 67, to: 75 },
      { surah: 69, from: 13, to: 37 },
      { surah: 75, from: 1, to: 40 },
      { surah: 81, from: 1, to: 14 },
      { surah: 82, from: 1, to: 19 },
      { surah: 99, from: 1, to: 8 },
      { surah: 101, from: 1, to: 11 }
    ]
  },
  {
    topic: "Paradise (Jannah) & Its Bliss",
    category: "The Hereafter",
    keywords: ["paradise", "jannah", "gardens beneath which rivers flow", "eternity", "springs", "fruits", "spouses purified", "peace", "countenance of allah", "highest reward"],
    verses: [
      { surah: 2, from: 25, to: 25 },
      { surah: 3, from: 15, to: 15 },
      { surah: 18, from: 30, to: 31 },
      { surah: 47, from: 15, to: 15 },
      { surah: 55, from: 46, to: 78 },
      { surah: 56, from: 10, to: 40 },
      { surah: 76, from: 11, to: 22 },
      { surah: 88, from: 8, to: 16 }
    ]
  },
  {
    topic: "Hellfire (Jahannam) & Its Warnings",
    category: "The Hereafter",
    keywords: ["hell", "jahannam", "fire", "nar", "boiling water", "zaqqum", "fetters", "chains", "regret", "punishment", "warning"],
    verses: [
      { surah: 2, from: 24, to: 24 },
      { surah: 4, from: 56, to: 56 },
      { surah: 14, from: 16, to: 17 },
      { surah: 22, from: 19, to: 22 },
      { surah: 56, from: 41, to: 56 },
      { surah: 67, from: 6, to: 11 },
      { surah: 78, from: 21, to: 30 }
    ]
  }
];

// Expand verses into an Ayah-indexed map and a Topic-indexed list
const ayahTopicIndex = {}; // "surah:ayah" -> [{ topic, category, keywords }]
const topicsTaxonomy = CORE_TOPICS.map(item => {
  const expandedVerses = [];
  for (const v of item.verses) {
    for (let a = v.from; a <= v.to; a++) {
      expandedVerses.push({ surah: v.surah, ayah: a });
      const key = `${v.surah}:${a}`;
      if (!ayahTopicIndex[key]) ayahTopicIndex[key] = [];
      ayahTopicIndex[key].push({
        topic: item.topic,
        category: item.category
      });
    }
  }
  return {
    ...item,
    expandedVerses
  };
});

const taxonomyOutputPath = path.join(topicsDir, 'ayah_topic_taxonomy.json');
fs.writeFileSync(taxonomyOutputPath, JSON.stringify({ topics: topicsTaxonomy, ayahIndex: ayahTopicIndex }, null, 2));
console.log(`✓ Generated Ayah Topic Taxonomy (${topicsTaxonomy.length} core themes) -> ${taxonomyOutputPath}`);

// -------------------------------------------------------------
// 3. EXTRACT TAFSIR SECTION HEADINGS (<h2>) FROM DOWNLOADED TAFSIRS
// -------------------------------------------------------------
const downloadedTafsirsDir = path.join(__dirname, '..', 'database', 'downloaded_tafsirs');
const tafsirHeadings = [];

if (fs.existsSync(downloadedTafsirsDir)) {
  const folders = fs.readdirSync(downloadedTafsirsDir);
  console.log(`Scanning ${folders.length} tafsir folders for <h2> section headings...`);

  for (const folder of folders) {
    // We scan prominent English, Arabic, and Urdu tafsirs (e.g. Ibn Kathir, Maarif, Bayan, etc.)
    const folderPath = path.join(downloadedTafsirsDir, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const surahNum = parseInt(path.basename(file, '.json'), 10);
      if (isNaN(surahNum)) continue;

      try {
        const content = fs.readFileSync(path.join(folderPath, file), 'utf8');
        const parsed = JSON.parse(content);
        const ayahs = Array.isArray(parsed) ? parsed : (parsed.ayahs || []);

        for (const item of ayahs) {
          const vNum = item.ayah || item.numberInSurah;
          const text = item.text || '';
          if (typeof text !== 'string') continue;

          // Extract <h2> headings
          const h2Matches = [...text.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
          for (const hMatch of h2Matches) {
            const heading = hMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (heading.length >= 3 && heading.length <= 150) {
              tafsirHeadings.push({
                folder,
                surahId: surahNum,
                ayahId: vNum,
                heading
              });
            }
          }
        }
      } catch (err) {
        // Skip malformed file
      }
    }
  }
}

const headingsOutputPath = path.join(topicsDir, 'tafsir_headings_index.json');
fs.writeFileSync(headingsOutputPath, JSON.stringify(tafsirHeadings, null, 2));
console.log(`✓ Extracted ${tafsirHeadings.length} Tafsir Section Headings -> ${headingsOutputPath}`);

console.log('✓ All Topic & Subject indexes successfully generated!');
