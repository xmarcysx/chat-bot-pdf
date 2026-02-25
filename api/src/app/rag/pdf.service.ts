import { Injectable, Logger } from '@nestjs/common';
import { RAG_CONFIG } from './rag.config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

export interface DocumentChunk {
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks?: number;
  };
}  
 
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async parsePdf(buffer: Buffer, filename: string): Promise<DocumentChunk[]> {
    this.logger.log(`Parsing PDF: ${filename}`);

    const data = await pdfParse(buffer);
    const text = data.text;

    this.logger.log(`PDF parsed, total characters: ${text.length}`);

    const chunks = this.chunkText(text);

    return chunks.map((content, index) => ({
      content,
      metadata: {
        source: filename,
        chunkIndex: index,
        totalChunks: chunks.length,
      },
    }));
  }

  private chunkText(text: string): string[] {
    const { chunkSize, chunkOverlap } = RAG_CONFIG.chunking;
    const chunks: string[] = [];

    // Normalizuj whitespace
    const normalized = text.replace(/\s+/g, ' ').trim();

    let start = 0;
    while (start < normalized.length) {
      let end = start + chunkSize;

      // Spróbuj ciąć na końcu zdania lub spacji
      if (end < normalized.length) {
        const lastPeriod = normalized.lastIndexOf('.', end);
        const lastSpace = normalized.lastIndexOf(' ', end);
        const cutAt = lastPeriod > start + chunkSize * 0.5
          ? lastPeriod + 1
          : lastSpace > start + chunkSize * 0.5
            ? lastSpace
            : end;
        end = cutAt;
      }

      const chunk = normalized.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      start = end - chunkOverlap;
    }

    this.logger.log(`Text split into ${chunks.length} chunks`);
    return chunks;
  }
}
