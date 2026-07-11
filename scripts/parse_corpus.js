const https = require('https');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const url = 'https://raw.githubusercontent.com/cltk/arabic_morphology_quranic-corpus/master/quranic-corpus-morphology-0.4.txt';
const dbPath = path.join(__dirname, '..', 'database', 'lexicon', 'data', 'english_morphology.sqlite');

const POS_MAP = {
  N: 'Noun', PN: 'Proper Noun', PRON: 'Pronoun', DEM: 'Demonstrative Pronoun',
  REL: 'Relative Pronoun', ADJ: 'Adjective', V: 'Verb', P: 'Preposition',
  T: 'Time Adverb', LOC: 'Location Adverb', CONJ: 'Conjunction',
  SUB: 'Subordinating Conjunction', ACC: 'Accusative Particle',
  AMD: 'Amendment Particle', ANS: 'Answer Particle', AVR: 'Aversion Particle',
  CAUS: 'Particle of Cause', CERT: 'Particle of Certainty',
  CIRC: 'Circumstantial Particle', COM: 'Comitative Particle',
  COND: 'Conditional Particle', EQ: 'Equalization Particle',
  EXH: 'Exhortation Particle', EXL: 'Explanation Particle',
  EXP: 'Exceptive Particle', FUT: 'Future Particle', INC: 'Inceptive Particle',
  INT: 'Interrogative Particle', INTG: 'Interrogative Pronoun',
  NEG: 'Negative Particle', PREV: 'Preventive Particle', PRO: 'Prohibition Particle',
  REM: 'Resumption Particle', RES: 'Restriction Particle', RET: 'Retraction Particle',
  RSLT: 'Result Particle', SUP: 'Supplemental Particle', SUR: 'Surprise Particle',
  VOC: 'Vocative Particle', INL: 'Quranic Initials'
};

const FEAT_MAP = {
  '1': '1st Person', '2': '2nd Person', '3': '3rd Person',
  M: 'Masculine', F: 'Feminine', S: 'Singular', D: 'Dual', P: 'Plural',
  NOM: 'Nominative', ACC: 'Accusative', GEN: 'Genitive',
  PERF: 'Perfect', IMPF: 'Imperfect', IMPV: 'Imperative',
  IND: 'Indicative', SUBJ: 'Subjunctive', JUS: 'Jussive',
  PASS: 'Passive', ACT: 'Active',
  PCPL: 'Participle', VN: 'Verbal Noun',
  'MS': 'Masculine Singular', 'MD': 'Masculine Dual', 'MP': 'Masculine Plural',
  'FS': 'Feminine Singular', 'FD': 'Feminine Dual', 'FP': 'Feminine Plural',
  '1S': '1st Person Singular', '1P': '1st Person Plural',
  '2MS': '2nd Person Masculine Singular', '2MD': '2nd Person Masculine Dual', '2MP': '2nd Person Masculine Plural',
  '2FS': '2nd Person Feminine Singular', '2FD': '2nd Person Feminine Dual', '2FP': '2nd Person Feminine Plural',
  '3MS': '3rd Person Masculine Singular', '3MD': '3rd Person Masculine Dual', '3MP': '3rd Person Masculine Plural',
  '3FS': '3rd Person Feminine Singular', '3FD': '3rd Person Feminine Dual', '3FP': '3rd Person Feminine Plural'
};

function parseLine(line) {
  // Format: (1:1:1:1) bi P - prefixed preposition bi
  const match = line.match(/^\((\d+):(\d+):(\d+):(\d+)\)\s+([^\s]+)\s+([A-Z]+)\s+(.*)/);
  if (!match) return null;
  const [_, surah, ayah, word, segment, form, pos, features] = match;
  
  let posText = POS_MAP[pos] || pos;
  let featuresText = [];
  
  if (features && features !== '-') {
    const parts = features.split('|');
    for (const p of parts) {
      if (p.startsWith('ROOT:')) continue;
      if (p.startsWith('LEM:')) continue;
      
      let f = p;
      if (f.startsWith('POS:')) f = POS_MAP[f.substring(4)] || f.substring(4);
      else f = FEAT_MAP[p] || p;

      // Filter out raw prefixed/stem tokens for cleaner display
      if (f === 'STEM' || f === 'PREFIX' || f === 'SUFFIX') continue;
      
      if (f && !f.includes('+')) featuresText.push(f);
    }
  }

  return {
    surah: parseInt(surah),
    ayah: parseInt(ayah),
    word: parseInt(word),
    segment: parseInt(segment),
    form,
    pos: posText,
    features: featuresText.join(', ')
  };
}

console.log('Downloading Quranic Corpus...');
https.get(url, (res) => {
  if (res.statusCode !== 200) {
    if (res.statusCode === 301 || res.statusCode === 302) {
      console.log('Redirecting to: ' + res.headers.location);
      https.get(res.headers.location, processResponse);
    } else {
      console.error('Failed to download: ' + res.statusCode);
    }
  } else {
    processResponse(res);
  }
}).on('error', (err) => {
  console.error('Error:', err.message);
});

function processResponse(res) {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Parsing ' + data.length + ' bytes...');
    const db = new Database(dbPath);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS word_morphology (
        surah INTEGER,
        ayah INTEGER,
        word INTEGER,
        pos_tags TEXT,
        features TEXT,
        PRIMARY KEY (surah, ayah, word)
      );
    `);
    
    db.exec('DELETE FROM word_morphology'); // Clear previous
    
    const insert = db.prepare(`
      INSERT INTO word_morphology (surah, ayah, word, pos_tags, features)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    db.transaction(() => {
      const lines = data.split('\n');
      let currentWord = null;
      let segments = [];
      
      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        
        const parsed = parseLine(line);
        if (parsed) {
          const wordKey = `${parsed.surah}:${parsed.ayah}:${parsed.word}`;
          
          if (currentWord && currentWord !== wordKey) {
            saveWord(insert, segments);
            segments = [];
          }
          currentWord = wordKey;
          segments.push(parsed);
        }
      }
      if (segments.length > 0) saveWord(insert, segments);
    })();
    
    console.log('Done mapping to english_morphology.sqlite');
  });
}

function saveWord(insertStmt, segments) {
  if (segments.length === 0) return;
  const { surah, ayah, word } = segments[0];
  
  // Combine all segments for this word into a single readable string
  let combinedPos = [];
  let combinedFeat = [];
  
  for (const s of segments) {
    let str = s.pos;
    if (s.features) str += ' (' + s.features + ')';
    combinedPos.push(str);
  }
  
  insertStmt.run(
    surah, ayah, word,
    combinedPos.join(' + '),
    '' // features merged into pos_tags for simplicity
  );
}
