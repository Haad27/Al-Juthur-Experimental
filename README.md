<div align="center">

  <img src="public/assets/favicon/apple-touch-icon.png" alt="Al-Juthur Logo" width="120" height="120" />

  # 🌿 Al-Juthur (الجذور)
  **The Ultimate Classical & AI-Powered Qur'anic Research Platform**

  *Explore classical Arabic root morphology, 130+ Tafsirs, 8+ historical Lexicons, and a 6-mode Academic AI RAG engine—all wrapped in a high-performance, modern 3D UI.*

  [![Next.js](https://img.shields.io/badge/Next.js-15.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
  [![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

</div>

---

## 📌 Executive Summary

**Al-Juthur** (*Arabic for "The Roots"*) is an enterprise-grade, open-source web application designed for scholars, researchers, and students of the Holy Qur'an. By bridging 1,400 years of classical Islamic scholarship with modern artificial intelligence, Al-Juthur provides unprecedented depth into Qur'anic linguistics, tafsir analysis, and semantic search.

Traditional platforms separate translations, tafsirs, and root dictionaries. **Al-Juthur** unifies them into a cohesive, interactive workspace powered by a 6-Mode Retrieval-Augmented Generation (RAG) pipeline and a 3D scroll-driven interface.

---

## ✨ Core Pillars & Key Features

### 📖 1. Immersive 3D & Responsive Reading Experience
- **Scroll-Driven 3D Canvas:** Built with Three.js and React Three Fiber featuring dynamic particle trails, camera keyframe animation, and reactive visual activations.
- **High-Performance Virtuoso Reader:** Handles 6,236 Ayahs smoothly with zero lag, instant word-by-word (WBW) translation, and interactive diacritic controls.
- **Typography & Mushaf Support:** Multiple fonts including Amiri, KFQPC, Uthmani, Warsh, Naskh, and IndoPak 15/16 line formats.

### 📚 2. Classical Tafsir Library (130+ Sources)
- Comprehensive catalog of over **130 Tafsir works** spanning classical eras (Ibn Kathir, Al-Tabari, Al-Qurtubi) to contemporary scholarly commentaries.
- Instant parallel comparison and verse-level commentary lookup.

### 📖 3. Root Word Morphology & Lexicons (8+ Dictionaries)
- Deep root-level breakdown for every single word in the Qur'an.
- Integrated classical dictionaries: **Lane's Lexicon**, **Lisan al-Arab**, **Mu'jam al-Ghani**, **Mufradat Alfaz al-Quran**, **Al-Qamus al-Muhit**, and **Maqayis al-Lughah**.
- Embedded PDF viewers for authoritative reference lexicons (Abdel Haleem, Abdul Mannan Omar, Lughat-ul-Quran).

### 🤖 4. 6-Mode AI RAG Engine (Retrieval-Augmented Generation)
- **Multi-Agent Pipeline:** Two-step execution (LLM 1 for Query Router & Guardrails ➡️ Hybrid SQLite Search ➡️ LLM 2 for Synthesis).
- **Hybrid Search Engine:** Combines BM25 Lexical Search (SQLite FTS5) with Dense Vector Embeddings via Reciprocal Rank Fusion (RRF).
- **6 Persona Modes:**
  1. 📖 **Grammatical & Syntactic Analysis (Sarf & I'rab)**
  2. 📜 **Historical Context (Asbab al-Nuzul)**
  3. 🌿 **Lexicon & Root Word Etymology**
  4. 🧠 **Philosophical & Thematic Reflection**
  5. 🔍 **Comparative Tafsir Synthesis**
  6. 🌐 **General Qur'anic QA**

### 🌐 5. Academic AI Translation & Transcreation
- Specialized LLM engine for transcreating classical Arabic into high-fidelity English.
- Strictly adheres to academic diacritics (ā, ī, ū, ṣ, ḍ), honorific protocols, and context-aware nomenclature without "AI filler" jargon.

---

## 🛠️ Technology Stack & Architecture

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/) |
| **3D & Graphics** | [Three.js](https://threejs.org/), [@react-three/fiber](https://r3f.docs.pmnd.rs/), [@react-three/drei](https://github.com/pmndrs/drei), GSAP ScrollTrigger |
| **Styling & UI** | Tailwind CSS v4, Lucide Icons, Framer Motion, Sonner, Radix UI |
| **Database & ORM** | Prisma ORM, SQLite (`dev.db`), Better-SQLite3 |
| **Search Engine** | SQLite FTS5 (BM25), Cosine Vector Similarity, Reciprocal Rank Fusion (RRF) |
| **AI Infrastructure** | Google Gemini API (3.1 Flash / Flash-Lite), Cascaded Multi-Model Fallbacks |
| **Audio Engine** | Audio Store (Zustand), Custom Surah/Ayah Audio Player |

---

## ⚙️ Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.0.0` or higher
- **npm** or **pnpm** / **yarn**
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Haad27/Deeper-Dive-in-Quran.git
   cd Deeper-Dive-in-Quran
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and configure your credentials:
   ```env
   # Database
   DATABASE_URL="file:./dev.db"

   # AI Services (Google Gemini)
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

4. **Initialize Prisma Database:**
   ```bash
   npx prisma generate
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to explore **Al-Juthur**.

---

## 📄 License & Attribution

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

Developed with precision and dedication for the global Ummah.

<div align="center">
  <sub>Built with ❤️ by the Al-Juthur Engineering Team</sub>
</div>
