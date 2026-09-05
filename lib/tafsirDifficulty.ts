/**
 * Utility to classify Tafsirs by difficulty level.
 * Categorizes works into Beginner, Intermediate, or Advanced.
 */

export type TafsirDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export function getTafsirDifficulty(name: string, authorName?: string | null): TafsirDifficulty {
  const text = `${name || ""} ${authorName || ""}`.toLowerCase();

  // 1. Beginner: Simple translations, modern accessible commentaries, simplified texts
  if (
    text.includes("sa'di") || text.includes("sadi") || text.includes("سعدي") || text.includes("سعدی") ||
    text.includes("tafheem") || text.includes("maududi") || text.includes("تفہیم") || text.includes("مودودي") || text.includes("مودودی") ||
    text.includes("israr") || text.includes("bayan-ul-quran") || text.includes("بيان القرآن") || text.includes("بیان القرآن") ||
    text.includes("taqi usmani") || text.includes("عثماني") || text.includes("عثمانی") ||
    text.includes("mukhtasar") || text.includes("مختصر") ||
    text.includes("shaarawi") || text.includes("sha'rawi") || text.includes("شعراوي") ||
    text.includes("tazkirul") || text.includes("wahiduddin") || text.includes("وحيد الدين")
  ) {
    return 'Beginner';
  }

  // 2. Advanced: Deep linguistic, legal, philosophical, or multi-volume encyclopedic works
  if (
    text.includes("tabari") || text.includes("طبري") || text.includes("طبری") ||
    text.includes("qurtubi") || text.includes("قرطبي") || text.includes("قرطبی") ||
    text.includes("razi") || text.includes("رازي") || text.includes("رازی") || text.includes("mafatih") ||
    text.includes("kashshaf") || text.includes("zamakhshari") || text.includes("كشاف") || text.includes("زمخشري") ||
    text.includes("alusi") || text.includes("آلوسي") || text.includes("آلوسی") ||
    text.includes("qutb") || text.includes("zilal") || text.includes("ظلال") || text.includes("قطب") ||
    text.includes("shawkani") || text.includes("شوكاني") || text.includes("شوکانی") ||
    text.includes("samarqandi") || text.includes("سمرقندي") || text.includes("سمرقندی") ||
    text.includes("ahkam") || text.includes("أحكام") || text.includes("jassas") || text.includes("جصاص") ||
    text.includes("maturidi") || text.includes("ماتريدي") || text.includes("naysaburi") || text.includes("نيسابوري") ||
    text.includes("muqatil") || text.includes("مقاتل") || text.includes("burusawi") || text.includes("بروسوي")
  ) {
    return 'Advanced';
  }

  // 3. Intermediate: Standard classical references (Ibn Kathir, Jalalayn, etc.)
  // If not explicitly Beginner or Advanced, default to Intermediate
  return 'Intermediate';
}
