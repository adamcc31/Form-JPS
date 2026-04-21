export interface Point {
  x: number;
  y: number;
}

/**
 * Mendeteksi 4 sudut utama dokumen pada gambar
 */
export function detectDocumentCorners(canvas: HTMLCanvasElement): Point[] | null {
  const cv = (window as any).cv;
  if (!cv) return null;

  let src = cv.imread(canvas);
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

  // Blur untuk mengurangi noise
  let blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

  // Canny edge detection
  let edges = new cv.Mat();
  cv.Canny(blurred, edges, 75, 200, 3, false);

  // Find contours
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  // Sort contours by area, keep largest ones
  let maxArea = 0;
  let maxContourIndex = -1;
  let maxContour = new cv.Mat();

  for (let i = 0; i < contours.size(); i++) {
    let cnt = contours.get(i);
    let area = cv.contourArea(cnt);
    if (area > maxArea) {
      // Find approximate polygon
      let approx = new cv.Mat();
      let perimeter = cv.arcLength(cnt, true);
      cv.approxPolyDP(cnt, approx, 0.02 * perimeter, true);

      // If our approximated contour has four points, we can assume we found the document
      if (approx.rows === 4) {
        maxArea = area;
        maxContourIndex = i;
        approx.copyTo(maxContour);
      }
      approx.delete();
    }
    cnt.delete();
  }

  let result: Point[] | null = null;

  if (maxContourIndex !== -1 && maxArea > (canvas.width * canvas.height * 0.1)) {
    result = [];
    for (let i = 0; i < 4; i++) {
      result.push({
        x: maxContour.intPtr(i, 0)[0],
        y: maxContour.intPtr(i, 0)[1],
      });
    }

    // Sort corners: top-left, top-right, bottom-right, bottom-left
    result = orderPoints(result);
  }

  // Cleanup
  src.delete();
  gray.delete();
  blurred.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
  if (maxContourIndex !== -1) maxContour.delete();

  return result;
}

/**
 * Merapikan urutan koordinat supaya selalu TL, TR, BR, BL
 */
function orderPoints(pts: Point[]): Point[] {
  // sort by x first
  const sortedX = [...pts].sort((a, b) => a.x - b.x);
  
  // Left side points
  const leftPts = [sortedX[0], sortedX[1]].sort((a, b) => a.y - b.y);
  const tl = leftPts[0];
  const bl = leftPts[1];

  // Right side points
  const rightPts = [sortedX[2], sortedX[3]].sort((a, b) => a.y - b.y);
  const tr = rightPts[0];
  const br = rightPts[1];

  return [tl, tr, br, bl];
}

/**
 * Menerapkan perspective transform (Warp) sesuai koordinat sudut
 */
export function applyPerspectiveTransform(
  sourceCanvas: HTMLCanvasElement, 
  corners: Point[], 
  width: number, 
  height: number
): HTMLCanvasElement {
  const cv = (window as any).cv;
  let src = cv.imread(sourceCanvas);

  let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    corners[0].x, corners[0].y, // TL
    corners[1].x, corners[1].y, // TR
    corners[2].x, corners[2].y, // BR
    corners[3].x, corners[3].y  // BL
  ]);

  let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    width, 0,
    width, height,
    0, height
  ]);

  let dsize = new cv.Size(width, height);
  let M = cv.getPerspectiveTransform(srcCoords, dstCoords);
  let dst = new cv.Mat();

  cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  cv.imshow(tempCanvas, dst);

  // Cleanup
  src.delete();
  dst.delete();
  M.delete();
  srcCoords.delete();
  dstCoords.delete();

  return tempCanvas;
}

/**
 * Mendapatkan nilai blur (Laplacian variance), 
 * jika nilai terlalu kecil biasanya ngeblur.
 */
export function getBlurScore(canvas: HTMLCanvasElement): number {
  const cv = (window as any).cv;
  if (!cv) return Infinity;

  let src = cv.imread(canvas);
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

  let laplacian = new cv.Mat();
  cv.Laplacian(gray, laplacian, cv.CV_64F);

  let mean = new cv.Mat();
  let stdDev = new cv.Mat();
  cv.meanStdDev(laplacian, mean, stdDev);

  let stdDevVal = stdDev.doublePtr(0, 0)[0];
  let variance = stdDevVal * stdDevVal;

  src.delete();
  gray.delete();
  laplacian.delete();
  mean.delete();
  stdDev.delete();

  return variance;
}

/**
 * Helper untuk mengubah canvas menjadi Blob file WebP
 */
export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gagal mengkonversi canvas ke blob"));
      },
      "image/webp",
      quality
    );
  });
}
