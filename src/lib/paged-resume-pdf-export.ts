import { toast } from 'sonner';
import { exportPagedDOMToPDF } from './paged-dom-pdf';

interface ExportOptions {
  filename?: string;
  quality?: number;
  scale?: number;
  margin?: number;
}

export async function exportMultiPagePDF(
  elementId: string,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = `resume-${new Date().toISOString().slice(0, 10)}.pdf`,
    quality = 0.95,
    scale = 2,
    margin = 2
  } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Unable to find element: ${elementId}`);
  }

  try {
    toast.loading('Generating PDF, please wait...', { id: 'pdf-export' });
    await exportPagedDOMToPDF({
      container: element,
      filename,
      margin,
      quality,
      scale,
      footerReservedMm: 10,
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
  }
}
