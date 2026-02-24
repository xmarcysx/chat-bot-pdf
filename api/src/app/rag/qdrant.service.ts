import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { RAG_CONFIG } from './rag.config';
import { DocumentChunk } from './pdf.service';

export interface SearchResult {
  content: string;
  score: number;
  metadata: DocumentChunk['metadata'];
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: QdrantClient;
  private readonly collectionName: string;

  constructor() {
    this.client = new QdrantClient({ url: RAG_CONFIG.qdrant.url });
    this.collectionName = RAG_CONFIG.qdrant.collectionName;
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  private async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName,
      );

      if (!exists) {
        this.logger.log(`Creating Qdrant collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: RAG_CONFIG.qdrant.vectorSize,
            distance: 'Cosine',
          },
        });
        this.logger.log('Collection created successfully');
      } else {
        this.logger.log(`Collection "${this.collectionName}" already exists`);
      }
    } catch (error) {
      this.logger.error('Failed to connect to Qdrant. Is it running?', error.message);
    }
  }

  async upsertChunks(
    chunks: DocumentChunk[],
    embeddings: number[][],
  ): Promise<void> {
    const points = chunks.map((chunk, index) => ({
      id: this.generateId(chunk.metadata.source, chunk.metadata.chunkIndex),
      vector: embeddings[index],
      payload: {
        content: chunk.content,
        source: chunk.metadata.source,
        chunkIndex: chunk.metadata.chunkIndex,
      },
    }));

    await this.client.upsert(this.collectionName, { points });
    this.logger.log(`Upserted ${points.length} vectors to Qdrant`);
  }

  async search(
    queryEmbedding: number[],
    topK = RAG_CONFIG.retrieval.topK,
  ): Promise<SearchResult[]> {
    const results = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit: topK,
      score_threshold: RAG_CONFIG.retrieval.scoreThreshold,
      with_payload: true,
    });

    return results.map((r) => ({
      content: r.payload?.['content'] as string,
      score: r.score,
      metadata: {
        source: r.payload?.['source'] as string,
        chunkIndex: r.payload?.['chunkIndex'] as number,
      },
    }));
  }

  async deleteBySource(source: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      filter: {
        must: [{ key: 'source', match: { value: source } }],
      },
    });
    this.logger.log(`Deleted vectors for source: ${source}`);
  }

  async collectionInfo() {
    return this.client.getCollection(this.collectionName);
  }

  private generateId(source: string, chunkIndex: number): number {
    // Prosty deterministyczny ID z hash źródła + indeksu
    let hash = 0;
    const str = `${source}_${chunkIndex}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
