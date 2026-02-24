import {
  Controller,
  Post,
  Body,
  Res,
  UploadedFile,
  UseInterceptors,
  Get,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import 'multer'; // augments Express.Multer namespace
import { RagService, ChatMessage } from './rag.service';

type MulterFile = Express.Multer.File;

interface ChatRequestDto {
  question: string;
  history?: ChatMessage[];
}

@Controller('rag')
export class RagController {
  private readonly logger = new Logger(RagController.name);

  constructor(private readonly ragService: RagService) {}

  /**
   * GET /api/rag/status
   * Sprawdź czy backend działa i ile wektorów jest w kolekcji
   */
  @Get('status')
  async getStatus() {
    return this.ragService.getStatus();
  }

  /**
   * POST /api/rag/upload
   * Prześlij plik PDF do indeksowania
   * Body: multipart/form-data z polem "file"
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(@UploadedFile() file: MulterFile) {
    if (!file) {
      throw new BadRequestException('Brak pliku. Wyślij PDF jako pole "file".');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Plik musi być w formacie PDF.');
    }

    this.logger.log(`Received file: ${file.originalname} (${file.size} bytes)`);

    const result = await this.ragService.ingestPdf(file.buffer, file.originalname);

    return {
      message: 'PDF zaindeksowany pomyślnie',
      filename: file.originalname,
      ...result,
    };
  }

  /**
   * POST /api/rag/chat
   * Wyślij pytanie i otrzymaj odpowiedź (SSE streaming)
   * Body: { question: string, history?: ChatMessage[] }
   */
  @Post('chat')
  async chat(@Body() body: ChatRequestDto, @Res() res: Response) {
    const { question, history = [] } = body;

    if (!question?.trim()) {
      throw new BadRequestException('Pole "question" jest wymagane.');
    }

    this.logger.log(`Chat question: "${question}"`);

    await this.ragService.chatStream(question, history, res);
  }
}
