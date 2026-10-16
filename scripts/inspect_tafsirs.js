const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'tafsirs_dump.json'), 'utf8'));

const lines = [`Analyzing ${data.length} Tafsirs...`];

data.forEach(a => {
  lines.push(`[${a.id}] [${a.lang}] "${a.name}" by "${a.authorName || ''}" (Era: ${a.era || 'N/A'}, Tags: ${a.tags.join(', ')})`);
});

fs.writeFileSync(path.join(__dirname, 'all_tafsirs_list.txt'), lines.join('\n'), 'utf8');
console.log('Written to all_tafsirs_list.txt');
