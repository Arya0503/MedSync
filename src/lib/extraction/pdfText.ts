export interface ExtractedLineInfo {
  page: number;
  lineIndex: number;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
}

/**
 * Extracts lines with normalized bounding boxes (0..1) from a PDF buffer using pdfjs-dist.
 */
export async function extractLinesFromPdf(pdfBuffer: Buffer): Promise<{ lines: ExtractedLineInfo[]; pageCount: number }> {
  // Dynamic import of pdfjs-dist to work cleanly in Node environment
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");

  const data = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  });

  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;
  const extractedLines: ExtractedLineInfo[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    // Group text items by roughly identical Y coordinate (line grouping)
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
    }>;

    // Sort items top-to-bottom, then left-to-right
    // In PDF coordinates, Y starts at bottom (0 at bottom, viewport.height at top)
    const lineBuckets: Array<{
      y: number;
      items: typeof items;
    }> = [];

    const Y_TOLERANCE = 4; // points tolerance for line alignment

    for (const item of items) {
      if (!item.str || item.str.trim() === "") continue;

      const itemY = viewport.height - item.transform[5]; // Convert to top-left 0..height
      let foundBucket = lineBuckets.find((b) => Math.abs(b.y - itemY) <= Y_TOLERANCE);

      if (!foundBucket) {
        foundBucket = { y: itemY, items: [] };
        lineBuckets.push(foundBucket);
      }
      foundBucket.items.push(item);
    }

    // Sort lines from top to bottom
    lineBuckets.sort((a, b) => a.y - b.y);

    let lineIndex = 0;
    for (const bucket of lineBuckets) {
      // Sort words left-to-right
      bucket.items.sort((a, b) => a.transform[4] - b.transform[4]);

      const lineText = bucket.items.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
      if (!lineText) continue;

      // Compute bounding box normalized 0..1
      const minX = Math.min(...bucket.items.map((it) => it.transform[4]));
      const maxX = Math.max(...bucket.items.map((it) => it.transform[4] + (it.width || 20)));
      const minY = Math.min(...bucket.items.map((it) => viewport.height - it.transform[5] - (it.height || 12)));
      const maxY = Math.max(...bucket.items.map((it) => viewport.height - it.transform[5]));

      const normX = Math.max(0, Math.min(1, minX / viewport.width));
      const normY = Math.max(0, Math.min(1, minY / viewport.height));
      const normW = Math.max(0.01, Math.min(1 - normX, (maxX - minX) / viewport.width));
      const normH = Math.max(0.01, Math.min(1 - normY, (maxY - minY) / viewport.height));

      extractedLines.push({
        page: pageNum,
        lineIndex,
        text: lineText,
        x: Number(normX.toFixed(4)),
        y: Number(normY.toFixed(4)),
        w: Number(normW.toFixed(4)),
        h: Number(normH.toFixed(4)),
        confidence: 0.98, // High confidence for digital text layer
      });

      lineIndex++;
    }
  }

  return { lines: extractedLines, pageCount };
}
