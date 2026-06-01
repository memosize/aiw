const DEFAULT_MIN_FILL_RATIO = 0.6;
const LINE_MERGE_THRESHOLD_PX = 1;

interface VerticalSegment {
  top: number;
  bottom: number;
}

function toSortedUniqueIntegers(values: number[]): number[] {
  return Array.from(
    new Set(
      values
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Math.round(value))
    )
  ).sort((a, b) => a - b);
}

function normalizeRectToSegment(
  rect: DOMRect,
  containerTop: number
): VerticalSegment | null {
  if (rect.height <= 0) {
    return null;
  }

  return {
    top: rect.top - containerTop,
    bottom: rect.bottom - containerTop
  };
}

function mergeVerticalSegments(segments: VerticalSegment[]): VerticalSegment[] {
  const sortedSegments = segments
    .filter((segment) => segment.bottom > segment.top)
    .sort((a, b) => a.top - b.top);

  if (sortedSegments.length === 0) {
    return [];
  }

  const mergedSegments: VerticalSegment[] = [sortedSegments[0]];

  for (let index = 1; index < sortedSegments.length; index += 1) {
    const currentSegment = sortedSegments[index];
    const previousSegment = mergedSegments[mergedSegments.length - 1];

    if (currentSegment.top <= previousSegment.bottom + LINE_MERGE_THRESHOLD_PX) {
      previousSegment.bottom = Math.max(previousSegment.bottom, currentSegment.bottom);
      continue;
    }

    mergedSegments.push(currentSegment);
  }

  return mergedSegments;
}

function buildBreaksFromSegments(segments: VerticalSegment[]): number[] {
  const breaks: number[] = [];

  segments.forEach((segment, index) => {
    breaks.push(segment.bottom);

    const nextSegment = segments[index + 1];
    if (!nextSegment) {
      return;
    }

    const gap = nextSegment.top - segment.bottom;
    if (gap >= 0) {
      breaks.push(segment.bottom + gap / 2);
    }
  });

  return breaks;
}

function collectTextLineBreaks(element: Element, containerTop: number): number[] {
  const segments: VerticalSegment[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent?.trim();
    if (!text) {
      continue;
    }

    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = Array.from(range.getClientRects());
    range.detach();

    rects.forEach((rect) => {
      const segment = normalizeRectToSegment(rect, containerTop);
      if (segment) {
        segments.push(segment);
      }
    });
  }

  return buildBreaksFromSegments(mergeVerticalSegments(segments));
}

export function collectSafePageBreaks(
  container: HTMLElement,
  selector = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, ul, ol, div'
): number[] {
  const containerRect = container.getBoundingClientRect();
  const candidates: number[] = [];
  const elements = Array.from(container.querySelectorAll(selector));

  elements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.height <= 0) {
      return;
    }

    const segment = normalizeRectToSegment(rect, containerRect.top);
    if (segment) {
      candidates.push(...buildBreaksFromSegments([segment]));
    }
    candidates.push(...collectTextLineBreaks(element, containerRect.top));
  });

  return toSortedUniqueIntegers(candidates);
}

export function buildPageSlices(
  totalHeightPx: number,
  pageHeightPx: number,
  safeBreaksPx: number[],
  minFillRatio = DEFAULT_MIN_FILL_RATIO
): Array<{ startY: number; endY: number }> {
  const slices: Array<{ startY: number; endY: number }> = [];
  const minFillHeight = pageHeightPx * minFillRatio;
  const breaks = toSortedUniqueIntegers([...safeBreaksPx, totalHeightPx]);

  let startY = 0;

  while (startY < totalHeightPx) {
    const idealEnd = Math.min(startY + pageHeightPx, totalHeightPx);
    const minEnd = Math.min(startY + minFillHeight, idealEnd);

    const preferredBreaks = breaks.filter(
      (point) => point > startY && point <= idealEnd && point >= minEnd
    );
    const fallbackBreaks = breaks.filter(
      (point) => point > startY && point <= idealEnd
    );

    let endY =
      preferredBreaks[preferredBreaks.length - 1] ??
      fallbackBreaks[fallbackBreaks.length - 1] ??
      Math.round(idealEnd);

    if (endY <= startY) {
      endY = Math.min(totalHeightPx, Math.round(startY + pageHeightPx));
    }

    slices.push({ startY, endY });
    startY = endY;
  }

  return slices;
}
