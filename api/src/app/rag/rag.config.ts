export const RAG_CONFIG = {
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    chatModel: process.env.OLLAMA_CHAT_MODEL || 'llama3:8b',
    embedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    collectionName: process.env.QDRANT_COLLECTION || 'rag_documents',
    vectorSize: 768, // nomic-embed-text produces 768-dim vectors
  },
  chunking: {
    chunkSize: 500,       // znaków na chunk
    chunkOverlap: 50,     // overlap między chunkami
  },
  retrieval: {
    topK: 5,              // ile chunków pobieramy przy query
    scoreThreshold: 0.5,  // minimalne podobieństwo
  },
};
