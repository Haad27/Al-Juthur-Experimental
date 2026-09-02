export interface SuggestedChip {
  label: string;
  prompt: string;
  icon: string;
}

export interface RagModeInfo {
  id: string;
  name: string;
  shortName: string;
  botTitle: string;
  badge: string;
  badgeColor: string;
  targetIntent: string;
  sources: string[];
  warning?: string;
  disclaimer: string;
  usageNotes: string[];
  examplePrompts: string[];
  suggestedChips?: SuggestedChip[];
  description: string;
}

export const RAG_MODES: RagModeInfo[] = [
  {
    id: "default",
    name: "1. AI Scholar · General Tafsir",
    shortName: "General Tafsir",
    botTitle: "General Tafsir AI Scholar",
    badge: "Balanced & Recommended",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    targetIntent: "Direct answers and general Quranic queries using the safest, most universally accepted classical commentaries.",
    sources: [
      "Tafsir Ibn Kathir (English & Arabic)",
      "Tafsir al-Tabari (Jami' al-Bayan)",
      "Tafsir al-Baghawi (Ma'alim al-Tanzil)",
      "Tafsir al-Qurtubi (Al-Jami' li-Ahkam al-Qur'an)",
      "Al-Tahrir wa al-Tanwir (Ibn Ashur)"
    ],
    disclaimer: "Synthesizes authentic classical commentaries into structured English. AI generated responses do not constitute binding religious decrees (fatwas).",
    usageNotes: [
      "Best for general verse inquiries, context of revelation (Asbab al-Nuzul), and core Quranic themes.",
      "Combines authentic narration (Riwayah) with analytical commentary.",
      "Provides direct verse citations and cross-references."
    ],
    examplePrompts: [
      "What is the background context and main theme of Surah Al-Mulk?",
      "Explain the spiritual significance of Ayah al-Kursi according to classical tafsir.",
      "Summarize the story of Ashab al-Kahf (People of the Cave) from Ibn Kathir."
    ],
    suggestedChips: [
      { label: "Explain verse", icon: "book", prompt: "Explain the background context, linguistic nuance, and classical tafsir of Surah Al-Ikhlas." },
      { label: "Ayat al-Kursi", icon: "sparkles", prompt: "Explain the spiritual significance and deep meanings of Ayah al-Kursi according to Ibn Kathir and classical scholars." },
      { label: "Surah Al-Mulk", icon: "compass", prompt: "What is the background context and main theme of Surah Al-Mulk according to classical tafsir?" },
      { label: "People of the Cave", icon: "scroll", prompt: "Summarize the story and spiritual lessons of Ashab al-Kahf (People of the Cave) from Ibn Kathir and Al-Tabari." }
    ],
    description: "The primary mode for standard study. Combines authentic narration (Riwayah) with rigorous analytical commentary and linguistic clarity."
  },
  {
    id: "classical",
    name: "2. AI Scholar · Hadith & Isnad",
    shortName: "Hadith & Isnad",
    botTitle: "Classical Hadith & Isnad AI Scholar",
    badge: "Early Salaf & Narrations",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    targetIntent: "Focused on historical narrations, early Sahabah and Salaf reports, and isnad-grounded exegesis.",
    sources: [
      "Tafsir Ibn Kathir (Arabic & English)",
      "Tafsir al-Tabari (Jami' al-Bayan)",
      "Al-Durr al-Manthur fi al-Tafsir al-Ma'thur (Al-Suyuti)"
    ],
    disclaimer: "Retrieves early transmission reports. Hadith chain verification should be cross-referenced with traditional Hadith specialists.",
    usageNotes: [
      "Best for investigating direct statements of Sahabah (Companions) and Tabi'in (Successors).",
      "Focuses on exegesis transmitted by narration (Tafsir bi-al-Ma'thur).",
      "Ideal for historical timeline queries."
    ],
    examplePrompts: [
      "What did Ibn Abbas transmit regarding the opening verses of Surah Al-Baqarah?",
      "Show me early Sahabah narrations about the revelation of Surah Al-Kahf.",
      "What reports exist in Al-Tabari concerning the night journey (Isra & Mi'raj)?"
    ],
    suggestedChips: [
      { label: "Verify narration", icon: "pen", prompt: "What did early Sahabah and Salaf narrate regarding the opening verses of Surah Al-Baqarah?" },
      { label: "Ibn Abbas reports", icon: "scroll", prompt: "What authentic reports from Ibn Abbas exist in Tafsir al-Tabari regarding the creation of the heavens and earth?" },
      { label: "Asbab al-Nuzul", icon: "book", prompt: "What are the authentic narrations regarding the cause of revelation (Asbab al-Nuzul) of Surah Al-Kahf?" },
      { label: "Night Journey", icon: "compass", prompt: "What classical reports exist in Al-Tabari and Ibn Kathir concerning the night journey (Isra & Mi'raj)?" }
    ],
    description: "Ideal for verifying exactly what the early generations of Islam (Sahabah, Tabi'in) transmitted regarding any ayah or historical event."
  },
  {
    id: "grammar",
    name: "3. AI Scholar · Grammar & Balagha",
    shortName: "Grammar & Balagha",
    botTitle: "Grammar & Balagha AI Scholar",
    badge: "Linguistic & Rhetoric Focus",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    targetIntent: "Word origins, syntax (i'rab), rhetorical beauty (balagha), particle structure, and deep grammatical breakdown.",
    sources: [
      "Al-Kashshaf (Al-Zamakhshari)",
      "Al-Bahr al-Muhit (Abu Hayyan al-Gharnati)",
      "I'rab al-Qur'an (Muhyiddin al-Darwish)"
    ],
    warning: "IMPORTANT GUARDRAIL: Scholars in this mode are masters of syntax and Arabic rhetoric. Do NOT use this mode as a reference for aqidah (creed) or general fiqh rulings. The AI router will refuse out-of-scope theological questions.",
    disclaimer: "Grammar & Balagha mode is restricted to syntax (I'rab) and Arabic eloquence. It does not provide legal rulings or theological creed (Aqidah).",
    usageNotes: [
      "Focuses on Arabic sentence breakdown, particle functions, and rhetorical structures.",
      "Explains subtle nuance between similar phrasing in different surahs.",
      "Analyzes verb tense choices and word ordering in the Quran."
    ],
    examplePrompts: [
      "What is the grammatical breakdown (I'rab) of 'Bismillah al-Rahman al-Rahim'?",
      "Explain the rhetorical beauty (balagha) in the phrasing of Surah Al-Ikhlas.",
      "Why is the particle 'fa' used instead of 'wa' in Surah Al-Kawtar?"
    ],
    suggestedChips: [
      { label: "I'rab of Bismillah", icon: "file", prompt: "What is the detailed grammatical breakdown (I'rab) and particle syntax of 'Bismillah al-Rahman al-Rahim'?" },
      { label: "Balagha of Al-Ikhlas", icon: "sparkles", prompt: "Explain the rhetorical beauty and eloquence (Balagha) in the phrasing and rhyme of Surah Al-Ikhlas." },
      { label: "Particle 'fa' vs 'wa'", icon: "layers", prompt: "Why is the connective particle 'fa' used instead of 'wa' in Surah Al-Kawthar according to classical grammarians?" },
      { label: "Taqdim & Ta'khir", icon: "book", prompt: "Explain the rhetorical purpose of Taqdim wa Ta'khir (word fronting) in 'Iyyaka na'budu' (Surah Al-Fatiha)." }
    ],
    description: "Exclusively explores the grammatical architecture, rhetorical subtleties, and precise Arabic word morphology of the Quranic text."
  },
  {
    id: "modern",
    name: "4. AI Scholar · Contemporary & Maqasid",
    shortName: "Contemporary & Maqasid",
    botTitle: "Contemporary & Maqasid AI Scholar",
    badge: "Modern Application & Themes",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    targetIntent: "Macro-themes, higher objectives of Shariah (Maqasid), societal context, modern psychology, and inter-verse connections across surahs.",
    sources: [
      "Al-Tahrir wa al-Tanwir (Ibn Ashur)",
      "Adwa' al-Bayan fi Eedah al-Qur'an (Al-Shanqiti)",
      "Al-Tafsir al-Wasit (Shaykh Tantawi)"
    ],
    disclaimer: "Connects Quranic principles to contemporary society and thematic analysis. Consult traditional scholars for specific modern legal rulings.",
    usageNotes: [
      "Great for understanding thematic links between different surahs.",
      "Explores higher objectives of Shariah (Maqasid) and ethical guidance.",
      "Addresses contemporary societal contexts and human psychology."
    ],
    examplePrompts: [
      "How do the principles in Surah Al-Hujurat apply to modern social media ethics?",
      "What does the Quran teach about mental resilience and anxiety in modern life?",
      "Explain the thematic connection between Surah Al-Fatiha and Surah Al-Baqarah."
    ],
    suggestedChips: [
      { label: "Social media ethics", icon: "compass", prompt: "How do the societal principles in Surah Al-Hujurat apply to modern social media ethics and communication?" },
      { label: "Anxiety & peace", icon: "heart", prompt: "What does the Quran teach about emotional resilience, dealing with anxiety, and finding inner tranquility?" },
      { label: "Maqasid of Shariah", icon: "layers", prompt: "What are the higher objectives of Shariah (Maqasid) reflected in Surah Al-Baqarah?" },
      { label: "Surah thematic links", icon: "book", prompt: "Explain the holistic thematic connection between Surah Al-Fatiha and Surah Al-Baqarah." }
    ],
    description: "Connects Quranic principles to modern societal realities, psychology, legislative wisdom, and holistic thematic relationships while maintaining focus on the text."
  },
  {
    id: "philosophical",
    name: "5. AI Scholar · Rational & Proofs",
    shortName: "Rational & Proofs",
    botTitle: "Rational & Philosophical AI Scholar",
    badge: "Intellectual & Logical Analysis",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    targetIntent: "Intellectual reflection, rational proofs, and philosophical arguments based on classical exegesis.",
    sources: [
      "Tafsir al-Razi (Mafatih al-Ghayb / The Great Tafsir)",
      "Ruh al-Ma'ani (Imam Shihab al-Din al-Alusi)",
      "Anwar al-Tanzil (Tafsir al-Baydawi)"
    ],
    warning: "NOTE: This mode focuses on intellectual and rational reflection of verses using logical proofs. This system strictly focuses on Quranic Tafsir and does not issue legal rulings or engage in sectarian/creed disputes.",
    disclaimer: "Focuses on rational proofs and academic exegesis. Not designed for practical jurisprudence or theological creed debates.",
    usageNotes: [
      "Ideal for exploring logical proofs of monotheism and cosmological reflection.",
      "Analyzes rational arguments presented in classical scholarly debates.",
      "Deeply explores ontological and thematic questions."
    ],
    examplePrompts: [
      "What rational arguments does Imam al-Razi present for divine creation in Surah Al-An'am?",
      "How do classical commentators discuss the concept of time in Surah Al-Asr?",
      "Explain the philosophical proofs for resurrection in Surah Ya-Sin."
    ],
    suggestedChips: [
      { label: "Creation arguments", icon: "brain", prompt: "What rational arguments does Imam al-Razi present for divine creation and design in Surah Al-An'am?" },
      { label: "Concept of time", icon: "clock", prompt: "How do classical commentators and philosophers discuss the concept of time in Surah Al-Asr?" },
      { label: "Proofs of resurrection", icon: "lightbulb", prompt: "Explain the philosophical and rational proofs for resurrection presented in Surah Ya-Sin." },
      { label: "Problem of trials", icon: "sparkles", prompt: "How does Imam al-Alusi explain divine wisdom behind human suffering and trials?" }
    ],
    description: "Engages with deep rational arguments, logical proofs, and philosophical reflections across classical scholarship."
  },
  {
    id: "lexicon",
    name: "6. AI Scholar · Classical Lexicon",
    shortName: "Classical Lexicon",
    botTitle: "Classical Arabic Lexicon AI Scholar",
    badge: "Root Etymology & Dictionaries",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    targetIntent: "Classical dictionary lookups, root concept structure, semantic nuances, and exhaustive classical Arabic usage.",
    sources: [
      "Mufradat Alfaz al-Quran (Al-Raghib al-Isfahani)",
      "Lisan al-Arab (Ibn Manzur)",
      "Maqayis al-Lughah (Ibn Faris)",
      "Lane's Lexicon (English cross-reference layer)"
    ],
    warning: "NOTE: Lexicon Mode is strictly bounded to root semantics, word definitions, and morphological forms. For full verse exegesis, switch to General Tafsir Mode.",
    disclaimer: "Strictly bounded to 3-letter/4-letter Arabic root definitions and classical dictionary entries. Does not output exegesis or legal rulings.",
    usageNotes: [
      "Search by 3-letter Arabic root or word concept (e.g. r-h-m, s-l-m).",
      "Traces semantic root evolution from pre-Islamic poetry to Quranic usage.",
      "Provides English definitions cross-referenced with Lane's Lexicon."
    ],
    examplePrompts: [
      "What is the primary root meaning and semantic journey of 'Rahmah' (ر ح م)?",
      "Explore the classical dictionary definitions for the root 'S-K-N' (س ك ن).",
      "Compare the root meanings of 'Alim' (علم) vs 'Khabir' (خبر) in classical lexicons."
    ],
    suggestedChips: [
      { label: "Root Rahmah (ر ح م)", icon: "layers", prompt: "What is the primary root meaning and semantic journey of 'Rahmah' (ر ح م) across Lisan al-Arab and Lane's Lexicon?" },
      { label: "Root Sakana (س ك ن)", icon: "search", prompt: "Explore the classical dictionary definitions and root connotations for 'S-K-N' (س ك ن)." },
      { label: "Alim vs Khabir", icon: "book", prompt: "Compare the root meanings and subtle semantic differences between 'Alim' (علم) and 'Khabir' (خبر) in classical lexicons." },
      { label: "Root Taqwa (و ق ي)", icon: "scroll", prompt: "Trace the morphological origin and linguistic evolution of 'Taqwa' from the root W-Q-Y in classical dictionaries." }
    ],
    description: "Searches primary classical Arabic dictionaries to reveal the precise semantic root journey and classical range of meaning for Quranic vocabulary."
  }
];

