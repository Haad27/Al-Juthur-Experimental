-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your Tafsir and Lexicon documents
create table rag_documents (
  id bigserial primary key,
  content text not null, -- The actual text chunk from the Tafsir/Lexicon
  metadata jsonb, -- Surah number, Ayah number, Book name (e.g. {"surah": 2, "ayah": 255, "book": "Tafsir Ibn Kathir"})
  embedding vector(384) -- all-MiniLM-L6-v2 uses 384 dimensions
);

-- Create a function to similarity search for documents
create or replace function match_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_surah int default null,
  filter_ayah int default null,
  filter_book text default null
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    rag_documents.id,
    rag_documents.content,
    rag_documents.metadata,
    1 - (rag_documents.embedding <=> query_embedding) as similarity
  from rag_documents
  where 1 - (rag_documents.embedding <=> query_embedding) > match_threshold
    and (filter_surah is null or (rag_documents.metadata->>'surah')::int = filter_surah)
    and (filter_ayah is null or (rag_documents.metadata->>'ayah')::int = filter_ayah)
    and (filter_book is null or rag_documents.metadata->>'book' = filter_book)
  order by rag_documents.embedding <=> query_embedding
  limit match_count;
$$;

-- Create an index to speed up vector searches
create index on rag_documents using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
