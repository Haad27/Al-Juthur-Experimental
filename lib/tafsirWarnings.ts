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

  if (
    text.includes("maududi") ||
    text.includes("moudidi") ||
    text.includes("mowdudi") ||
    text.includes("modudi") ||
    text.includes("tafheem") ||
    text.includes("مودودي") ||
    text.includes("مودودی") ||
    text.includes("تفہیم") ||
    text.includes("تفهيم")
  ) {
    return {
      hasWarning: true,
      message: "This is an influential modern commentary with a distinct socio-political and contemporary reformist emphasis that some scholars have critiqued. Readers are encouraged to benefit from its intellectual depth and systematic explanations while being mindful of these scholarly discussions.",
    };
  }

  return { hasWarning: false, message: "" };
}
