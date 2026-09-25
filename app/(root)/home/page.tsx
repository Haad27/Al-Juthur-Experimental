"use client";
// Production: Simple Qur'an Homepage (Surahs Catalog)
import React, { useEffect, useState, useRef } from "react";
import { fetchAllSurahs } from "@/api/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArchiveIcon, XIcon, Search, Menu as MenuIcon } from "lucide-react";
import { toast } from "sonner";
import useSurahNavigation from "@/hooks/useSurahNavigation";
import { amiri, amiriquran, inter } from "@/app/fonts";
import MobileSheet from "@/components/sidebar/MobileSheet";
import AppHeader from "@/components/layout/AppHeader";
import { isSurahMatch, filterSurahs, parseSurahVerseReference } from "@/lib/searchUtils";
import { getRecentQuranReading, RecentQuranReading } from "@/lib/readerStorage";

const SurahsList = () => {
  const router = useRouter();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [recent, setRecent] = useState<RecentQuranReading | null>(null);
  const [deletedAyah, setDeletedAyah] = useState<Ayah>();
  const [savedAyahs, setSavedAyahs] = useState<Ayah[]>();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "Last Read" | "Saved" | "Collections"
  >("Last Read");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [homeSearchQuery, setHomeSearchQuery] = useState("");
  const [isHomeSearchFocused, setIsHomeSearchFocused] = useState(false);
  const homeSearchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (homeSearchContainerRef.current && !homeSearchContainerRef.current.contains(event.target as Node)) {
        setIsHomeSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [amount, setAmount] = useState(21);
  const { getSurahNumber } = useSurahNavigation();

  const refreshRecent = React.useCallback(() => {
    const r = getRecentQuranReading();
    setRecent(r);
    try {
      const resC = localStorage.getItem("saved-ayahs");
      if (resC) {
        setSavedAyahs(JSON.parse(resC));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAllSurahs().then((resA) => {
      setSurahs(resA.data);
    });
    refreshRecent();

    // Critical: Listen for BFCache restore (when user hits browser Back button), tab focus, and storage events
    window.addEventListener("pageshow", refreshRecent);
    window.addEventListener("focus", refreshRecent);
    window.addEventListener("storage", refreshRecent);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshRecent();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pageshow", refreshRecent);
      window.removeEventListener("focus", refreshRecent);
      window.removeEventListener("storage", refreshRecent);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshRecent]);

  const handleRemoveSavedAyah = (ayah: Ayah) => {
    const saved = savedAyahs ?? [];
    const updated = saved.filter((a: Ayah) => a.number !== ayah.number);

    localStorage.setItem("saved-ayahs", JSON.stringify(updated));
    setSavedAyahs(updated);
    setDeletedAyah(ayah);
  };

  const parsedHomeVerseRef = parseSurahVerseReference(homeSearchQuery);
  const targetAyahFromHomeSearch = parsedHomeVerseRef?.ayahNumber;

  const filteredHomeSurahs = filterSurahs(homeSearchQuery, surahs);

  return (
    <>
      <MobileSheet
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        surahs={surahs}
      />

      <AppHeader
        rightSlot={
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <MenuIcon className="size-5" />
          </button>
        }
      />

      <div className={`mx-auto w-full max-w-6xl space-y-14 px-4 pb-36 pt-8 sm:px-6 md:pb-16 ${inter.className}`}>
        <section className="max-w-2xl space-y-4">
          <h1 className="text-3xl font-semibold leading-tight text-foreground md:text-5xl">
            Read without distraction
          </h1>
          <p className="reading-prose max-w-xl text-base text-muted-foreground md:text-lg">
            A blessed Book revealed so that you might reflect upon its verses — [38:29]
          </p>
          <button
            onClick={() => {
              document.getElementById("start_reading")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-full border border-border bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start reading
          </button>
        </section>

        {recent?.number && (() => {
          const lastAyah = recent.lastReadAyah || recent.ayah;
          const targetUrl = lastAyah && lastAyah > 1 
            ? `/surah/${recent.number}?ayah=${lastAyah}` 
            : `/surah/${recent.number}`;

          return (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Continue reading</h2>
              <Link href={targetUrl} className="block max-w-sm group">
                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-accent/40">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">
                        {recent?.number}. {recent?.englishName}
                      </p>
                      {lastAyah && lastAyah > 1 && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                          Ayah {lastAyah}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {recent?.englishNameTranslation}
                    </p>
                  </div>
                  <p className={`${amiriquran.className} text-xl text-arabic shrink-0 mr-1`}>
                    {recent?.name}
                  </p>
                </div>
              </Link>
            </section>
          );
        })()}

        <section className="space-y-5 scroll-mt-24" id="start_reading">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <h2 className="text-lg font-semibold text-foreground md:text-2xl">
              All surahs
            </h2>
            <div ref={homeSearchContainerRef} className="relative z-20 w-full md:w-72">
              <input
                type="text"
                placeholder="Search surah (e.g. Al-Nur, 24)..."
                value={homeSearchQuery}
                onChange={(e) => setHomeSearchQuery(e.target.value)}
                onFocus={() => setIsHomeSearchFocused(true)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              {isHomeSearchFocused && homeSearchQuery.trim().length > 0 && (
                <div className="absolute top-full right-0 left-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg custom-scrollbar">
                  {filteredHomeSurahs.length > 0 ? (
                    <div className="flex flex-col gap-0.5 p-1.5">
                      {filteredHomeSurahs.slice(0, 10).map((surah) => (
                        <button
                          key={`suggest-surah-${surah.number}`}
                          onClick={() => {
                            setHomeSearchQuery(surah.englishName);
                            setIsHomeSearchFocused(false);
                            const targetUrl = targetAyahFromHomeSearch && targetAyahFromHomeSearch <= (surah.numberOfAyahs || 999)
                              ? `/surah/${surah.number}?ayah=${targetAyahFromHomeSearch}`
                              : `/surah/${surah.number}`;
                            router.push(targetUrl);
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
                        >
                          <span className="block text-sm font-medium text-foreground">{surah.englishName}</span>
                          <span className="text-[10px] text-muted-foreground">{surah.englishNameTranslation}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-center text-xs text-muted-foreground">No matches found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredHomeSurahs.map((surah: Surah) => (
              <Link
                href={
                  targetAyahFromHomeSearch && targetAyahFromHomeSearch <= (surah.numberOfAyahs || 999)
                    ? `/surah/${surah.number}?ayah=${targetAyahFromHomeSearch}`
                    : `/surah/${surah.number}`
                }
                key={surah.number}
                prefetch={false}
              >
                <div className="flex h-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-accent/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {surah.number}. {surah.englishName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {surah.englishNameTranslation}
                    </p>
                  </div>
                  <p className={`${amiriquran.className} shrink-0 text-xl text-arabic`}>
                    {surah.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your reflections</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            {savedAyahs?.length ? (
              savedAyahs.map((a: Ayah, index) => (
                <div key={index} className="min-w-[280px] max-w-sm shrink-0">
                  <div
                    className="flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/40"
                    onClick={() =>
                      router.push(`/surah/${a.surahNumber}?ayah=${a.numberInSurah}`)
                    }
                  >
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>Surah {a.surahNumber}</span>
                      <span>·</span>
                      <span>Ayah {a.numberInSurah}</span>
                    </div>
                    <p className={`${amiri.className} line-clamp-3 text-right text-lg leading-relaxed text-arabic`}>
                      {a.text}
                    </p>
                    <p className="line-clamp-2 text-sm italic leading-[1.7] text-reading">
                      {a.translation}
                    </p>
                    <div className="mt-1 flex justify-between">
                      <XIcon
                        className="size-5 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSavedAyah(a);
                        }}
                      />
                      <ArchiveIcon
                        className="size-5 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info("Sorry, that functionality isn't implemented yet.");
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full py-6 text-sm text-muted-foreground">
                No saved ayahs yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default SurahsList;
