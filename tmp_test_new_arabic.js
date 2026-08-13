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

async function test() {
  console.log("Sending request...");
  const res = await fetch("http://localhost:3000/api/ai/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let fullOutput = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunkStr = decoder.decode(value, { stream: true });
    console.log("CHUNK:", chunkStr);
    fullOutput += chunkStr;
  }
  
  console.log("\n\nFINAL OUTPUT:\n", fullOutput);
}

test().catch(console.error);
