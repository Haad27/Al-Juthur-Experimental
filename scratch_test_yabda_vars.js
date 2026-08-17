const fs = require('fs');

// Let's test combinations for sifr on Alef:
// 1. \u0627\u06DF (Alef + Sifr)
// 2. \u0671\u06DF (Wasla + Sifr)
// 3. \u0627\u200C\u06DF (Alef + ZWNJ + Sifr)
// 4. \u0627\u200D\u06DF (Alef + ZWJ + Sifr)
// 5. \u06DF alone
// 6. Presentation forms or font glyph mappings if any

console.log('Testing Sifr representations:');
const yabdaVariations = [
  { label: 'Raw', val: 'يَبْدَؤُا۟' },
  { label: 'Alef Wasla', val: 'يَبْدَؤُٱ۟' },
  { label: 'With ZWJ', val: 'يَبْدَؤُا\u200D۟' },
  { label: 'With ZWNJ', val: 'يَبْدَؤُا\u200C۟' },
  { label: 'With High Sifr', val: 'يَبْدَؤُاْ' }, // \u0652 Sukun / small circle
  { label: 'With Sifr Mustateel', val: 'يَبْدَؤُا۠' }, // \u06E0
];

yabdaVariations.forEach(v => {
  console.log(`${v.label}: ${v.val} -> ${[...v.val].map(c => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ')}`);
});
