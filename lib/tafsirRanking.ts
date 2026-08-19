/**
 * Utility to rank Tafsirs by fame and popularity.
 * Most famous classical and contemporary Tafsirs get lower rank numbers (1, 2, 3...)
 * so they automatically sort to the top.
 */
export function getTafsirFameRank(name: string, authorName?: string | null): number {
  const text = `${name || ""} ${authorName || ""}`.toLowerCase();

  // 1. Tafsir Ibn Kathir (Most famous worldwide across all languages)
  if (text.includes("ibn kathir") || text.includes("ابن كثير") || text.includes("ابن کثیر")) return 1;

  // 2. Tafsir al-Jalalayn (Most famous concise classical seminary text)
  if (text.includes("jalalayn") || text.includes("جلالين") || text.includes("جلالین")) return 2;

  // 3. Tafsir al-Tabari (Mother of all classical Tafsirs)
  if (text.includes("tabari") || text.includes("طبري") || text.includes("طبری")) return 3;

  // 4. Tafsir al-Qurtubi (Most famous legal/fiqh Tafsir)
  if (text.includes("qurtubi") || text.includes("قرطبي") || text.includes("قرطبی")) return 4;

  // 5. Tafsir as-Sa'di (Most famous modern clear classical Tafsir)
  if (text.includes("sa'di") || text.includes("sadi") || text.includes("سعدي") || text.includes("سعدی")) return 5;

  // 6. Tafheem-ul-Quran (Sayyid Abul A'la Maududi)
  if (text.includes("tafheem") || text.includes("maududi") || text.includes("تفہیم") || text.includes("مودودي") || text.includes("مودودی")) return 6;

  // 7. Bayan-ul-Quran (Dr. Israr Ahmad / Ashraf Ali Thanwi)
  if (text.includes("israr") || text.includes("bayan-ul-quran") || text.includes("بيان القرآن") || text.includes("بیان القرآن") || text.includes("thanwi") || text.includes("تھانوی")) return 7;

  // 8. Ma'arif-ul-Quran / Mufti Shafi / Taqi Usmani
  if (text.includes("ma'arif") || text.includes("maarif") || text.includes("معارف") || text.includes("shafi") || text.includes("taqi usmani") || text.includes("عثماني") || text.includes("عثمانی")) return 8;

  // 9. Tafsir al-Kashshaf (Az-Zamakhshari)
  if (text.includes("kashshaf") || text.includes("zamakhshari") || text.includes("كشاف") || text.includes("زمخشري")) return 9;

  // 10. Tafsir al-Razi / Mafatih al-Ghayb
  if (text.includes("razi") || text.includes("رازي") || text.includes("رازی") || text.includes("mafatih")) return 10;

  // 11. Al-Mukhtasar in Tafsir (Famous abridged interpretation)
  if (text.includes("mukhtasar") || text.includes("مختصر")) return 11;

  // 12. Tafsir Ibn Abbas / Tanwir al-Miqbas
  if (text.includes("ibn abbas") || text.includes("tanwir") || text.includes("ابن عباس")) return 12;

  // 13. Tafsir al-Baghawi (Ma'alim al-Tanzil)
  if (text.includes("baghawi") || text.includes("بغوي") || text.includes("بغوی")) return 13;

  // 14. Tafsir Ibn Abi Hatim
  if (text.includes("ibn abi hatim") || text.includes("ابن أبي حاتم")) return 14;

  // 15. Tafsir Ibn al-Jawzi (Zad al-Masir)
  if (text.includes("jawzi") || text.includes("جوزي") || text.includes("جوزی")) return 15;

  // 16. Tafsir Ibn Qayyim al-Jawziyya
  if (text.includes("qayyim") || text.includes("قيم") || text.includes("قیم")) return 16;

  // 17. Tafsir Ibn Juzay (Al-Tashil)
  if (text.includes("juzay") || text.includes("جزي") || text.includes("جزی")) return 17;

  // 18. Tafsir al-Samarqandi (Bahr al-Ulum)
  if (text.includes("samarqandi") || text.includes("سمرقندي") || text.includes("سمرقندی")) return 18;

  // 19. Tafsir al-Tha'alibi
  if (text.includes("tha'alibi") || text.includes("ثعالبي") || text.includes("ثعالبی")) return 19;

  // 20. Fi Zilal al-Quran (Sayyid Qutb)
  if (text.includes("zilal") || text.includes("qutb") || text.includes("ظلال") || text.includes("قطب")) return 20;

  // 21. Tazkirul Quran (Maulana Wahiduddin Khan)
  if (text.includes("tazkirul") || text.includes("wahiduddin") || text.includes("وحيد الدين")) return 21;

  // 22. Tafsir al-Shawkani (Fath al-Qadir)
  if (text.includes("shawkani") || text.includes("شوكاني") || text.includes("شوکانی")) return 22;

  // 23. Tafsir al-Alusi (Ruh al-Ma'ani)
  if (text.includes("alusi") || text.includes("آلوسي") || text.includes("آلوسی")) return 23;

  // 24. Tafsir al-Sam'ani
  if (text.includes("sam'ani") || text.includes("سمعاني")) return 24;

  // Default rank for all other Tafsirs
  return 100;
}

/**
 * Utility to get language priority ranking.
 * English comes first (1), followed by Urdu (2), Arabic (3), Pashto (4), and then all other languages.
 */
export function getLanguagePriority(langName: string): number {
  const lower = (langName || "").toLowerCase();
  if (lower.includes("english")) return 1;
  if (lower.includes("urdu")) return 2;
  if (lower.includes("arabic")) return 3;
  if (lower.includes("pashto")) return 4;
  return 5;
}

/**
 * Helper to determine scholarly difficulty level of a Tafsir.
 * Beginner: Concise, modern, easy-to-read classical & contemporary explanations.
 * Intermediate: Comprehensive analytical and thematic commentaries.
 * Advanced: Deep linguistic, jurisprudence (fiqh), theological, and extensive classical encyclopedias.
 */
export function getTafsirDifficulty(name: string, authorName?: string | null): 'Beginner' | 'Intermediate' | 'Advanced' {
  const text = `${name || ""} ${authorName || ""}`.toLowerCase();

  // Advanced: Extensive multi-volume classical encyclopedias, jurisprudence, linguistics, theology
  if (
    text.includes("tabari") || text.includes("طبري") ||
    text.includes("qurtubi") || text.includes("قرطبي") ||
    text.includes("kashshaf") || text.includes("zamakhshari") || text.includes("زمخشري") ||
    text.includes("razi") || text.includes("رازي") || text.includes("mafatih") ||
    text.includes("baghawi") || text.includes("بغوي") ||
    text.includes("ibn abi hatim") || text.includes("ابن أبي حاتم") ||
    text.includes("shawkani") || text.includes("شوكاني") ||
    text.includes("alusi") || text.includes("آلوسي") ||
    text.includes("qushayri") || text.includes("قشيري")
  ) {
    return 'Advanced';
  }

  // Beginner: Concise, modern, accessible
  if (
    text.includes("sa'di") || text.includes("sadi") || text.includes("سعدي") ||
    text.includes("jalalayn") || text.includes("جلالين") ||
    text.includes("mukhtasar") || text.includes("مختصر") ||
    text.includes("tazkirul") || text.includes("taqi usmani") || text.includes("عثماني") ||
    text.includes("ahsanul bayaan")
  ) {
    return 'Beginner';
  }

  // Intermediate: Default for Ibn Kathir, Tafheem, Bayan-ul-Quran, Ma'arif-ul-Quran, Ibn Abbas, etc.
  return 'Intermediate';
}
