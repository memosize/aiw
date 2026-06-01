const DEFAULT_MIN_FILL_RATIO = 0.6;
const LINE_MERGE_THRESHOLD_PX = 1;
const BREAK_PADDING_PX = 2;
const DEFAULT_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, ul, ol, div';

export interface VerticalSegment {
  top: number;
  bottom: number;
}

function clampToCanvas(value: number, totalHeight: number): number {
  return Math.max(0, Math.min(totalHeight, Math.round(value)));
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
    .filter((segment) => Number.isFinite(segment.top) && Number.isFinite(segment.bottom))
    .filter((segment) => segment.bottom > segment.top)
    .sort((a, b) => a.top - b.top);

  if (sortedSegments.length === 0) {
    return [];
  }

  const mergedSegments: VerticalSegment[] = [{ ...sortedSegments[0] }];

  for (let index = 1; index < sortedSegments.length; index += 1) {
    const currentSegment = sortedSegments[index];
    const previousSegment = mergedSegments[mergedSegments.length - 1];

    if (currentSegment.top <= previousSegment.bottom + LINE_MERGE_THRESHOLD_PX) {
      previousSegment.bottom = Math.max(previousSegment.bottom, currentSegment.bottom);
      continue;
    }

    mergedSegments.push({ ...currentSegment });
  }

  return mergedSegments;
}

function collectTextLineSegments(
  element: Element,
  containerTop: number
): VerticalSegment[] {
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

  return mergeVerticalSegments(segments);
}

export function collectOccupiedSegments(
  container: HTMLElement,
  selector = DEFAULT_SELECTOR
): VerticalSegment[] {
  const containerRect = container.getBoundingClientRect();
  const segments: VerticalSegment[] = [];
  const elements = Array.from(container.querySelectorAll(selector));

  elements.forEach((element) => {
    const textSegments = collectTextLineSegments(element, containerRect.top);
    if (textSegments.length > 0) {
      segments.push(...textSegments);
      return;
    }

    const rect = element.getBoundingClientRect();
    const segment = normalizeRectToSegment(rect, containerRect.top);
    if (segment) {
      segments.push(segment);
    }
  });

  return mergeVerticalSegments(segments);
}

export function scaleSegments(
  segments: VerticalSegment[],
  scale: number,
  totalHeight: number
): VerticalSegment[] {
  return mergeVerticalSegments(
    segments.map((segment) => ({
      top: clampToCanvas(segment.top * scale, totalHeight),
      bottom: clampToCanvas(segment.bottom * scale, totalHeight)
    }))
  );
}

export function buildPageSlices(
  totalHeightPx: number,
  pageHeightPx: number,
  occupiedSegmentsPx: VerticalSegment[],
  minFillRatio = DEFAULT_MIN_FILL_RATIO
): Array<{ startY: number; endY: number }> {
  const slices: Array<{ startY: number; endY: number }> = [];
  const minFillHeight = Math.max(1, Math.round(pageHeightPx * minFillRatio));
  const normalizedSegments = mergeVerticalSegments(occupiedSegmentsPx).map((segment) => ({
    top: clampToCanvas(segment.top, totalHeightPx),
    bottom: clampToCanvas(segment.bottom, totalHeightPx)
  }));

  let startY = 0;
  let segmentIndex = 0;

  while (startY < totalHeightPx) {
    while (
      segmentIndex < normalizedSegments.length &&
      normalizedSegments[segmentIndex].bottom <= startY + BREAK_PADDING_PX
    ) {
      segmentIndex += 1;
    }

    const idealEnd = Math.min(totalHeightPx, startY + Math.round(pageHeightPx));
    let endY = idealEnd;
    let probeIndex = segmentIndex;

    while (probeIndex < normalizedSegments.length) {
      const segment = normalizedSegments[probeIndex];

      if (segment.top >= idealEnd - BREAK_PADDING_PX) {
        endY = clampToCanvas(segment.top - BREAK_PADDING_PX, totalHeightPx);
        break;
      }

      if (segment.bottom > idealEnd - BREAK_PADDING_PX) {
        const safeEndBeforeSegment = clampToCanvas(
          segment.top - BREAK_PADDING_PX,
          totalHeightPx
        );

        if (safeEndBeforeSegment > startY + BREAK_PADDING_PX) {
          endY = safeEndBeforeSegment;
        } else {
          endY = Math.min(totalHeightPx, clampToCanvas(segment.bottom + BREAK_PADDING_PX, totalHeightPx));
        }
        break;
      }

      probeIndex += 1;
    }

    if (endY - startY < minFillHeight) {
      let forcedEnd = endY;

      while (probeIndex < normalizedSegments.length) {
        const segment = normalizedSegments[probeIndex];
        forcedEnd = Math.min(totalHeightPx, clampToCanvas(segment.bottom + BREAK_PADDING_PX, totalHeightPx));

        if (forcedEnd - startY >= minFillHeight || forcedEnd >= totalHeightPx) {
          endY = forcedEnd;
          break;
        }

        probeIndex += 1;
      }
    }

    if (endY <= startY) {
      endY = Math.min(totalHeightPx, clampToCanvas(startY + pageHeightPx, totalHeightPx));
    }

    slices.push({ startY, endY });
    startY = endY;
  }

  return slices;
}
