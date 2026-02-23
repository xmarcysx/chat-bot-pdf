import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/** Prosta konwersja Markdown-like → HTML dla wiadomości asystenta */
@Pipe({ name: 'messageFormat', standalone: true })
export class MessageFormatPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    if (!value) return '';

    const html = value
      // Bold **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic *text*
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Inline code `code`
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Newlines → <br>
      .replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
