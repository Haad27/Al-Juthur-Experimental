import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTafsirDifficulty } from '@/lib/tafsirDifficulty';
import { unstable_cache } from 'next/cache';
import { getQuranComSurahTranslation } from '@/lib/translations';

// Helper to build a cached NextResponse
function cachedJson(data: unknown, maxAge: number, staleWhileRevalidate = Math.floor(maxAge / 4)) {
  const isEmpty = Array.isArray((data as any)?.data) && (data as any).data.length === 0;
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': isEmpty ? 'no-cache, no-store, must-revalidate' : `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    },
  });
}

// Map of Authors with 100% pre-downloaded local JSON files for lightning-fast 0ms file reads
const LOCAL_TAFSIR_MAP: Record<number, { folder: string; isUrdu?: boolean; isPashto?: boolean; authorName: string; name: string }> = {
  60: { folder: "en-tafsir-al-mukhtasar", authorName: "Center for Quranic Interpretation", name: "Abridged Explanation of the Quran" },
  61: { folder: "en-tafisr-ibn-kathir", authorName: "Hafiz Ibn Kathir", name: "Tafsir Ibn Kathir" },
  62: { folder: "en-tafsir-maarif-ul-quran", authorName: "Mufti Muhammad Shafi", name: "Ma'arif-ul-Quran" },
  63: { folder: "en-al-jalalayn", authorName: "Jalal al-Din al-Mahalli & Jalal al-Din al-Suyuti", name: "Tafsir al-Jalalayn" },
  64: { folder: "en-tazkirul-quran", authorName: "Maulana Wahiduddin Khan", name: "Tazkirul Quran" },
  265: { folder: "en-tafsir-as-saadi", authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di", name: "Tafsir as-Sa'di" },
  102: { folder: "ur-tafseer-ibn-e-kaseer", isUrdu: true, authorName: "Hafiz Ibn Kathir", name: "Tafsir Ibn Kathir" },
  103: { folder: "ur-tafsir-as-saadi-urdu", isUrdu: true, authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di", name: "Tafsir as-Sa'di" },
  104: { folder: "ur-tafsir-bayan-ul-quran", isUrdu: true, authorName: "Dr. Israr Ahmad", name: "Bayan-ul-Quran (بیان القرآن)" },
  105: { folder: "tafsir-fe-zalul-quran-syed-qatab", isUrdu: true, authorName: "Sayyid Qutb", name: "Fi Zilal al-Quran" },
  106: { folder: "ur-tazkirul-quran", isUrdu: true, authorName: "Maulana Wahiduddin Khan", name: "Tazkirul Quran" },
  107: { folder: "en-kashf-al-asrar-tafsir", authorName: "Rashid al-Din Maybudi", name: "Kashf al-Asrar" },
  108: { folder: "en-al-qushairi-tafsir", authorName: "Imam Abu al-Qasim al-Qushayri", name: "Lata'if al-Isharat" },
  109: { folder: "en-kashani-tafsir", authorName: "Abd al-Razzaq al-Kashani", name: "Tafsir al-Kashani" },
  110: { folder: "en-tafsir-al-tustari", authorName: "Sahl al-Tustari", name: "Tafsir al-Tustari" },
  111: { folder: "en-asbab-al-nuzul-by-al-wahidi", authorName: "Imam Ali ibn Ahmad al-Wahidi", name: "Asbab al-Nuzul" },
  112: { folder: "en-tafsir-ibn-abbas", authorName: "Attributed to Abdullah ibn Abbas", name: "Tanwir al-Miqbas" },
  113: { folder: "en-al-jalalayn", authorName: "Jalal al-Din al-Mahalli & Jalal al-Din al-Suyuti", name: "Tafsir al-Jalalayn" },
  114: { folder: "ps-pashto-mokhtasar", isPashto: true, authorName: "Center for Quranic Interpretation", name: "Al-Mukhtasar (Pashto)" },
  125: { folder: "ar-tafseer-tanwir-al-miqbas", authorName: "Attributed to Abdullah ibn Abbas", name: "Tanwir al-Miqbas" },
  128: { folder: "en-al-qushairi-tafsir", authorName: "Imam Abu al-Qasim al-Qushayri", name: "Lata'if al-Isharat" },
  129: { folder: "en-asbab-al-nuzul-by-al-wahidi", authorName: "Imam Ali ibn Ahmad al-Wahidi", name: "Asbab al-Nuzul" },
  131: { folder: "en-tafsir-ibn-abbas", authorName: "Attributed to Abdullah ibn Abbas", name: "Tanwir al-Miqbas" },
  140: { folder: "en-tafsir-fe-zalul-quran-syed-qatab", authorName: "Sayyid Qutb", name: "Fi Zilal al-Quran" },
  158: { folder: "ur-tafsir-bayan-ul-quran", isUrdu: true, authorName: "Dr. Israr Ahmad", name: "Bayan-ul-Quran (بیان القرآن)" },
  100158: { folder: "ur-tafsir-bayan-ul-quran", isUrdu: true, authorName: "Dr. Israr Ahmad", name: "Bayan-ul-Quran (بیان القرآن)" },
  // Quranpedia Classical & Contemporary Tafsirs
  201: { folder: "ar-tafsir-al-manar", authorName: "Muhammad Rashid Rida", name: "Tafsir al-Manar (تفسير المنار)" },
  202: { folder: "ar-tafsir-al-shaarawi", authorName: "Shaykh Muhammad Metwalli al-Sha'rawi", name: "Tafsir al-Sha'rawi (تفسير الشعراوي)" },
  203: { folder: "ar-al-tafsir-al-munir", authorName: "Dr. Wahbah al-Zuhayli", name: "Al-Tafsir al-Munir (التفسير المنير)" },
  204: { folder: "ar-al-tafsir-al-wasit-zuhayli", authorName: "Dr. Wahbah al-Zuhayli", name: "Al-Tafsir al-Wasit (الوسيط للزحيلي)" },
  205: { folder: "ar-safwat-al-tafasir", authorName: "Shaykh Muhammad Ali al-Sabuni", name: "Safwat al-Tafasir (صفوة التفاسير)" },
  206: { folder: "ar-mukhtasar-ibn-kathir-sabuni", authorName: "Shaykh Muhammad Ali al-Sabuni", name: "Mukhtasar Ibn Kathir (مختصر تفسير ابن كثير)" },
  207: { folder: "ar-tafsir-al-maraghi", authorName: "Ahmad Mustafa al-Maraghi", name: "Tafsir al-Maraghi (تفسير المراغي)" },
  208: { folder: "ar-al-tafsir-al-hadith", authorName: "Muhammad Izzat Darwaza", name: "Al-Tafsir al-Hadith (التفسير الحديث)" },
  209: { folder: "ar-ruh-al-bayan", authorName: "Ismail Haqqi al-Burusawi", name: "Ruh al-Bayan (روح البيان)" },
  210: { folder: "ar-al-kashf-wal-bayan-thalabi", authorName: "Abu Ishaq al-Tha'labi", name: "Al-Kashf wal-Bayan (تفسير الثعلبي)" },
  211: { folder: "ar-lubab-al-tawil-khazin", authorName: "Ali ibn Muhammad al-Khazin", name: "Lubab al-Ta'wil (تفسير الخازن)" },
  212: { folder: "ar-ahkam-al-quran-jassas", authorName: "Abu Bakr al-Jassas", name: "Ahkam al-Quran (أحكام القرآن للجصاص)" },
  213: { folder: "ar-ahkam-al-quran-ibn-al-arabi", authorName: "Abu Bakr ibn al-Arabi al-Maliki", name: "Ahkam al-Quran (أحكام القرآن لابن العربي)" },
  214: { folder: "ar-ahkam-al-quran-harrasi", authorName: "Imam Ilkiya al-Harrasi", name: "Ahkam al-Quran (أحكام القرآن للهراسي)" },
  215: { folder: "ar-tawilat-ahl-al-sunnah-maturidi", authorName: "Abu Mansur al-Maturidi", name: "Ta'wilat Ahl al-Sunnah (تفسير الماتريدي)" },
  216: { folder: "ar-al-bahr-al-madid-ibn-ajiba", authorName: "Ahmad ibn Ajiba", name: "Al-Bahr al-Madid (البحر المديد لابن عجيبة)" },
  217: { folder: "ar-tafsir-muqatil-ibn-sulayman", authorName: "Muqatil ibn Sulayman", name: "Tafsir Muqatil ibn Sulayman (تفسير مقاتل بن سليمان)" },
  218: { folder: "ar-tafsir-mujahid", authorName: "Imam Mujahid ibn Jabr", name: "Tafsir Mujahid (تفسير مجاهد بن جبر)" },
  219: { folder: "ar-tafsir-imam-malik", authorName: "Imam Malik ibn Anas", name: "Tafsir al-Imam Malik (تفسير الإمام مالك)" },
  220: { folder: "ar-tafsir-imam-al-shafii", authorName: "Imam Muhammad ibn Idris al-Shafi'i", name: "Tafsir al-Imam al-Shafi'i (تفسير الإمام الشافعي)" },
  221: { folder: "ar-tafsir-al-nasai", authorName: "Imam Ahmad ibn Shu'ayb al-Nasa'i", name: "Tafsir al-Nasa'i (تفسير النسائي)" },
  222: { folder: "ar-al-hidayah-makki", authorName: "Imam Makki ibn Abi Talib", name: "Al-Hidayah ila Bulugh al-Nihayah (الهداية لمكي)" },
  223: { folder: "ar-hashiyat-al-sawi", authorName: "Ahmad ibn Muhammad al-Sawi", name: "Hashiyat al-Sawi (حاشية الصاوي على الجلالين)" },
  224: { folder: "ar-tafsir-sufyan-al-thawri", authorName: "Imam Sufyan al-Thawri", name: "Tafsir Sufyan al-Thawri (تفسير سفيان الثوري)" },
  225: { folder: "ar-gharaib-al-quran-naysaburi", authorName: "Nizam al-Din al-Naysaburi", name: "Ghara'ib al-Quran (غرائب القرآن للنيسابوري)" },
  // Additional Authentic Ahl al-Sunnah Tafsirs (IDs 226-264)
  226: { folder: "ar-tafsir-yahya-ibn-sallam", authorName: "Yahya ibn Sallam al-Taymi", name: "Tafsir Yahya ibn Sallam (تفسير يحيى بن سلام)" },
  227: { folder: "ar-tafsir-abd-al-razzaq-al-sanani", authorName: "Imam Abd al-Razzaq al-San'ani", name: "Tafsir Abd al-Razzaq (تفسير عبد الرزاق الصنعاني)" },
  228: { folder: "ar-tafsir-ibn-khuwayz-mandad", authorName: "Abu Bakr Muhammad ibn Khuwayz Mandad al-Maliki", name: "Tafsir Ibn Khuwayz Mandad (تفسير ابن خويز منداد)" },
  229: { folder: "ar-majaz-al-quran-abu-ubaida", authorName: "Abu Ubaida Ma'mar ibn al-Muthanna", name: "Majaz al-Quran (مجاز القرآن لأبي عبيدة)" },
  230: { folder: "ar-maani-al-quran-farra", authorName: "Abu Zakariya Yahya ibn Ziyad al-Farra'", name: "Ma'ani al-Quran (معاني القرآن للفراء)" },
  231: { folder: "ar-maani-al-quran-akhfash", authorName: "Abu al-Hasan al-Akhfash al-Awsat", name: "Ma'ani al-Quran (معاني القرآن للأخفش)" },
  232: { folder: "ar-gharib-al-quran-ibn-qutaybah", authorName: "Abu Muhammad Abdullah ibn Muslim ibn Qutaybah al-Dinawari", name: "Gharib al-Quran (غريب القرآن لابن قتيبة)" },
  233: { folder: "ar-gharib-al-quran-zayd-ibn-ali", authorName: "Imam Zayd ibn Ali ibn al-Husayn", name: "Gharib al-Quran (غريب القرآن لزيد بن علي)" },
  234: { folder: "ar-nuzhat-al-qulub-sijistani", authorName: "Abu Bakr Muhammad ibn Aziz al-Sijistani", name: "Nuzhat al-Qulub fi Gharib al-Quran (نزهة القلوب للسجستاني)" },
  235: { folder: "ar-tafsir-al-izz-ibn-abd-al-salam", authorName: "Sultan al-Ulama Izz al-Din Abd al-Aziz ibn Abd al-Salam", name: "Tafsir al-Izz ibn Abd al-Salam (تفسير العز بن عبد السلام)" },
  236: { folder: "ar-maani-al-quran-wa-irabuh-zajjaj", authorName: "Abu Ishaq Ibrahim ibn al-Sari al-Zajjaj", name: "Ma'ani al-Quran wa I'rabuh (معاني القرآن وإعرابه للزجاج)" },
  237: { folder: "ar-tafsir-al-raghib-al-isfahani", authorName: "Abu al-Qasim al-Husayn ibn Muhammad al-Raghib al-Isfahani", name: "Tafsir al-Raghib al-Isfahani (تفسير الراغب الأصفهاني)" },
  238: { folder: "ar-al-nahr-al-madd-abu-hayyan", authorName: "Abu Hayyan al-Gharnati al-Andalusi", name: "Al-Nahr al-Madd min al-Bahr al-Muhit (النهر الماد لأبي حيان)" },
  239: { folder: "ar-tadhkirat-al-arib-ibn-al-jawzi", authorName: "Jamal al-Din Abu al-Faraj Ibn al-Jawzi", name: "Tadhkirat al-Arib fi Tafsir al-Gharib (تذكرة الأريب لابن الجوزي)" },
  240: { folder: "ar-ijaz-al-bayan-naysaburi", authorName: "Mahmud ibn Abi al-Hasan al-Naysaburi al-Ghaznawi", name: "I'jaz al-Bayan an Ma'ani al-Quran (إيجاز البيان للنيسابوري)" },
  241: { folder: "ar-al-sirat-al-mustaqim-khidr", authorName: "Nur al-Din Ahmad ibn Muhammad ibn Khidr", name: "Al-Sirat al-Mustaqim fi Tibyan al-Quran (الصراط المستقيم للرازي)" },
  242: { folder: "ar-ara-ibn-hazm-fi-al-tafsir", authorName: "Abu Muhammad Ali ibn Ahmad ibn Hazm al-Andalusi", name: "Ara' Ibn Hazm fi al-Tafsir (آراء ابن حزم في التفسير)" },
  243: { folder: "ar-juhud-ibn-abd-al-barr", authorName: "Abu Umar Yusuf ibn Abd Allah Ibn Abd al-Barr al-Qurtubi", name: "Juhud Ibn Abd al-Barr fi al-Tafsir (جهود ابن عبد البر في التفسير)" },
  244: { folder: "ar-juhud-al-imam-al-ghazali", authorName: "Hujjat al-Islam Abu Hamid Muhammad al-Ghazali", name: "Juhud al-Imam al-Ghazali fi al-Tafsir (جهود الغزالي في التفسير)" },
  245: { folder: "ar-juhud-al-qarafi-fi-al-tafsir", authorName: "Abu al-Abbas Shihab al-Din Ahmad al-Qarafi al-Maliki", name: "Juhud al-Qarafi fi al-Tafsir (جهود القرافي في التفسير)" },
  246: { folder: "ar-tafsir-ibn-arafa-al-maliki", authorName: "Abu Abd Allah Muhammad ibn Muhammad Ibn Arafa al-Warghami", name: "Tafsir Ibn Arafa (تفسير ابن عرفة المالكي)" },
  247: { folder: "ar-al-taqyid-al-kabir-basili", authorName: "Abu al-Abbas Ahmad ibn Muhammad al-Basili al-Tunisi", name: "Al-Taqyid al-Kabir (التقييد الكبير للبسيلي)" },
  248: { folder: "ar-al-tibyan-fi-gharib-al-quran-ibn-al-haim", authorName: "Shihab al-Din Ahmad ibn Muhammad Ibn al-Ha'im", name: "Al-Tibyan fi Tafsir Gharib al-Quran (التبيان لابن الهائم)" },
  249: { folder: "ar-fath-al-rahman-zakariya-al-ansari", authorName: "Shaykh al-Islam Zakariya ibn Muhammad al-Ansari", name: "Fath al-Rahman bi-Kashf ma Yaltabis fi al-Quran (فتح الرحمن لشيخ الإسلام الأنصاري)" },
  250: { folder: "ar-ghayat-al-amani-al-kurani", authorName: "Shihab al-Din Ahmad ibn Isma'il al-Kurani", name: "Ghayat al-Amani fi Tafsir al-Kalam al-Rabbani (غاية الأماني للكوراني)" },
  251: { folder: "ar-hadaiq-al-ruh-wa-al-rayhan-harari", authorName: "Allamah Muhammad al-Amin al-Harari al-Shafi'i", name: "Hadaiq al-Ruh wa al-Rayhan (حدائق الروح والريحان للهرري)" },
  252: { folder: "ar-majalis-al-tadhkir-ibn-badis", authorName: "Shaykh Abd al-Hamid Ibn Badis al-Sanhaji", name: "Majalis al-Tadhkir min Kalam al-Hakim al-Khabir (مجالس التذكير لابن باديس)" },
  253: { folder: "ar-al-adhb-al-namir-shinqiti", authorName: "Shaykh Muhammad al-Amin al-Shinqiti", name: "Al-Adhb al-Namir min Majalis al-Shinqiti (العذب النمير للشنقيطي)" },
  254: { folder: "ar-safwat-al-bayan-hasanein-makhlouf", authorName: "Shaykh Hasanein Muhammad Makhlouf", name: "Safwat al-Bayan li-Ma'ani al-Quran (صفوة البيان لمخلوف)" },
  255: { folder: "ar-al-taysir-fi-ahadith-al-tafsir-nasiri", authorName: "Shaykh Muhammad al-Makki al-Nasiri", name: "Al-Taysir fi Ahadith al-Tafsir (التيسير في أحاديث التفسير للمكي الناصري)" },
  256: { folder: "ar-aysar-al-tafasir-humad", authorName: "As'ad Mahmud Humad", name: "Aysar al-Tafasir (أيسر التفاسير لأسعد حومد)" },
  257: { folder: "ar-al-mushaf-al-mufassar-farid-wajdi", authorName: "Muhammad Farid Wajdi", name: "Al-Mushaf al-Mufassar (المصحف المفسر لفريد وجدي)" },
  258: { folder: "ar-awdah-al-tafasir-khatib", authorName: "Muhammad Muhammad Abd al-Latif (Ibn al-Khatib)", name: "Awdah al-Tafasir (أوضح التفاسير لمحمد فريد الخطيب)" },
  259: { folder: "ar-al-tafsir-al-qurani-lil-quran-khatib", authorName: "Abd al-Karim Yunus al-Khatib", name: "Al-Tafsir al-Qur'ani lil-Qur'an (التفسير القرآني للقرآن)" },
  260: { folder: "ar-bayan-al-maani-al-ani", authorName: "Abd al-Qadir ibn Mulla Huwaysh al-Ani", name: "Bayan al-Ma'ani (بيان المعاني لعبد القادر ملا حويش)" },
  261: { folder: "ar-al-tafsir-al-shamil-amir-abd-al-aziz", authorName: "Dr. Amir Abd al-Aziz", name: "Al-Tafsir al-Shamil (التفسير الشامل لأمير عبد العزيز)" },
  262: { folder: "ar-al-mawsooah-al-quraniyyah-abyari", authorName: "Ibrahim ibn Isma'il al-Abyari", name: "Al-Mawsoo'ah al-Qur'aniyyah (الموسوعة القرآنية للأبياري)" },
  263: { folder: "ar-gharib-al-quran-kamila-kuwari", authorName: "Dr. Kamila bint Muhammad al-Kuwari", name: "Tafsir Gharib al-Quran (تفسير غريب القرآن لكاملة الكواري)" },
  264: { folder: "ar-al-tafsir-al-bayani-al-qaddumi", authorName: "Dr. Sami Wadi' Abd al-Fattah al-Qaddumi", name: "Al-Tafsir al-Bayani (التفسير البياني لقدومي)" },
};

// 1. Cached library loader (languages + authors with tags & difficulty)
const getTafsirLibrary = unstable_cache(
  async () => {
    const [langs, rawAuthors] = await Promise.all([
      prisma.language.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.author.findMany({
        include: { tags: true },
      }),
    ]);

    // Exclude redundant duplicate IDs where canonical/higher-quality editions exist
    const EXCLUDED_AUTHOR_IDS = new Set([
      138, // duplicate of 100097 (Tafheem-ul-Quran with full footnotes)
      139, // duplicate of 100151 (Aasan Tarjuma Quran with full footnotes)
      113, // duplicate of 63 (Tafsir al-Jalalayn En)
      108, // duplicate of 128 (Lata'if al-Isharat En)
      111, // duplicate of 129 (Asbab al-Nuzul En)
      112, // duplicate of 131 (Tanwir al-Miqbas En)
      98,  // duplicate of 95 (Tafsir as-Sa'di Ru)
    ]);

    const authors = rawAuthors
      .filter(a => !EXCLUDED_AUTHOR_IDS.has(a.id))
      .map(a => {
        if (a.id === 104) {
          return {
            ...a,
            name: "Bayan-ul-Quran (بیان القرآن)",
            authorName: "Dr. Israr Ahmad",
          };
        }
        if (a.id === 105) {
          return {
            ...a,
            name: "Fi Zilal al-Qur'an (فی ظلال القرآن)",
            authorName: "Sayyid Qutb",
          };
        }
        if (a.id === 106) {
          return {
            ...a,
            name: "Tazkirul Quran (تذکیر القرآن)",
            authorName: "Maulana Wahiduddin Khan",
          };
        }
        return a;
      });

    // Virtual Authors & Dedicated Local Tafsirs
    const virtualAuthors: any[] = [
      // English (languageId: 3)
      { id: 265, name: "Tafsir as-Sa'di (تيسير الكريم الرحمن)", authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100095, name: "Tafheem-ul-Quran (Commentary)", authorName: "Sayyid Abul Ala Maududi", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100084, name: "The Noble Quran (with Explanatory Notes)", authorName: "Mufti Taqi Usmani", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100022, name: "Quran Translation & Commentary", authorName: "Abdullah Yusuf Ali", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100203, name: "The Noble Quran (Interpretation & Notes)", authorName: "Muhammad Taqi-ud-Din al-Hilali & Muhammad Muhsin Khan", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100149, name: "Bridges’ Translation (Linguistic & Qira'at Notes)", authorName: "Fadel Soliman", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100085, name: "The Quran (Oxford World's Classics)", authorName: "M.A.S. Abdel Haleem", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      
      // Urdu (languageId: 10)
      { id: 100097, name: "Tafheem-ul-Quran (تفہیم القرآن)", authorName: "Syed Abul A'la Maududi", languageId: 10, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100831, name: "Tafheem-ul-Quran (Roman Urdu)", authorName: "Sayyid Abul Ala Maududi", languageId: 10, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100151, name: "Aasan Tarjuma Quran (آسان ترجمہ قرآن مع تفسیری حواشی)", authorName: "Mufti Muhammad Taqi Usmani", languageId: 10, era: "Modern & Contemporary (19th-21st CE)", tags: [] },

      // Pashto (languageId: 11)
      { id: 100118, name: "Pashto Translation & Commentary (د قرآن پښتو تفسیر)", authorName: "Zakaria Abulsalam", languageId: 11, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
    ];
    
    const virtualTag = { id: 999, name: "Translation with Explanation", color: "emerald" };
    virtualAuthors.forEach(va => {
      if (va.id >= 100000) {
        va.tags = [virtualTag];
      }
    });
    
    authors.forEach(a => {
      if ([138, 139, 105, 158].includes(a.id)) {
        if (!a.tags.find((t: any) => t.id === 999)) {
          a.tags.push(virtualTag as any);
        }
      }
    });

    const existingIds = new Set<number>();
    const authorsByLang: Record<number, any[]> = {};
    for (const a of [...authors, ...virtualAuthors]) {
      if (existingIds.has(a.id)) continue;
      existingIds.add(a.id);
      if (!authorsByLang[a.languageId]) authorsByLang[a.languageId] = [];
      authorsByLang[a.languageId].push({
        ...a,
        difficulty: getTafsirDifficulty(a.name, a.authorName)
      });
    }

    return langs.map(l => ({
      ...l,
      authors: authorsByLang[l.id] || []
    }));
  },
  ['tafsir-library-v16'],
  { revalidate: 2592000 } // 30 days
);

// Cached Surah Ayahs (Quran text never changes; 30-day memory cache)
const getAyahsForSurah = unstable_cache(
  async (surahId: number) => {
    try {
      return await prisma.ayah.findMany({
        where: { surahId },
        orderBy: { numberInSurah: 'asc' },
        select: { id: true, surahId: true, numberInSurah: true, text: true }
      });
    } catch (e) {
      console.warn(`[Tafsir] getAyahsForSurah failed for surah ${surahId}:`, e);
      return [];
    }
  },
  ['tafsir-surah-ayahs-v2'],
  { revalidate: 2592000 } // 30 days
);

// 2. Ultra-fast local file tafsir loader (Reads directly from disk in < 1ms)
const getLocalDownloadedTafsir = unstable_cache(
  async (folder: string, isUrdu: boolean, isPashto: boolean, authorId: number, surahId: number, authorName: string, name: string) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const parts1 = ['data' + 'base', 'downloaded' + '_tafsirs', folder, `${surahId}.json`];
      const parts2 = ['resources', 'standalone', 'data' + 'base', 'downloaded' + '_tafsirs', folder, `${surahId}.json`];
      const parts3 = ['.next', 'standalone', 'data' + 'base', 'downloaded' + '_tafsirs', folder, `${surahId}.json`];
      const parts4 = ['..', 'data' + 'base', 'downloaded' + '_tafsirs', folder, `${surahId}.json`];

      const candidatePaths = [
        path.join(/*turbopackIgnore: true*/ process.cwd(), ...parts1),
        path.join(/*turbopackIgnore: true*/ process.cwd(), ...parts2),
        path.join(/*turbopackIgnore: true*/ process.cwd(), ...parts3),
        path.join(/*turbopackIgnore: true*/ process.cwd(), ...parts4),
      ];
      const tafsirFile = candidatePaths.find(p => fs.existsSync(p));
      if (!tafsirFile) return null;

      const raw = fs.readFileSync(tafsirFile, 'utf8');
      const parsed = JSON.parse(raw);
      const rawAyahs = Array.isArray(parsed) ? parsed : (parsed.ayahs || []);
      
      let ayahs: any[] = [];
      try {
        ayahs = await getAyahsForSurah(surahId);
      } catch (err) {
        console.warn(`[Tafsir] Could not fetch arabic ayahs for surah ${surahId}:`, err);
      }
      const ayahByNumber = new Map(ayahs.map((a: any) => [a.numberInSurah, a]));

      return rawAyahs.map((a: any, idx: number) => {
        const vNum = a.ayah || a.numberInSurah || (idx + 1);
        const arabicAyah = ayahByNumber.get(vNum);
        
        let textFormatted = a.text || "";
        if (isUrdu) {
          textFormatted = `<div class='text-zinc-100 leading-[2.8] text-right font-urdu' style="font-family: 'Noto Nastaliq Urdu', 'Gulzar', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', 'Noto Sans Arabic', serif; line-height: 2.8; font-size: 1.18rem; color: #f4f4f5;" dir="rtl">${a.text}</div>`;
        } else if (isPashto) {
          textFormatted = `<div class='text-zinc-100 leading-[2.4] text-right font-arabic' style="font-family: var(--font-amiri, serif); line-height: 2.4; font-size: 1.2rem; color: #f4f4f5;" dir="rtl">${a.text}</div>`;
        }

        return {
          id: authorId * 1000 + vNum,
          authorId: authorId,
          surahId: surahId,
          ayahId: vNum,
          text: textFormatted,
          ayah: {
            id: arabicAyah?.id || vNum,
            surahId: surahId,
            numberInSurah: vNum,
            text: arabicAyah?.text || "Arabic Text",
          },
          author: { name: name, authorName: authorName }
        };
      });
    } catch (e) {
      console.error(`Error loading local tafsir ${folder} for surah ${surahId}:`, e);
      return null;
    }
  },
  ['local-downloaded-tafsir-v14'],
  { revalidate: 2592000 }
);

const AUTHOR_DB_FALLBACK_MAP: Record<number, number[]> = {
  131: [131, 112],
  112: [112, 131],
  128: [128, 108],
  108: [108, 128],
  129: [129, 111],
  111: [111, 129],
  63: [63, 113],
  113: [113, 63],
  95: [95, 98],
  98: [98, 95],
};

// 3. Cached DB Surah Tafsir Loader (Fallback for authors not pre-downloaded)
const getSurahDbTafsir = unstable_cache(
  async (authorId: number, surahId: number) => {
    try {
      const targetAuthorIds = AUTHOR_DB_FALLBACK_MAP[authorId] || [authorId];
      const [ayahs, author, rawTafsirs] = await Promise.all([
        getAyahsForSurah(surahId).catch(() => []),
        prisma.author.findUnique({
          where: { id: authorId },
          select: { id: true, name: true, authorName: true, languageId: true, era: true }
        }).catch(() => null),
        prisma.tafsirEntry.findMany({
          where: {
            authorId: { in: targetAuthorIds },
            surahId
          },
          select: { id: true, authorId: true, surahId: true, ayahId: true, text: true }
        }).catch(() => [])
      ]);

      const ayahById = new Map((ayahs || []).map((a: any) => [a.id, a]));
      const ayahByNumber = new Map((ayahs || []).map((a: any) => [a.numberInSurah, a]));
      const tafsirs = (rawTafsirs || []).map((t: any) => {
        const arabicAyah = ayahById.get(t.ayahId) || ayahByNumber.get(t.ayahId) || {
          id: t.ayahId,
          surahId: surahId,
          numberInSurah: t.ayahId,
          text: "Arabic Text",
        };
        return {
          ...t,
          authorId: authorId, // Normalized to requested authorId
          ayah: arabicAyah,
          author: author
        };
      });

      tafsirs.sort((a: any, b: any) => (a.ayah?.numberInSurah || 0) - (b.ayah?.numberInSurah || 0));
      return tafsirs;
    } catch (e) {
      console.error(`Error loading DB tafsir author ${authorId} for surah ${surahId}:`, e);
      return [];
    }
  },
  ['surah-db-tafsir-v15'],
  { revalidate: 2592000 } // 30 days
);

// Helper to prefetch all footnotes for a Surah in parallel
async function fetchSurahFootnotes(fIds: string[]): Promise<Record<string, string>> {
  if (!fIds || fIds.length === 0) return {};
  const uniqueIds = Array.from(new Set(fIds));
  const results: Record<string, string> = {};

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const res = await fetch(`https://api.quran.com/api/v4/foot_notes/${id}`, {
          next: { revalidate: 2592000 }, // Cache 30 days
        });
        if (res.ok) {
          const data = await res.json();
          if (data.foot_note?.text) {
            results[id] = data.foot_note.text;
          }
        }
      } catch (e) {
        console.error(`Failed to prefetch footnote ${id}:`, e);
      }
    })
  );
  return results;
}

// 4. Cached Virtual Translation-Based Tafsir Loader (Pre-fetches and embeds all commentary footnotes)
const getVirtualTafsir = unstable_cache(
  async (authorId: number, surahId: number, transId: string) => {
    const [translations, ayahs] = await Promise.all([
      getQuranComSurahTranslation(surahId, transId),
      getAyahsForSurah(surahId),
    ]);

    const footnoteRegex = /<[a-z0-9]+\b[^>]*(?:foot_note|footnote_id|footnote-id|footnote|data-foot_note|data-footnote)=["']?(\d+)["']?[^>]*>[\s\S]*?<\/[a-z0-9]+>/gi;

    // Collect all footnote IDs for the entire Surah to batch-fetch in 1 parallel wave
    const allFootnoteIds: string[] = [];
    translations.forEach((t: any) => {
      if (typeof t.text === "string") {
        let match;
        const localRegex = new RegExp(footnoteRegex.source, "gi");
        while ((match = localRegex.exec(t.text)) !== null) {
          allFootnoteIds.push(match[1]);
        }
      }
    });

    const footnoteTexts = await fetchSurahFootnotes(allFootnoteIds);

    return translations.map((t: any, index: number) => {
      let cleanText = t.text || "";
      const fIds: string[] = [];
      const verseFootnotes: Record<string, string> = {};

      if (typeof t.text === "string") {
        cleanText = t.text.replace(footnoteRegex, (_match: string, id: string) => {
          fIds.push(id);
          if (footnoteTexts[id]) {
            verseFootnotes[id] = footnoteTexts[id];
          }
          return ` <span class="text-accent font-bold">[${fIds.length}]</span> `;
        });
        cleanText = cleanText.replace(/<sup[^>]*>.*?<\/sup>/gi, "");
      }

      const verseNum = t.verse_number || t.numberInSurah || (index + 1);
      const arabicAyah = ayahs.find((a) => a.numberInSurah === verseNum);

      return {
        id: authorId * 1000 + verseNum,
        authorId: authorId,
        surahId: surahId,
        ayahId: verseNum,
        text: cleanText,
        footnoteIds: fIds,
        footnotes: verseFootnotes, // Pre-populated footnotes for frame-0 instant rendering!
        ayah: {
          id: arabicAyah?.id || verseNum,
          surahId: surahId,
          numberInSurah: verseNum,
          text: arabicAyah?.text || "Arabic Text",
        },
        author: { name: "Virtual Tafsir" },
      };
    });
  },
  ['virtual-tafsir-v6'],
  { revalidate: 2592000 } // 30 days
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get('language');
  const surahId = searchParams.get('surahId');
  const ayahNum = searchParams.get('ayahId');
  const authorId = searchParams.get('authorId');

  try {
    // 1. Basic query to fetch all languages & authors
    if (!language && !surahId && !ayahNum && !authorId) {
      try {
        const data = await getTafsirLibrary();
        return cachedJson({ success: true, data }, 2592000, 86400);
      } catch (err) {
        console.error("Prisma fetch error in library load:", err);
        return NextResponse.json({ success: false, error: 'Failed to load library' }, { status: 500 });
      }
    }

    // 2. Query all Ayahs + Tafsir for a specific Author and Surah (Full Surah Reader Mode with optional pagination)
    if (authorId && surahId && !ayahNum) {
      const parsedAuthorId = parseInt(authorId);
      const parsedSurahId = parseInt(surahId);
      const startParam = searchParams.get('start');
      const countParam = searchParams.get('count');
      const startNum = startParam ? Math.max(1, parseInt(startParam)) : 1;
      const countNum = countParam ? Math.max(1, parseInt(countParam)) : 0;

      const DB_TO_TRANS_MAP: Record<number, string> = {
        138: "97",  // Maududi UR
        139: "151", // Taqi Usmani UR
      };

      let tafsirs: any[] = [];

      // FAST PATH 1: Pre-downloaded Local JSON Tafsirs (< 1ms read from disk)
      const localMeta = LOCAL_TAFSIR_MAP[parsedAuthorId];
      if (localMeta) {
        const localData = await getLocalDownloadedTafsir(
          localMeta.folder,
          !!localMeta.isUrdu,
          !!localMeta.isPashto,
          parsedAuthorId,
          parsedSurahId,
          localMeta.authorName,
          localMeta.name
        );
        if (localData && localData.length > 0) {
          tafsirs = localData;
        }
      }

      // FAST PATH 2: Virtual translation-based tafsirs
      if (tafsirs.length === 0 && (parsedAuthorId > 100000 || DB_TO_TRANS_MAP[parsedAuthorId])) {
        const transId = parsedAuthorId > 100000 ? (parsedAuthorId - 100000).toString() : DB_TO_TRANS_MAP[parsedAuthorId];
        tafsirs = await getVirtualTafsir(parsedAuthorId, parsedSurahId, transId);
      }

      // FALLBACK: Database query
      if (tafsirs.length === 0) {
        tafsirs = await getSurahDbTafsir(parsedAuthorId, parsedSurahId);
      }

      if (countNum > 0) {
        const sliced = tafsirs.slice(startNum - 1, startNum - 1 + countNum);
        return cachedJson({ success: true, data: sliced, totalCount: tafsirs.length }, 2592000, 86400);
      }

      return cachedJson({ success: true, data: tafsirs, totalCount: tafsirs.length }, 2592000, 86400);
    }

    // 3. Query a specific Ayah within a Surah for an Author
    if (surahId && ayahNum && authorId) {
      const parsedAuthorId = parseInt(authorId);
      const parsedSurahId = parseInt(surahId);
      const parsedAyahNum = parseInt(ayahNum);

      const DB_TO_TRANS_MAP: Record<number, string> = {
        138: "97",  // Maududi UR
        139: "151", // Taqi Usmani UR
      };

      // FAST PATH 1: Check local downloaded tafsir first
      const localMeta = LOCAL_TAFSIR_MAP[parsedAuthorId];
      if (localMeta) {
        const allSurahTafsirs = await getLocalDownloadedTafsir(
          localMeta.folder,
          !!localMeta.isUrdu,
          !!localMeta.isPashto,
          parsedAuthorId,
          parsedSurahId,
          localMeta.authorName,
          localMeta.name
        );
        if (allSurahTafsirs && allSurahTafsirs.length > 0) {
          const match = allSurahTafsirs.filter((t: any) => t.ayahId === parsedAyahNum || t.ayah?.numberInSurah === parsedAyahNum);
          return cachedJson({ success: true, data: match }, 2592000, 86400);
        }
      }

      // FAST PATH 2: Check virtual translation-based tafsir for single ayah
      if (parsedAuthorId > 100000 || DB_TO_TRANS_MAP[parsedAuthorId]) {
        const transId = parsedAuthorId > 100000 ? (parsedAuthorId - 100000).toString() : DB_TO_TRANS_MAP[parsedAuthorId];
        const allSurahTafsirs = await getVirtualTafsir(parsedAuthorId, parsedSurahId, transId);
        if (allSurahTafsirs && allSurahTafsirs.length > 0) {
          const match = allSurahTafsirs.filter((t: any) => t.ayahId === parsedAyahNum || t.ayah?.numberInSurah === parsedAyahNum);
          return cachedJson({ success: true, data: match }, 2592000, 86400);
        }
      }

      const targetAuthorIds = AUTHOR_DB_FALLBACK_MAP[parsedAuthorId] || [parsedAuthorId];
      const [rawTafsirs, author, ayah] = await Promise.all([
        prisma.tafsirEntry.findMany({
          where: {
            authorId: { in: targetAuthorIds },
            surahId: parsedSurahId,
            ayah: { numberInSurah: parsedAyahNum },
          },
          select: { id: true, authorId: true, surahId: true, ayahId: true, text: true },
        }),
        prisma.author.findUnique({
          where: { id: parsedAuthorId },
          select: { id: true, name: true, authorName: true },
        }),
        prisma.ayah.findFirst({
          where: { surahId: parsedSurahId, numberInSurah: parsedAyahNum },
          select: { id: true, surahId: true, numberInSurah: true, text: true },
        }),
      ]);

      const tafsirs = rawTafsirs.map((t) => ({
        ...t,
        authorId: parsedAuthorId,
        ayah: ayah,
        author: author,
      }));
      return cachedJson({ success: true, data: tafsirs }, 2592000, 86400);
    }

    return NextResponse.json({ success: false, message: 'Invalid parameters' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
