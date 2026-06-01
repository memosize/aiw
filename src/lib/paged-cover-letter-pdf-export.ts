import { toast } from 'sonner';
import { exportPagedDOMToPDF } from './paged-dom-pdf';

export interface CoverLetterExportOptions {
  filename: string;
  language?: 'en' | 'zh';
  senderInfo: {
    full_name: string;
    address?: string;
    email: string;
    phone: string;
  };
  recipientInfo?: {
    recruiter_name?: string;
    recruiter_title?: string;
    company_name: string;
    company_address?: string;
  };
  date: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function extractBodyContent(content: string): string {
  const lines = content.split('\n');
  const start = lines.findIndex((line) => line.trim().toLowerCase().startsWith('dear '));
  return start >= 0 ? lines.slice(start).join('\n') : content;
}

export async function exportCoverLetterToPDF(
  content: string,
  options: CoverLetterExportOptions
): Promise<void> {
  const { filename, language = 'en', senderInfo, recipientInfo, date } = options;

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
    lineHeight: '1.6',
    color: '#000000',
    boxSizing: 'border-box',
    whiteSpace: 'normal',
    wordBreak: language === 'zh' ? 'break-all' : 'break-word',
    overflowWrap: 'anywhere'
  });

  const sender = document.createElement('div');
  Object.assign(sender.style, {
    textAlign: 'right',
    marginBottom: '20pt'
  });
  [senderInfo.full_name, senderInfo.address, senderInfo.email, senderInfo.phone]
    .filter(Boolean)
    .forEach((value, index) => {
      const p = document.createElement('p');
      Object.assign(p.style, {
        margin: '0',
        fontWeight: index === 0 ? 'bold' : 'normal'
      });
      p.textContent = value ?? '';
      sender.appendChild(p);
    });
  container.appendChild(sender);

  const dateNode = document.createElement('p');
  Object.assign(dateNode.style, { margin: '0 0 20pt' });
  dateNode.textContent = formatDate(date);
  container.appendChild(dateNode);

  if (recipientInfo) {
    const recipient = document.createElement('div');
    Object.assign(recipient.style, { marginBottom: '20pt' });
    [
      recipientInfo.recruiter_name,
      recipientInfo.recruiter_title,
      recipientInfo.company_name,
      recipientInfo.company_address
    ]
      .filter(Boolean)
      .forEach((value) => {
        const p = document.createElement('p');
        Object.assign(p.style, { margin: '0' });
        p.textContent = value ?? '';
        recipient.appendChild(p);
      });
    container.appendChild(recipient);
  }

  extractBodyContent(content).split('\n\n').filter(Boolean).forEach((block) => {
    const p = document.createElement('p');
    Object.assign(p.style, {
      margin: '0 0 12pt',
      lineHeight: '1.6',
      whiteSpace: 'pre-wrap',
      wordBreak: language === 'zh' ? 'break-all' : 'break-word',
      overflowWrap: 'anywhere'
    });
    p.textContent = block.trim();
    container.appendChild(p);
  });

  document.body.appendChild(container);

  try {
    toast.loading('Generating PDF, please wait...', { id: 'pdf-export' });
    await exportPagedDOMToPDF({
      container,
      filename,
      margin: 20,
      quality: 0.95,
      scale: 2,
      title: 'Cover Letter',
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
