import { saveAs } from 'file-saver';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Paragraph,
  Packer,
  TabStopType,
  TextRun,
  Table,
  TableCell,
  TableRow,
  VerticalAlign,
  WidthType
} from 'docx';
import { StandardResumeData } from '@/lib/resume-field-mapping';

type SectionKey = keyof StandardResumeData['sections'];

interface DocxExportOptions {
  filename?: string;
  themePrimary?: string;
  sectionTitles?: Partial<Record<SectionKey, string>>;
  layoutOrder?: string[];
  mainLayoutOrder?: string[];
  sidebarLayoutOrder?: string[];
}
const FONT_FAMILY = 'Times New Roman';
const BASE_FONT_SIZE = 22;
const BASE_TEXT_COLOR = '000000';
const SECONDARY_TEXT_COLOR = '000000';
const PAGE_WIDTH_TWIP = 11906; // A4 width in twips (8.27in * 1440)
const PAGE_MARGIN_LEFT = 720;
const PAGE_MARGIN_RIGHT = 720;
const TEXT_WIDTH = PAGE_WIDTH_TWIP - PAGE_MARGIN_LEFT - PAGE_MARGIN_RIGHT;
const RIGHT_TAB_POSITION = TEXT_WIDTH;
const MAIN_COLUMN_RIGHT_PADDING = 240;

const toPlainText = (content?: string): string => {
  if (!content) return '';
  const temp = document.createElement('div');
  temp.innerHTML = content;
  const raw = temp.textContent || temp.innerText || '';
  const normalizedLines = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[^\S\n]+/g, ' ').trim())
    .filter((line, index, lines) => line !== '' || (index > 0 && lines[index - 1] !== ''));
  return normalizedLines.join('\n').trim();
};

const normalizeColor = (color?: string): string => {
  if (!color) {
    return '1F4E79';
  }
  const hex = color.startsWith('#') ? color.slice(1) : color;
  if (hex.length === 3) {
    return hex
      .split('')
      .map(char => char + char)
      .join('')
      .toUpperCase();
  }
  return hex.toUpperCase();
};

interface ContactLineOptions {
  color?: string;
  alignment?: AlignmentType;
  spacing?: { before?: number; after?: number };
  includeCustomFields?: boolean;
  includeWebsite?: boolean;
}

const createContactLine = (
  basics: StandardResumeData['basics'],
  options: ContactLineOptions = {}
) => {
  const parts: string[] = [];
  const push = (value?: string) => {
    const trimmed = toPlainText(value);
    if (trimmed) {
      parts.push(trimmed);
    }
  };

  push(basics.phone);
  push(basics.location);
  push(basics.email);

  const includeCustomFields = options.includeCustomFields ?? true;
  if (includeCustomFields) {
    basics.customFields.forEach(field => push(`${field.name}: ${field.value}`));
  }

  const includeWebsite = options.includeWebsite ?? includeCustomFields;
  if (includeWebsite) {
    push(basics.url?.href);
  }

  if (!parts.length) {
    return null;
  }

  const color = options.color ?? SECONDARY_TEXT_COLOR;
  const alignment = options.alignment ?? AlignmentType.CENTER;
  const before = options.spacing?.before ?? 80;
  const after = options.spacing?.after ?? 160;

  return new Paragraph({
    children: [
      new TextRun({
        text: parts.join(' • '),
        font: FONT_FAMILY,
        size: 20,
        color
      })
    ],
    alignment,
    spacing: { before, after }
  });
};

const createSectionHeading = (
  title: string,
  themeColor: string,
  sectionIndex: number
) =>
  new Paragraph({
    children: [
      new TextRun({
        text: toPlainText(title),
        font: FONT_FAMILY,
        bold: true,
        size: 26,
        color: themeColor
      })
    ],
    spacing: { before: sectionIndex === 0 ? 120 : 240, after: 0 },
    border: {
      bottom: {
        color: themeColor,
        space: 1,
        size: 12,
        style: BorderStyle.SINGLE
      }
    }
  });

type AlignedParagraphOptions = {
  left?: string;
  right?: string;
  leftBold?: boolean;
  leftItalic?: boolean;
  rightBold?: boolean;
  rightItalic?: boolean;
  leftColor?: string;
  rightColor?: string;
  fontSize?: number;
  spacingBefore?: number;
  spacingAfter?: number;
  rightIndent?: number;
  tabStopPosition?: number;
};

const createAlignedParagraph = ({
  left,
  right,
  leftBold = false,
  leftItalic = false,
  rightBold = false,
  rightItalic = false,
  leftColor = BASE_TEXT_COLOR,
  rightColor = SECONDARY_TEXT_COLOR,
  fontSize = BASE_FONT_SIZE,
  spacingBefore = 140,
  spacingAfter = 40,
  rightIndent = 0,
  tabStopPosition
}: AlignedParagraphOptions): Paragraph | null => {
  const leftText = toPlainText(left);
  const rightText = toPlainText(right);

  if (!leftText && !rightText) {
    return null;
  }

  const children: TextRun[] = [];

  if (leftText) {
    children.push(
      new TextRun({
        text: leftText,
        font: FONT_FAMILY,
        bold: leftBold,
        italics: leftItalic,
        size: fontSize,
        color: leftColor
      })
    );
  }

  if (rightText) {
    if (children.length) {
      children.push(new TextRun({ text: '\t' }));
    }

    children.push(
      new TextRun({
        text: rightText,
        font: FONT_FAMILY,
        bold: rightBold,
        italics: rightItalic,
        size: Math.max(fontSize - 2, 20),
        color: rightColor
      })
    );
  }

  return new Paragraph({
    children,
    tabStops: rightText
      ? [
          {
            type: TabStopType.RIGHT,
            position: Math.max(
              (tabStopPosition ?? RIGHT_TAB_POSITION) - rightIndent,
              0
            )
          }
        ]
      : undefined,
    indent: {
      left: 0,
      right: rightIndent
    },
    spacing: { before: spacingBefore, after: spacingAfter }
  });
};

const createBulletParagraphs = (
  content?: string,
  options: {
    color?: string;
    fontSize?: number;
    spacingBeforeFirst?: number;
    spacingBetween?: number;
    asHyphen?: boolean;
  } = {}
): Paragraph[] => {
  const plain = toPlainText(content);
  if (!plain) {
    return [];
  }

  const lines = plain
    .split(/\r?\n+/)
    .map(line => line.replace(/^[•\-\u2022]\s*/, '').trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const text = options.asHyphen ? `- ${line}` : line;
    return new Paragraph({
      children: [
        new TextRun({
          text,
          font: FONT_FAMILY,
          size: options.fontSize ?? BASE_FONT_SIZE,
          color: options.color ?? BASE_TEXT_COLOR
        })
      ],
      spacing: {
        before:
          index === 0
            ? options.spacingBeforeFirst ?? 60
            : options.spacingBetween ?? 30,
        after: options.spacingBetween ?? 30
      },
      bullet: options.asHyphen
        ? undefined
        : {
            level: 0
          },
      indent: {
        left: 480,     // Text starts 480 twips from left (approx 1/3 inch)
        hanging: 240   // First line hangs back by 240 twips (bullet at 240 twips from margin)
      }
    });
  });
};

const createPlainParagraph = (
  text?: string,
  {
    italics = false,
    bold = false,
    spacingBefore = 100,
    spacingAfter = 60,
    size = BASE_FONT_SIZE,
    color = BASE_TEXT_COLOR,
    alignment,
    indent
  }: {
    italics?: boolean;
    bold?: boolean;
    spacingBefore?: number;
    spacingAfter?: number;
    size?: number;
    color?: string;
    alignment?: AlignmentType;
    indent?: { left?: number; right?: number; hanging?: number };
  } = {}
): Paragraph | null => {
  const plain = toPlainText(text);
  if (!plain) {
    return null;
  }

  return new Paragraph({
    children: [
      new TextRun({
        text: plain,
        font: FONT_FAMILY,
        size,
        italics,
        bold,
        color
      })
    ],
    spacing: { before: spacingBefore, after: spacingAfter },
    alignment,
    indent
  });
};

const appendIfTruthy = <T>(collection: T[], item: T | null | undefined) => {
  if (item) {
    collection.push(item);
  }
};

const formatEducationScore = (score?: string): string => {
  const plainScore = toPlainText(score);
  if (!plainScore) {
    return '';
  }

  return /^\s*gpa\b/i.test(plainScore) ? plainScore : `GPA: ${plainScore}`;
};

const getEducationPointLines = (item: {
  score?: string;
  summary?: string;
  courses?: string;
}) => {
  return [
    item.score ? formatEducationScore(item.score) : '',
    item.summary ? `Honors: ${toPlainText(item.summary)}` : '',
    item.courses ? `Relevant Coursework: ${toPlainText(item.courses)}` : ''
  ].filter(Boolean);
};

const DITTO_TEXT_COLOR = '000000';
const DITTO_SECONDARY_COLOR = '000000';

type HeaderLine = {
  text?: string;
  bold?: boolean;
  italics?: boolean;
  color?: string;
  fontSize?: number;
};

const createMainEntryHeaderTable = ({
  leftLines,
  rightLines,
  spacingBefore,
  spacingAfter
}: {
  leftLines: HeaderLine[];
  rightLines: HeaderLine[];
  spacingBefore: number;
  spacingAfter: number;
}): Table | null => {
  const normalizedLeft = leftLines
    .map(line => ({
      ...line,
      text: toPlainText(line.text)
    }))
    .filter(line => Boolean(line.text));

  const normalizedRight = rightLines
    .map(line => ({
      ...line,
      text: toPlainText(line.text)
    }))
    .filter(line => Boolean(line.text));

  if (!normalizedLeft.length && !normalizedRight.length) {
    return null;
  }

  const makeParagraphs = (
    lines: typeof normalizedLeft,
    alignRight: boolean
  ): Paragraph[] => {
    if (!lines.length) {
      return [
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: { before: spacingBefore, after: spacingAfter },
          alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT
        })
      ];
    }

    return lines.map((line, index) => {
      const isFirst = index === 0;
      const isLast = index === lines.length - 1;

      return new Paragraph({
        children: [
          new TextRun({
            text: line.text!,
            font: FONT_FAMILY,
            bold: line.bold,
            italics: line.italics,
            size: line.fontSize ?? (alignRight ? Math.max(BASE_FONT_SIZE - 2, 20) : BASE_FONT_SIZE),
            color: line.color ?? DITTO_TEXT_COLOR
          })
        ],
        spacing: {
          before: isFirst ? spacingBefore : 0,
          after: isLast ? spacingAfter : 20
        },
        alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT
      });
    });
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideH: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideV: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            margins: { left: 0, right: 0, top: 0, bottom: 0 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
            },
            verticalAlign: VerticalAlign.TOP,
            children: makeParagraphs(normalizedLeft, false)
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            margins: {
              left: 0,
              right: MAIN_COLUMN_RIGHT_PADDING,
              top: 0,
              bottom: 0
            },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
            },
            verticalAlign: VerticalAlign.TOP,
            children: makeParagraphs(normalizedRight, true)
          })
        ]
      })
    ]
  });
};

const wrapWithAccent = ({
  header,
  body,
  accentColor,
  gap = 160,
  thickWidth = 260,
  thinWidth = 60
}: {
  header?: Paragraph | Table | null;
  body: Array<Paragraph | Table>;
  accentColor: string;
  gap?: number;
  thickWidth?: number;
  thinWidth?: number;
}): Table | null => {
  if (!header && body.length === 0) {
    return null;
  }

  const blankParagraph = new Paragraph({ text: '', spacing: { before: 0, after: 0 } });

  const baseCellBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  } as const;

  const accentBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: accentColor },
    bottom: { style: BorderStyle.NONE, size: 0, color: accentColor },
    left: { style: BorderStyle.NONE, size: 0, color: accentColor },
    right: { style: BorderStyle.NONE, size: 0, color: accentColor }
  } as const;

  const rows: TableRow[] = [];

  if (header) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: thickWidth, type: WidthType.DXA },
            shading: { fill: accentColor },
            borders: accentBorders,
            children: [blankParagraph]
          }),
          new TableCell({
            width: { size: thinWidth, type: WidthType.DXA },
            shading: { fill: accentColor },
            borders: accentBorders,
            children: [blankParagraph]
          }),
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { left: gap, right: 0, top: 0, bottom: 0 },
            borders: baseCellBorders,
            children: [header]
          })
        ]
      })
    );
  }

  if (body.length) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: thickWidth, type: WidthType.DXA },
            borders: baseCellBorders,
            children: [blankParagraph]
          }),
          new TableCell({
            width: { size: thinWidth, type: WidthType.DXA },
            shading: { fill: accentColor },
            borders: accentBorders,
            children: [blankParagraph]
          }),
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { left: gap, right: 0, top: 0, bottom: 0 },
            borders: baseCellBorders,
            children: [
              ...body,
              new Paragraph({ text: '', spacing: { before: 0, after: 20 } })
            ]
          })
        ]
      })
    );
  }

  if (!rows.length) {
    return null;
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideH: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideV: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    },
    rows
  });
};

const createDittoSectionHeading = (title: string, isFirst: boolean): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({
        text: toPlainText(title),
        font: FONT_FAMILY,
        bold: true,
        size: 28,
        color: DITTO_TEXT_COLOR
      })
    ],
    spacing: { before: isFirst ? 80 : 140, after: 40 }
  });

const createDittoSidebarHeading = (title: string, isFirst: boolean): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({
        text: toPlainText(title),
        font: FONT_FAMILY,
        bold: true,
        size: 28,
        color: DITTO_TEXT_COLOR
      })
    ],
    spacing: { before: isFirst ? 40 : 180, after: 40 }
  });

const buildDittoDocument = (
  resume: StandardResumeData,
  options: {
    themeColor: string;
    sectionTitles?: Partial<Record<SectionKey, string>>;
    mainLayoutOrder?: string[];
    sidebarLayoutOrder?: string[];
  }
): Document => {
  const sections = resume.sections;
  const accentColor = options.themeColor || DITTO_TEXT_COLOR;

  const headingDefaults: Partial<Record<SectionKey, string>> = {
    summary: 'Summary',
    experience: 'Work Experience',
    education: 'Education',
    projects: 'Research Experience',
    activities: 'Activities',
    skills: 'Skills',
    certifications: 'Certifications',
    awards: 'Awards',
    languages: 'SKILLS',
    references: 'References'
  };

  const resolveTitle = (key: SectionKey, fallback: string) =>
    options.sectionTitles?.[key] ?? headingDefaults[key] ?? fallback;

  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? (value as string[]) : [];

  const isSectionKey = (value: string): value is SectionKey =>
    Object.prototype.hasOwnProperty.call(sections, value);

  const layoutPages = resume.metadata?.layout ?? [];
  const firstPageLayout = layoutPages[0] ?? [];
  const layoutMainRaw = (
    options.mainLayoutOrder?.length
      ? options.mainLayoutOrder
      : asStringArray(firstPageLayout[0])
  ).filter(isSectionKey);
  const layoutSidebarRaw = options.sidebarLayoutOrder?.length
    ? options.sidebarLayoutOrder
    : asStringArray(firstPageLayout[1]);

  const allowedMainSections: SectionKey[] = [
    'summary',
    'experience',
    'education',
    'projects',
    'activities'
  ];

  const mainOrder = Array.from(
    new Set<SectionKey>([
      ...layoutMainRaw.filter(section => allowedMainSections.includes(section)),
      ...allowedMainSections
    ])
  );

  const defaultSidebarOrder: Array<SectionKey | 'profiles'> = [
    'profiles',
    'skills',
    'awards',
    'languages',
    'certifications',
    'references'
  ];

  const sidebarOrder = Array.from(
    new Set([
      ...layoutSidebarRaw.filter(item => item === 'profiles' || isSectionKey(item)),
      ...defaultSidebarOrder
    ])
  );

  const mainParagraphs: Array<Paragraph | Table> = [];
  let isFirstMain = true;

  const pushMainSection = (
    key: SectionKey,
    fallback: string,
    paragraphs: Array<Paragraph | Table>
  ) => {
    const filtered = paragraphs.filter(Boolean);
    if (!filtered.length) {
      return;
    }

    const title = resolveTitle(key, fallback);
    mainParagraphs.push(createDittoSectionHeading(title, isFirstMain));
    mainParagraphs.push(...filtered);
    mainParagraphs.push(new Paragraph({ text: '', spacing: { before: 0, after: 20 } }));
    isFirstMain = false;
  };

  const buildExperience = (): Array<Paragraph | Table> => {
    if (!sections.experience.visible || sections.experience.items.length === 0) {
      return [];
    }

    return sections.experience.items.flatMap((item, index) => {
      const header = createMainEntryHeaderTable({
          leftLines: [
            { text: item.position, bold: true, fontSize: 28 },
            { text: item.company, italics: true, fontSize: 24 }
          ],
          rightLines: [
            { text: item.date, bold: true, fontSize: 26 },
            { text: item.location, fontSize: 24 }
          ],
          spacingBefore: index === 0 ? 60 : 80,
          spacingAfter: 12
        });
      const body: Array<Paragraph | Table> = [];
      body.push(
        ...createBulletParagraphs(item.summary, {
          color: DITTO_SECONDARY_COLOR,
          spacingBeforeFirst: 15,
          spacingBetween: 15,
          fontSize: BASE_FONT_SIZE,
          asHyphen: false
        })
      );
      const wrapped = wrapWithAccent({ header, body, accentColor });
      return wrapped ? [wrapped] : [];
    });
  };

  const buildEducation = (): Array<Paragraph | Table> => {
    if (!sections.education.visible || sections.education.items.length === 0) {
      return [];
    }

    return sections.education.items.flatMap((item, index) => {
      const header = createMainEntryHeaderTable({
          leftLines: [
            { text: item.institution, bold: true, fontSize: 28 },
            { text: item.location, bold: true, fontSize: 24 }
          ],
          rightLines: [
            { text: item.date, bold: true, fontSize: 26 },
            {
              text: [item.studyType, item.area].filter(Boolean).map(toPlainText).join(', '),
              fontSize: 24
            }
          ],
          spacingBefore: index === 0 ? 60 : 80,
          spacingAfter: 12
        });

      const body: Array<Paragraph | Table> = [];
      const detailLine = [
        item.score ? `GPA: ${toPlainText(item.score)}` : '',
        toPlainText(item.summary)
      ]
        .filter(Boolean)
        .join(' • ');
      if (false && detailLine) {
        appendIfTruthy(
          body,
          createPlainParagraph(detailLine, {
            spacingBefore: 0,
            spacingAfter: 20,
            color: DITTO_TEXT_COLOR,
            size: BASE_FONT_SIZE
          })
        );
      }

      body.push(
        ...createBulletParagraphs(getEducationPointLines(item).join('\n'), {
          color: DITTO_TEXT_COLOR,
          spacingBeforeFirst: 0,
          spacingBetween: 20,
          fontSize: BASE_FONT_SIZE,
          asHyphen: false
        })
      );

      if (item.courses) {
        appendIfTruthy(
          body,
          createPlainParagraph(
            item.courses
              .split(',')
              .map(course => course.trim())
              .filter(Boolean)
              .join(' • '),
            {
              spacingBefore: 0,
              spacingAfter: 30,
              color: accentColor,
              size: BASE_FONT_SIZE - 2
            }
          )
        );
      }

      const wrapped = wrapWithAccent({ header, body, accentColor });
      return wrapped ? [wrapped] : [];
    });
  };

  const buildProjects = (): Array<Paragraph | Table> => {
    if (!sections.projects.visible || sections.projects.items.length === 0) {
      return [];
    }

    return sections.projects.items.flatMap((item, index) => {
      const header = createMainEntryHeaderTable({
          leftLines: [
            { text: item.name, bold: true, fontSize: 28 },
            { text: item.description, bold: true, fontSize: 24 }
          ],
          rightLines: [
            { text: item.date, bold: true, fontSize: 26 },
            { text: item.location, fontSize: 24 }
          ],
          spacingBefore: index === 0 ? 60 : 80,
          spacingAfter: 12
        });

      const body: Array<Paragraph | Table> = [];

      if (item.keywords && item.keywords.length > 0) {
        appendIfTruthy(
          body,
          createPlainParagraph(item.keywords.join(' • '), {
            spacingBefore: 0,
            spacingAfter: 20,
            color: accentColor,
            size: BASE_FONT_SIZE - 2
          })
        );
      }

      body.push(
        ...createBulletParagraphs(item.summary, {
          color: DITTO_SECONDARY_COLOR,
          spacingBeforeFirst: 15,
          spacingBetween: 15,
          fontSize: BASE_FONT_SIZE,
          asHyphen: false
        })
      );

      const wrapped = wrapWithAccent({ header, body, accentColor });
      return wrapped ? [wrapped] : [];
    });
  };

  const buildActivities = (): Array<Paragraph | Table> => {
    if (!sections.activities.visible || sections.activities.items.length === 0) {
      return [];
    }

    return sections.activities.items.flatMap((item, index) => {
      const header = createMainEntryHeaderTable({
          leftLines: [
            { text: item.role, bold: true, fontSize: 28 },
            { text: item.name, fontSize: 24 }
          ],
          rightLines: [
            { text: item.date, bold: true, fontSize: 26 },
            { text: item.location, fontSize: 24 }
          ],
          spacingBefore: index === 0 ? 60 : 80,
          spacingAfter: 15
        });

      const body: Array<Paragraph | Table> = [];
      body.push(
        ...createBulletParagraphs(item.summary, {
          color: DITTO_SECONDARY_COLOR,
          spacingBeforeFirst: 15,
          spacingBetween: 15,
          fontSize: BASE_FONT_SIZE,
          asHyphen: false
        })
      );

      const wrapped = wrapWithAccent({ header, body, accentColor });
      return wrapped ? [wrapped] : [];
    });
  };

  const buildAwards = (): Array<Paragraph | Table> => {
    if (!sections.awards.visible || sections.awards.items.length === 0) {
      return [];
    }

    return sections.awards.items.flatMap((item, index) => {
      const header = createMainEntryHeaderTable({
          leftLines: [{ text: item.title ?? '', bold: true, fontSize: 26 }],
          rightLines: [{ text: item.date, bold: true, fontSize: 24 }],
          spacingBefore: index === 0 ? 40 : 60,
          spacingAfter: 10
        });

      const body: Array<Paragraph | Table> = [];
      appendIfTruthy(
        body,
        createPlainParagraph(item.awarder, {
          spacingBefore: 0,
          spacingAfter: 10,
          color: DITTO_SECONDARY_COLOR,
          size: BASE_FONT_SIZE - 2
        })
      );

      body.push(
        ...createBulletParagraphs(item.summary, {
          color: accentColor,
          spacingBeforeFirst: 10,
          spacingBetween: 15,
          fontSize: BASE_FONT_SIZE,
          asHyphen: false
        })
      );

      const wrapped = wrapWithAccent({ header, body, accentColor });
      return wrapped ? [wrapped] : [];
    });
  };

  const buildCertifications = (): Paragraph[] => {
    if (!sections.certifications.visible || sections.certifications.items.length === 0) {
      return [];
    }

    return sections.certifications.items.map((item, index) => {
      const paragraphs: Paragraph[] = [];
      appendIfTruthy(
        paragraphs,
        createPlainParagraph(item.name, {
          bold: true,
          size: 22,
          color: DITTO_TEXT_COLOR,
          spacingBefore: index === 0 ? 20 : 40,
          spacingAfter: 10
        })
      );
      appendIfTruthy(
        paragraphs,
        createPlainParagraph(item.issuer, {
          color: DITTO_SECONDARY_COLOR,
          size: BASE_FONT_SIZE - 2,
          spacingBefore: 0,
          spacingAfter: 6
        })
      );
      appendIfTruthy(
        paragraphs,
        createPlainParagraph(item.date, {
          color: DITTO_SECONDARY_COLOR,
          size: BASE_FONT_SIZE - 2,
          spacingBefore: 0,
          spacingAfter: 10
        })
      );
      return paragraphs;
    }).flat();
  };

  const buildLanguages = (): Paragraph[] => {
    if (!sections.languages.visible || sections.languages.items.length === 0) {
      return [];
    }

    const paragraphs: Paragraph[] = [];
    appendIfTruthy(
      paragraphs,
      createPlainParagraph('Languages', {
        bold: true,
        size: 22,
        color: DITTO_TEXT_COLOR,
        spacingBefore: 20,
        spacingAfter: 6
      })
    );

    sections.languages.items.forEach((item, index) => {
      appendIfTruthy(
        paragraphs,
        createPlainParagraph(
          item.description ? `${item.name}: ${item.description}` : item.name,
          {
            color: DITTO_SECONDARY_COLOR,
            size: BASE_FONT_SIZE - 2,
            spacingBefore: index === 0 ? 0 : 10,
            spacingAfter: 8
          }
        )
      );
    });

    return paragraphs;
  };

  const buildSkills = (): Paragraph[] => {
    if (!sections.skills.visible || sections.skills.items.length === 0) {
      return [];
    }

    const professionalText = sections.skills.items
      .flatMap((item) => {
        if (item.keywords && item.keywords.length > 0) {
          return item.keywords;
        }
        if (item.description) {
          return item.description
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        }
        return [];
      })
      .join(', ');

    if (!professionalText) {
      return [];
    }

    const paragraphs: Paragraph[] = [];
    appendIfTruthy(
      paragraphs,
      createPlainParagraph('Professional', {
        bold: true,
        size: 22,
        color: DITTO_TEXT_COLOR,
        spacingBefore: 20,
        spacingAfter: 6
      })
    );
    appendIfTruthy(
      paragraphs,
      createPlainParagraph(professionalText, {
        color: accentColor,
        size: BASE_FONT_SIZE - 2,
        spacingBefore: 0,
        spacingAfter: 10
      })
    );

    return paragraphs;
  };

  const buildReferences = (): Paragraph[] => {
    if (!sections.references.visible || sections.references.items.length === 0) {
      return [];
    }

    return sections.references.items.map((item, index) => {
      const paragraphs: Paragraph[] = [];
      appendIfTruthy(
        paragraphs,
        createPlainParagraph(item.name, {
          bold: true,
          size: 22,
          color: DITTO_TEXT_COLOR,
          spacingBefore: index === 0 ? 20 : 40,
          spacingAfter: 6
        })
      );

      appendIfTruthy(
        paragraphs,
        createPlainParagraph(item.description, {
          color: DITTO_SECONDARY_COLOR,
          size: BASE_FONT_SIZE - 2,
          spacingBefore: 0,
          spacingAfter: 10
        })
      );

      appendIfTruthy(
        paragraphs,
        createPlainParagraph(item.url?.href, {
          color: accentColor,
          size: BASE_FONT_SIZE - 2,
          spacingBefore: 0,
          spacingAfter: 10
        })
      );

      return paragraphs;
    }).flat();
  };

  const summaryParagraph = createPlainParagraph(sections.summary.content, {
    spacingBefore: 140,
    spacingAfter: 60,
    color: DITTO_TEXT_COLOR
  });

  mainOrder.forEach((sectionKey) => {
    switch (sectionKey) {
      case 'summary':
        if (sections.summary.visible && summaryParagraph) {
          pushMainSection('summary', sections.summary.name, [summaryParagraph]);
        }
        break;
      case 'experience':
        pushMainSection('experience', sections.experience.name, buildExperience());
        break;
      case 'education':
        pushMainSection('education', sections.education.name, buildEducation());
        break;
      case 'projects':
        pushMainSection('projects', sections.projects.name, buildProjects());
        break;
      case 'activities':
        pushMainSection('activities', sections.activities.name, buildActivities());
        break;
      default:
        break;
    }
  });

  const sidebarParagraphs: Paragraph[] = [];
  let isFirstSidebar = true;

  const pushSidebarSection = (title: string, paragraphs: Paragraph[]) => {
    const filtered = paragraphs.filter(Boolean);
    if (!filtered.length) {
      return;
    }
    sidebarParagraphs.push(createDittoSidebarHeading(title, isFirstSidebar));
    sidebarParagraphs.push(...filtered);
    isFirstSidebar = false;
  };

  const customFields = (resume.basics.customFields || []).filter(
    field => field && field.value
  );

  const profilesContent = customFields.map((field, index) => {
    const paragraphs: Paragraph[] = [];
    appendIfTruthy(
      paragraphs,
      createPlainParagraph(field.name, {
        bold: true,
        size: 22,
        color: DITTO_TEXT_COLOR,
        spacingBefore: index === 0 ? 20 : 40,
        spacingAfter: 6
      })
    );
    appendIfTruthy(
      paragraphs,
      createPlainParagraph(field.value, {
        color: accentColor,
        size: BASE_FONT_SIZE - 2,
        spacingBefore: 0,
        spacingAfter: 10
      })
    );
    return paragraphs;
  }).flat();

  const sectionsAlreadyInMain = new Set<SectionKey>(mainOrder);

  sidebarOrder.forEach((item) => {
    if (item === 'profiles') {
      pushSidebarSection('Profiles', profilesContent);
      return;
    }

    if (!isSectionKey(item)) {
      return;
    }

    if (sectionsAlreadyInMain.has(item as SectionKey)) {
      // 已经在主内容中渲染过，避免重复显示
      return;
    }

    switch (item as SectionKey) {
      case 'skills':
        pushSidebarSection(resolveTitle('skills', sections.skills.name), [
          ...buildSkills(),
          ...buildLanguages()
        ]);
        break;
      case 'certifications':
        pushSidebarSection(resolveTitle('certifications', sections.certifications.name), buildCertifications());
        break;
      case 'awards':
        pushSidebarSection(resolveTitle('awards', sections.awards.name), buildAwards());
        break;
      case 'languages':
        break;
      case 'references':
        pushSidebarSection(resolveTitle('references', sections.references.name), buildReferences());
        break;
      default:
        break;
    }
  });

  const table = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideH: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideV: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            margins: { left: 50, right: 50, top: 50, bottom: 50 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
            },
            verticalAlign: VerticalAlign.TOP,
            children: sidebarParagraphs.length
              ? sidebarParagraphs
              : [new Paragraph({ text: '' })]
          }),
          new TableCell({
            width: { size: 67, type: WidthType.PERCENTAGE },
            margins: { left: 0, right: 0, top: 0, bottom: 0 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
            },
            verticalAlign: VerticalAlign.TOP,
            children: mainParagraphs.length
              ? mainParagraphs
              : [new Paragraph({ text: '' })]
          })
        ]
      })
    ]
  });

  const nameRun = new TextRun({
    text: toPlainText(resume.basics.name || 'Unnamed'),
    font: FONT_FAMILY,
    bold: true,
    size: 48,
    color: 'FFFFFF'
  });

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: accentColor },
      bottom: { style: BorderStyle.NONE, size: 0, color: accentColor },
      left: { style: BorderStyle.NONE, size: 0, color: accentColor },
      right: { style: BorderStyle.NONE, size: 0, color: accentColor },
      insideH: { style: BorderStyle.NONE, size: 0, color: accentColor },
      insideV: { style: BorderStyle.NONE, size: 0, color: accentColor }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: accentColor },
            margins: { left: 0, right: 0, top: 320, bottom: 240 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: accentColor },
              bottom: { style: BorderStyle.NONE, size: 0, color: accentColor },
              left: { style: BorderStyle.NONE, size: 0, color: accentColor },
              right: { style: BorderStyle.NONE, size: 0, color: accentColor }
            },
            children: [
              new Paragraph({
                children: [nameRun],
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 0 }
              })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: { left: 0, right: 0, top: 180, bottom: 180 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
            },
            children: (() => {
              const paragraphs: Paragraph[] = [];
              const headlineParagraph = createPlainParagraph(resume.basics.headline, {
                spacingBefore: 0,
                spacingAfter: 40,
                color: DITTO_TEXT_COLOR,
                size: BASE_FONT_SIZE,
                alignment: AlignmentType.LEFT
              });

              if (headlineParagraph) {
                paragraphs.push(headlineParagraph);
              }

              const contactParagraph = createContactLine(resume.basics, {
                color: accentColor,
                alignment: AlignmentType.LEFT,
                spacing: { before: 20, after: 20 },
                includeCustomFields: false,
                includeWebsite: false
              });

              if (contactParagraph) {
                paragraphs.push(contactParagraph);
              }

              return paragraphs.length ? paragraphs : [new Paragraph({ text: '' })];
            })()
          })
        ]
      })
    ]
  });

  const documentChildren: Array<Paragraph | Table> = [headerTable];

  documentChildren.push(new Paragraph({ text: '', spacing: { before: 80, after: 80 } }));
  documentChildren.push(table);

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: BASE_FONT_SIZE,
            color: DITTO_TEXT_COLOR
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: PAGE_MARGIN_LEFT,
              right: PAGE_MARGIN_RIGHT
            }
          }
        },
        children: documentChildren
      }
    ]
  });
};

const getTemplateSectionTitleOverrides = (
  template?: string
): Partial<Record<SectionKey, string>> => {
  if (template === 'kakuna') {
    return {
      summary: 'SUMMARY',
      experience: 'WORK EXPERIENCE',
      education: 'EDUCATION',
      projects: 'RESEARCH EXPERIENCE',
      activities: 'EXTRACURRICULAR ACTIVITIES',
      skills: 'SKILLS',
      certifications: 'Certifications',
      awards: 'HONOURS & AWARDS',
      languages: 'SKILLS',
      references: 'References'
    };
  }

  return {};
};

export const exportResumeDocx = async (
  resume: StandardResumeData,
  options: DocxExportOptions = {}
): Promise<void> => {
  const {
    filename = `resume-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.docx`,
    themePrimary,
    sectionTitles,
    mainLayoutOrder,
    sidebarLayoutOrder
  } = options;
  const themeColor = normalizeColor(themePrimary ?? resume.metadata?.theme?.primary);

  if (resume.metadata?.template === 'ditto') {
    const doc = buildDittoDocument(resume, {
      themeColor,
      sectionTitles,
      mainLayoutOrder,
      sidebarLayoutOrder
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
    return;
  }
  const sectionTitleOverrides: Partial<Record<SectionKey, string>> = {
    ...getTemplateSectionTitleOverrides(resume.metadata?.template),
    ...(sectionTitles ?? {})
  };

  const docChildren: Paragraph[] = [];

  // Header
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: toPlainText(resume.basics.name || 'Unnamed'),
          font: FONT_FAMILY,
          bold: true,
          size: 36,
          color: BASE_TEXT_COLOR
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 }
    })
  );

  appendIfTruthy(docChildren, createPlainParagraph(resume.basics.headline, {
    spacingBefore: 0,
    spacingAfter: 40,
    italics: false,
    bold: false
  }));

  const contactLine = createContactLine(resume.basics);
  if (contactLine) {
    docChildren.push(contactLine);
  }

  let sectionIndex = 0;
  const pushSection = (
    key: SectionKey,
    fallbackTitle: string,
    visible: boolean,
    paragraphs: Array<Paragraph | null>
  ) => {
    const filtered = paragraphs.filter(
      (paragraph): paragraph is Paragraph => paragraph != null
    );
    if (!visible || filtered.length === 0) {
      return;
    }
    const normalizedFallback =
      fallbackTitle?.trim().length
        ? fallbackTitle.trim().toUpperCase()
        : (key as string).toUpperCase();
    const heading = sectionTitleOverrides[key] ?? normalizedFallback;
    docChildren.push(createSectionHeading(heading, themeColor, sectionIndex));
    docChildren.push(...filtered);
    sectionIndex += 1;
  };

  // Section content generators
  const sectionGenerators: Record<string, () => void> = {
    summary: () => {
      pushSection('summary', resume.sections.summary.name, resume.sections.summary.visible, [
        createPlainParagraph(resume.sections.summary.content, {
          spacingBefore: 40,
          spacingAfter: 80
        })
      ]);
    },

    experience: () => {
      const experienceParagraphs: Array<Paragraph | null> = resume.sections.experience.items.flatMap((item, idx) => {
        const paragraphs: Paragraph[] = [];
        appendIfTruthy(
          paragraphs,
          createAlignedParagraph({
            left: item.position,
            right: item.date,
            leftBold: true,
            rightBold: true,
            spacingBefore: idx === 0 ? 40 : 240,
            spacingAfter: 20
          })
        );
        appendIfTruthy(
          paragraphs,
          createAlignedParagraph({
            left: item.company,
            right: item.location,
            leftItalic: true,
            spacingBefore: 0,
            spacingAfter: 30
          })
        );
        paragraphs.push(...createBulletParagraphs(item.summary));
        return paragraphs;
      });
      pushSection('experience', resume.sections.experience.name, resume.sections.experience.visible, experienceParagraphs);
    },

    education: () => {
      const educationParagraphs: Array<Paragraph | null> = resume.sections.education.items.flatMap((item, idx) => {
        const paragraphs: Paragraph[] = [];
        appendIfTruthy(
          paragraphs,
          createAlignedParagraph({
            left: item.institution,
            right: item.location,
            leftBold: true,
            rightBold: true,
            spacingBefore: idx === 0 ? 40 : 240,
            spacingAfter: 20
          })
        );

        const degreeParts = [
          item.studyType,
          item.area
        ]
          .map(toPlainText)
          .filter(Boolean)
          .join(', ');

        appendIfTruthy(
          paragraphs,
          createAlignedParagraph({
            left: degreeParts,
            right: item.date,
            spacingBefore: 0,
            spacingAfter: 20
          })
        );

        paragraphs.push(
          ...createBulletParagraphs(getEducationPointLines(item).join('\n'), {
            spacingBeforeFirst: 0,
            spacingBetween: 20,
            fontSize: BASE_FONT_SIZE,
            asHyphen: false
          })
        );

        return paragraphs;
      });
      pushSection('education', resume.sections.education.name, resume.sections.education.visible, educationParagraphs);
    },

    projects: () => {
      const projectParagraphs: Array<Paragraph | null> = resume.sections.projects.items.flatMap((item, idx) => {
        const paragraphs: Paragraph[] = [];
        appendIfTruthy(
          paragraphs,
          createAlignedParagraph({
            left: item.name,
            right: item.date,
            leftBold: true,
            spacingBefore: idx === 0 ? 40 : 220,
            spacingAfter: 20
          })
        );

        appendIfTruthy(
          paragraphs,
          createAlignedParagraph({
            left: item.description,
            right: item.location,
            spacingBefore: 0,
            spacingAfter: 20
          })
        );

        appendIfTruthy(
          paragraphs,
          createPlainParagraph(
            [item.url?.href, item.keywords?.join(', ')].filter(Boolean).join(' • '),
            { spacingBefore: 0, spacingAfter: 30, italics: true }
          )
        );

        paragraphs.push(...createBulletParagraphs(item.summary));
        return paragraphs;
      });
      pushSection('projects', resume.sections.projects.name, resume.sections.projects.visible, projectParagraphs);
    },

    skills: () => {
      const professionalText = resume.sections.skills.items
        .flatMap((item) => {
          if (item.keywords?.length) {
            return item.keywords.map(toPlainText);
          }
          if (item.description) {
            return item.description
              .split(',')
              .map((value) => toPlainText(value).trim())
              .filter(Boolean);
          }
          return [];
        })
        .join(', ');

      const skillParagraphs: Array<Paragraph | null> = [];

      if (professionalText) {
        skillParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Professional',
                font: FONT_FAMILY,
                bold: true,
                size: BASE_FONT_SIZE
              })
            ],
            spacing: { before: 40, after: 20 }
          })
        );
        skillParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: professionalText,
                font: FONT_FAMILY,
                size: BASE_FONT_SIZE
              })
            ],
            spacing: { before: 0, after: 40 }
          })
        );
      }

      resume.sections.languages.items.forEach((item, idx) => {
        if (idx === 0) {
          skillParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Languages',
                  font: FONT_FAMILY,
                  bold: true,
                  size: BASE_FONT_SIZE
                })
              ],
              spacing: { before: professionalText ? 80 : 40, after: 20 }
            })
          );
        }

        skillParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.description
                  ? `${toPlainText(item.name)}: ${toPlainText(item.description)}`
                  : toPlainText(item.name),
                font: FONT_FAMILY,
                size: BASE_FONT_SIZE
              })
            ],
            spacing: { before: 0, after: 30 }
          })
        );
      });

      pushSection(
        'skills',
        'SKILLS',
        resume.sections.skills.visible || resume.sections.languages.visible,
        skillParagraphs
      );
    },

    awards: () => {
      const awardParagraphs: Array<Paragraph | null> = resume.sections.awards.items.flatMap((item, idx) => {
        const paragraphs: Paragraph[] = [];
        appendIfTruthy(
          paragraphs,
          createAlignedParagraph({
            left: item.title,
            right: item.date,
            leftBold: true,
            spacingBefore: idx === 0 ? 40 : 220,
            spacingAfter: 20
          })
        );

        appendIfTruthy(
          paragraphs,
          createPlainParagraph(item.awarder, {
            spacingBefore: 0,
            spacingAfter: 30,
            italics: true
          })
        );

        paragraphs.push(...createBulletParagraphs(item.summary));
        return paragraphs;
      });
      pushSection('awards', resume.sections.awards.name, resume.sections.awards.visible, awardParagraphs);
    },

    activities: () => {
      const activityParagraphs: Array<Paragraph | null> = resume.sections.activities.items.flatMap((item, idx) => {
        const paragraphs: Paragraph[] = [];
        appendIfTruthy(
          paragraphs,
          createAlignedParagraph({
            left: item.role,
            right: item.date,
            leftBold: true,
            rightBold: true,
            spacingBefore: idx === 0 ? 40 : 220,
            spacingAfter: 20
          })
        );
        appendIfTruthy(
          paragraphs,
          createAlignedParagraph({
            left: item.name,
            right: item.location,
            spacingBefore: 0,
            spacingAfter: 30
          })
        );
        paragraphs.push(...createBulletParagraphs(item.summary));
        return paragraphs;
      });
      pushSection('activities', resume.sections.activities.name, resume.sections.activities.visible, activityParagraphs);
    },

    languages: () => {
      return;
    },

    certifications: () => {
      const certificationParagraphs: Array<Paragraph | null> = resume.sections.certifications.items.flatMap((item, idx) => {
        const paragraphs: Paragraph[] = [];
        appendIfTruthy(
          paragraphs,
          createAlignedParagraph({
            left: item.name,
            right: item.date,
            leftBold: true,
            spacingBefore: idx === 0 ? 40 : 220,
            spacingAfter: 20
          })
        );
        appendIfTruthy(
          paragraphs,
          createPlainParagraph(item.issuer, {
            spacingBefore: 0,
            spacingAfter: 30,
            italics: true
          })
        );
        paragraphs.push(...createBulletParagraphs(item.summary));
        return paragraphs;
      });
      pushSection('certifications', resume.sections.certifications.name, resume.sections.certifications.visible, certificationParagraphs);
    },

    references: () => {
      const referenceParagraphs: Array<Paragraph | null> = resume.sections.references.items.map((item, idx) =>
        new Paragraph({
          children: [
            new TextRun({
              text: toPlainText(item.name),
              font: FONT_FAMILY,
              bold: true,
              size: BASE_FONT_SIZE
            }),
            ...(item.description
              ? [
                  new TextRun({
                    text: ` - ${toPlainText(item.description)}`,
                    font: FONT_FAMILY,
                    size: BASE_FONT_SIZE
                  })
                ]
              : []),
            ...(item.url?.href
              ? [
                  new TextRun({
                    text: ` (${toPlainText(item.url.href)})`,
                    font: FONT_FAMILY,
                    size: BASE_FONT_SIZE
                  })
                ]
              : [])
          ],
          spacing: { before: idx === 0 ? 40 : 120, after: 40 }
        })
      );
      pushSection('references', resume.sections.references.name, resume.sections.references.visible, referenceParagraphs);
    }
  };

  // 榛樿妯″潡椤哄簭
  const DEFAULT_SECTION_ORDER = [
    'summary', 'experience', 'education', 'projects',
    'skills', 'awards', 'activities', 'languages',
    'certifications', 'references'
  ];

  // 获取实际顺序：使用 layoutOrder 或默认顺序
  const sectionOrder = options.layoutOrder ?? DEFAULT_SECTION_ORDER;

  // 用于追踪已生成的模块，避免重复
  const generatedSections = new Set<string>();

  // 按顺序生成模块
  for (const section of sectionOrder) {
    if (!generatedSections.has(section) && sectionGenerators[section]) {
      sectionGenerators[section]();
      generatedSections.add(section);
    }
  }

  // 仅在未显式提供布局顺序时，才补上默认顺序中的其他模块。
  if (!options.layoutOrder) {
    for (const section of DEFAULT_SECTION_ORDER) {
      if (!generatedSections.has(section) && sectionGenerators[section]) {
        sectionGenerators[section]();
        generatedSections.add(section);
      }
    }
  }

  if (docChildren.length === 0) {
    docChildren.push(
      new Paragraph({
        text: '暂无可导出的内容。',
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 }
      })
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: BASE_FONT_SIZE,
            color: BASE_TEXT_COLOR
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: PAGE_MARGIN_LEFT,
              right: PAGE_MARGIN_RIGHT
            }
          }
        },
        children: docChildren
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
};


