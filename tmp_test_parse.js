const { fragmentArabicText } = require('./lib/utils.js');

const textToTranslate = `قوله تعالى: {منه لحماً}: يجوز في «منه» تعلُّقه ب
«لتأكلوا» ، وأن يتعلَّق بمحذوف لأنه حال من النكرة بعده. و
«مِنْ» لابتداء الغاية أو للتبعيض، ولا بُدَّ مِنْ حذفِ مضافٍ،
أي: مِنْ حيوانِهِ.و «طرياً» فَعِيل مِنْ طَرُوَ يَطْرُو طَرَاوةً كَسَرُوَ
يَسْرُو سَرَاوةً. وقال الفراء: «بل يقال: طَرِيَ يَطْرَى طَرَاوةً وطَرَاءً
مثل: شَقِيَ يَشْقَى شَقَاوةً وشَقَاءً» . والطراوة ضد اليبوسة،
أي: غضاً جديداً. ويُقَال: الثياب المُطَرَّاة. والإطراء: مَدْح
تُجَدِّد ذِكْرَه، وأمَّا «طُرَّأ» بالهمز فمعناه طَلَع.قوله: «حِليةً»
الاستنجاء، والماخور: الموضع الذي يُباع فيه الخمر. و
«ترى» هنا بَصَريةٌ فقط.قوله: «ولتبتغوا» فيه ثلاثةُ أوجُهٍ:
عطفُه على «لتأكلوا» ، وما بينهما اعتراضٌ -كما تقدَّم- وهذا
هو الظاهر. ثانيها: أنه عطفٌ على علةٍ محذوفةٍ تقديره:
لتنتفعوا بذلك ولتبتغوا، ذكره ابن الأنباري، ثالثُها: أنه
متعلِّقٌ بفعلٍ محذوفٍ، أي: فَعَل ذلك لتبتغوا، وفيهما تكلُّفٌ
لا حاجةَ إليه.`;

const originalFragments = fragmentArabicText(textToTranslate);

// Mock the parseMarkdownTable logic directly
function parseMarkdownTable(text, originalFragments, isFinal = false) {
  const lines = text.split('\n');
  const rows = [];
  const seenRows = new Set();
  
  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed.startsWith('|') && !trimmed.includes('|')) continue;
    
    if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
    
    const columns = trimmed.split('|').map(p => p.trim());
    if (columns.length >= 1) {
      let transcreated = columns[0] || '';
      let sourceCol = columns[1] || '';
      
      const cleanTrans = transcreated.toLowerCase().replace(/[\*\s\.\?]/g, '');
      const cleanSource = sourceCol.toLowerCase().replace(/[\*\s\.\?]/g, '');

      if (
        cleanTrans === 'transcreatedtext' ||
        cleanSource === 'sourcefragments' ||
        cleanSource === 'sourcetext' ||
        cleanTrans === 'readytogenerate' ||
        transcreated.includes('---') ||
        sourceCol.includes('---')
      ) {
        continue;
      }
      
      if (!transcreated && !sourceCol) continue;
      
      const cleanedTransText = transcreated.replace(/^(?:\*\*)?(?:Row|Paragraph|Segment|Section)\s*\d+[:\-\.]?\s*(?:\*\*)?\s*/i, '').trim();
      
      let sourceText = sourceCol;
      let claimedIndices = [];
      
      if (originalFragments && originalFragments.length > 0) {
        // Parse comma-separated ranges e.g. "1-3, 5"
        const parts = sourceCol.split(',');
        for (const part of parts) {
          const rangeMatch = part.match(/(\d+)\s*-\s*(\d+)/);
          if (rangeMatch) {
            let start = parseInt(rangeMatch[1]);
            let end = parseInt(rangeMatch[2]);
            if (start > end) {
              const temp = start;
              start = end;
              end = temp;
            }
            for (let i = start; i <= end; i++) claimedIndices.push(i - 1);
          } else {
            const numMatch = part.match(/\d+/);
            if (numMatch) claimedIndices.push(parseInt(numMatch[0]) - 1);
          }
        }
        
        claimedIndices = [...new Set(claimedIndices)].sort((a, b) => a - b).filter(i => i >= 0 && i < originalFragments.length);
        
        if (claimedIndices.length > 0) {
          sourceText = claimedIndices.map(i => originalFragments[i].text + originalFragments[i].delimiter).join('').trim();
        } else {
          sourceText = '';
        }
      }
      
      const rowKey = \`\${cleanedTransText}|||\${claimedIndices.join(',')}\`;
      if (seenRows.has(rowKey)) continue;
      seenRows.add(rowKey);
      
      rows.push({
        transcreatedText: cleanedTransText,
        sourceText: sourceText,
        claimedIndices
      });
    }
  }
  
  if (isFinal && originalFragments && originalFragments.length > 0) {
    const allClaimed = new Set(rows.flatMap(r => r.claimedIndices));
    const missingIndices = [];
    for (let i = 0; i < originalFragments.length; i++) {
      if (!allClaimed.has(i)) missingIndices.push(i);
    }
    
    if (missingIndices.length > 0) {
      const missingText = missingIndices.map(i => originalFragments[i].text + originalFragments[i].delimiter).join('').trim();
      if (missingText) {
         rows.push({
           transcreatedText: "*(Translation missed by AI)*",
           sourceText: missingText,
           claimedIndices: missingIndices
         });
      }
    }
  }
  
  return rows.map(r => ({ transcreatedText: r.transcreatedText, sourceText: r.sourceText }));
}

const aiOutput = \`
| Transcreated Text | Source Fragments |
|---|---|
| First translation | 1-2 |
| Second translation | 3, 5-7 |
| Third translation | 11-13 |
\`;

const result = parseMarkdownTable(aiOutput, originalFragments, true);
console.log(JSON.stringify(result, null, 2));
