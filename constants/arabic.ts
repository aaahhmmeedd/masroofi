export const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const QURAN_VERSES = [
  { text: "وَأَنفِقُوا فِي سَبِيلِ اللَّهِ وَلَا تُلْقُوا بِأَيْدِيكُمْ إِلَى التَّهْلُكَةِ", surah: "البقرة: ١٩٥" },
  { text: "وَلَا تُسْرِفُوا ۚ إِنَّهُ لَا يُحِبُّ الْمُسْرِفِينَ", surah: "الأنعام: ١٤١" },
  { text: "وَالَّذِينَ إِذَا أَنفَقُوا لَمْ يُسْرِفُوا وَلَمْ يَقْتُرُوا وَكَانَ بَيْنَ ذَٰلِكَ قَوَامًا", surah: "الفرقان: ٦٧" },
  { text: "وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ ۖ وَهُوَ خَيْرُ الرَّازِقِينَ", surah: "سبأ: ٣٩" },
  { text: "وَفِي أَمْوَالِهِمْ حَقٌّ لِّلسَّائِلِ وَالْمَحْرُومِ", surah: "الذاريات: ١٩" },
  { text: "إِن تُقْرِضُوا اللَّهَ قَرْضًا حَسَنًا يُضَاعِفْهُ لَكُمْ", surah: "التغابن: ١٧" },
  { text: "وَمَا تُنفِقُوا مِنْ خَيْرٍ فَلِأَنفُسِكُمْ", surah: "البقرة: ٢٧٢" },
  { text: "وَمَا آتَيْتُم مِّن رِّبًا لِّيَرْبُوَ فِي أَمْوَالِ النَّاسِ فَلَا يَرْبُو عِندَ اللَّهِ", surah: "الروم: ٣٩" },
  { text: "يَا أَيُّهَا الَّذِينَ آمَنُوا لَا تَأْكُلُوا أَمْوَالَكُم بَيْنَكُم بِالْبَاطِلِ", surah: "النساء: ٢٩" },
  { text: "وَلَا تَجْعَلْ يَدَكَ مَغْلُولَةً إِلَىٰ عُنُقِكَ وَلَا تَبْسُطْهَا كُلَّ الْبَسْطِ", surah: "الإسراء: ٢٩" },
  { text: "الَّذِي جَعَلَ لَكُمُ الْأَرْضَ ذَلُولًا فَامْشُوا فِي مَنَاكِبِهَا وَكُلُوا مِن رِّزْقِهِ", surah: "الملك: ١٥" },
  { text: "وَاللَّهُ يَرْزُقُ مَن يَشَاءُ بِغَيْرِ حِسَابٍ", surah: "البقرة: ٢١٢" },
  { text: "وَمَا مِن دَابَّةٍ فِي الْأَرْضِ إِلَّا عَلَى اللَّهِ رِزْقُهَا", surah: "هود: ٦" },
  { text: "إِنَّ اللَّهَ يَرْزُقُ مَن يَشَاءُ بِغَيْرِ حِسَابٍ", surah: "آل عمران: ٣٧" },
  { text: "فَأَمَّا مَنْ أَعْطَىٰ وَاتَّقَىٰ ۝ وَصَدَّقَ بِالْحُسْنَىٰ ۝ فَسَنُيَسِّرُهُ لِلْيُسْرَىٰ", surah: "الليل: ٥-٧" },
  { text: "سَيَجْعَلُ اللَّهُ بَعْدَ عُسْرٍ يُسْرًا", surah: "الطلاق: ٧" },
  { text: "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ ۖ وَمَا تُقَدِّمُوا لِأَنفُسِكُم مِّنْ خَيْرٍ تَجِدُوهُ عِندَ اللَّهِ", surah: "البقرة: ١١٠" },
  { text: "وَيُؤْثِرُونَ عَلَىٰ أَنفُسِهِمْ وَلَوْ كَانَ بِهِمْ خَصَاصَةٌ", surah: "الحشر: ٩" },
];

export function toArabicNumerals(num: number): string {
  return num.toString().replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

export function formatCurrency(amount: number, currency: string = "ج.م"): string {
  const abs = Math.abs(amount);
  const rounded = Math.round(abs);
  
  if (currency === "$") {
    return `$ ${rounded.toLocaleString("en-US")}`;
  }
  
  // Format with thousand separators
  const arabicNumStr = toArabicNumerals(rounded);
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  
  // Add commas every 3 digits from right to left
  const numStr = rounded.toString();
  let withCommas = "";
  for (let i = numStr.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) withCommas = "," + withCommas;
    withCommas = numStr[i] + withCommas;
  }
  
  // Convert to Arabic numerals
  const formatted = toArabicNumerals(parseInt(withCommas.replace(/,/g, "")));
  
  // Re-add commas in the Arabic version
  let finalFormatted = "";
  for (let i = formatted.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) finalFormatted = "," + finalFormatted;
    finalFormatted = formatted[i] + finalFormatted;
  }
  
  return `${finalFormatted} ${currency}`;
}

export function formatArabicCurrency(amount: number): string {
  return formatCurrency(amount, "ج.م");
}

export function getMonthYearLabel(month: number, year: number): string {
  return `${ARABIC_MONTHS[month - 1]} ${toArabicNumerals(year)}`;
}

export function getMonthShort(month: number): string {
  return ARABIC_MONTHS[month - 1].slice(0, 3);
}

export function getRandomVerse(): { text: string; surah: string } {
  return QURAN_VERSES[Math.floor(Math.random() * QURAN_VERSES.length)];
}
