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

    // TODO: Implementacja - wysyłanie wiadomości do API i odbieranie odpowiedzi
    // Przykład:
    // this.http.post<{ reply: string }>('/api/chat', { message: text }).subscribe({
    //   next: (response) => this.handleAssistantResponse(convId, loadingMsg.id, response.reply),
    //   error: (err) => this.handleError(convId, loadingMsg.id, err),
    // });

    // Symulacja odpowiedzi (placeholder - do zastąpienia przez prawdziwe API)
    this.simulatePlaceholderResponse(convId, loadingMsg.id, text);
  }

  // TODO: Implementacja - obsługa odpowiedzi z API
  private handleAssistantResponse(
    convId: string,
    loadingMsgId: string,
    reply: string
  ): void {
    this.replaceLoadingMessage(convId, loadingMsgId, reply);
    this.isTyping.set(false);
    this.shouldScrollToBottom = true;
  }

  // TODO: Implementacja - obsługa błędów z API
  private handleError(convId: string, loadingMsgId: string, err: unknown): void {
    console.error('Chat API error:', err);
    this.replaceLoadingMessage(
      convId,
      loadingMsgId,
      'Wystąpił błąd podczas komunikacji z serwerem. Spróbuj ponownie.'
    );
    this.isTyping.set(false);
    this.shouldScrollToBottom = true;
  }

  /** Tymczasowa symulacja - do usunięcia po wdrożeniu prawdziwego API */
  private simulatePlaceholderResponse(
    convId: string,
    loadingMsgId: string,
    _userText: string
  ): void {
    setTimeout(() => {
      const placeholder =
        '⚙️ *To jest odpowiedź zastępcza.* \n\nPrawdziwa implementacja czeka na podłączenie do API — szukaj znacznika `// TODO: Implementacja` w pliku `chat.component.ts`.';
      this.handleAssistantResponse(convId, loadingMsgId, placeholder);
    }, 1200);
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
