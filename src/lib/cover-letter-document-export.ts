import html2canvas from 'yd-html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Packer,
  Header,
  Footer,
  PageNumber
} from 'docx';
import { toast } from 'sonner';
import { buildPageSlices, collectSafePageBreaks } from './pdf-pagination';

/**
 * Cover Letter 导出选项接口
 */
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

// A4 页面尺寸常量
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX_RATIO = 3.779527559; // 1mm = 3.78px at 96dpi

/**
 * 格式化日期
 */
function formatDate(dateStr: string, language: 'en' | 'zh'): string {
  if (!dateStr) {
    const now = new Date();
    if (language === 'zh') {
      return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    }
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  }

  // 尝试解析日期字符串
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr; // 如果无法解析，返回原始字符串
  }

  if (language === 'zh') {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * 从内容中提取正文部分（去除信头信息）
 */
function extractBodyContent(content: string): string {
  // 查找 "Dear" 开头的行，从那里开始是正文
  const lines = content.split('\n');
  let bodyStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase().startsWith('dear ') ||
        lines[i].trim().startsWith('尊敬的')) {
      bodyStartIndex = i;
      break;
    }
  }

  // 返回从 Dear 开始的所有内容
  return lines.slice(bodyStartIndex).join('\n');
}

/**
 * 导出 Cover Letter 为 TXT 格式（带专业格式化）
 */
export async function exportCoverLetterToTXT(
  content: string,
  options: CoverLetterExportOptions
): Promise<void> {
  const {
    filename,
    language = 'en',
    senderInfo,
    recipientInfo,
    date
  } = options;

  try {
    let formattedContent = '';
    const lineWidth = 70; // 行宽用于右对齐

    // 右对齐辅助函数
    const rightAlign = (text: string): string => {
      const padding = Math.max(0, lineWidth - text.length);
      return ' '.repeat(padding) + text;
    };

    // 发件人信息（右对齐）
    formattedContent += `${rightAlign(senderInfo.full_name)}\n`;
    if (senderInfo.address) {
      formattedContent += `${rightAlign(senderInfo.address)}\n`;
    }
    formattedContent += `${rightAlign(senderInfo.email)}\n`;
    formattedContent += `${rightAlign(senderInfo.phone)}\n`;
    formattedContent += '\n';

    // 日期（左对齐）
    formattedContent += `${formatDate(date, language)}\n`;
    formattedContent += '\n';

    // 收件人信息
    if (recipientInfo) {
      if (recipientInfo.recruiter_name) {
        formattedContent += `${recipientInfo.recruiter_name}\n`;
      }
      if (recipientInfo.recruiter_title) {
        formattedContent += `${recipientInfo.recruiter_title}\n`;
      }
      formattedContent += `${recipientInfo.company_name}\n`;
      if (recipientInfo.company_address) {
        formattedContent += `${recipientInfo.company_address}\n`;
      }
      formattedContent += '\n';
    }

    // 正文内容
    const bodyContent = extractBodyContent(content);
    formattedContent += bodyContent;

    // 如果正文没有签名，添加签名
    if (!bodyContent.toLowerCase().includes('sincerely') &&
        !bodyContent.includes('此致') &&
        !bodyContent.includes('敬上')) {
      formattedContent += '\n\n';
      formattedContent += language === 'zh' ? '此致敬礼，\n\n' : 'Sincerely,\n\n';
      formattedContent += `${senderInfo.full_name}\n`;
      formattedContent += `${senderInfo.email} | ${senderInfo.phone}`;
    }

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
 * 导出 Cover Letter 为 PDF 格式（带专业格式化）
 */
export async function exportCoverLetterToPDF(
  content: string,
  options: CoverLetterExportOptions
): Promise<void> {
  const {
    filename,
    language = 'en',
    senderInfo,
    recipientInfo,
    date
  } = options;

  try {
    toast.loading(
      language === 'zh' ? '正在生成 PDF，请稍候...' : 'Generating PDF, please wait...',
      { id: 'pdf-export' }
    );

    // 创建临时容器
    const container = document.createElement('div');
    container.id = 'cover-letter-pdf-temp-container';

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
      lineHeight: '1.6',
      color: '#000000',
      overflow: 'visible',
      boxSizing: 'border-box'
    });

    document.body.appendChild(container);

    // 发件人信息区域（右对齐）
    const senderDiv = document.createElement('div');
    Object.assign(senderDiv.style, {
      marginBottom: '20pt',
      textAlign: 'right'
    });

    // 发件人姓名
    const senderName = document.createElement('p');
    Object.assign(senderName.style, {
      margin: '0',
      fontWeight: 'bold',
      fontSize: '12pt'
    });
    senderName.textContent = senderInfo.full_name;
    senderDiv.appendChild(senderName);

    // 发件人地址
    if (senderInfo.address) {
      const senderAddress = document.createElement('p');
      Object.assign(senderAddress.style, { margin: '0', fontSize: '12pt' });
      senderAddress.textContent = senderInfo.address;
      senderDiv.appendChild(senderAddress);
    }

    // 发件人邮箱
    const senderEmail = document.createElement('p');
    Object.assign(senderEmail.style, { margin: '0', fontSize: '12pt' });
    senderEmail.textContent = senderInfo.email;
    senderDiv.appendChild(senderEmail);

    // 发件人电话
    const senderPhone = document.createElement('p');
    Object.assign(senderPhone.style, { margin: '0', fontSize: '12pt' });
    senderPhone.textContent = senderInfo.phone;
    senderDiv.appendChild(senderPhone);

    container.appendChild(senderDiv);

    // 日期
    const dateDiv = document.createElement('p');
    Object.assign(dateDiv.style, {
      margin: '0 0 20pt 0',
      fontSize: '12pt'
    });
    dateDiv.textContent = formatDate(date, language);
    container.appendChild(dateDiv);

    // 收件人信息区域
    if (recipientInfo) {
      const recipientDiv = document.createElement('div');
      Object.assign(recipientDiv.style, {
        marginBottom: '20pt'
      });

      if (recipientInfo.recruiter_name) {
        const recruiterName = document.createElement('p');
        Object.assign(recruiterName.style, { margin: '0', fontSize: '12pt' });
        recruiterName.textContent = recipientInfo.recruiter_name;
        recipientDiv.appendChild(recruiterName);
      }

      if (recipientInfo.recruiter_title) {
        const recruiterTitle = document.createElement('p');
        Object.assign(recruiterTitle.style, { margin: '0', fontSize: '12pt' });
        recruiterTitle.textContent = recipientInfo.recruiter_title;
        recipientDiv.appendChild(recruiterTitle);
      }

      const companyName = document.createElement('p');
      Object.assign(companyName.style, { margin: '0', fontSize: '12pt' });
      companyName.textContent = recipientInfo.company_name;
      recipientDiv.appendChild(companyName);

      if (recipientInfo.company_address) {
        const companyAddress = document.createElement('p');
        Object.assign(companyAddress.style, { margin: '0', fontSize: '12pt' });
        companyAddress.textContent = recipientInfo.company_address;
        recipientDiv.appendChild(companyAddress);
      }

      container.appendChild(recipientDiv);
    }

    // 渲染正文内容
    const bodyContent = extractBodyContent(content);
    renderCoverLetterContent(container, bodyContent, language, senderInfo);

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
      Math.max(rect.height, container.scrollHeight, container.offsetHeight) + 20
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
    await createMultiPagePDF(container, canvas, filename, 20, 0.95, 'Cover Letter', language);
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
 * 导出 Cover Letter 为 DOCX 格式（带专业格式化）
 */
export async function exportCoverLetterToDOCX(
  content: string,
  options: CoverLetterExportOptions
): Promise<void> {
  const {
    filename,
    language = 'en',
    senderInfo,
    recipientInfo,
    date
  } = options;

  try {
    toast.loading(
      language === 'zh' ? '正在生成 Word 文档，请稍候...' : 'Generating Word document, please wait...',
      { id: 'docx-export' }
    );

    const docParagraphs: Paragraph[] = [];
    const fontFamily = language === 'zh' ? '宋体' : 'Times New Roman';

    // 发件人姓名（右对齐）
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: senderInfo.full_name,
            font: fontFamily,
            size: 24, // 12pt
            bold: true
          })
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0 }
      })
    );

    // 发件人地址（右对齐）
    if (senderInfo.address) {
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: senderInfo.address,
              font: fontFamily,
              size: 24
            })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 0 }
        })
      );
    }

    // 发件人邮箱（右对齐）
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: senderInfo.email,
            font: fontFamily,
            size: 24
          })
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0 }
      })
    );

    // 发件人电话（右对齐）
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: senderInfo.phone,
            font: fontFamily,
            size: 24
          })
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 300 }
      })
    );

    // 日期
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: formatDate(date, language),
            font: fontFamily,
            size: 24
          })
        ],
        spacing: { after: 300 }
      })
    );

    // 收件人信息
    if (recipientInfo) {
      if (recipientInfo.recruiter_name) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: recipientInfo.recruiter_name,
                font: fontFamily,
                size: 24
              })
            ],
            spacing: { after: 0 }
          })
        );
      }

      if (recipientInfo.recruiter_title) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: recipientInfo.recruiter_title,
                font: fontFamily,
                size: 24
              })
            ],
            spacing: { after: 0 }
          })
        );
      }

      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: recipientInfo.company_name,
              font: fontFamily,
              size: 24
            })
          ],
          spacing: { after: 0 }
        })
      );

      if (recipientInfo.company_address) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: recipientInfo.company_address,
                font: fontFamily,
                size: 24
              })
            ],
            spacing: { after: 0 }
          })
        );
      }

      // 收件人信息后的空行
      docParagraphs.push(
        new Paragraph({
          children: [],
          spacing: { after: 300 }
        })
      );
    }

    // 解析并添加正文内容
    const bodyContent = extractBodyContent(content);
    const paragraphs = bodyContent.split('\n\n').filter((p: string) => p.trim());

    paragraphs.forEach((para: string, index: number) => {
      const trimmed = para.trim();

      // 跳过空段落
      if (!trimmed) return;

      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
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
    });

    // 如果正文没有签名，添加签名
    const hasSignature = bodyContent.toLowerCase().includes('sincerely') ||
                         bodyContent.includes('此致') ||
                         bodyContent.includes('敬上');

    if (!hasSignature) {
      // 空行
      docParagraphs.push(new Paragraph({ children: [], spacing: { after: 200 } }));

      // Sincerely
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: language === 'zh' ? '此致敬礼，' : 'Sincerely,',
              font: fontFamily,
              size: 24
            })
          ],
          spacing: { after: 400 }
        })
      );

      // 签名姓名
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: senderInfo.full_name,
              font: fontFamily,
              size: 24,
              bold: true
            })
          ],
          spacing: { after: 0 }
        })
      );

      // 联系方式
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${senderInfo.email} | ${senderInfo.phone}`,
              font: fontFamily,
              size: 24
            })
          ],
          spacing: { after: 0 }
        })
      );
    }

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
                      text: 'Cover Letter',
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
      title: 'Cover Letter'
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
 * 渲染 Cover Letter 正文内容为 HTML
 */
function renderCoverLetterContent(
  container: HTMLElement,
  content: string,
  language: 'en' | 'zh',
  senderInfo: { full_name: string; email: string; phone: string }
): void {
  const paragraphs = content.split('\n\n').filter((p: string) => p.trim());

  paragraphs.forEach((para: string) => {
    const trimmed = para.trim();

    // 跳过空段落
    if (!trimmed) return;

    const p = document.createElement('p');
    Object.assign(p.style, {
      textAlign: language === 'zh' ? 'justify' : 'left',
      marginBottom: '12pt',
      lineHeight: '1.6',
      fontSize: '12pt'
    });
    p.textContent = trimmed;
    container.appendChild(p);
  });

  // 如果正文没有签名，添加签名
  const hasSignature = content.toLowerCase().includes('sincerely') ||
                       content.includes('此致') ||
                       content.includes('敬上');

  if (!hasSignature) {
    // 空行
    const spacer = document.createElement('div');
    spacer.style.height = '20pt';
    container.appendChild(spacer);

    // Sincerely
    const sincerely = document.createElement('p');
    Object.assign(sincerely.style, {
      margin: '0 0 30pt 0',
      fontSize: '12pt'
    });
    sincerely.textContent = language === 'zh' ? '此致敬礼，' : 'Sincerely,';
    container.appendChild(sincerely);

    // 签名姓名
    const signatureName = document.createElement('p');
    Object.assign(signatureName.style, {
      margin: '0',
      fontWeight: 'bold',
      fontSize: '12pt'
    });
    signatureName.textContent = senderInfo.full_name;
    container.appendChild(signatureName);

    // 联系方式
    const contactInfo = document.createElement('p');
    Object.assign(contactInfo.style, {
      margin: '0',
      fontSize: '12pt'
    });
    contactInfo.textContent = `${senderInfo.email} | ${senderInfo.phone}`;
    container.appendChild(contactInfo);
  }
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
  const safeBreaks = collectSafePageBreaks(container).map((point) =>
    Math.round(point * renderScale)
  );
  const pageSlices = buildPageSlices(canvasHeight, pageContentHeightPx, safeBreaks);
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
