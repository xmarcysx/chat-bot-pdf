import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { PdfService } from './pdf.service';
import { EmbeddingService } from './embedding.service';
import { QdrantService } from './qdrant.service';

@Module({
  controllers: [RagController],
  providers: [RagService, PdfService, EmbeddingService, QdrantService],
})
export class RagModule {}
