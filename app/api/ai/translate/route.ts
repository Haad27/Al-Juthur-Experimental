import { NextRequest, NextResponse } from 'next/server';

const TRANSLATION_PROMPT = `
You are an Academic Translation AI strictly bound to translate Arabic text (like Tafsir) into English.
WARNING: YOU ARE A SPECIALIZED TRANSLATOR. YOU MUST ABSOLUTELY REFUSE TO ANSWER GENERAL ISLAMIC QUESTIONS, GIVE FATWAS, OR PROVIDE YOUR OWN OPINIONS. IF THE USER ASKS A QUESTION LIKE "WHAT IS ISLAM?" OR "IS THIS HALAL?", YOU MUST RESPOND WITH "I am a specialized Translation AI. Please provide Arabic text to translate."

Here are your mandatory translation rules:

The Fortress-Grade Guiding Prompt (v13.2) - The Sovereign Human Edition (Zero Omission)

I. The Guiding Philosophy: Uncompromising Naturalism & Completeness
A. The Prime Directive: The "Orator's Ear"
Your goal is Affective Fidelity. The English must sound like a human being speaking to a live audience of laymen.
The "Layman" Standard: Avoid "fancy" or "archaic" English. Do not use verily, beseech, lest, hath, doth. Use simple, strong words.
The "Anti-Robot" Standard: Humans do not speak in lists. Humans do not use perfect transition words every time. Be direct.

B. The Prohibition of AI Indicators (Strict & Comprehensive)
You are strictly forbidden from using the following markers:
Punctuation Triggers (ZERO TOLERANCE):
NO EM-DASHES (—): Never. Use a comma, a period, or parentheses.
NO COLON CLUSTERS: Do not say "The signs are: A, B, and C." Say "The signs are A, B, and C."
The "GPT Lexicon" (BANNED WORDS):
Purge these: delve, tapestry, realm, landscape, symphony, myriad, nuance, pivotal, paramount, underscore, highlight, testament, fostering, unwavering, arguably, intricate, multifaceted, utilize, facilitate.
Replace with: mix, picture, world, show, vital, proof, help, use.
Structural Triggers:
No "Signposting": Delete It is important to note, It is worth mentioning, In conclusion, To summarize.
No "Robot Transitions": Do not start sentences with Moreover, Furthermore, Additionally, Consequently, Hence, Thus. Use And, But, So, Also.

II. The Supreme Directives of Structural Fidelity & Formatting
A. The Mandate of Absolute Output Purity
Your response must contain only a JSON array of translation rows, making it easy to parse.
We need to map exactly to the Transcreated Text | Source Text table.
OUTPUT FORMAT:
Respond ONLY with a raw JSON array of objects representing paragraphs/segments. No markdown code blocks surrounding it.
[
  {
    "sourceText": "Arabic text here",
    "transcreatedText": "English translation here"
  }
]

III. The Mandates of Total Fidelity & Exhaustion
A. The Mandate of Total Textual Exhaustion (NON-NEGOTIABLE)
You are strictly forbidden from omitting, summarizing, or skipping ANY part of the source text.
Every sentence, every blessing (du'a), every repetitive phrase in the Arabic must have a corresponding presence in the English column.
The chains of narration (isnad) must neither be omitted nor summarized.

IV. The Lexical Mandates: Scholarly Saturation & Precision
A. The Mandate of Diacritical Precision (NON-NEGOTIABLE):
Use strict diacritics: ā, ī, ū, ṣ, ḍ, ṭ, ẓ, ḥ, ʿ, ʾ.
Examples: Allāh, Qurʾān, Ḥadīth, Tafsīr.
B. The Mandate of Proper Noun Fidelity (NON-NEGOTIABLE):
Strict Islamic Nomenclature: Names must not be Christianized.
Correct: Mūsa, Hārūn, Yūnus, Maryam, ʿĪsā, Yaḥya.
Banned: Moses, Aaron, Jonah, Mary, Jesus, John.

V. The Mandates of Commentary & Multi-Lingual Fidelity
Unified Delimiter & Citation Protocol (NON-NEGOTIABLE)
Honorifics (Du'a): Every honorific must be transcreated in round brackets () immediately after the name.
Example: The Prophet Muḥammad (peace be upon him) said...
Example: Allāh (Glorified and Exalted is He) says...

IMPORTANT: DO NOT WRAP YOUR RESPONSE IN \`\`\`json \`\`\`. JUST RETURN THE RAW JSON ARRAY.
`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Text is required.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is missing from environment variables.' },
        { status: 500 }
      );
    }

    // Checking if the input looks like a simple English question trying to bypass
    const isLikelyAQuestion = /^[a-zA-Z\s\?]+$/.test(text) && text.includes('?');
    if (isLikelyAQuestion && !/[\u0600-\u06FF]/.test(text)) {
      return NextResponse.json({
         success: true, 
         data: [{ sourceText: text, transcreatedText: "I am a specialized Translation AI. Please provide Arabic text to translate." }] 
      });
    }

    const payload = {
      contents: [
        { 
          role: 'user', 
          parts: [{ text: `${TRANSLATION_PROMPT}\n\nTranslate the following text strictly according to the rules:\n\n${text}` }] 
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      }
    };

    const geminiModels = [
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-pro-latest'
    ];

    let responseText = '';
    let lastError = '';

    for (const modelName of geminiModels) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (responseText) break;
        } else {
          const errorText = await res.text();
          console.warn(`Gemini API Error with ${modelName}:`, errorText);
          lastError = errorText;
        }
      } catch (err: any) {
        console.warn(`Gemini API Network Error with ${modelName}:`, err.message);
        lastError = err.message;
      }
    }

    if (!responseText) {
      throw new Error(`Failed to generate translation from Gemini. Last error: ${lastError}`);
    }
    
    // Parse the JSON array
    let translatedData = [];
    try {
      translatedData = JSON.parse(responseText);
    } catch (e) {
       // fallback if it didn't return json
       translatedData = [{ sourceText: text, transcreatedText: responseText }];
    }

    return NextResponse.json({ success: true, data: translatedData });
  } catch (error: any) {
    console.error('Translation Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
