"use client";
// Other -/-Essential Imports ⭐
import React, { useEffect, useState } from "react";
// API ⭐
import { fetchAllSurahs } from "@/api/api";
// Next ⭐
import Link from "next/link";
// Components ⭐
import LogoIcon from "@/components/svg/icons/LogoIcon";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// Icons / Lucide React ⭐
import MenuIcon from "@/components/svg/icons/MenuIcon";
import { ArchiveIcon, Circle, Sparkle, Trash, X, XIcon, Search } from "lucide-react";
// Hooks ⭐
import useSurahNavigation from "@/hooks/useSurahNavigation";
// Fonts ⭐
import { amiri, amiriquran, inter } from "@/app/fonts";
import MobileSheet from "@/components/sidebar/MobileSheet";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SurahsList = () => {
  // organize later
  // -ROUTER-
  const router = useRouter();
  // USE STATES Data: 🔹
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [recent, setRecent] = useState<Surah>(); // ‼ ☹
  const [deletedAyah, setDeletedAyah] = useState<Ayah>();
  const [savedAyahs, setSavedAyahs] = useState<Ayah[]>(); // ‼ ☹
  // USE STATES States: 🔹
  // Active: 🟥
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "Last Read" | "Saved" | "Collections"
  >("Last Read");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [homeSearchQuery, setHomeSearchQuery] = useState("");
  // const [searchResults, setSearchResults] = useState([]);
  const [amount, setAmount] = useState(21);
  // Boolean 🔹
  // const [loading, setLoading] = useState(false);
  // Hooks 🔹
  const { getSurahNumber } = useSurahNavigation();

  // FETCH HOOK FOR SURAHS, RECENT, SAVED AYAHS!
  useEffect(() => {
    const func = async () => {
      const resA = await fetchAllSurahs(); //
      const resB = localStorage.getItem("recent");
      const resC = localStorage.getItem("saved-ayahs");
      setSurahs(resA.data); // Breaking Change Fix

      // Parse the LocalStorage Data
      const parsedRecent = JSON.parse(resB ?? "[]"); // if undefined/null return empty array
      const parsedSaved = JSON.parse(resC ?? "[]");

      // Set the Recent and Saved Ayahs
      setRecent(parsedRecent);
      setSavedAyahs(parsedSaved);
    };
    func();
  }, []);

  const handleRemoveSavedAyah = (ayah: Ayah) => {
    const saved = savedAyahs ?? []; // use current state, fallback if needed
    const updated = saved.filter((a: Ayah) => a.number !== ayah.number);

    localStorage.setItem("saved-ayahs", JSON.stringify(updated));
    setSavedAyahs(updated); // <- update the state too
    setDeletedAyah(ayah);
  };

  const filteredHomeSurahs = surahs.filter((surah) => {
    if (!homeSearchQuery.trim()) return true;
    const query = homeSearchQuery.toLowerCase().replace(/q/g, "k").replace(/[^a-z0-9]/g, "");
    const surahName = surah.englishName.toLowerCase().replace(/q/g, "k").replace(/[^a-z0-9]/g, "");
    const surahTranslation = surah.englishNameTranslation.toLowerCase().replace(/q/g, "k").replace(/[^a-z0-9]/g, "");
    return surahName.includes(query) || surahTranslation.includes(query) || surah.number.toString() === query;
  });

  return (
    <>
      <MobileSheet
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        surahs={surahs}
      />
      <div className="h-16 w-full lg:hidden flex"></div>
      <div className="sticky top-0 z-50 h-20 w-full backdrop-blur-3xl bg-zinc-950/50 border-b border-zinc-800/40 shadow-sm hidden lg:flex items-center justify-between xl:px-20 lg:px-8 px-4">
        <div className="flex items-center gap-3 text-white">
          <LogoIcon className="hidden lg:block w-8 h-8 rounded-[20%]" />
          <p className="font-bold text-2xl">Al-Juthur</p>

          <div className="sm:hidden ml-auto">
            <MenuIcon
              className="dark:text-white text-black"
              onClick={() => setIsOpen((prev) => !prev)}
            />
          </div>
        </div>

        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 gap-6 text-zinc-400 lg:text-base text-sm">
          <Link href="/home" className="cursor-pointer hover:text-gray-300 transition text-white ">
            Home
          </Link>
          <Link href="/tafsir" className="cursor-pointer hover:text-gray-300 transition">
            Tafsir
          </Link>
          <Link href="/lexicon" className="cursor-pointer hover:text-gray-300 transition">
            Lexicon
          </Link>
          <Link href="/ai" className="cursor-pointer hover:text-gray-300 transition text-zinc-400">
            AI Translator
          </Link>
          <Link href="/rag" className="cursor-pointer hover:text-gray-300 transition">
            RAG Bot
          </Link>
        </nav>
      </div>

      <div className="space-y-16 w-full flex-col flex-1 text-white xl:px-20 lg:px-8 px-4 pb-36 md:pb-16">
        <div className="w-full flex flex-col space-y-16 relative">
          <div className="grid md:grid-cols-2 grid-cols-1 items-center gap-8 pt-2 pb-8 md:py-16 relative">
            {/* 🌟 Left: Text content */}
            <Sparkle
              className="fill-emerald-500 text-emerald-500 absolute left-62 top-32 animate-pulse rotate-34 z-10"
              size={36}
            />
            <Sparkle
              className="fill-emerald-300 text-emerald-300 absolute left-12 sm:bottom-32 -bottom-24 animate-pulse z-10"
              size={48}
            />
            {/* <Circle
              className="fill-orange-400 text-orange-400 absolute right-56 -bottom-24 z-0 animate-bounce"
              size={48}
            /> */}

            {/* 🆕 Extra sparkles */}
            <Sparkle
              className="fill-emerald-400 text-emerald-400 absolute right-24 bottom-20 animate-caret-blink z-20"
              size={36}
            />
            <Sparkle
              className="fill-pink-500 text-pink-500 absolute left-[50%] top-[40%] animate-pulse z-10"
              size={28}
            />
            <Circle
              className="fill-emerald-400 text-emerald-400 absolute right-[30%] top-[80%] blur-sm opacity-70 z-0"
              size={32}
            />
            <Circle
              className="animate-spin fill-white text-white absolute left-10 top-10 opacity-10 blur-2xl z-0"
              size={126}
            />
            <div className="space-y-6 relative z-20">
              <h1 className="md:text-6xl text-4xl font-semibold text-white group">
                Dive{" "}
                <span className="text-emerald-500 group-hover:brightness-125 transition-all duration-300">
                  <button
                    onClick={() => {
                      document.getElementById("start_reading")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="cursor-pointer hover:underline"
                  >
                    Deeper
                  </button>
                </span>{" "}
                into <br /> the profound <br /> meanings
                <span className="text-sm text-zinc-400 block mt-2"> - [38:29]</span>
              </h1>

              <p className="max-w-md md:text-lg text-base font-medium text-zinc-400">
                Explore authentic Tafsir and Lexicons. Understand the Quran deeply with our comprehensive tools, including AI translation and RAG.
              </p>

              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    document.getElementById("start_reading")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-emerald-500 text-white hover:bg-emerald-600 transition cursor-pointer"
                >
                  Start Exploring
                </Button>
              </div>
            </div>

            {/* 📖 Right: Quran image with original float-mystic animation */}
            <div className="flex flex-col items-center justify-center relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/30 rounded-full blur-[100px] pointer-events-none z-0" />
              <Image
                src="/assets/images/allah-quran.png"
                alt="Floating Quran"
                className="w-72 sm:w-96 md:w-[412px] lg:w-[512px] xl:w-[612px] animate-float-mystic pointer-events-none select-none drop-shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                height={624}
                width={624}
              />
            </div>
          </div>

          <div className="space-y-12">

            <div className="space-y-6">
              <h1 className="md:text-4xl text-3xl font-semibold text-white">
                Continue Reading
              </h1>

              {recent?.number && (
                <Link href={`/surah/${recent?.number}`}>
                  <div className="relative overflow-hidden border border-white/50 hover:border-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 group cursor-pointer rounded-xl h-[86px] backdrop-blur-md px-5 py-4 shadow-md transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg z-4 sm:w-[280px] w-full">
                    {/* Giant Faded Watermark Number */}
                    <div className="absolute -right-1 -bottom-4 text-6xl font-black text-white/50 group-hover:text-white transition-colors duration-500 pointer-events-none select-none leading-none">
                      {recent?.number}
                    </div>

                    <div className="relative z-10 flex items-center justify-between gap-4">
                      <div className="flex flex-col flex-1 space-y-0.5 text-sm min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-emerald-100 whitespace-nowrap">{recent?.number}.</span>
                          <p className="font-semibold text-white text-base truncate">
                            {recent?.englishName}
                          </p>
                        </div>
                        <p className="text-xs text-emerald-100/80 pl-4 truncate">
                          {recent?.englishNameTranslation}
                        </p>
                      </div>

                      <p className={`${amiriquran.className} text-xl text-white tracking-wide whitespace-nowrap shrink-0`}>
                        {recent?.name}
                      </p>
                    </div>
                  </div>
                </Link>
              )}
            </div>


          </div>
        </div>

        <div className="space-y-6 scroll-mt-24" id="start_reading">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="md:text-4xl text-3xl font-semibold text-white">
              Explore All Surahs
            </h2>
            <div className="relative w-full md:w-72 z-20">
              <input
                type="text"
                placeholder="Search Surah (e.g., Baqarah)"
                value={homeSearchQuery}
                onChange={(e) => setHomeSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-base md:text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-600"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>
          <div
            className={`w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5 relative ${inter.className}`}
          >
            <Sparkle
              className="fill-emerald-500 text-emerald-500 absolute left-56 top-32 animate-pulse rotate-45 -z-1"
              size={36}
            />
            <Circle
              className="fill-green-600 text-green-600 absolute right-56 top-16 z-0 animate-caret-blink"
              size={16}
            />
            
            {/* 🌟 Additional scattered background stars */}
            <Sparkle
              className="fill-pink-500 text-pink-500 absolute right-[10%] top-[20%] animate-pulse rotate-12 -z-1 opacity-50"
              size={24}
            />
            <Circle
              className="fill-emerald-500 text-emerald-500 absolute left-[15%] top-[40%] animate-caret-blink -z-1 opacity-60"
              size={20}
            />
            <Sparkle
              className="fill-emerald-400 text-emerald-400 absolute right-[20%] top-[60%] animate-pulse -rotate-12 -z-1 opacity-50"
              size={28}
            />
            <Sparkle
              className="fill-emerald-600 text-emerald-600 absolute left-[25%] top-[80%] animate-pulse rotate-45 -z-1 opacity-40"
              size={32}
            />
            <Circle
              className="fill-yellow-500 text-yellow-500 absolute right-[15%] top-[90%] animate-caret-blink -z-1 opacity-50"
              size={14}
            />

            <Circle
              className="fill-white text-white absolute left-10 top-10 animate-spin opacity-10 blur-2xl z-0"
              size={120}
            />
            <Circle
              className="fill-emerald-500 text-emerald-500 absolute right-10 top-[50%] animate-spin opacity-10 blur-[100px] z-0"
              size={180}
            />

            {filteredHomeSurahs.map((surah: Surah) => (
              <Link href={`/surah/${surah.number}`} key={surah.number} prefetch={false}>
                <div className="relative overflow-hidden border border-emerald-500/50 hover:border-emerald-500 bg-zinc-900/40 group cursor-pointer rounded-xl h-full backdrop-blur-md px-5 py-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 z-4">
                  {/* Giant Faded Watermark Number */}
                  <div className="absolute -right-1 -bottom-4 text-6xl font-black text-emerald-500/30 group-hover:text-emerald-500 transition-colors duration-500 pointer-events-none select-none leading-none">
                    {surah.number}
                  </div>

                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex flex-col flex-1 space-y-0.5 text-sm min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-zinc-500 group-hover:text-emerald-400 transition-colors whitespace-nowrap">{surah.number}.</span>
                        <p className="font-semibold text-white text-base truncate">
                          {surah.englishName}
                        </p>
                      </div>
                      <p className="text-[11px] sm:text-xs text-zinc-400 pl-4 truncate">
                        {surah.englishNameTranslation}
                      </p>
                    </div>

                    <p className={`${amiriquran.className} text-xl text-zinc-300 group-hover:text-emerald-300 transition-colors tracking-wide whitespace-nowrap shrink-0`}>
                      {surah.name}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="md:text-4xl text-3xl font-semibold text-white">
            Your Reflections
          </h1>

          <div className="w-full pb-2">
            <div
              className="flex gap-6 min-w-full overflow-x-auto scroll-smooth px-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#3b82f6 #18181b",
              }}
            >
              {savedAyahs?.length ? (
                savedAyahs.map((a: Ayah, index) => (
                  <div
                    key={index}
                    className="min-w-[320px] max-w-sm flex-shrink-0"
                  >
                    <div
                      className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-500 border border-emerald-500/20 backdrop-blur-lg rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-300 ease-in-out gap-2 flex flex-col cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/surah/${a.surahNumber}?ayah=${a.numberInSurah}`
                        )
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-zinc-900/80 text-white px-2 py-0.5 rounded text-xs">
                          Surah {a.surahNumber}
                        </span>
                        <span className="bg-emerald-900/80 text-white px-2 py-0.5 rounded text-xs">
                          Ayah {a.numberInSurah}
                        </span>
                      </div>

                      <p
                        className={`${amiri.className} text-white leading-relaxed text-lg line-clamp-3 mt-4`}
                      >
                        {a.text}
                      </p>
                      <p className="text-white mt-1 line-clamp-2 italic">
                        {a.translation}
                      </p>

                      <div className="flex justify-between mt-2">
                        {/* ❌ Delete Icon */}
                        <XIcon
                          className="text-emerald-900 size-6 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent card click
                            handleRemoveSavedAyah(a);
                          }}
                        />

                        {/* 📦 Archive Icon */}
                        <ArchiveIcon
                          className="text-emerald-900 size-6 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent card click
                            toast.info(
                              "Sorry, that functionality isn't implemented yet."
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-zinc-400 text-center py-8 w-full">
                  No saved ayahs yet.
                </div>
              )}
            </div>
            <style jsx>{`
              .flex::-webkit-scrollbar {
                height: 8px;
                background: #1e293b;
                border-radius: 8px;
              }
              .flex::-webkit-scrollbar-thumb {
                background: #3b82f6;
                border-radius: 8px;
              }
            `}</style>
          </div>
        </div>


      </div>
    </>
  );
};

export default SurahsList;
