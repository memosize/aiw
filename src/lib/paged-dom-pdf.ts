import html2canvas from 'yd-html2canvas';
import { jsPDF } from 'jspdf';
import { buildPageSlices, collectOccupiedSegments, scaleSegments } from './pdf-pagination';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX_RATIO = 3.779527559;

type PageNumberAlign = 'center' | 'right';

interface PageNumberContext {
  pageIndex: number;
  totalPages: number;
  pdf: jsPDF;
  pdfWidth: number;
  pdfHeight: number;
  margin: number;
}

export interface PagedDOMPDFOptions {
  container: HTMLElement;
  filename: string;
  margin: number;
  quality: number;
  scale?: number;
  title?: string;
  author?: string;
  footerReservedMm?: number;
  backgroundColor?: string;
  pageNumberAlign?: PageNumberAlign;
  pageNumberFontSize?: number;
  renderPageLabel?: (context: PageNumberContext) => string;
}

function waitForLayout(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function renderPageSlice(
  container: HTMLElement,
  width: number,
  startY: number,
  sliceHeight: number,
  scale: number,
  backgroundColor: string
): Promise<HTMLCanvasElement> {
  const viewport = document.createElement('div');
  const clone = container.cloneNode(true) as HTMLElement;

  Object.assign(viewport.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: `${width}px`,
    height: `${sliceHeight}px`,
    overflow: 'hidden',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '-1',
    backgroundColor
  });

  Object.assign(clone.style, {
    position: 'absolute',
    top: `-${startY}px`,
    left: '0',
    width: `${width}px`,
    height: 'auto',
    minHeight: '0',
    maxWidth: 'none',
    transform: 'none',
    margin: '0'
  });

  viewport.appendChild(clone);
  document.body.appendChild(viewport);

  try {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
    await waitForLayout();

    return await html2canvas(viewport, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor,
      width,
      height: sliceHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: width,
      windowHeight: sliceHeight
    });
  } finally {
    if (viewport.isConnected) {
      document.body.removeChild(viewport);
    }
  }
}

export async function exportPagedDOMToPDF(
  options: PagedDOMPDFOptions
): Promise<void> {
  const {
    container,
    filename,
    margin,
    quality,
    scale = 2,
    title,
    author,
    footerReservedMm = 10,
    backgroundColor = '#ffffff',
    pageNumberAlign = 'center',
    pageNumberFontSize = 10,
    renderPageLabel
  } = options;

  const rect = container.getBoundingClientRect();
  const contentWidthPx = Math.ceil(
    Math.max(rect.width, container.scrollWidth, container.offsetWidth)
  );
  const contentHeightPx = Math.ceil(
    Math.max(rect.height, container.scrollHeight, container.offsetHeight)
  );

  if (contentWidthPx <= 0 || contentHeightPx <= 0) {
    throw new Error('Document content is empty');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const properties: { title?: string; author?: string } = {};
  if (title) {
    properties.title = title;
  }
  if (author) {
    properties.author = author;
  }
  if (Object.keys(properties).length > 0) {
    pdf.setProperties(properties);
  }

  const pdfWidth = A4_WIDTH_MM;
  const pdfHeight = A4_HEIGHT_MM;
  const availableWidthMm = pdfWidth - margin * 2;
  const availableHeightMm = pdfHeight - margin * 2 - footerReservedMm;
  const renderedCanvasWidthPx = contentWidthPx * scale;
  const widthScale = Math.min(
    (availableWidthMm * MM_TO_PX_RATIO) / renderedCanvasWidthPx,
    1
  );
  const renderedWidthMm = (renderedCanvasWidthPx / MM_TO_PX_RATIO) * widthScale;
  const pageContentHeightPx =
    (availableHeightMm * MM_TO_PX_RATIO) / widthScale;
  const totalRenderedHeightPx = Math.ceil(contentHeightPx * scale);
  const occupiedSegments = scaleSegments(
    collectOccupiedSegments(container),
    scale,
    totalRenderedHeightPx
  );
  const pageSlices = buildPageSlices(
    totalRenderedHeightPx,
    pageContentHeightPx,
    occupiedSegments
  );
  const totalPages = pageSlices.length;

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    const pageSlice = pageSlices[pageIndex];
    const sliceCanvas = await renderPageSlice(
      container,
      contentWidthPx,
      pageSlice.startY / scale,
      (pageSlice.endY - pageSlice.startY) / scale,
      scale,
      backgroundColor
    );

    const renderedHeightMm =
      (sliceCanvas.height / MM_TO_PX_RATIO) * widthScale;
    const offsetX = (pdfWidth - renderedWidthMm) / 2;

    pdf.addImage(
      sliceCanvas.toDataURL('image/jpeg', quality),
      'JPEG',
      offsetX,
      margin,
      renderedWidthMm,
      renderedHeightMm
    );

    const pageLabel = renderPageLabel?.({
      pageIndex,
      totalPages,
      pdf,
      pdfWidth,
      pdfHeight,
      margin
    });

    if (pageLabel) {
      pdf.setFontSize(pageNumberFontSize);
      pdf.setTextColor(128, 128, 128);

      if (pageNumberAlign === 'right') {
        pdf.text(pageLabel, pdfWidth - margin - 20, pdfHeight - margin / 2);
      } else {
        pdf.text(pageLabel, pdfWidth / 2, pdfHeight - margin / 2, { align: 'center' });
      }
    }
  }

  pdf.save(filename);
}
