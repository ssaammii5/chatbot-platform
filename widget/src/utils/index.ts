/**
 * widget/src/utils/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared utilities for the AI chat widget:
 *  - sanitize()       — strip potentially malicious HTML before rendering
 *  - renderMarkdown() — convert Markdown to safe HTML for chat messages
 *  - parseCitations() — extract [1], [2] style source references from bot text
 */

// ─── Sanitization ─────────────────────────────────────────────────────────────

/**
 * Allowed HTML elements for rendered Markdown inside chat bubbles.
 * Kept intentionally narrow — no scripts, forms, iframes, or event handlers.
 */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'code', 'pre', 'blockquote',
  'a',   // Only href allowed (see sanitizeHtml)
  'hr',
]);

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
};

/**
 * Strip all HTML from user-provided text to prevent XSS when displayed as plain text.
 * Use this for raw text content you won't render as HTML.
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize an HTML string by removing all tags/attributes not in the allowlist.
 * This is a lightweight DOM-based sanitizer safe for use in Shadow DOM.
 * For a full-featured sanitizer, consider DOMPurify (adds ~35 KB).
 */
export function sanitizeHtml(html: string): string {
  // Create a detached document fragment to parse the HTML safely
  const template = document.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;

  function cleanNode(node: Node): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        // Replace the element with its text content
        const text = document.createTextNode(el.textContent || '');
        el.replaceWith(text);
        return;
      }

      // Remove all non-allowed attributes
      const allowed = ALLOWED_ATTRS[tag] ?? [];
      const attrsToRemove: string[] = [];
      for (const attr of Array.from(el.attributes)) {
        if (!allowed.includes(attr.name)) {
          attrsToRemove.push(attr.name);
        }
      }
      attrsToRemove.forEach((a) => el.removeAttribute(a));

      // For links: force safe target/rel, block javascript: hrefs
      if (tag === 'a') {
        const href = el.getAttribute('href') ?? '';
        if (href.toLowerCase().startsWith('javascript:') || href.startsWith('data:')) {
          el.removeAttribute('href');
        }
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }

      // Recurse into children
      Array.from(el.childNodes).forEach(cleanNode);
    }
  }

  Array.from(fragment.childNodes).forEach(cleanNode);

  const div = document.createElement('div');
  div.appendChild(fragment);
  return div.innerHTML;
}

// ─── Markdown Rendering ───────────────────────────────────────────────────────

/**
 * Convert a Markdown string to safe HTML for display in chat bubbles.
 * Handles the subset of Markdown that's useful in chat:
 *   **bold**, *italic*, `code`, ```blocks```, [links](url), - lists
 *
 * Output is sanitized before being returned.
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';

  let html = markdown
    // Escape any existing < > & to prevent HTML injection before we add our own tags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

    // Code blocks (``` ... ```) — must come before inline code
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')

    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')

    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')

    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')

    // Links: [text](url)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')

    // Unordered lists (- item)
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')

    // Numbered lists (1. item)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap in paragraph tags
  html = `<p>${html}</p>`;

  return sanitizeHtml(html);
}

// ─── Citation Parser ──────────────────────────────────────────────────────────

export interface Citation {
  /** The citation index as it appears in the text, e.g. 1 for [1] */
  index: number;
  /** The raw citation marker, e.g. "[1]" */
  marker: string;
  /** Position in the original text where the marker starts */
  position: number;
}

/**
 * Extract citation markers like [1], [2], [Source 3] from bot responses.
 * These are placed by the LlamaIndex RAG engine referencing source documents.
 *
 * Returns an array of Citation objects in order of appearance.
 */
export function parseCitations(text: string): Citation[] {
  const CITATION_REGEX = /\[(\d+)\]/g;
  const citations: Citation[] = [];
  let match: RegExpExecArray | null;

  while ((match = CITATION_REGEX.exec(text)) !== null) {
    const index = parseInt(match[1], 10);
    // Deduplicate: only add each index once
    if (!citations.find((c) => c.index === index)) {
      citations.push({
        index,
        marker: match[0],
        position: match.index,
      });
    }
  }

  return citations.sort((a, b) => a.index - b.index);
}

/**
 * Replace citation markers in text with superscript HTML links.
 * e.g. "See [1] for details" → "See <sup>[1]</sup> for details"
 *
 * The output is sanitized before return.
 */
export function formatCitations(text: string): string {
  // Replace [N] with a styled superscript span
  const formatted = text.replace(/\[(\d+)\]/g, '<sup class="citation">[$1]</sup>');
  return sanitizeHtml(formatted);
}
