export interface RagModeInfo {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  badgeColor: string;
  targetIntent: string;
  sources: string[];
  warning?: string;
  description: string;
}

export const RAG_MODES: RagModeInfo[] = [
  {
    id: "default",
    name: "1. Default Mode (Balanced & Comprehensive)",
    shortName: "Default Mode",
    badge: "Normal / Recommended Use",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    targetIntent: "Direct answers and general Quranic queries using the safest, most universally accepted classical and comprehensive commentaries.",
    sources: [
      "Tafsir Ibn Kathir (English)",
      "Tafsir al-Tabari (Jami' al-Bayan)",
      "Tafsir al-Baghawi (Ma'alim al-Tanzil)",
      "Tafsir al-Qurtubi (Al-Jami' li-Ahkam al-Qur'an)",
      "Al-Tahrir wa al-Tanwir (Ibn Ashur)"
    ],
    description: "The primary mode for standard study. Combines authentic narration (Riwayah) with rigorous analytical commentary and linguistic clarity."
  },
  {
    id: "classical",
    name: "2. Classical Mode (Ma'thur & Athar)",
    shortName: "Classical Mode",
    badge: "Early Generations & Isnad",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    targetIntent: "Focused on historical narrations, early Sahabah and Salaf reports, and isnad-grounded exegesis.",
    sources: [
      "Tafsir Ibn Kathir (Arabic & English)",
      "Tafsir al-Tabari (Jami' al-Bayan)",
      "Al-Durr al-Manthur fi al-Tafsir al-Ma'thur (Al-Suyuti)"
    ],
    description: "Ideal for verifying exactly what the early generations of Islam (Sahabah, Tabi'in) transmitted regarding any ayah or historical event."
  },
  {
    id: "grammar",
    name: "3. Grammar & Balagha Mode (Linguistic — Tafsir)",
    shortName: "Grammar & Balagha",
    badge: "Linguistic & Rhetoric Focus",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    targetIntent: "Word origins, syntax (i'rab), rhetorical beauty (balagha), particle structure, and deep grammatical breakdown.",
    sources: [
      "Al-Kashshaf (Al-Zamakhshari)",
      "Al-Bahr al-Muhit (Abu Hayyan al-Gharnati)",
      "I'rab al-Qur'an (Muhyiddin al-Darwish)"
    ],
    warning: "IMPORTANT WARNING: Scholars in this mode (e.g., Al-Zamakhshari, Abu Hayyan) are world-renowned masters of syntax, linguistics, and rhetoric. Do NOT use this mode as a reference for aqidah (theological creed) or general fiqh rulings. The AI router will flag and refuse out-of-scope theological questions here.",
    description: "Exclusively explores the grammatical architecture, rhetorical subtleties, and precise Arabic word morphology of the Quranic text."
  },
  {
    id: "modern",
    name: "4. Modern & Contextual Mode (Maqasidi & Society)",
    shortName: "Modern & Contextual",
    badge: "Contemporary Application",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    targetIntent: "Macro-themes, higher objectives of Shariah (Maqasid), societal context, and inter-verse connections across surahs.",
    sources: [
      "Al-Tahrir wa al-Tanwir (Ibn Ashur)",
      "Adwa' al-Bayan fi Eedah al-Qur'an (Al-Shanqiti)",
      "Al-Tafsir al-Wasit (Shaykh Tantawi)"
    ],
    description: "Connects Quranic principles to modern societal realities, legislative wisdom, and holistic thematic relationships across the Book."
  },
  {
    id: "philosophical",
    name: "5. Philosophical & Intellectual Mode (Kalam & Rational)",
    shortName: "Philosophical Mode",
    badge: "Systematic Logic & Refutation",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    targetIntent: "Theological debates, rational proofs, systematic scholastic theology (Kalam), and refutation of doubts.",
    sources: [
      "Tafsir al-Razi (Mafatih al-Ghayb / The Great Tafsir)",
      "Ruh al-Ma'ani (Imam Shihab al-Din al-Alusi)",
      "Anwar al-Tanzil (Tafsir al-Baydawi)"
    ],
    warning: "NOTE: These classical texts focus on logical proofs, scholastic Kalam debates, and philosophical refutations. For basic jurisprudence or standard devotional reading, please use Default Mode.",
    description: "Engages with deep rational arguments, philosophical inquiries, and comprehensive systematic theology across classical scholarship."
  },
  {
    id: "lexicon",
    name: "6. Lexicon Mode (Word-Level Dictionary Lookup)",
    shortName: "Lexicon Mode",
    badge: "Root Definition & Etymology",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    targetIntent: "Classical dictionary lookups, root concept structure, semantic nuances, and exhaustive classical Arabic usage.",
    sources: [
      "Mufradat Alfaz al-Quran (Al-Raghib al-Isfahani)",
      "Lisan al-Arab (Ibn Manzur)",
      "Maqayis al-Lughah (Ibn Faris)",
      "Lane's Lexicon (English cross-reference layer)"
    ],
    warning: "NOTE: Lexicon Mode is strictly bounded to root semantics, word definitions, and morphological forms. For full verse tafsir or practical rulings, switch to Default Mode.",
    description: "Searches primary classical Arabic dictionaries to reveal the precise semantic root journey and classical range of meaning for Quranic vocabulary."
  }
];
