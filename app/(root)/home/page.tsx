"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { SURAHS_DATA } from "@/lib/surahsData";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { amiriquran } from "@/app/fonts";

// Simplified categorized Tafsir list based on the requested 3 columns
const TAFSIR_CATEGORIES = [
  {
    title: "أمهات (Foundational)",
    books: [
      { id: 164, name: "Tafsir al-Tabari", arabicName: "تفسير الطبري", author: "Imam al-Tabari", volumes: "24 Vols", theme: "bg-red-950/20 text-red-700 border-red-900/30" }, // 164 is Tabari AR from db usually, or 61 for EN
      { id: 61, name: "Tafsir Ibn Kathir", arabicName: "تفسير ابن كثير", author: "Hafiz Ibn Kathir", volumes: "10 Vols", theme: "bg-accent/20 text-accent border-accent/30" },
      { id: 212, name: "Ahkam al-Quran", arabicName: "أحكام القرآن", author: "Al-Jassas", volumes: "5 Vols", theme: "bg-blue-950/20 text-blue-700 border-blue-900/30" },
    ]
  },
  {
    title: "عامة (General)",
    books: [
      { id: 63, name: "Tafsir al-Jalalayn", arabicName: "تفسير الجلالين", author: "Al-Mahalli & Al-Suyuti", volumes: "1 Vol", theme: "bg-emerald-950/20 text-emerald-700 border-emerald-900/30" },
      { id: 205, name: "Safwat al-Tafasir", arabicName: "صفوة التفاسير", author: "Al-Sabuni", volumes: "3 Vols", theme: "bg-accent/20 text-accent border-accent/30" },
      { id: 209, name: "Ruh al-Bayan", arabicName: "روح البيان", author: "Al-Burusawi", volumes: "10 Vols", theme: "bg-indigo-950/20 text-indigo-700 border-indigo-900/30" },
    ]
  },
  {
    title: "معاصرة (Contemporary)",
    books: [
      { id: 103, name: "Tafsir as-Sa'di", arabicName: "تيسير الكريم الرحمن", author: "Abdur-Rahman as-Sa'di", volumes: "4 Vols", theme: "bg-amber-950/20 text-amber-700 border-amber-900/30" },
      { id: 60, name: "Al-Mukhtasar in Tafsir", arabicName: "المختصر في التفسير", author: "Quranic Council", volumes: "1 Vol", theme: "bg-emerald-950/20 text-emerald-700 border-emerald-900/30" },
      { id: 204, name: "Al-Tafsir al-Wasit", arabicName: "التفسير الوسيط", author: "Wahbah al-Zuhayli", volumes: "3 Vols", theme: "bg-slate-800/40 text-slate-300 border-slate-700" },
    ]
  }
];

export default function DiscoveryHomepage() {
  const router = useRouter();
  const [selectedSurah, setSelectedSurah] = useState("1");
  const [selectedAyah, setSelectedAyah] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");

  const surahMeta = SURAHS_DATA.find((s) => s.number === parseInt(selectedSurah));
  const numberOfAyahs = surahMeta?.numberOfAyahs || 7;

  // Reset Ayah to 1 when Surah changes
  useEffect(() => {
    setSelectedAyah("1");
  }, [selectedSurah]);

  const handleTafsirClick = (authorId: number) => {
    router.push(`/tafsir?author=${authorId}&surah=${selectedSurah}&ayah=${selectedAyah}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/quran?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center pt-16 sm:pt-24 px-4 sm:px-6 pb-20">
      
      {/* 1. Top Section: Greeting & Minimalist Citation */}
      <div className="w-full max-w-4xl text-center space-y-6 mb-12">
        <h1 className={`${amiriquran.className} text-4xl sm:text-5xl lg:text-6xl text-foreground font-bold tracking-tight mb-2`}>
          الباحث القرآني
        </h1>
        <p className="text-accent text-sm font-semibold uppercase tracking-widest">
          Salam! Let's start understanding the Qur'an
        </p>
        <p className="text-reading text-sm sm:text-base max-w-2xl mx-auto italic opacity-80">
          "A blessed Book revealed so that you might reflect upon its verses" — [38:29]
        </p>
      </div>

      {/* 2. Central Control Panel: Search & Selectors */}
      <div className="w-full max-w-4xl bg-card border border-border rounded-xl p-4 sm:p-6 mb-16 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search words, topics, or verses..."
              className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm sm:text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Surah Selector */}
            <Select value={selectedSurah} onValueChange={setSelectedSurah}>
              <SelectTrigger className="w-full bg-background border-border py-6 text-sm sm:text-base">
                <SelectValue placeholder="Select Surah" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {SURAHS_DATA.map((surah) => (
                  <SelectItem key={surah.number} value={surah.number.toString()}>
                    <span className="flex items-center gap-2 w-full justify-between pr-4">
                      <span className="flex items-center gap-2 text-left">
                        <span className="w-6 text-center text-accent text-xs font-mono">{surah.number}</span>
                        <span>{surah.englishName}</span>
                      </span>
                      <span className={`${amiriquran.className} text-arabic text-right`}>{surah.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ayah Selector */}
            <Select value={selectedAyah} onValueChange={setSelectedAyah}>
              <SelectTrigger className="w-full bg-background border-border py-6 text-sm sm:text-base">
                <SelectValue placeholder="Select Ayah" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {Array.from({ length: numberOfAyahs }, (_, i) => i + 1).map((ayah) => (
                  <SelectItem key={ayah} value={ayah.toString()}>
                    Ayah {ayah}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
      </div>

      {/* 3. Bottom Section: Categorized Tafsir Grid */}
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TAFSIR_CATEGORIES.map((category) => (
            <div key={category.title} className="flex flex-col items-center">
              <h3 className={`${amiriquran.className} text-xl sm:text-2xl text-foreground font-bold mb-6 border-b-2 border-accent pb-2 px-4`}>
                {category.title}
              </h3>
              
              <div className="flex flex-col gap-4 w-full">
                {category.books.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleTafsirClick(book.id)}
                    className="w-full text-center p-4 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-accent/5 transition-colors flex flex-col items-center justify-center gap-2 group shadow-sm"
                  >
                    <span className={`${amiriquran.className} text-lg sm:text-xl text-arabic group-hover:text-accent transition-colors`}>
                      {book.arabicName}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                      {book.author}
                    </span>
                    <span className="text-[10px] sm:text-xs text-reading opacity-70">
                      {book.volumes}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
