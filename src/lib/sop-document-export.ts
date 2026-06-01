import html2canvas from 'yd-html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  Packer,
  Header,
  Footer,
  PageNumber,
  NumberFormat
} from 'docx';
import { toast } from 'sonner';
import { buildPageSlices, collectOccupiedSegments, scaleSegments } from './pdf-pagination';

/**
 * SOP 导出选项接口
 */
export interface SOPExportOptions {
  filename: string;
  title?: string;         // 默认 "Statement of Purpose"
  target?: string;        // 申请目标（学校/项目）
  language?: 'en' | 'zh';
  includeDate?: boolean;  // 是否包含日期，默认 true
}

// A4 页面尺寸常量
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX_RATIO = 3.779527559; // 1mm = 3.78px at 96dpi

/**
 * 获取当前日期字符串
 */
function getCurrentDate(language: 'en' | 'zh'): string {
  const now = new Date();
  if (language === 'zh') {
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  }
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

/**
 * 导出 SOP 为 TXT 格式（带格式化）
 */
export async function exportSOPToTXT(
  content: string,
  options: SOPExportOptions
): Promise<void> {
  const {
    filename,
    title = 'Statement of Purpose',
    target,
    language = 'en',
    includeDate = true
  } = options;

  try {
    const separator = '═'.repeat(50);
    const thinSeparator = '─'.repeat(50);

    let formattedContent = '';

    // 标题区域
    formattedContent += `${separator}\n`;
    formattedContent += `${title.toUpperCase().padStart((50 + title.length) / 2).padEnd(50)}\n`;
    formattedContent += `${separator}\n\n`;

    // 申请目标
    if (target) {
      const targetLabel = language === 'zh' ? '申请目标' : 'Application Target';
      formattedContent += `${targetLabel}: ${target}\n`;
    }

    // 日期
    if (includeDate) {
      const dateLabel = language === 'zh' ? '日期' : 'Date';
      formattedContent += `${dateLabel}: ${getCurrentDate(language)}\n`;
    }

    if (target || includeDate) {
      formattedContent += `\n${thinSeparator}\n\n`;
    }

    // 正文内容
    formattedContent += content;

    // 创建并下载文件
    const blob = new Blob([formattedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(language === 'zh' ? 'TXT 文件已导出' : 'TXT file exported');
  } catch (error) {
    console.error('TXT 导出失败:', error);
    toast.error(language === 'zh' ? 'TXT 导出失败' : 'TXT export failed');
    throw error;
  }
}

/**
 * 导出 SOP 为 PDF 格式（带专业格式化）
 */
export async function exportSOPToPDF(
  content: string,
  options: SOPExportOptions
): Promise<void> {
  const {
    filename,
    title = 'Statement of Purpose',
    target,
    language = 'en',
    includeDate = true
  } = options;

  try {
    toast.loading(
      language === 'zh' ? '正在生成 PDF，请稍候...' : 'Generating PDF, please wait...',
      { id: 'pdf-export' }
    );

    // 创建临时容器
    const container = document.createElement('div');
    container.id = 'sop-pdf-temp-container';

    // 设置容器样式
    Object.assign(container.style, {
      position: 'fixed',
      top: '-99999px',
      left: '-99999px',
      width: `${A4_WIDTH_MM - 40}mm`,
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

    // 标题区域
    const headerDiv = document.createElement('div');
    Object.assign(headerDiv.style, {
      borderBottom: '2px solid #333',
      paddingBottom: '16pt',
      marginBottom: '20pt',
      textAlign: 'center'
    });

    // 主标题
    const titleElement = document.createElement('h1');
    Object.assign(titleElement.style, {
      fontSize: '18pt',
      fontWeight: 'bold',
      margin: '0 0 12pt 0',
      color: '#1a1a1a',
      letterSpacing: '2pt',
      textTransform: 'uppercase'
    });
    titleElement.textContent = title;
    headerDiv.appendChild(titleElement);

    // 申请目标
    if (target) {
      const targetElement = document.createElement('p');
      Object.assign(targetElement.style, {
        fontSize: '11pt',
        margin: '0 0 6pt 0',
        color: '#444'
      });
      const targetLabel = language === 'zh' ? '申请目标' : 'Application Target';
      targetElement.textContent = `${targetLabel}: ${target}`;
      headerDiv.appendChild(targetElement);
    }

    // 日期
    if (includeDate) {
      const dateElement = document.createElement('p');
      Object.assign(dateElement.style, {
        fontSize: '10pt',
        margin: '0',
        color: '#666'
      });
      dateElement.textContent = getCurrentDate(language);
      headerDiv.appendChild(dateElement);
    }

    container.appendChild(headerDiv);

    // 渲染正文内容
    renderMarkdownContent(container, content, language);

    // 等待渲染完成
    await new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );

    // 计算容器尺寸
    const rect = container.getBoundingClientRect();
    const computedWidth = Math.ceil(
      Math.max(rect.width, container.scrollWidth, container.offsetWidth)
    );
    const computedHeight = Math.ceil(
      Math.max(rect.height, container.scrollHeight, container.offsetHeight)
    );

    // 生成高分辨率 canvas
    const canvas = await html2canvas(container, {
      scale: 2,
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

    // 移除临时容器

    // 创建多页 PDF
    await createMultiPagePDF(container, canvas, filename, 20, 0.95, title, language);
    if (container.isConnected) {
      document.body.removeChild(container);
    }

    toast.success(
      language === 'zh' ? 'PDF 导出成功！' : 'PDF exported successfully!',
      { id: 'pdf-export' }
    );
  } catch (error) {
    console.error('PDF 导出失败:', error);
    toast.error(
      language === 'zh'
        ? `PDF 导出失败: ${error instanceof Error ? error.message : '未知错误'}`
        : `PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { id: 'pdf-export' }
    );
    throw error;
  }
}

/**
 * 导出 SOP 为 DOCX 格式（带专业格式化）
 */
export async function exportSOPToDOCX(
  content: string,
  options: SOPExportOptions
): Promise<void> {
  const {
    filename,
    title = 'Statement of Purpose',
    target,
    language = 'en',
    includeDate = true
  } = options;

  try {
    toast.loading(
      language === 'zh' ? '正在生成 Word 文档，请稍候...' : 'Generating Word document, please wait...',
      { id: 'docx-export' }
    );

    const docParagraphs: Paragraph[] = [];
    const fontFamily = language === 'zh' ? '宋体' : 'Times New Roman';

    // 主标题
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title.toUpperCase(),
            font: fontFamily,
            size: 36, // 18pt
            bold: true
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 200
        }
      })
    );

    // 申请目标
    if (target) {
      const targetLabel = language === 'zh' ? '申请目标' : 'Application Target';
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${targetLabel}: ${target}`,
              font: fontFamily,
              size: 22, // 11pt
              color: '444444'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 100
          }
        })
      );
    }

    // 日期
    if (includeDate) {
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: getCurrentDate(language),
              font: fontFamily,
              size: 20, // 10pt
              color: '666666'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 200
          }
        })
      );
    }

    // 分隔线（使用下划线段落）
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '─'.repeat(60),
            font: fontFamily,
            size: 20,
            color: '333333'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 200,
          after: 400
        }
      })
    );

    // 解析并添加正文内容
    const paragraphs = content.split('\n\n').filter((p: string) => p.trim());

    paragraphs.forEach((para: string, index: number) => {
      const trimmed = para.trim();

      // 检查是否是标题
      if (trimmed.startsWith('### ')) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmed.slice(4),
                font: fontFamily,
                size: 26, // 13pt
                bold: true
              })
            ],
            spacing: {
              before: 300,
              after: 150
            }
          })
        );
      } else if (trimmed.startsWith('## ')) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmed.slice(3),
                font: fontFamily,
                size: 28, // 14pt
                bold: true
              })
            ],
            spacing: {
              before: 400,
              after: 200
            }
          })
        );
      } else if (trimmed.startsWith('# ')) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmed.slice(2),
                font: fontFamily,
                size: 32, // 16pt
                bold: true
              })
            ],
            spacing: {
              before: 500,
              after: 250
            }
          })
        );
      } else {
        // 普通段落
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmed.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1'),
                font: fontFamily,
                size: 24 // 12pt
              })
            ],
            spacing: {
              before: index === 0 ? 0 : 200,
              after: 200,
              line: 360 // 1.5倍行距
            },
            alignment: language === 'zh' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT
          })
        );
      }
    });

    // 创建带页眉页脚的文档
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                bottom: 1440,
                left: 1440,
                right: 1440
              }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: title,
                      font: fontFamily,
                      size: 18, // 9pt
                      color: '888888'
                    })
                  ],
                  alignment: AlignmentType.RIGHT
                })
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: fontFamily,
                      size: 18
                    }),
                    new TextRun({
                      text: ' / ',
                      font: fontFamily,
                      size: 18
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      font: fontFamily,
                      size: 18
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ]
            })
          },
          children: docParagraphs
        }
      ],
      creator: 'Essmote AI',
      title: title
    });

    // 生成并保存文档
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);

    toast.success(
      language === 'zh' ? 'Word 文档导出成功！' : 'Word document exported successfully!',
      { id: 'docx-export' }
    );
  } catch (error) {
    console.error('DOCX 导出失败:', error);
    toast.error(
      language === 'zh'
        ? `Word 文档导出失败: ${error instanceof Error ? error.message : '未知错误'}`
        : `Word export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { id: 'docx-export' }
    );
    throw error;
  }
}

/**
 * 渲染 Markdown 内容为 HTML
 */
function renderMarkdownContent(
  container: HTMLElement,
  content: string,
  language: 'en' | 'zh'
): void {
  const paragraphs = content.split('\n\n').filter((p: string) => p.trim());

  paragraphs.forEach((para: string) => {
    const trimmed = para.trim();

    // 标题
    if (trimmed.startsWith('### ')) {
      const h3 = document.createElement('h3');
      Object.assign(h3.style, {
        fontSize: '13pt',
        fontWeight: 'bold',
        marginTop: '16pt',
        marginBottom: '10pt',
        color: '#1a1a1a'
      });
      h3.innerHTML = parseInlineMarkdown(trimmed.slice(4));
      container.appendChild(h3);
    } else if (trimmed.startsWith('## ')) {
      const h2 = document.createElement('h2');
      Object.assign(h2.style, {
        fontSize: '14pt',
        fontWeight: 'bold',
        marginTop: '20pt',
        marginBottom: '12pt',
        color: '#1a1a1a'
      });
      h2.innerHTML = parseInlineMarkdown(trimmed.slice(3));
      container.appendChild(h2);
    } else if (trimmed.startsWith('# ')) {
      const h1 = document.createElement('h1');
      Object.assign(h1.style, {
        fontSize: '16pt',
        fontWeight: 'bold',
        marginTop: '24pt',
        marginBottom: '16pt',
        color: '#1a1a1a'
      });
      h1.innerHTML = parseInlineMarkdown(trimmed.slice(2));
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
          li.innerHTML = parseInlineMarkdown(line.slice(2));
          ul.appendChild(li);
        }
      });
      container.appendChild(ul);
    }
    // 普通段落
    else {
      const p = document.createElement('p');
      Object.assign(p.style, {
        textAlign: language === 'zh' ? 'justify' : 'left',
        textIndent: language === 'zh' ? '2em' : '0',
        marginBottom: '12pt',
        lineHeight: '1.8'
      });
      p.innerHTML = parseInlineMarkdown(trimmed);
      container.appendChild(p);
    }
  });
}

/**
 * 解析行内 Markdown 格式
 */
function parseInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
    .replace(/__(.+?)__/g, '<strong style="font-weight: bold;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="font-style: italic;">$1</em>')
    .replace(/_(.+?)_/g, '<em style="font-style: italic;">$1</em>')
    .replace(/`(.+?)`/g, '<code style="font-family: monospace; background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px;">$1</code>');
}

/**
 * 创建多页 PDF
 */
async function createMultiPagePDF(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  filename: string,
  margin: number,
  quality: number,
  title: string,
  language: 'en' | 'zh'
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  pdf.setProperties({ title });

  const pdfWidth = A4_WIDTH_MM;
  const pdfHeight = A4_HEIGHT_MM;
  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = pdfHeight - margin * 2;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const renderScale = canvasHeight / Math.max(container.scrollHeight, container.offsetHeight, 1);
  const widthRatio = (contentWidth * MM_TO_PX_RATIO) / canvasWidth;
  const scale = Math.min(widthRatio, 1);

  const scaledWidth = (canvasWidth / MM_TO_PX_RATIO) * scale;
  const pageContentHeightPx = (contentHeight * MM_TO_PX_RATIO) / scale;
  const occupiedSegments = scaleSegments(
    collectOccupiedSegments(container),
    renderScale,
    canvasHeight
  );
  const pageSlices = buildPageSlices(canvasHeight, pageContentHeightPx, occupiedSegments);
  const totalPages = pageSlices.length;

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    const { startY, endY } = pageSlices[pageIndex];
    const currentPageHeight = endY - startY;

    const pageCanvas = document.createElement('canvas');
    const pageCtx = pageCanvas.getContext('2d')!;
    pageCanvas.width = canvasWidth;
    pageCanvas.height = currentPageHeight;

    pageCtx.fillStyle = '#ffffff';
    pageCtx.fillRect(0, 0, canvasWidth, currentPageHeight);
    pageCtx.drawImage(
      canvas,
      0, startY, canvasWidth, currentPageHeight,
      0, 0, canvasWidth, currentPageHeight
    );

    const imgData = pageCanvas.toDataURL('image/jpeg', quality);
    const imgHeight = (currentPageHeight / MM_TO_PX_RATIO) * scale;
    const x = (pdfWidth - scaledWidth) / 2;
    const y = margin;

    pdf.addImage(imgData, 'JPEG', x, y, scaledWidth, imgHeight);

    // 页码
    pdf.setFontSize(9);
    pdf.setTextColor(128, 128, 128);
    const pageText = language === 'zh'
      ? `第 ${pageIndex + 1} 页 / 共 ${totalPages} 页`
      : `Page ${pageIndex + 1} of ${totalPages}`;
    pdf.text(pageText, pdfWidth / 2, pdfHeight - margin / 2, { align: 'center' });
  }

  pdf.save(filename);
}
