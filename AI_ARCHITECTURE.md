# Quran AI Architecture: RAG & Translation System

This document outlines the backend architecture, file structure, and core logic behind the 6-Mode Retrieval-Augmented Generation (RAG) system and the specialized AI Translation engine. It is designed for software engineers to understand the system's execution flow.

## 1. 6-Mode RAG System (Retrieval-Augmented Generation)

The RAG system is a multi-step pipeline that takes a user query, processes it through a routing LLM to extract classical Arabic concepts, performs a hybrid semantic/lexical search, and synthesizes a response using a mode-specific persona.

### Core Files & Flow

1. **`app/api/ai/rag/route.ts` (The Entry Point)**
   - Acts as the orchestrator for the entire RAG flow.
   - **Step 1: Quota Check.** Performs an initial token estimation (`estimateTokens`) and checks rate limits (`checkUserQuota`).
   - **Step 2: Query Preparation.** Calls `prepareRagQuery` to run "LLM 1".
   - **Step 3: Retrieval.** Calls `searchHybrid` to retrieve relevant classical texts.
   - **Step 4: Prompt Engineering.** Constructs a massive system prompt dynamically injecting the `contextText` (retrieved documents) and a `modeSpecificRole` (e.g., Grammatical, Philosophical, Lexicon).
   - **Step 5: Synthesis.** Calls `executeWithFallback` ("LLM 2") to generate the final response.

2. **`lib/ai/rag/query-router.ts` (LLM 1: Query Prep & Guardrails)**
   - **Purpose:** Acts as a lightweight LLM router (using Gemini Flash/Flash-Lite) before hitting the main database.
   - **Arabic Expansion:** Translates English concepts into classical Arabic roots and keywords (`expandedQueryAr`). This is critical because the underlying SQLite/Prisma databases contain classical Arabic texts.
   - **Deterministic Fallbacks:** Uses a hardcoded `BASE_CONCEPT_KEYWORDS` dictionary for fast baseline expansion if the LLM fails.
   - **Guardrails:** Evaluates `isScopeValid`. For example, if the mode is "grammar" or "lexicon", it strictly rejects Fiqh (jurisprudence) or Aqeedah (theology) questions to prevent out-of-bounds answers.

3. **`lib/ai/rag/hybrid-search.ts` (The Retrieval Engine)**
   - **Purpose:** Fetches the most relevant documents using a multi-pronged search strategy against a SQLite database (`rag_parent_documents` and `rag_child_chunks`).
   - **BM25 Lexical Search (FTS5):** Uses SQLite's Full-Text Search (FTS5) to find exact keyword matches in the child chunks, utilizing the Arabic roots extracted by the query router.
   - **Dense Vector Search:** Generates embeddings for the query (using `generateEmbedding`) and calculates cosine similarity against stored vectors.
   - **Structural & Mode Filters:** Dynamically builds SQL `WHERE` clauses to restrict searches to specific Surahs, Ayahs, or `authorId`s based on the selected Mode (e.g., limiting the Lexicon mode to dictionaries).
   - **Reciprocal Rank Fusion (RRF):** Combines the ranks from BM25 and Vector searches to score and select the best parent documents.
   - **Direct Fallback:** If vector/lexical searches fail, or if an exact Surah is requested, it directly queries the `dev.db` (Prisma) to pull the exact Tafsir verses to ensure 100% accuracy.

4. **`lib/ai/model-router.ts` (Multi-Model Execution Chain)**
   - **Purpose:** Ensures high availability and cost-efficiency.
   - Defines `ROUTING_CHAINS` per mode. For example, `grammar` mode cascades through `['gemini-3.0-flash', 'gemini-2.5-flash', 'gemma-4-31b']`.
   - The `executeWithFallback` function tries the primary model, and if it fails or hits a rate limit (`checkModelCapacity`), it gracefully falls back to the next model in the chain.

---

## 2. Academic AI Translation System

The translation system is purpose-built to transcreate classical Arabic texts (like Tafsir) into high-fidelity, natural-sounding English while strictly adhering to academic nomenclature and formatting rules.

### Core Files & Flow

1. **`app/api/ai/translate/route.ts` (The Entry Point & Orchestrator)**
   - **Prompt Injection Protection:** Inspects the incoming payload for trigger words (e.g., "ignore instructions", "system role"). If the user asks a conversational question instead of providing Arabic text, it hard-rejects the request.
   - **Chunking Strategy:** Uses `splitTextIntoChunks` to break large texts into paragraph-sized chunks (up to 8000 chars) to prevent context window exhaustion and hallucination.
   - **Model Routing:** Dispatches to `translate_short` or `translate_long` model chains via `executeWithFallback` depending on the chunk size.
   - **Structured Parsing:** The LLM is instructed to output purely a Markdown table (`| Transcreated Text | Source Text |`). The `parseMarkdownTable` function extracts this table into a structured JSON array.

2. **The "Affective Fidelity" System Prompt (Inside `route.ts`)**
   - The translation logic is entirely driven by a highly engineered, non-negotiable system prompt.
   - **The "Orator's Ear" / Anti-Robot Standard:** Forces the model to avoid "GPT-isms" (e.g., *delve*, *tapestry*, *moreover*, *furthermore*). It bans em-dashes and colon clusters.
   - **Absolute Output Purity:** Forbids the model from outputting preambles, intros, or thoughts. It must only output the Markdown table.
   - **Diacritical & Lexical Precision:** Mandates strict diacritics (ā, ī, ū, ṣ, ḍ) for Islamic terms and bans the Christianization of prophet names (e.g., must use *Mūsa*, not *Moses*).
   - **Honorifics Protocol:** Forces the insertion of honorifics in round brackets (e.g., `Allāh (Glorified and Exalted is He)`).

---

### Summary of Shared Infrastructure

- Both systems rely heavily on **`lib/ai/model-router.ts`** for robust LLM fallback execution. By using chains of models (e.g., `gemini-3.1-flash-lite`, `gemma-4-26b`), the system mitigates API downtime and rate limits.
- Both use **`lib/ai/quota-manager.ts`** and **`lib/ai/token-budget.ts`** to track user IPs, calculate exact token usage, and prevent abuse of the free RAG limits.
- **RAG Architecture Pattern:** *Two-LLM Pipeline* (LLM 1 for Query/Guardrail prep ➡️ SQLite Hybrid Search ➡️ LLM 2 for Synthesis).
- **Translation Architecture Pattern:** *Map-Reduce Structure* (Chunking ➡️ Parallel LLM Translation with strict Markdown table constraints ➡️ Parsing Markdown into JSON).
