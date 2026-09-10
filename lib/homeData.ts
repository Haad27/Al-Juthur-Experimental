export interface TafsirBookItem {
  id: number; // authorId or unique reference
  title: string;
  arabicTitle?: string;
  author: string;
  era: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  coverTheme: "burgundy" | "emerald" | "navy" | "sepia" | "charcoal" | "amber";
  description: string;
  features: string[];
  recommendedSurah?: number;
  badge?: string;
}

export interface RoadmapPathway {
  id: "beginner" | "intermediate" | "advanced";
  title: string;
  tagline: string;
  targetAudience: string;
  badge: string;
  books: TafsirBookItem[];
}

export interface MoodReflection {
  id: string;
  title: string;
  arabicTitle: string;
  subtitle: string;
  iconName: "rain" | "leaf" | "sun" | "drop" | "telescope" | "hands";
  themeClass: string;
  quote: {
    surahNumber: number;
    ayahNumber: number;
    surahName: string;
    arabicText: string;
    translation: string;
    tafsirExcerpt: string;
    tafsirSource: string;
  };
  recommendedSurahs: Array<{
    number: number;
    name: string;
    englishName: string;
    reason: string;
  }>;
}

export interface MethodologyCategory {
  id: string;
  title: string;
  subtitle: string;
  count: string;
  books: Array<{
    title: string;
    author: string;
    coverTheme: "burgundy" | "emerald" | "navy" | "sepia" | "charcoal" | "amber";
  }>;
  filterHref: string;
}

// -------------------------------------------------------------
// 1. Top-Shelf Handpicked Classical Previews
// -------------------------------------------------------------
export const TOP_SHELF_TAFSIRS: TafsirBookItem[] = [
  {
    id: 103,
    title: "Tafsir as-Sa'di",
    arabicTitle: "تيسير الكريم الرحمن في تفسير كلام المنان",
    author: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di",
    era: "14th Century AH (1376 AH / 1956 CE)",
    category: "Modern & Accessible Orthodox",
    difficulty: "Beginner",
    coverTheme: "sepia",
    description:
      "A luminous, modern classical commentary celebrated for its clarity, eloquence, and direct spiritual focus on moral guidance and faith without dense grammatical complexities.",
    features: ["Distraction-Free", "Pure Orthodox Creed", "Concise Flow", "Spiritual Insights"],
    recommendedSurah: 18,
    badge: "Most Recommended Primer",
  },
  {
    id: 61,
    title: "Tafsir Ibn Kathir",
    arabicTitle: "تفسير القرآن العظيم",
    author: "Hafiz Abu al-Fida Ismail Ibn Kathir",
    era: "8th Century AH (774 AH / 1373 CE)",
    category: "Classical Athari (Tradition-Based)",
    difficulty: "Intermediate",
    coverTheme: "burgundy",
    description:
      "The undisputed gold-standard of traditional Quranic commentary. Renowned across all centuries for explaining the Qur'an by the Qur'an, followed by authentic Prophetic Hadith and reports of the Sahaba.",
    features: ["Authentic Hadith Chains", "Quran by Quran", "Thematic Rigor", "Universal Authority"],
    recommendedSurah: 2,
    badge: "Universal Classical Standard",
  },
  {
    id: 60,
    title: "Al-Mukhtasar in Tafsir",
    arabicTitle: "المختصر في تفسير القرآن الكريم",
    author: "Center for Quranic Interpretation",
    era: "Contemporary Scholarly Committee (1435 AH)",
    category: "Concise Scholarly Consensus",
    difficulty: "Beginner",
    coverTheme: "emerald",
    description:
      "A meticulously vetted contemporary interpretation prepared by a distinguished global council of Quranic scholars. Delivers concise sentence-level explanations of each verse.",
    features: ["Council Consensus", "Modern Academic English", "Ayah-by-Ayah Precision", "Zero Jargon"],
    recommendedSurah: 36,
    badge: "Essential Beginner Companion",
  },
  {
    id: 62,
    title: "Ma'arif-ul-Quran",
    arabicTitle: "معارف القرآن",
    author: "Mufti Muhammad Shafi Usmani",
    era: "14th Century AH (1396 AH / 1976 CE)",
    category: "Comprehensive Analysis & Contemporary Context",
    difficulty: "Intermediate",
    coverTheme: "navy",
    description:
      "A landmark multi-volume contemporary masterpiece bridging profound classical scholarship with answers to modern existential and social questions, with notes by Mufti Taqi Usmani.",
    features: ["Modern Inquiries", "Comprehensive Fiqh", "Spiritual Reflections", "Explanatory Notes"],
    recommendedSurah: 67,
    badge: "Comprehensive Reference",
  },
];

// -------------------------------------------------------------
// 2. All-Time Bestsellers / Most-Read Classical Works
// -------------------------------------------------------------
export const ALL_TIME_BESTSELLERS: TafsirBookItem[] = [
  {
    id: 61,
    title: "Tafsir Ibn Kathir",
    arabicTitle: "تفسير القرآن العظيم",
    author: "Hafiz Ibn Kathir",
    era: "774 AH / 1373 CE",
    category: "Tradition-Based (Ma'thur)",
    difficulty: "Intermediate",
    coverTheme: "burgundy",
    description: "Foremost classical commentary explaining verses through authentic Prophetic traditions.",
    features: ["Quran by Quran", "Hadith Analysis"],
    recommendedSurah: 1,
    badge: "#1 Most Read Worldwide",
  },
  {
    id: 103,
    title: "Tafsir as-Sa'di",
    arabicTitle: "تيسير الكريم الرحمن",
    author: "Shaykh Abdur-Rahman as-Sa'di",
    era: "1376 AH / 1956 CE",
    category: "Clear & Devotional",
    difficulty: "Beginner",
    coverTheme: "sepia",
    description: "Lucid contemporary commentary focusing on practical guidance and living faith.",
    features: ["Beginner Friendly", "Moral Guidance"],
    recommendedSurah: 18,
    badge: "Best for Starters",
  },
  {
    id: 63,
    title: "Tafsir al-Jalalayn",
    arabicTitle: "تفسير الجلالين",
    author: "Al-Mahalli & As-Suyuti",
    era: "911 AH / 1505 CE",
    category: "Concise Classical Primer",
    difficulty: "Beginner",
    coverTheme: "charcoal",
    description: "The timeless classical seminary textbook containing succinct phrase-by-phrase glosses.",
    features: ["Ultra-Concise", "Seminary Standard"],
    recommendedSurah: 55,
    badge: "Centuries-Old Primer",
  },
  {
    id: 60,
    title: "Al-Mukhtasar in Tafsir",
    arabicTitle: "المختصر في التفسير",
    author: "Center for Quranic Interpretation",
    era: "1435 AH / 2014 CE",
    category: "Scholarly Consensus",
    difficulty: "Beginner",
    coverTheme: "emerald",
    description: "Carefully vetted concise explanation crafted for modern global readers.",
    features: ["Global Consensus", "Accessible Style"],
    recommendedSurah: 36,
    badge: "Contemporary Essential",
  },
  {
    id: 62,
    title: "Ma'arif-ul-Quran",
    arabicTitle: "معارف القرآن",
    author: "Mufti Muhammad Shafi",
    era: "1396 AH / 1976 CE",
    category: "Comprehensive Analysis",
    difficulty: "Intermediate",
    coverTheme: "navy",
    description: "Encyclopedic multi-volume commentary addressing modern inquiries with classical depth.",
    features: ["Explanatory Notes", "Living Sunnah"],
    recommendedSurah: 67,
    badge: "Scholarly Standard",
  },
  {
    id: 205,
    title: "Safwat al-Tafasir",
    arabicTitle: "صفوة التفاسير",
    author: "Shaykh Muhammad Ali al-Sabuni",
    era: "1442 AH / 2021 CE",
    category: "Synthesis of Major Works",
    difficulty: "Intermediate",
    coverTheme: "amber",
    description: "An elegant distillation of the top classical commentaries synthesized into modern Arabic prose.",
    features: ["Synthesis of Tabari & Razi", "Eloquence"],
    recommendedSurah: 12,
    badge: "Scholarly Synthesis",
  },
  {
    id: 210,
    title: "Tafsir al-Baghawi",
    arabicTitle: "معالم التنزيل للبغوي",
    author: "Imam al-Husayn al-Baghawi",
    era: "516 AH / 1122 CE",
    category: "Purity of Hadith & Sunnah",
    difficulty: "Intermediate",
    coverTheme: "sepia",
    description: "Revered by generations of scholars for its purity from unsupported stories and deep Hadith citations.",
    features: ["Pure Sunnah", "Revered Classical"],
    recommendedSurah: 56,
    badge: "Pinnacle of Sunnah",
  },
  {
    id: 201,
    title: "Tafsir al-Tabari",
    arabicTitle: "جامع البيان عن تأويل آي القرآن",
    author: "Imam Ibn Jarir al-Tabari",
    era: "310 AH / 923 CE",
    category: "Monumental Encyclopedia",
    difficulty: "Advanced",
    coverTheme: "burgundy",
    description: "The foundational encyclopedia of all Quranic exegesis preserving complete isnad transmission.",
    features: ["Complete Chains", "Mother of Tafsir"],
    recommendedSurah: 2,
    badge: "Father of Exegesis",
  },
];

// -------------------------------------------------------------
// 3. Tafsir Roadmaps: Beginner, Intermediate, Advanced
// Strictly non-controversial, orthodox works for Beginner & Intermediate
// -------------------------------------------------------------
export const TAFSIR_ROADMAPS: Record<string, RoadmapPathway> = {
  beginner: {
    id: "beginner",
    title: "The Best Start: Foundations of Understanding",
    tagline: "Lucid, accessible, non-controversial classical & contemporary works designed to build intuitive understanding.",
    targetAudience: "New readers, students taking their first steps, and daily spiritual reflection.",
    badge: "Step 1 · Accessible & Lucid",
    books: [
      {
        id: 103,
        title: "Tafsir as-Sa'di",
        arabicTitle: "تيسير الكريم الرحمن",
        author: "Shaykh Abdur-Rahman as-Sa'di",
        era: "1376 AH / 1956 CE",
        category: "Clear & Devotional",
        difficulty: "Beginner",
        coverTheme: "sepia",
        description: "The top recommended starting book worldwide. Focuses directly on what Allah wants the servant to know, believe, and act upon.",
        features: ["Clean Translation", "Practical Spirituality", "Zero Theological Polemics"],
        badge: "Recommended First Read",
      },
      {
        id: 60,
        title: "Al-Mukhtasar in Tafsir",
        arabicTitle: "المختصر في تفسير القرآن",
        author: "Center for Quranic Interpretation",
        era: "1435 AH / 2014 CE",
        category: "Scholarly Council Consensus",
        difficulty: "Beginner",
        coverTheme: "emerald",
        description: "Consensus-vetted modern commentary providing direct, clear meanings of each verse without extraneous historical tangents.",
        features: ["Verse-by-Verse Clarity", "Global Scholarly Consensus", "Contemporary English"],
        badge: "Concise Guidance",
      },
      {
        id: 63,
        title: "Tafsir al-Jalalayn",
        arabicTitle: "تفسير الجلالين",
        author: "Al-Mahalli & As-Suyuti",
        era: "911 AH / 1505 CE",
        category: "Classical Seminary Textbook",
        difficulty: "Beginner",
        coverTheme: "charcoal",
        description: "Standard primer studied across classical Islamic madrasas for over 500 years. Brief, exact, and phrase-focused.",
        features: ["Exact Vocabulary", "High Academic Pedigree", "Compact Classical Phrasing"],
        badge: "Historical Primer",
      },
      {
        id: 100151,
        title: "Aasan Tarjuma Quran (Explanatory Notes)",
        arabicTitle: "آسان ترجمہ قرآن مع تفسیری حواشی",
        author: "Mufti Muhammad Taqi Usmani",
        era: "Contemporary (1429 AH)",
        category: "Clear Notes & Background",
        difficulty: "Beginner",
        coverTheme: "navy",
        description: "A lucid rendering with concise footnotes addressing background reasons for revelation and practical modern context.",
        features: ["Footnote Commentary", "Everyday Language", "Reliable Orthodox Notes"],
        badge: "Gentle Companion",
      },
    ],
  },
  intermediate: {
    id: "intermediate",
    title: "Analytical Commentary & Hadith Context",
    tagline: "Rich classical and multi-volume references combining verse-by-verse Hadith background and thematic analysis.",
    targetAudience: "Dedicated students seeking historical context, reasons of revelation (Asbab al-Nuzul), and deeper wisdom.",
    badge: "Step 2 · In-Depth & Hadith-Backed",
    books: [
      {
        id: 61,
        title: "Tafsir Ibn Kathir",
        arabicTitle: "تفسير القرآن العظيم",
        author: "Hafiz Ibn Kathir",
        era: "774 AH / 1373 CE",
        category: "Tradition-Based (Tafsir bi-l-Ma'thur)",
        difficulty: "Intermediate",
        coverTheme: "burgundy",
        description: "The universal reference for classical exegesis. Grounds every passage in authentic Hadiths and early consensus without controversy.",
        features: ["Prophetic Sunnah Citations", "Authentic Hadith Context", "Universal Authority"],
        badge: "Essential Milestone",
      },
      {
        id: 210,
        title: "Tafsir al-Baghawi",
        arabicTitle: "معالم التنزيل",
        author: "Imam al-Husayn al-Baghawi (Muhyi al-Sunnah)",
        era: "516 AH / 1122 CE",
        category: "Purity of Hadith & Sunnah",
        difficulty: "Intermediate",
        coverTheme: "sepia",
        description: "Known among traditional scholars as the most reliable, clean, and balanced intermediate classical commentary, completely free from unverified tales.",
        features: ["Sanad Purity", "Classical Sunnah", "Revered Traditional Balance"],
        badge: "Pinnacle of Balance",
      },
      {
        id: 62,
        title: "Ma'arif-ul-Quran",
        arabicTitle: "معارف القرآن",
        author: "Mufti Muhammad Shafi",
        era: "1396 AH / 1976 CE",
        category: "Comprehensive Analysis",
        difficulty: "Intermediate",
        coverTheme: "navy",
        description: "Encyclopedic Urdu/English commentary blending classical Sunni jurisprudence, moral purification, and answers to modern thought.",
        features: ["Modern Dilemmas Addressed", "Legal Nuances", "Living Sunni Wisdom"],
        badge: "Comprehensive Library",
      },
      {
        id: 205,
        title: "Safwat al-Tafasir",
        arabicTitle: "صفوة التفاسير",
        author: "Shaykh Muhammad Ali al-Sabuni",
        era: "1442 AH / 2021 CE",
        category: "Scholarly Synthesis",
        difficulty: "Intermediate",
        coverTheme: "amber",
        description: "Synthesizes the best insights of Tabari, Kashshaf, Razi, Qurtubi, and Ibn Kathir into accessible, elegant prose.",
        features: ["Multi-Classical Synthesis", "Literary Flow", "Structured Analysis"],
        badge: "Modern Classical Digest",
      },
    ],
  },
  advanced: {
    id: "advanced",
    title: "Scholarly Encyclopedias & Linguistic Masterpieces",
    tagline: "Monumental multi-volume classical treatises exploring grammatical subtleties (Nahw), rhetoric (Balaghah), and jurisprudence (Fiqh).",
    targetAudience: "Scholars, advanced students of Arabic, researchers, and memorizers of the Quran.",
    badge: "Step 3 · Monumental Scholarship",
    books: [
      {
        id: 201,
        title: "Tafsir al-Tabari",
        arabicTitle: "جامع البيان في تأويل القرآن",
        author: "Imam Muhammad ibn Jarir al-Tabari",
        era: "310 AH / 923 CE",
        category: "Foundational Classical Encyclopedia",
        difficulty: "Advanced",
        coverTheme: "burgundy",
        description: "The primary source and bedrock of all Quranic sciences. Preserves complete oral chains, variant readings (Qira'at), and early linguistic debates.",
        features: ["Oral Isnad Transmission", "Early Dialects", "Linguistic Weighing"],
        badge: "The Mother of Tafsir",
      },
      {
        id: 213,
        title: "Tafsir al-Qurtubi",
        arabicTitle: "الجامع لأحكام القرآن",
        author: "Imam Abu Abd Allah al-Qurtubi",
        era: "671 AH / 1273 CE",
        category: "Jurisprudence (Ahkam al-Qur'an)",
        difficulty: "Advanced",
        coverTheme: "emerald",
        description: "The premier legal commentary of the Quran, extracting rulings, ethical duties, and legal debates across classical Madhabs.",
        features: ["Comparative Fiqh", "Ethical Rulings", "Extensive Arabic Lexicon"],
        badge: "Pinnacle of Fiqh",
      },
      {
        id: 236,
        title: "Al-Kashshaf",
        arabicTitle: "الكشاف عن حقائق غوامض التنزيل",
        author: "Abu al-Qasim az-Zamakhshari",
        era: "538 AH / 1144 CE",
        category: "Arabic Rhetoric & Eloquence (Balaghah)",
        difficulty: "Advanced",
        coverTheme: "charcoal",
        description: "Renowned as the pinnacle of Quranic literary and rhetorical analysis. Unlocks the divine miraculous eloquence (I'jaz) of word choices.",
        features: ["Rhetorical Secrets", "Miraculous Word Order", "Grammatical Analysis"],
        badge: "Rhetorical Masterpiece",
      },
      {
        id: 215,
        title: "Mafatih al-Ghayb (Tafsir al-Razi)",
        arabicTitle: "مفاتيح الغيب (التفسير الكبير)",
        author: "Imam Fakhr al-Din al-Razi",
        era: "606 AH / 1210 CE",
        category: "Theological & Philosophical Exegesis",
        difficulty: "Advanced",
        coverTheme: "navy",
        description: "The monumental 32-volume philosophical and rational commentary examining cosmic signs, logic, theology, and human intellect.",
        features: ["Intellectual & Cosmic Signs", "Philosophical Depth", "Encyclopedic Scale"],
        badge: "Monumental Encyclopedia",
      },
    ],
  },
};

// -------------------------------------------------------------
// 4. "Match Your Mood" — Thematic Quranic Reflections
// -------------------------------------------------------------
export const MOOD_REFLECTIONS: MoodReflection[] = [
  {
    id: "sabr",
    title: "Rise Up & Overcome",
    arabicTitle: "الصبر والفرج",
    subtitle: "Solace, resilience & divine strength through trials",
    iconName: "rain",
    themeClass: "from-amber-950/20 to-card border-accent/30",
    quote: {
      surahNumber: 94,
      ayahNumber: 5,
      surahName: "Ash-Sharh",
      arabicText: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا · إِنَّ مَعَ الْعُسْرِ يُسْرًا",
      translation: "For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.",
      tafsirExcerpt:
        "The repetition confirms divine certainty: hardship is accompanied and enclosed by multiple reliefs. When difficulty peaks, divine aid draws nearest.",
      tafsirSource: "Tafsir as-Sa'di & Ibn Kathir",
    },
    recommendedSurahs: [
      { number: 94, name: "الشرح", englishName: "Ash-Sharh", reason: "Direct reassurance when feeling overwhelmed" },
      { number: 12, name: "يوسف", englishName: "Yusuf", reason: "Patience crowned with honor after profound tests" },
      { number: 2, name: "البقرة", englishName: "Al-Baqarah", reason: "Verses 153-157 on seeking help through patience and prayer" },
    ],
  },
  {
    id: "peace",
    title: "Peace & Tranquility",
    arabicTitle: "السكينة والطمأنينة",
    subtitle: "Calming anxious hearts with divine remembrance",
    iconName: "leaf",
    themeClass: "from-emerald-950/20 to-card border-emerald-900/30",
    quote: {
      surahNumber: 13,
      ayahNumber: 28,
      surahName: "Ar-Ra'd",
      arabicText: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
      translation: "Those who have believed and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured.",
      tafsirExcerpt:
        "The heart finds its genuine rest nowhere in creation except when tethered to its Maker. Anxiety dissipates as trust in His wisdom deepens.",
      tafsirSource: "Tafsir Ibn Kathir & Al-Mukhtasar",
    },
    recommendedSurahs: [
      { number: 13, name: "الرعد", englishName: "Ar-Ra'd", reason: "Anchoring the soul in Allah's wisdom and signs" },
      { number: 93, name: "الضحى", englishName: "Ad-Duha", reason: "Loving solace during emotional silence and darkness" },
      { number: 55, name: "الرحمن", englishName: "Ar-Rahman", reason: "Meditative rhythm of boundless divine grace" },
    ],
  },
  {
    id: "growth",
    title: "Productivity & Purpose",
    arabicTitle: "الهمة والإنتاجية",
    subtitle: "Harnessing time, intentionality, and moral excellence",
    iconName: "sun",
    themeClass: "from-yellow-950/20 to-card border-yellow-900/30",
    quote: {
      surahNumber: 103,
      ayahNumber: 1,
      surahName: "Al-'Asr",
      arabicText: "وَالْعَصْرِ · إِنَّ الْإِنسَانَ لَفِي خُسْرٍ · إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ",
      translation: "By time, indeed mankind is in loss, except for those who believe and do righteous deeds and advise one another to truth and patience.",
      tafsirExcerpt:
        "Imam ash-Shafi'i noted: 'If mankind reflected upon this single chapter alone, it would suffice them.' It provides the blueprint of deliberate daily living.",
      tafsirSource: "Tafsir Ibn Kathir & Al-Jalalayn",
    },
    recommendedSurahs: [
      { number: 103, name: "العصر", englishName: "Al-'Asr", reason: "The foundational blueprint of human productivity" },
      { number: 67, name: "الملك", englishName: "Al-Mulk", reason: "Reflecting on purpose: 'To test which of you is best in deed'" },
      { number: 62, name: "الجمعة", englishName: "Al-Jumu'ah", reason: "Balancing spiritual duty with productive worldly commerce" },
    ],
  },
  {
    id: "mercy",
    title: "Softening the Heart & Mercy",
    arabicTitle: "الرحمة والتوبة",
    subtitle: "Hope, forgiveness & refuge in Allah's boundless mercy",
    iconName: "drop",
    themeClass: "from-cyan-950/20 to-card border-cyan-900/30",
    quote: {
      surahNumber: 39,
      ayahNumber: 53,
      surahName: "Az-Zumar",
      arabicText: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا",
      translation: "Say, 'O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, Allah forgives all sins.'",
      tafsirExcerpt:
        "The most hopeful verse in the entire revelation. Allah calls the transgressors 'My servants' to awaken their longing to return home.",
      tafsirSource: "Tafsir al-Qurtubi & Ibn Kathir",
    },
    recommendedSurahs: [
      { number: 39, name: "الزمر", englishName: "Az-Zumar", reason: "The call to return with absolute hope in forgiveness" },
      { number: 25, name: "الفرقان", englishName: "Al-Furqan", reason: "Verses 63-77 describing the gentle Servants of the Merciful" },
      { number: 19, name: "مريم", englishName: "Maryam", reason: "Subtle narratives of tender answered prayers" },
    ],
  },
  {
    id: "wonder",
    title: "Wonder & Cosmic Reflection",
    arabicTitle: "التفكر في خلق السماوات",
    subtitle: "Pondering the majesty of creation and natural signs",
    iconName: "telescope",
    themeClass: "from-indigo-950/20 to-card border-indigo-900/30",
    quote: {
      surahNumber: 3,
      ayahNumber: 190,
      surahName: "Ali 'Imran",
      arabicText: "إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِّأُولِي الْأَلْبَابِ",
      translation: "Indeed, in the creation of the heavens and the earth and the alternation of the night and the day are signs for those of understanding.",
      tafsirExcerpt:
        "The Prophet ﷺ wept upon its revelation, saying: 'Woe to him who reads this verse and does not ponder over it.'",
      tafsirSource: "Tafsir Ibn Kathir & Baghawi",
    },
    recommendedSurahs: [
      { number: 3, name: "آل عمران", englishName: "Ali 'Imran", reason: "Verses 190-195 on deep cosmic contemplation (Tafakkur)" },
      { number: 88, name: "الغاشية", englishName: "Al-Ghashiyah", reason: "Reflecting on camels, sky, mountains, and earth" },
      { number: 50, name: "ق", englishName: "Qaf", reason: "Awakening wonder through rain, date-palms, and creation" },
    ],
  },
  {
    id: "shukr",
    title: "Gratitude & Contentment",
    arabicTitle: "الشكر والرضا",
    subtitle: "Counting unseen blessings and finding deep inner joy",
    iconName: "hands",
    themeClass: "from-emerald-950/20 to-card border-accent/30",
    quote: {
      surahNumber: 14,
      ayahNumber: 7,
      surahName: "Ibrahim",
      arabicText: "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
      translation: "And [remember] when your Lord proclaimed, 'If you are grateful, I will surely increase you [in favor].'",
      tafsirExcerpt:
        "Gratitude protects existing blessings from departing and summons divine increase in both worldly gifts and spiritual serenity.",
      tafsirSource: "Tafsir as-Sa'di",
    },
    recommendedSurahs: [
      { number: 14, name: "إبراهيم", englishName: "Ibrahim", reason: "The divine promise that gratitude guarantees increase" },
      { number: 16, name: "النحل", englishName: "An-Nahl", reason: "Known as 'The Chapter of Blessings' (Surat an-Ni'am)" },
      { number: 31, name: "لقمان", englishName: "Luqman", reason: "Wisdom of thanking Allah for guidance and intellect" },
    ],
  },
];

// -------------------------------------------------------------
// 5. Methodology & Genre Collections (Overlapping Book Stacks)
// -------------------------------------------------------------
export const METHODOLOGY_COLLECTIONS: MethodologyCategory[] = [
  {
    id: "tradition",
    title: "Classical & Athari (Tradition-Based)",
    subtitle: "Grounded in Quran-by-Quran and authentic Prophetic Hadith transmissions.",
    count: "18 Works",
    books: [
      { title: "Tafsir al-Tabari", author: "Imam al-Tabari", coverTheme: "burgundy" },
      { title: "Tafsir Ibn Kathir", author: "Hafiz Ibn Kathir", coverTheme: "sepia" },
      { title: "Tafsir al-Baghawi", author: "Imam al-Baghawi", coverTheme: "charcoal" },
    ],
    filterHref: "/tafsir?category=tradition",
  },
  {
    id: "accessible",
    title: "Modern & Accessible Commentaries",
    subtitle: "Clear prose, contemporary explanations, and direct devotional application.",
    count: "24 Works",
    books: [
      { title: "Tafsir as-Sa'di", author: "Abdur-Rahman as-Sa'di", coverTheme: "sepia" },
      { title: "Al-Mukhtasar in Tafsir", author: "Scholarly Council", coverTheme: "emerald" },
      { title: "Safwat al-Tafasir", author: "Muhammad Ali al-Sabuni", coverTheme: "amber" },
    ],
    filterHref: "/tafsir?category=accessible",
  },
  {
    id: "jurisprudence",
    title: "Legal & Jurisprudential (Ahkam al-Qur'an)",
    subtitle: "Deducing rulings, comparative Fiqh, and legal reasoning from divine commands.",
    count: "14 Works",
    books: [
      { title: "Al-Jami' li-Ahkam", author: "Imam al-Qurtubi", coverTheme: "emerald" },
      { title: "Ahkam al-Quran", author: "Abu Bakr al-Jassas", coverTheme: "navy" },
      { title: "Ahkam al-Quran", author: "Ibn al-Arabi al-Maliki", coverTheme: "burgundy" },
    ],
    filterHref: "/tafsir?category=jurisprudence",
  },
  {
    id: "linguistic",
    title: "Linguistic & Rhetorical (Balaghah & I'rab)",
    subtitle: "Grammatical precision, lexical origins, and literary secrets of divine speech.",
    count: "16 Works",
    books: [
      { title: "Al-Kashshaf", author: "Az-Zamakhshari", coverTheme: "charcoal" },
      { title: "Ma'ani al-Quran", author: "Al-Farra'", coverTheme: "amber" },
      { title: "Al-Nahr al-Madd", author: "Abu Hayyan al-Andalusi", coverTheme: "navy" },
    ],
    filterHref: "/tafsir?category=linguistic",
  },
];

// -------------------------------------------------------------
// 6. Popular Daily Audio Surahs
// -------------------------------------------------------------
export const POPULAR_AUDIO_SURAHS = [
  { number: 1, name: "الفاتحة", englishName: "Al-Fatihah", englishTranslation: "The Opening", verses: 7 },
  { number: 18, name: "الكهف", englishName: "Al-Kahf", englishTranslation: "The Cave", verses: 110 },
  { number: 36, name: "يس", englishName: "Ya-Sin", englishTranslation: "Ya-Sin", verses: 83 },
  { number: 55, name: "الرحمن", englishName: "Ar-Rahman", englishTranslation: "The Beneficent", verses: 78 },
  { number: 56, name: "الواقعة", englishName: "Al-Waqi'ah", englishTranslation: "The Inevitable", verses: 96 },
  { number: 67, name: "الملك", englishName: "Al-Mulk", englishTranslation: "The Sovereignty", verses: 30 },
];
