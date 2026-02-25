import {
  Component,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MessageFormatPipe } from './message-format.pipe';

const API_BASE = 'http://localhost:3000/api/rag';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

let _msgCounter = 0;
function newId(): string {
  return `msg_${Date.now()}_${++_msgCounter}`;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageFormatPipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements AfterViewChecked {
  private http = inject(HttpClient);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLElement>;
  @ViewChild('inputTextarea') inputTextarea!: ElementRef<HTMLTextAreaElement>;

  // ── State ──────────────────────────────────────────────────────────────────
  conversations = signal<Conversation[]>([]);
  activeConversationId = signal<string | null>(null);
  userInput = signal<string>('');
  isSidebarOpen = signal<boolean>(true);
  isTyping = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  uploadStatus = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  private shouldScrollToBottom = false;

  // ── Derived ────────────────────────────────────────────────────────────────
  activeConversation = computed(() =>
    this.conversations().find((c) => c.id === this.activeConversationId())
  );

  messages = computed(() => this.activeConversation()?.messages ?? []);

  hasMessages = computed(() => this.messages().length > 0);

  // ── Sidebar suggestions ────────────────────────────────────────────────────
  suggestions = [
    { icon: '📄', text: 'Podsumuj dokument PDF' },
    { icon: '🔍', text: 'Znajdź kluczowe informacje' },
    { icon: '💡', text: 'Wyjaśnij skomplikowane pojęcia' },
    { icon: '📊', text: 'Przeanalizuj dane z pliku' },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  newConversation(): void {
    const conv: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'Nowa rozmowa',
      messages: [],
      createdAt: new Date(),
    };
    this.conversations.update((list) => [conv, ...list]);
    this.activeConversationId.set(conv.id);
  }

  selectConversation(id: string): void {
    this.activeConversationId.set(id);
    this.shouldScrollToBottom = true;
  }

  deleteConversation(event: Event, id: string): void {
    event.stopPropagation();
    this.conversations.update((list) => list.filter((c) => c.id !== id));
    if (this.activeConversationId() === id) {
      const remaining = this.conversations();
      this.activeConversationId.set(remaining[0]?.id ?? null);
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update((v) => !v);
  }

  onInputChange(value: string): void {
    this.userInput.set(value);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }

  useSuggestion(text: string): void {
    this.userInput.set(text);
    if (!this.activeConversationId()) {
      this.newConversation();
    }
    setTimeout(() => this.sendMessage(), 50);
  }

  sendMessage(): void {
    const text = this.userInput().trim();
    if (!text || this.isTyping()) return;

    // Ensure we have an active conversation
    if (!this.activeConversationId()) {
      this.newConversation();
    }

    const convId = this.activeConversationId()!;

    // Add user message
    const userMsg: Message = {
      id: newId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    this.addMessageToConversation(convId, userMsg);

    // Update conversation title from first message
    this.updateConversationTitle(convId, text);

    this.userInput.set('');
    this.resetTextareaHeight();
    this.isTyping.set(true);
    this.shouldScrollToBottom = true;

    // Add loading placeholder for assistant
    const loadingMsg: Message = {
      id: newId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };
    this.addMessageToConversation(convId, loadingMsg);

    this.callRagApi(convId, loadingMsg.id, text);
  }

  // ── RAG API ────────────────────────────────────────────────────────────────

  private async callRagApi(convId: string, loadingMsgId: string, question: string): Promise<void> {
    // Zbuduj historię (bez aktualnego pytania i loading message)
    const history = this.conversations()
      .find((c) => c.id === convId)
      ?.messages
      .filter((m) => !m.loading && m.id !== loadingMsgId)
      .slice(0, -1) // pomiń ostatnią user message (wysyłamy jako question)
      .map((m) => ({ role: m.role, content: m.content })) ?? [];

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      // Oznacz że odpowiedź już nie jest w loading
      this.replaceLoadingMessage(convId, loadingMsgId, '');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        const lines = raw.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;

          try {
            const { text } = JSON.parse(payload) as { text: string };
            accumulated += text;
            this.replaceLoadingMessage(convId, loadingMsgId, accumulated);
            this.shouldScrollToBottom = true;
          } catch {
            // ignoruj nieparsowalne linie
          }
        }
      }
    } catch (err) {
      console.error('RAG API error:', err);
      this.replaceLoadingMessage(
        convId,
        loadingMsgId,
        'Wystąpił błąd podczas komunikacji z serwerem. Upewnij się że backend (`nx serve api`) i Ollama działają.'
      );
    } finally {
      this.isTyping.set(false);
      this.shouldScrollToBottom = true;
    }
  }

  // ── PDF Upload ─────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadPdf(file);
    input.value = ''; // reset input
  }

  private uploadPdf(file: File): void {
    this.isUploading.set(true);
    this.uploadStatus.set(null);

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ message: string; chunksIngested: number }>(
      `${API_BASE}/upload`,
      formData
    ).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        this.uploadStatus.set({
          type: 'success',
          text: `✓ ${file.name} (${res.chunksIngested} fragmentów)`,
        });
        setTimeout(() => this.uploadStatus.set(null), 4000);
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadStatus.set({
          type: 'error',
          text: `✗ Błąd uploadu: ${err.message ?? 'nieznany błąd'}`,
        });
        setTimeout(() => this.uploadStatus.set(null), 5000);
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private addMessageToConversation(convId: string, msg: Message): void {
    this.conversations.update((list) =>
      list.map((c) =>
        c.id === convId ? { ...c, messages: [...c.messages, msg] } : c
      )
    );
  }

  private replaceLoadingMessage(
    convId: string,
    loadingMsgId: string,
    content: string
  ): void {
    this.conversations.update((list) =>
      list.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === loadingMsgId
                  ? { ...m, content, loading: false, timestamp: new Date() }
                  : m
              ),
            }
          : c
      )
    );
  }

  private updateConversationTitle(convId: string, firstMessage: string): void {
    const conv = this.conversations().find((c) => c.id === convId);
    if (!conv || conv.messages.length > 1) return;
    const title =
      firstMessage.length > 40
        ? firstMessage.slice(0, 40) + '…'
        : firstMessage;
    this.conversations.update((list) =>
      list.map((c) => (c.id === convId ? { ...c, title } : c))
    );
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private resetTextareaHeight(): void {
    const ta = this.inputTextarea?.nativeElement;
    if (ta) ta.style.height = 'auto';
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Dzisiaj';
    if (date.toDateString() === yesterday.toDateString()) return 'Wczoraj';
    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  }

  trackByMessage(_: number, msg: Message): string {
    return msg.id;
  }

  trackByConversation(_: number, conv: Conversation): string {
    return conv.id;
  }
}
