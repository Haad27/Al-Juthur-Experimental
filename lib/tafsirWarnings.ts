export interface TafsirWarning {
  hasWarning: boolean;
  message: string;
}

export function getTafsirWarning(name: string, authorName?: string | null): TafsirWarning {
  const text = `${name || ""} ${authorName || ""}`.toLowerCase();

  if (text.includes("kashshaf") || text.includes("zamakhshari") || text.includes("كشاف") || text.includes("زمخشري")) {
    return {
      hasWarning: true,
      message: "This Tafsir contains Mu'tazili theological views. Please be aware of these creedal differences, though much benefit can still be derived from its profound linguistic insights.",
    };
  }

  if (text.includes("razi") || text.includes("رازي") || text.includes("mafatih")) {
    return {
      hasWarning: true,
      message: "This Tafsir heavily incorporates philosophy (Kalam) and Ash'ari theology. Benefit from its vast scope, but be mindful if you are not well-versed in these theological discussions.",
    };
  }

  if (text.includes("qutb") || text.includes("zilal") || text.includes("ظلال") || text.includes("قطب")) {
    return {
      hasWarning: true,
      message: "This is a modern work with unique socio-political and methodological perspectives that some scholars have critiqued. Benefit from its literary power while being aware of its specific methodology.",
    };
  }

  if (text.includes("nasafi") || text.includes("نسفي")) {
    return {
      hasWarning: true,
      message: "This Tafsir is based on Maturidi theology. Please be aware of these creedal differences while benefiting from its concise and structured explanations.",
    };
  }

  return { hasWarning: false, message: "" };
}
