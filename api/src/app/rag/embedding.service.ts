import { Injectable, Logger } from '@nestjs/common';
import { Ollama } from 'ollama';
import { RAG_CONFIG } from './rag.config';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({ host: RAG_CONFIG.ollama.baseUrl });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.ollama.embeddings({
      model: RAG_CONFIG.ollama.embedModel,
      prompt: text,
    });
    return response.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    this.logger.log(`Generating embeddings for ${texts.length} chunks...`);
    const embeddings: number[][] = [];

    // Ollama nie ma batch endpoint - robimy sekwencyjnie
    for (let i = 0; i < texts.length; i++) {
      if (i % 10 === 0) {
        this.logger.log(`Embedding progress: ${i}/${texts.length}`);
      }
      const embedding = await this.embed(texts[i]);
      embeddings.push(embedding);
    }

    this.logger.log(`Embeddings generated: ${embeddings.length}`);
    return embeddings;
  }
}
