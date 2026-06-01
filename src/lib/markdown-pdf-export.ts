import html2canvas from 'yd-html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { buildPageSlices, collectOccupiedSegments, scaleSegments } from './pdf-pagination';

export interface MarkdownPDFOptions {
  filename?: string;
  title?: string;
  author?: string;
  language?: 'en' | 'zh';
  quality?: number;
  scale?: number;
  margin?: number;
}

/**
 * Markdown PDF 导出工具类
 * 使用 HTML 渲染 + html2canvas 方式，参考简历模块的高质量 PDF 导出
 */
export class MarkdownPDFExporter {
  // A4 页面尺寸常量
  private static readonly A4_WIDTH_MM = 210;
  private static readonly A4_HEIGHT_MM = 297;
  private static readonly MM_TO_PX_RATIO = 3.779527559; // 1mm = 3.78px at 96dpi

  /**
   * 导出 Markdown 为高质量 PDF
   * @param markdownContent Markdown 格式的文本内容
   * @param options 导出选项
   */
  static async exportToPDF(
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

    try {
      toast.loading('正在生成高质量 PDF，请稍候...', { id: 'pdf-export' });

      // 1. 创建临时容器并渲染 Markdown
      const container = this.createMarkdownContainer(
        markdownContent,
        language,
        title
      );

      // 2. 等待渲染完成（两帧确保浏览器完成重排）
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );

      // 3. 计算容器尺寸
      const rect = container.getBoundingClientRect();
      const computedWidth = Math.ceil(
        Math.max(rect.width, container.scrollWidth, container.offsetWidth)
      );
      const computedHeight = Math.ceil(
        Math.max(rect.height, container.scrollHeight, container.offsetHeight)
      );

      // 4. 生成高分辨率 canvas
      const canvas = await html2canvas(container, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: computedWidth,
        height: computedHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: computedWidth,
        windowHeight: computedHeight
      });

      // 5. 移除临时容器

      // 6. 创建多页 PDF
      await this.createMultiPagePDF(container, canvas, filename, margin, quality, title, author);
      if (container.isConnected) {
        document.body.removeChild(container);
      }

      toast.success('PDF 导出成功！', { id: 'pdf-export' });
    } catch (error) {
      console.error('PDF 导出失败:', error);
      toast.error(
        `PDF 导出失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { id: 'pdf-export' }
      );
      throw error;
    }
  }

  /**
   * 创建临时 DOM 容器来渲染 Markdown
   * 使用内联样式避免依赖外部 CSS
   */
  private static createMarkdownContainer(
    content: string,
    language: 'en' | 'zh',
    title?: string
  ): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'markdown-pdf-temp-container';

    // 设置容器样式（固定定位到屏幕外）
    Object.assign(container.style, {
      position: 'fixed',
      top: '-99999px',
      left: '-99999px',
      width: `${this.A4_WIDTH_MM - 40}mm`, // A4 width - margins
      backgroundColor: 'white',
      padding: '20mm',
      fontFamily: language === 'zh'
        ? '"Songti SC", "SimSun", "STSong", "宋体", serif'
        : '"Times New Roman", "Georgia", "Garamond", serif',
      fontSize: '12pt',
      lineHeight: '1.8',
      color: '#000000',
      overflow: 'visible',
      boxSizing: 'border-box'
    });

    document.body.appendChild(container);

    // 渲染标题（如果有）
    if (title) {
      const titleElement = document.createElement('h1');
      Object.assign(titleElement.style, {
        fontSize: '20pt',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '24pt',
        marginTop: '0',
        color: '#1a1a1a',
        pageBreakAfter: 'avoid'
      });
      titleElement.textContent = title;
      container.appendChild(titleElement);
    }

    // 渲染 Markdown 内容
    this.renderMarkdownContent(container, content, language);

    return container;
  }

  /**
   * 渲染 Markdown 内容为 HTML
   * 使用简化的 Markdown 解析（支持常用格式）
   */
  private static renderMarkdownContent(
    container: HTMLElement,
    content: string,
    language: 'en' | 'zh'
  ): void {
    // 按段落分割
    const paragraphs = content.split('\n\n').filter((p: string) => p.trim());

    paragraphs.forEach((para: string) => {
      const trimmed = para.trim();

      // 标题 (## 或 ###)
      if (trimmed.startsWith('### ')) {
        const h3 = document.createElement('h3');
        Object.assign(h3.style, {
          fontSize: '14pt',
          fontWeight: 'bold',
          marginTop: '16pt',
          marginBottom: '10pt',
          color: '#1a1a1a',
          pageBreakAfter: 'avoid'
        });
        h3.innerHTML = this.parseInlineMarkdown(trimmed.slice(4));
        container.appendChild(h3);
      } else if (trimmed.startsWith('## ')) {
        const h2 = document.createElement('h2');
        Object.assign(h2.style, {
          fontSize: '16pt',
          fontWeight: 'bold',
          marginTop: '20pt',
          marginBottom: '12pt',
          color: '#1a1a1a',
          pageBreakAfter: 'avoid'
        });
        h2.innerHTML = this.parseInlineMarkdown(trimmed.slice(3));
        container.appendChild(h2);
      } else if (trimmed.startsWith('# ')) {
        const h1 = document.createElement('h1');
        Object.assign(h1.style, {
          fontSize: '20pt',
          fontWeight: 'bold',
          marginTop: '24pt',
          marginBottom: '16pt',
          color: '#1a1a1a',
          pageBreakAfter: 'avoid'
        });
        h1.innerHTML = this.parseInlineMarkdown(trimmed.slice(2));
        container.appendChild(h1);
      }
      // 无序列表
      else if (trimmed.match(/^[-*] /)) {
        const ul = document.createElement('ul');
        Object.assign(ul.style, {
          marginLeft: '24pt',
          marginBottom: '12pt',
          listStyleType: 'disc'
        });
        const lines = trimmed.split('\n');
        lines.forEach((line: string) => {
          if (line.match(/^[-*] /)) {
            const li = document.createElement('li');
            Object.assign(li.style, {
              marginBottom: '6pt',
              lineHeight: '1.6'
            });
            li.innerHTML = this.parseInlineMarkdown(line.slice(2));
            ul.appendChild(li);
          }
        });
        container.appendChild(ul);
      }
      // 有序列表
      else if (trimmed.match(/^\d+\. /)) {
        const ol = document.createElement('ol');
        Object.assign(ol.style, {
          marginLeft: '24pt',
          marginBottom: '12pt'
        });
        const lines = trimmed.split('\n');
        lines.forEach((line: string) => {
          if (line.match(/^\d+\. /)) {
            const li = document.createElement('li');
            Object.assign(li.style, {
              marginBottom: '6pt',
              lineHeight: '1.6'
            });
            li.innerHTML = this.parseInlineMarkdown(line.replace(/^\d+\. /, ''));
            ul.appendChild(li);
          }
        });
        container.appendChild(ol);
      }
      // 引用块
      else if (trimmed.startsWith('> ')) {
        const blockquote = document.createElement('blockquote');
        Object.assign(blockquote.style, {
          borderLeft: '4px solid #ddd',
          paddingLeft: '16pt',
          marginLeft: '0',
          marginRight: '0',
          marginBottom: '12pt',
          fontStyle: 'italic',
          color: '#666'
        });
        blockquote.innerHTML = this.parseInlineMarkdown(trimmed.slice(2));
        container.appendChild(blockquote);
      }
      // 普通段落
      else {
        const p = document.createElement('p');
        Object.assign(p.style, {
          textAlign: language === 'zh' ? 'justify' : 'left',
          textIndent: language === 'zh' ? '2em' : '0',
          marginBottom: '12pt',
          lineHeight: '1.8',
          orphans: '2',
          widows: '2'
        });
        p.innerHTML = this.parseInlineMarkdown(trimmed);
        container.appendChild(p);
      }
    });
  }

  /**
   * 解析行内 Markdown 格式（粗体、斜体、代码）
   */
  private static parseInlineMarkdown(text: string): string {
    return text
      // 粗体 **text** 或 __text__
      .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
      .replace(/__(.+?)__/g, '<strong style="font-weight: bold;">$1</strong>')
      // 斜体 *text* 或 _text_
      .replace(/\*(.+?)\*/g, '<em style="font-style: italic;">$1</em>')
      .replace(/_(.+?)_/g, '<em style="font-style: italic;">$1</em>')
      // 行内代码 `code`
      .replace(/`(.+?)`/g, '<code style="font-family: \'Courier New\', monospace; background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px;">$1</code>')
      // 链接 [text](url)
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #0066cc; text-decoration: underline;">$1</a>');
  }

  /**
   * 创建多页 PDF
   * 参考简历模块的分页算法
   */
  private static async createMultiPagePDF(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    filename: string,
    margin: number,
    quality: number,
    title?: string,
    author?: string
  ): Promise<void> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 设置文档元数据
    if (title) {
      pdf.setProperties({ title });
    }
    if (author) {
      pdf.setProperties({ author });
    }

    const pdfWidth = this.A4_WIDTH_MM;
    const pdfHeight = this.A4_HEIGHT_MM;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = pdfHeight - margin * 2;

    // 计算缩放比例
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const renderScale = canvasHeight / Math.max(container.scrollHeight, container.offsetHeight, 1);
    const widthRatio = (contentWidth * this.MM_TO_PX_RATIO) / canvasWidth;
    const scale = Math.min(widthRatio, 1); // 只缩小，不放大

    // 计算实际内容尺寸(mm)
    const scaledWidth = (canvasWidth / this.MM_TO_PX_RATIO) * scale;

    // 计算每页可容纳的内容高度(px)
    const pageContentHeightPx = (contentHeight * this.MM_TO_PX_RATIO) / scale;
    const occupiedSegments = scaleSegments(
      collectOccupiedSegments(container),
      renderScale,
      canvasHeight
    );
    const pageSlices = buildPageSlices(canvasHeight, pageContentHeightPx, occupiedSegments);
    const totalPages = pageSlices.length;

    console.log(`[Markdown PDF] 内容总高度: ${canvasHeight}px, 每页高度: ${pageContentHeightPx}px, 总页数: ${totalPages}`);

    // 分页处理
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      // 计算当前页的内容区域
      const { startY, endY } = pageSlices[pageIndex];
      const currentPageHeight = endY - startY;

      // 创建当前页的 canvas
      const pageCanvas = document.createElement('canvas');
      const pageCtx = pageCanvas.getContext('2d')!;
      pageCanvas.width = canvasWidth;
      pageCanvas.height = currentPageHeight;

      // 绘制当前页内容
      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, canvasWidth, currentPageHeight);
      pageCtx.drawImage(
        canvas,
        0, startY, canvasWidth, currentPageHeight,
        0, 0, canvasWidth, currentPageHeight
      );

      // 转换为图片并添加到 PDF
      const imgData = pageCanvas.toDataURL('image/jpeg', quality);
      const imgHeight = (currentPageHeight / this.MM_TO_PX_RATIO) * scale;

      // 居中放置
      const x = (pdfWidth - scaledWidth) / 2;
      const y = margin;

      pdf.addImage(imgData, 'JPEG', x, y, scaledWidth, imgHeight);

      // 添加页码
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text(
        `${pageIndex + 1} / ${totalPages}`,
        pdfWidth - margin - 20,
        pdfHeight - margin - 5
      );
    }

    // 保存 PDF
    pdf.save(filename);
  }
}

/**
 * 便捷导出函数 - Markdown 转 PDF
 */
export async function exportMarkdownToPDF(
  content: string,
  options: MarkdownPDFOptions = {}
): Promise<void> {
  return MarkdownPDFExporter.exportToPDF(content, options);
}
