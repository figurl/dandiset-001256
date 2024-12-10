import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { Roi } from "./RoiView";

type RoiViewWidgetProps = {
  width: number;
  height: number;
  N1: number;
  N2: number;
  rois: Roi[] | undefined;
  referenceImage: number[][] | undefined;
  selectedRoi: "all" | number;
};

const v1 = 255;
const v2 = 160;
const _ = 128;
const distinctColors = [
  [v1, _, _],
  [_, v1, _],
  [_, _, v1],
  [v1, v1, _],
  [v1, _, v1],
  [_, v1, v1],
  [v1, v2, _],
  [v1, _, v2],
  [_, v1, v2],
  [v2, v1, _],
  [v2, _, v1],
  [_, v2, v1],
];

const RoiViewWidget: FunctionComponent<RoiViewWidgetProps> = ({
  width,
  height,
  rois,
  referenceImage,
  N1,
  N2,
  selectedRoi,
}) => {
  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >(undefined);
  const statusBarHeight = 15;
  const scale = Math.min(width / N1, (height - statusBarHeight) / N2);
  const offsetX = (width - N1 * scale) / 2;
  const offsetY = (height - statusBarHeight - N2 * scale) / 2;
  const status = useMemo(() => {
    if (referenceImage && !rois) return "Loading ROI data...";
    if (!referenceImage && !rois)
      return "Loading reference image and ROI data...";
    if (!referenceImage && rois) return "Loading reference image...";
    return `Number of ROIs: ${rois!.length}`;
  }, [rois, referenceImage]);
  const referenceImageMaxVal = useMemo(() => {
    if (!referenceImage) return 0;
    return computeMaxVal(referenceImage);
  }, [referenceImage]);
  useEffect(() => {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    if (referenceImage) {
      const brightnessScale = 1;
      const referenceImageData = ctx.createImageData(N1, N2);
      const maxval = referenceImageMaxVal || 1;
      for (let i = 0; i < N1; i++) {
        for (let j = 0; j < N2; j++) {
          const v = (referenceImage[i][j] / maxval) * brightnessScale;
          const v2 = Math.min(255, v * 255);
          const index = (i * N2 + j) * 4;
          referenceImageData.data[index + 0] = v2;
          referenceImageData.data[index + 1] = v2;
          referenceImageData.data[index + 2] = v2;
          referenceImageData.data[index + 3] = 255;
        }
      }
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = N1;
      offscreenCanvas.height = N2;
      const c = offscreenCanvas.getContext("2d");
      if (c) {
        c.putImageData(referenceImageData, 0, 0);
        ctx.drawImage(offscreenCanvas, 0, 0, N1 * scale, N2 * scale);
      }
    }
    for (const roi of rois || []) {
      if (selectedRoi !== "all" && roi.roiNumber !== selectedRoi) {
        continue;
      }
      const planeTransform = { xflip: false, yflip: false, xyswap: true };
      const color = distinctColors[(roi.roiNumber - 1) % distinctColors.length];
      const {
        w0: w0_a,
        h0: h0_a,
        x0: x0_a,
        y0: y0_a,
        data: data_a,
      } = roi.imageMask;
      const { w0, h0, x0, y0, data } = applyPlaneTransform(
        { w: w0_a, h: h0_a, x: x0_a, y: y0_a, data: data_a },
        N1,
        N2,
        planeTransform,
      );
      const maxval = computeMaxVal(data);
      const imageData = ctx.createImageData(w0, h0);
      const dataBoundary = getBoundary(data);
      for (let i = 0; i < w0; i++) {
        for (let j = 0; j < h0; j++) {
          let v = dataBoundary[i][j] / (maxval || 1);
          if (isNaN(v)) v = 0;
          const index = (j * w0 + i) * 4;
          imageData.data[index + 0] = color[0] * v;
          imageData.data[index + 1] = color[1] * v;
          imageData.data[index + 2] = color[2] * v;
          imageData.data[index + 3] = v ? 255 : 0;
        }
      }
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = w0;
      offscreenCanvas.height = h0;
      const c = offscreenCanvas.getContext("2d");
      if (c) {
        c.putImageData(imageData, 0, 0);
        ctx.drawImage(
          offscreenCanvas,
          x0 * scale,
          y0 * scale,
          w0 * scale,
          h0 * scale,
        );
      }
    }
  }, [
    canvasElement,
    rois,
    N1,
    N2,
    scale,
    referenceImageMaxVal,
    referenceImage,
    selectedRoi,
  ]);
  if (N1 === 0 || N2 === 0) {
    return (
      <div style={{ position: "relative", width, height, fontSize: 12 }} />
    );
  }
  return (
    <div style={{ position: "relative", width, height, fontSize: 12 }}>
      <div
        style={{
          position: "absolute",
          width: N1 * scale,
          height: N2 * scale,
          left: offsetX,
          top: offsetY,
        }}
      >
        <canvas
          ref={(elmt) => elmt && setCanvasElement(elmt)}
          width={N1 * scale}
          height={N2 * scale}
        />
      </div>
      <div
        style={{
          position: "absolute",
          width: width,
          height: statusBarHeight,
          top: height - statusBarHeight,
          left: 0,
          padding: 5,
        }}
      >
        {status}
      </div>
    </div>
  );
};

const applyPlaneTransform = (
  roi: { w: number; h: number; x: number; y: number; data: number[][] },
  N1: number,
  N2: number,
  planeTransform: { xflip: boolean; yflip: boolean; xyswap: boolean },
) => {
  const { w, h, x, y, data } = roi;
  if (planeTransform.xyswap) {
    // transpose
    const data2: number[][] = [];
    for (let i = 0; i < data[0].length; i++) {
      const row: number[] = [];
      for (let j = 0; j < data.length; j++) {
        row.push(data[j][i]);
      }
      data2.push(row);
    }
    return applyPlaneTransform(
      { w: h, h: w, x: y, y: x, data: data2 },
      N1,
      N2,
      {
        xflip: planeTransform.xflip,
        yflip: planeTransform.yflip,
        xyswap: false,
      },
    );
  } else {
    const data2: number[][] = [];
    for (let i = 0; i < w; i++) {
      const i2 = planeTransform.xflip ? w - i : i;
      const row: number[] = [];
      for (let j = 0; j < h; j++) {
        const j2 = planeTransform.yflip ? h - j : j;
        row.push(data[i2][j2]);
      }
      data2.push(row);
    }
    return {
      w0: w,
      h0: h,
      x0: planeTransform.xflip ? N1 - x - w : x,
      y0: planeTransform.yflip ? N2 - y - h : y,
      data: data2,
    };
  }
};

const computeMaxVal = (data: number[][]) => {
  let maxval = 0;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (let j = 0; j < row.length; j++) {
      const v = row[j];
      maxval = Math.max(maxval, v);
    }
  }
  return maxval;
};

const getBoundary = (data: number[][]) => {
  const data2: number[][] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const row2: number[] = [];
    for (let j = 0; j < row.length; j++) {
      if (data[i][j] && isOnBoundary(data, i, j)) {
        row2.push(data[i][j]);
      } else {
        row2.push(0);
      }
    }
    data2.push(row2);
  }
  return data2;
};

const isOnBoundary = (data: number[][], i: number, j: number) => {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const i2 = i + dx;
      const j2 = j + dy;
      if (i2 < 0 || i2 >= data.length) return true;
      if (j2 < 0 || j2 >= data[i2].length) return true;
      if (data[i2][j2] === 0) return true;
    }
  }
  return false;
};

export default RoiViewWidget;
