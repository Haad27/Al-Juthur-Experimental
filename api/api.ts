import { SURAHS_DATA } from "@/lib/surahsData";

export const fetchAllSurahs = async () => {
  return {
    code: 200,
    status: "OK",
    data: SURAHS_DATA,
  };
};

export const fetchSurahById = async (id: number) => {
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${id}/quran-uthmani`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching surah by ID:", error);
  }
};

{
  /* TODO: Change to a more detailed function name */
}
export const searchQuran = async (query: string) => {
  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/search/${query}/all/en`
    );
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching Quran:", error);
  }
};


export const fetchAyahAudio = async (
  surahId: number,
  ayahId: number,
  type?: unknown
) => {
  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surahId}:${ayahId}/ar.alafasy`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Error fetching ayah-audio:", error);
  }
};

export const fetchSurahAudio = async (surahId: number) => {
  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahId}/ar.alafasy`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(`Error fetching surah-audio: ${error}`);
  }
};


export const fetchReciters = async () => {
  try {
    const response = await fetch("https://api.quran.com/api/v4/resources/recitations");
    if (!response.ok) throw new Error("Failed to fetch reciters");
    return await response.json();
  } catch (error) {
    console.error("Error fetching reciters:", error);
    return { recitations: [] };
  }
};

export const fetchChapterAudioSegments = async (reciterId: number, chapterId: number) => {
  try {
    const response = await fetch(`https://api.quran.com/api/v4/quran/recitations/${reciterId}?chapter_number=${chapterId}&fields=segments`);
    if (!response.ok) throw new Error("Failed to fetch audio segments");
    return await response.json();
  } catch (error) {
    console.error("Error fetching audio segments:", error);
    return null;
  }
};
