import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { Ollama } from 'ollama';
import { RAG_CONFIG } from './rag.config';
import { PdfService } from './pdf.service';
import { EmbeddingService } from './embedding.service';
import { QdrantService, SearchResult } from './qdrant.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly ollama: Ollama;

  constructor(
    private readonly pdfService: PdfService,
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantService: QdrantService,
  ) {
    this.ollama = new Ollama({ host: RAG_CONFIG.ollama.baseUrl });
  }

  // ─── INGESTION ───────────────────────────────────────────────────────────────

  async ingestPdf(buffer: Buffer, filename: string): Promise<{ chunksIngested: number }> {
    this.logger.log(`Starting ingestion: ${filename}`);

    // 1. Parsuj PDF i podziel na chunki
    const chunks = await this.pdfService.parsePdf(buffer, filename);

    // 2. Usuń poprzednie dane z tego pliku (re-upload)
    await this.qdrantService.deleteBySource(filename);

    // 3. Wygeneruj embeddingi
    const texts = chunks.map((c) => c.content);
    const embeddings = await this.embeddingService.embedBatch(texts);

    // 4. Zapisz do Qdrant
    await this.qdrantService.upsertChunks(chunks, embeddings);

    this.logger.log(`Ingestion complete: ${chunks.length} chunks stored`);
    return { chunksIngested: chunks.length };
  }

  // ─── QUERY (streaming) ───────────────────────────────────────────────────────

  async chatStream(
    question: string,
    history: ChatMessage[],
    res: Response,
  ): Promise<void> {
    // 1. Embed pytanie
    const queryEmbedding = await this.embeddingService.embed(question);

    // 2. Znajdź najlepsze chunki
    const relevantChunks: SearchResult[] = await this.qdrantService.search(queryEmbedding);

    if (relevantChunks.length === 0) {
      res.write('data: Nie znalazłem odpowiednich informacji w dokumentach.\n\n');
      res.end();
      return;
    }

    // 3. Zbuduj kontekst
    const context = relevantChunks
      .map((c, i) => `[Fragment ${i + 1}] ${c.content}`)
      .join('\n\n');

    // 4. Zbuduj wiadomości dla LLM
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Jesteś pomocnym asystentem. Odpowiadaj wyłącznie na podstawie poniższego kontekstu z dokumentów. 
Jeśli odpowiedź nie jest zawarta w kontekście, powiedz wprost że nie masz tej informacji.
Odpowiadaj w języku pytania użytkownika.

KONTEKST:
${context}`,
      },
      ...history,
      { role: 'user', content: question },
    ];

    // 5. Stream odpowiedź z Ollama
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await this.ollama.chat({
      model: RAG_CONFIG.ollama.chatModel,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.message?.content || '';
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }

  // ─── STATUS ──────────────────────────────────────────────────────────────────

  async getStatus() {
    const info = await this.qdrantService.collectionInfo();
    return {
      model: RAG_CONFIG.ollama.chatModel,
      embedModel: RAG_CONFIG.ollama.embedModel,
      collection: RAG_CONFIG.qdrant.collectionName,
      vectorsCount: info.points_count ?? info.indexed_vectors_count ?? 0,
    };
  }
}
