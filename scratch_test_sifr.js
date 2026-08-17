const fs = require('fs');

const testCases = [
  { name: "yabda raw", text: "يَبْدَؤُا۟" },
  { name: "yabda with ZWJ before sifr", text: "يَبْدَؤُا\u200D\u06DF" },
  { name: "yabda with Alif + Sifr combined", text: "يَبْدَؤُا۟" },
  { name: "sultan raw (4:153)", text: "سُلْطَٰنًۭا" },
  { name: "sultan raw (14:10)", text: "بِسُلْطٰنٍۢ" },
  { name: "sultan 17:80", text: "سُلْطَـٰنًا" },
  { name: "mathalan raw", text: "مَثَلًۭا" },
  { name: "mathalan with E2", text: "مَثَلًاۢ" },
  { name: "mathalan with clean iqlab", text: "مَثَلًۭا" }
];

const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'UthmanicHafs_V22';
  src: url('public/assets/fonts/UthmanicHafs_V22.woff2') format('woff2');
}
@font-face {
  font-family: 'UthmanicHafs1Ver18';
  src: url('public/assets/fonts/UthmanicHafs1Ver18.woff2') format('woff2');
}
@font-face {
  font-family: 'UthmanicHafs1Ver17';
  src: url('public/assets/fonts/UthmanicHafs1-Ver17.woff2') format('woff2');
}
@font-face {
  font-family: 'IndoPakNastaleeq';
  src: url('public/assets/fonts/indopak-nastaleeq.woff2') format('woff2');
}
body {
  background: #111827;
  color: #f9fafb;
  font-size: 36px;
  line-height: 2.2;
  padding: 40px;
}
.box {
  background: #1f2937;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.label {
  font-size: 14px;
  color: #9ca3af;
  font-family: sans-serif;
  direction: ltr;
}
.v22 { font-family: 'UthmanicHafs_V22', serif; }
.v18 { font-family: 'UthmanicHafs1Ver18', serif; }
.v17 { font-family: 'UthmanicHafs1Ver17', serif; }
</style>
</head>
<body>
  ${testCases.map(tc => `
    <div class="box">
      <div class="label">${tc.name}</div>
      <div class="v22">V22: ${tc.text}</div>
      <div class="v18">V18: ${tc.text}</div>
      <div class="v17">V17: ${tc.text}</div>
    </div>
  `).join('')}
</body>
</html>`;

fs.writeFileSync('scratch_sifr_test.html', html);
console.log('Generated scratch_sifr_test.html');
