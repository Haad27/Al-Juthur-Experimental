"use client";

import { useState, useEffect } from 'react';

export default function TafsirPage() {
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState<any>(null);
  const [selectedSurah, setSelectedSurah] = useState("");
  const [selectedAyah, setSelectedAyah] = useState("");
  const [tafsirData, setTafsirData] = useState(null);

  useEffect(() => {
    fetch('/api/tafsir')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLanguages(data.data);
        }
      });
  }, []);

  const handleFetchTafsir = async () => {
    if (!selectedAuthor || !selectedSurah || !selectedAyah) return;
    
    const res = await fetch(`/api/tafsir?surahId=${selectedSurah}&ayahId=${selectedAyah}`);
    const data = await res.json();
    if (data.success) {
      setTafsirData(data.data);
    }
  };

  // Get all authors across all languages (or filtered by selectedLanguage)
  const allAuthors = languages.reduce((acc: any[], lang: any) => {
    if (selectedLanguage && lang.code !== selectedLanguage) return acc;
    const authorsWithLang = lang.authors.map((a: any) => ({ ...a, languageName: lang.name }));
    return [...acc, ...authorsWithLang];
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 text-white pt-24 px-4 sm:px-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-4 text-center bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
        Tafsir Explorer
      </h1>
      <p className="text-zinc-400 text-center mb-12 max-w-2xl mx-auto text-lg">
        Select a Tafsir collection below to begin reading deep exegesis of the Holy Quran.
      </p>

      {/* Language Filter */}
      <div className="flex justify-center mb-12">
        <select 
          className="bg-zinc-800/80 border border-zinc-700 rounded-xl px-6 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-lg"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          <option value="">All Languages</option>
          {languages.map((lang: any) => (
            <option key={lang.id} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>

      {!selectedAuthor ? (
        /* Grid of Tafsir Collections */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {allAuthors.map((author: any) => (
            <div 
              key={author.id}
              onClick={() => setSelectedAuthor(author)}
              className="bg-zinc-800/40 border border-zinc-700/50 hover:border-blue-500/50 rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-blue-400 text-xl font-bold">📖</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{author.name}</h3>
              <p className="text-zinc-400 text-sm">Language: <span className="text-zinc-300 font-medium">{author.languageName}</span></p>
            </div>
          ))}
          {allAuthors.length === 0 && (
             <div className="col-span-full text-center text-zinc-500 py-12">
               No Tafsirs found.
             </div>
          )}
        </div>
      ) : (
        /* Selected Tafsir View */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => { setSelectedAuthor(null); setTafsirData(null); }}
            className="mb-6 text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back to Collections
          </button>

          <div className="bg-zinc-800/40 border border-blue-500/30 rounded-3xl p-8 mb-8 shadow-[0_0_30px_rgba(59,130,246,0.05)]">
            <h2 className="text-3xl font-bold text-white mb-2">{selectedAuthor.name}</h2>
            <p className="text-blue-400 mb-8 font-medium">Language: {selectedAuthor.languageName}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Surah Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-zinc-400 font-semibold uppercase tracking-wider">Select Surah</label>
                <div className="relative">
                  <input 
                    type="number"
                    min="1"
                    max="114"
                    placeholder="Surah Number (1-114)"
                    className="w-full bg-zinc-900/80 border border-zinc-700 focus:border-blue-500 rounded-xl p-4 text-white text-lg outline-none transition-all shadow-inner"
                    value={selectedSurah}
                    onChange={(e) => setSelectedSurah(e.target.value)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">Surah</div>
                </div>
              </div>

              {/* Ayah Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-zinc-400 font-semibold uppercase tracking-wider">Select Ayah</label>
                <div className="relative">
                  <input 
                    type="number"
                    min="1"
                    placeholder="Ayah Number"
                    className="w-full bg-zinc-900/80 border border-zinc-700 focus:border-blue-500 rounded-xl p-4 text-white text-lg outline-none transition-all shadow-inner"
                    value={selectedAyah}
                    onChange={(e) => setSelectedAyah(e.target.value)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">Ayah</div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleFetchTafsir}
              disabled={!selectedSurah || !selectedAyah}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              Read Tafsir
            </button>
          </div>

          {/* Tafsir Content Display */}
          {tafsirData && tafsirData.length > 0 ? (
            <div className="space-y-6 mb-16">
              {tafsirData.map((entry: any) => (
                <div key={entry.id} className="bg-zinc-800/80 p-8 rounded-3xl border border-emerald-500/20 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                  <h3 className="text-xl font-semibold mb-6 text-emerald-400 border-b border-zinc-700/50 pb-4 inline-block">
                    Ayah {selectedAyah}
                  </h3>
                  <p className="text-zinc-300 leading-loose text-lg whitespace-pre-wrap font-serif">
                    {entry.text}
                  </p>
                </div>
              ))}
            </div>
          ) : tafsirData && tafsirData.length === 0 ? (
            <div className="text-center py-16 bg-zinc-800/20 rounded-3xl border border-dashed border-zinc-700">
              <span className="text-4xl block mb-4">🏜️</span>
              <p className="text-zinc-400 text-lg">No Tafsir found for Surah {selectedSurah}, Ayah {selectedAyah} in this collection.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
