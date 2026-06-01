const DEFAULT_MIN_FILL_RATIO = 0.6;

function toSortedUniqueIntegers(values: number[]): number[] {
  return Array.from(
    new Set(
      values
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Math.round(value))
    )
  ).sort((a, b) => a - b);
}

function collectTextLineBreaks(element: Element, containerTop: number): number[] {
  const breaks: number[] = [];
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
      if (rect.height > 0) {
        breaks.push(rect.bottom - containerTop);
      }
    });
  }

  return breaks;
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

    candidates.push(rect.bottom - containerRect.top);
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
