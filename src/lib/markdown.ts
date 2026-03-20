/**
 * Lightweight markdown renderer for chat messages.
 * Supports bold, italic, lists, and inline code.
 */

export function renderMarkdown(text: string): string {
  // 1. Sanitize raw HTML from LLM to prevent XSS (if any <script> tags leak)
  const sanitized = text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');

  let html = escapeHtml(sanitized);

  // Bold and italic replacements
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(?!\*)(.*?)(?<!\*)\*/g, '<em>$1</em>');

  // Process line by line for paragraphs and lists
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const listMatch = line.match(/^[-•*]\s+(.+)/) || line.match(/^\d+\.\s+(.+)/);
    
    if (listMatch) {
      if (!inList) { 
        result.push('<ul>'); 
        inList = true; 
      }
      result.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) { 
        result.push('</ul>'); 
        inList = false; 
      }
      if (line.trim() === '') {
        result.push(''); // blank line becomes empty string for joining
      } else {
        result.push(`<p>${line}</p>`);
      }
    }
  }
  
  if (inList) {
    result.push('</ul>');
  }

  // Join back and clean up empty paragraph gaps
  return result.join('\n').replace(/\n{2,}/g, '\n');
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };
  return text.replace(/[&<>]/g, (char) => map[char] || char);
}
