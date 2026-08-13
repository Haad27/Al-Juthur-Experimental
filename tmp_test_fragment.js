

const text = `قوله تعالى: {منه لحماً}: يجوز في «منه» تعلُّقه ب
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

function testFragmentArabicText(text) {
  const rawSplit = text.split(/([\n.؟!؛]+)/);
  const fragments = [];
  let currentText = '';
  
  for (let i = 0; i < rawSplit.length; i += 2) {
    const chunk = rawSplit[i];
    const delim = rawSplit[i + 1] || '';
    
    currentText += chunk;
    
    if (currentText.trim().length >= 30 || i + 2 >= rawSplit.length) {
      if (currentText.trim().length > 0 || delim.length > 0) {
        fragments.push({ text: currentText, delimiter: delim });
      }
      currentText = '';
    } else {
      currentText += delim;
    }
  }
  
  if (currentText.length > 0) {
    if (fragments.length > 0) {
      fragments[fragments.length - 1].delimiter += currentText;
    } else {
      fragments.push({ text: currentText, delimiter: '' });
    }
  }
  
  return fragments;
}

const fragments = testFragmentArabicText(text);
console.log(`Total fragments: ${fragments.length}`);
fragments.forEach((f, i) => {
  console.log(`\n--- Fragment ${i + 1} ---`);
  console.log(f.text + f.delimiter);
});
console.log("\nReconstruction matches original:", fragments.map(f => f.text + f.delimiter).join('') === text);
