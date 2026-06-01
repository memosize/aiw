import { toast } from 'sonner';
import { exportPagedDOMToPDF } from './paged-dom-pdf';

export interface SOPExportOptions {
  filename: string;
  title?: string;
  target?: string;
  language?: 'en' | 'zh';
  includeDate?: boolean;
}

function getCurrentDate(language: 'en' | 'zh'): string {
  const now = new Date();
  if (language === 'zh') {
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }
  return now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function renderParagraphs(container: HTMLElement, content: string, language: 'en' | 'zh'): void {
  content.split('\n\n').filter(Boolean).forEach((block) => {
    const p = document.createElement('p');
    Object.assign(p.style, {
      margin: '0 0 12pt',
      lineHeight: '1.8',
      textAlign: language === 'zh' ? 'justify' : 'left'
    });
    p.textContent = block.trim();
    container.appendChild(p);
  });
}

export async function exportSOPToPDF(content: string, options: SOPExportOptions): Promise<void> {
  const {
    filename,
    title = 'Statement of Purpose',
    target,
    language = 'en',
    includeDate = true
  } = options;

  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    top: '-99999px',
    left: '-99999px',
    width: '170mm',
    backgroundColor: '#ffffff',
    padding: '20mm',
    fontFamily: language === 'zh'
      ? '"Songti SC", "SimSun", "STSong", serif'
      : '"Times New Roman", "Georgia", "Garamond", serif',
    fontSize: '12pt',
    lineHeight: '1.8',
    color: '#000000',
    boxSizing: 'border-box'
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    borderBottom: '2px solid #333',
    paddingBottom: '16pt',
    marginBottom: '20pt',
    textAlign: 'center'
  });

  const heading = document.createElement('h1');
  Object.assign(heading.style, {
    fontSize: '18pt',
    fontWeight: 'bold',
    margin: '0 0 12pt',
    letterSpacing: '2pt',
    textTransform: 'uppercase'
  });
  heading.textContent = title;
  header.appendChild(heading);

  if (target) {
    const targetNode = document.createElement('p');
    Object.assign(targetNode.style, {
      fontSize: '11pt',
      margin: '0 0 6pt'
    });
    targetNode.textContent = `Application Target: ${target}`;
    header.appendChild(targetNode);
  }

  if (includeDate) {
    const dateNode = document.createElement('p');
    Object.assign(dateNode.style, {
      fontSize: '10pt',
      margin: '0',
      color: '#666'
    });
    dateNode.textContent = getCurrentDate(language);
    header.appendChild(dateNode);
  }

  container.appendChild(header);
  renderParagraphs(container, content, language);
  document.body.appendChild(container);

  try {
    toast.loading('Generating PDF, please wait...', { id: 'pdf-export' });
    await exportPagedDOMToPDF({
      container,
      filename,
      margin: 20,
      quality: 0.95,
      scale: 2,
      title,
      pageNumberAlign: 'center',
      pageNumberFontSize: 9,
      renderPageLabel: ({ pageIndex, totalPages }) => `Page ${pageIndex + 1} of ${totalPages}`
    });
    toast.success('PDF exported successfully!', { id: 'pdf-export' });
  } catch (error) {
    console.error('PDF export failed:', error);
    toast.error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      id: 'pdf-export'
    });
    throw error;
  } finally {
    if (container.isConnected) {
      document.body.removeChild(container);
    }
  }
}
