export interface TranslationFontOption {
  id: string;
  name: string;
  familyLabel: string;
  category: "Sans-Serif" | "Serif" | "Classical" | "Nastaliq" | "Naskh" | "Modern";
  description: string;
  sample: string;
  fontFamily: string;
  lineHeight?: string;
}

export const ENGLISH_FONTS: TranslationFontOption[] = [
  {
    id: "inter",
    name: "Inter",
    familyLabel: "Clean Sans",
    category: "Sans-Serif",
    description: "Crisp, balanced, modern digital readability.",
    sample: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
    lineHeight: "1.7",
  },
  {
    id: "lora",
    name: "Lora",
    familyLabel: "Literary Serif",
    category: "Serif",
    description: "Warm, graceful editorial serif designed for long-form reading.",
    sample: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    fontFamily: "var(--font-lora), Georgia, 'Times New Roman', serif",
    lineHeight: "1.75",
  },
  {
    id: "playfair",
    name: "Playfair Display",
    familyLabel: "Classical Serif",
    category: "Serif",
    description: "High-contrast, distinguished serif with classical scripture appeal.",
    sample: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    fontFamily: "var(--font-playfair), 'Playfair Display', 'Times New Roman', Georgia, serif",
    lineHeight: "1.75",
  },
  {
    id: "cinzel",
    name: "Cinzel",
    familyLabel: "Regal Classical",
    category: "Classical",
    description: "Inspired by classical Roman inscriptions; solemn and majestic.",
    sample: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    fontFamily: "var(--font-cinzel), Georgia, 'Times New Roman', serif",
    lineHeight: "1.75",
  },
  {
    id: "plus-jakarta",
    name: "Plus Jakarta Sans",
    familyLabel: "Geometric Sans",
    category: "Sans-Serif",
    description: "Modern, friendly geometric sans with effortless clarity.",
    sample: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    fontFamily: "var(--font-plus-jakarta), system-ui, -apple-system, sans-serif",
    lineHeight: "1.7",
  },
  {
    id: "arial",
    name: "Arial",
    familyLabel: "Universal Sans",
    category: "Sans-Serif",
    description: "Clean, ubiquitous neo-grotesque sans-serif with timeless neutral clarity.",
    sample: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
    lineHeight: "1.7",
  },
  {
    id: "rockwell",
    name: "Rockwell",
    familyLabel: "Slab Serif",
    category: "Serif",
    description: "Architectural geometric slab serif with distinct, bold mechanical serifs.",
    sample: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    fontFamily: "Rockwell, 'Rockwell Nova', var(--font-roboto-slab), 'DejaVu Serif', 'Sitka Small', serif",
    lineHeight: "1.75",
  },
];

export const URDU_FONTS: TranslationFontOption[] = [
  {
    id: "nastaliq",
    name: "Noto Nastaliq",
    familyLabel: "Classic Nastaliq",
    category: "Nastaliq",
    description: "Authentic Urdu Nastaliq calligraphy with full ligature support.",
    sample: "شروع اللّٰہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے",
    fontFamily: "var(--font-noto-nastaliq-urdu), 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif",
    lineHeight: "2.6",
  },
  {
    id: "gulzar",
    name: "Gulzar",
    familyLabel: "Artistic Nastaliq",
    category: "Nastaliq",
    description: "Graceful, expressive Nastaliq calligraphy with distinct styling.",
    sample: "شروع اللّٰہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے",
    fontFamily: "var(--font-gulzar), 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif",
    lineHeight: "2.6",
  },
  {
    id: "noto-sans-arabic",
    name: "Digital Naskh",
    familyLabel: "Modern Naskh / Sans",
    category: "Modern",
    description: "Horizontal baseline; ultra-clear and effortless to read.",
    sample: "شروع اللّٰہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے",
    fontFamily: "var(--font-noto-sans-arabic), 'Noto Sans Arabic', system-ui, sans-serif",
    lineHeight: "2.2",
  },
  {
    id: "amiri",
    name: "Amiri Classical",
    familyLabel: "Quranic Naskh",
    category: "Naskh",
    description: "Classical Islamic Naskh script used in historical printings.",
    sample: "شروع اللّٰہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے",
    fontFamily: "'Amiri', serif",
    lineHeight: "2.2",
  },
  {
    id: "indopak",
    name: "Indo-Pak Nastaleeq",
    familyLabel: "Subcontinental",
    category: "Nastaliq",
    description: "Traditional subcontinental Nastaleeq typeface.",
    sample: "شروع اللّٰہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے",
    fontFamily: "'IndoPakNastaleeq', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif",
    lineHeight: "2.6",
  },
];

export function getEnglishFont(id?: string): TranslationFontOption {
  return ENGLISH_FONTS.find((f) => f.id === id) || ENGLISH_FONTS[0];
}

export function getUrduFont(id?: string): TranslationFontOption {
  return URDU_FONTS.find((f) => f.id === id) || URDU_FONTS[0];
}

export function getTranslationFontStyle(
  isUrdu: boolean,
  isEnglish: boolean,
  urduFontId?: string,
  englishFontId?: string
): { fontFamily?: string; lineHeight?: string } {
  if (isUrdu) {
    const font = getUrduFont(urduFontId);
    return {
      fontFamily: font.fontFamily,
      lineHeight: font.lineHeight,
    };
  }

  if (isEnglish) {
    const font = getEnglishFont(englishFontId);
    return {
      fontFamily: font.fontFamily,
      lineHeight: font.lineHeight,
    };
  }

  return {};
}
