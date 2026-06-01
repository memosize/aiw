import { toast } from 'sonner';
import { exportPagedDOMToPDF } from './paged-dom-pdf';

export interface MarkdownPDFOptions {
  filename?: string;
  title?: string;
  author?: string;
  language?: 'en' | 'zh';
  quality?: number;
  scale?: number;
  margin?: number;
}

const A4_WIDTH_MM = 210;

function parseInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="font-family: Courier New, monospace; background: #f5f5f5; padding: 2px 4px; border-radius: 3px;">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #0066cc; text-decoration: underline;">$1</a>');
}

function renderMarkdownContent(
  container: HTMLElement,
  content: string,
  language: 'en' | 'zh'
): void {
  const paragraphs = content.split('\n\n').filter((item) => item.trim());

  paragraphs.forEach((paragraph) => {
    const trimmed = paragraph.trim();

    if (trimmed.startsWith('### ')) {
      const h3 = document.createElement('h3');
      Object.assign(h3.style, {
        fontSize: '14pt',
        fontWeight: 'bold',
        margin: '16pt 0 10pt',
        color: '#1a1a1a'
      });
      h3.innerHTML = parseInlineMarkdown(trimmed.slice(4));
      container.appendChild(h3);
      return;
    }

    if (trimmed.startsWith('## ')) {
      const h2 = document.createElement('h2');
      Object.assign(h2.style, {
        fontSize: '16pt',
        fontWeight: 'bold',
        margin: '20pt 0 12pt',
        color: '#1a1a1a'
      });
      h2.innerHTML = parseInlineMarkdown(trimmed.slice(3));
      container.appendChild(h2);
      return;
    }

    if (trimmed.startsWith('# ')) {
      const h1 = document.createElement('h1');
      Object.assign(h1.style, {
        fontSize: '20pt',
        fontWeight: 'bold',
        margin: '24pt 0 16pt',
        color: '#1a1a1a'
      });
      h1.innerHTML = parseInlineMarkdown(trimmed.slice(2));
      container.appendChild(h1);
      return;
    }

    if (/^[-*] /m.test(trimmed)) {
      const ul = document.createElement('ul');
      Object.assign(ul.style, {
        margin: '0 0 12pt 24pt',
        listStyleType: 'disc'
      });
      trimmed.split('\n').forEach((line) => {
        if (!/^[-*] /.test(line)) return;
        const li = document.createElement('li');
        Object.assign(li.style, {
          marginBottom: '6pt',
          lineHeight: '1.6'
        });
        li.innerHTML = parseInlineMarkdown(line.slice(2));
        ul.appendChild(li);
      });
      container.appendChild(ul);
      return;
    }

    if (/^\d+\. /m.test(trimmed)) {
      const ol = document.createElement('ol');
      Object.assign(ol.style, {
        margin: '0 0 12pt 24pt'
      });
      trimmed.split('\n').forEach((line) => {
        if (!/^\d+\. /.test(line)) return;
        const li = document.createElement('li');
        Object.assign(li.style, {
          marginBottom: '6pt',
          lineHeight: '1.6'
        });
        li.innerHTML = parseInlineMarkdown(line.replace(/^\d+\. /, ''));
        ol.appendChild(li);
      });
      container.appendChild(ol);
      return;
    }

    const p = document.createElement('p');
    Object.assign(p.style, {
      margin: '0 0 12pt',
      lineHeight: '1.8',
      textAlign: language === 'zh' ? 'justify' : 'left'
    });
    p.innerHTML = parseInlineMarkdown(trimmed).replace(/\n/g, '<br />');
    container.appendChild(p);
  });
}

function createMarkdownContainer(
  content: string,
  language: 'en' | 'zh',
  title?: string
): HTMLDivElement {
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    top: '-99999px',
    left: '-99999px',
    width: `${A4_WIDTH_MM - 40}mm`,
    backgroundColor: '#ffffff',
    padding: '20mm',
    fontFamily: language === 'zh'
      ? '"Songti SC", "SimSun", "STSong", serif'
      : '"Times New Roman", "Georgia", "Garamond", serif',
    fontSize: '12pt',
    lineHeight: '1.8',
    color: '#000000',
    overflow: 'visible',
    boxSizing: 'border-box'
  });

  if (title) {
    const titleElement = document.createElement('h1');
    Object.assign(titleElement.style, {
      fontSize: '20pt',
      fontWeight: 'bold',
      textAlign: 'center',
      margin: '0 0 24pt',
      color: '#1a1a1a'
    });
    titleElement.textContent = title;
    container.appendChild(titleElement);
  }

  renderMarkdownContent(container, content, language);
  document.body.appendChild(container);
  return container;
}

export async function exportMarkdownToPDF(
  markdownContent: string,
  options: MarkdownPDFOptions = {}
): Promise<void> {
  const {
    filename = `document-${new Date().toISOString().slice(0, 10)}.pdf`,
    title,
    author,
    language = 'en',
    quality = 0.95,
    scale = 2,
    margin = 20
  } = options;

  let container: HTMLDivElement | null = null;

  try {
    toast.loading('Generating PDF, please wait...', { id: 'pdf-export' });
    container = createMarkdownContainer(markdownContent, language, title);

    await exportPagedDOMToPDF({
      container,
      filename,
      margin,
      quality,
      scale,
      title,
      author,
      pageNumberAlign: 'right',
      renderPageLabel: ({ pageIndex, totalPages }) => `${pageIndex + 1} / ${totalPages}`
    });

    toast.success('PDF exported successfully!', { id: 'pdf-export' });
  } catch (error) {
    console.error('PDF export failed:', error);
    toast.error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      id: 'pdf-export'
    });
    throw error;
  } finally {
    if (container?.isConnected) {
      document.body.removeChild(container);
    }
  }
}
