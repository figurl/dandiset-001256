import {
  FunctionComponent,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNwbFileSafe } from "../neurosift-lib/misc/NwbFileContext";
import {
  RemoteH5Dataset,
  RemoteH5FileX,
} from "../neurosift-lib/remote-h5-file";
import { MainContext } from "./MainContext";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type RoiViewProps = {
  // none
};

const RoiView: FunctionComponent<RoiViewProps> = () => {
  const nwbFile = useNwbFileSafe();
  const { rois, N1, N2 } = useRois(nwbFile);
  const referenceImage = useReferenceImage(nwbFile);
  const { selectedSession, roiNumber } = useContext(MainContext)!;
  const width = 300;
  const height = 300;
  if (!selectedSession) {
    return (
      <div
        style={{
          position: "absolute",
          width: width,
          height: height,
          backgroundColor: "lightgray",
        }}
      >
        <div>No session selected</div>
      </div>
    );
  }
  if (!nwbFile) {
    return (
      <div
        style={{
          position: "absolute",
          width: width,
          height: height,
          backgroundColor: "lightgray",
        }}
      >
        <div>No NWB file selected</div>
      </div>
    );
  }
  return (
    <RoiViewWidget
      width={width}
      height={height}
      rois={rois}
      referenceImage={referenceImage}
      N1={N1}
      N2={N2}
      selectedRoi={roiNumber}
    />
  );
};

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
      const { w0: w0a, h0: h0a, x0: x0a, y0: y0a, data } = roi.imageMask;
      const w0 = planeTransform.xyswap ? w0a : h0a;
      const h0 = planeTransform.xyswap ? h0a : w0a;
      const x0b = planeTransform.xflip ? N1 - x0a - w0 : x0a;
      const y0b = planeTransform.yflip ? N2 - y0a - h0 : y0a;
      const x0 = planeTransform.xyswap ? y0b : x0b;
      const y0 = planeTransform.xyswap ? x0b : y0b;
      const maxval = computeMaxVal(data);
      const imageData = ctx.createImageData(w0, h0);
      for (let i = 0; i < w0; i++) {
        const i2 = planeTransform.xflip ? w0 - 1 - i : i;
        for (let j = 0; j < h0; j++) {
          const j2 = planeTransform.yflip ? h0 - 1 - j : j;
          const v = data[i2][h0 - 1 - j2] / (maxval || 1);
          const index = (j * w0 + i) * 4;
          imageData.data[index + 0] = color[0] * v;
          imageData.data[index + 1] = color[1] * v;
          imageData.data[index + 2] = color[2] * v;
          imageData.data[index + 3] = v ? v * 255 : 0;
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

// important to store localized masks, otherwise we run out of RAM quick
type ImageMask = {
  x0: number;
  y0: number;
  w0: number;
  h0: number;
  data: number[][];
};

type Roi = {
  roiNumber: number;
  imageMask: ImageMask;
};

const useRois = (nwbFile: RemoteH5FileX | null) => {
  const [client, setClient] = useState<PlaneSegmentationClient | undefined>(
    undefined,
  );
  const [rois, setRois] = useState<Roi[] | undefined>(undefined);
  const [N1, setN1] = useState<number>(0);
  const [N2, setN2] = useState<number>(0);
  useEffect(() => {
    let canceled = false;
    setClient(undefined);
    if (!nwbFile) return;
    const load = async () => {
      const c = new PlaneSegmentationClient(
        nwbFile,
        "/processing/ophys/ImageSegmentation/PlaneSegmentation_all",
      );
      await c.initialize();
      if (canceled) return;
      setClient(c);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile]);
  useEffect(() => {
    let canceled = false;
    if (!client) return;
    const load = async () => {
      const rois: Roi[] = [];
      for (let i = 0; i < client.shape[0]; i++) {
        if (!client.hasImageMask) {
          throw Error(`Unexpected: no image mask`);
        }
        const mask = await client.getImageMask(i);
        rois.push({
          roiNumber: i + 1,
          imageMask: mask,
        });
      }
      if (canceled) return;
      setRois(rois);
      setN1(client.shape[1]);
      setN2(client.shape[2]);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [client]);
  return { rois, N1, N2 };
};

const blockSize = 50;
class PlaneSegmentationClient {
  #imageMaskDataset: RemoteH5Dataset | undefined;
  #pixelMaskDataset: RemoteH5Dataset | undefined;
  #pixelMaskIndex: number[] | undefined;
  #pixelMaskImageSize: number[] | undefined; // in the case of pixel mask, we unfortunately do not have any direct way to get the image size
  #blocks: { [i: number]: ImageMask[] } = {};
  constructor(
    private nwbFile: RemoteH5FileX,
    private objectPath: string,
  ) {}
  async initialize() {
    this.#imageMaskDataset = await this.nwbFile.getDataset(
      `${this.objectPath}/image_mask`,
    );
    this.#pixelMaskDataset = await this.nwbFile.getDataset(
      `${this.objectPath}/pixel_mask`,
    );
    if (this.#pixelMaskDataset) {
      this.#pixelMaskIndex = (await this.nwbFile.getDatasetData(
        `${this.objectPath}/pixel_mask_index`,
        {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any;
      this.#pixelMaskImageSize = await determineImageSizeFromNwbFileContext(
        this.nwbFile,
        this.objectPath,
      );
    }
    if (!this.#imageMaskDataset && !this.#pixelMaskDataset)
      throw Error(`No image mask or pixel mask dataset`);
  }
  get shape() {
    if (this.#imageMaskDataset) return this.#imageMaskDataset.shape;
    else if (this.#pixelMaskDataset) {
      if (!this.#pixelMaskImageSize) {
        console.error(`No pixel mask image size`);
        return [0, 0, 0]; // see comment above
      }
      return [
        this.#pixelMaskIndex!.length,
        this.#pixelMaskImageSize[0],
        this.#pixelMaskImageSize[1],
      ]; // see comment above
    } else throw Error(`No image mask or pixel mask dataset`);
  }
  get hasImageMask() {
    return !!this.#imageMaskDataset;
  }
  get hasPixelMask() {
    return !!this.#pixelMaskDataset;
  }
  async getImageMask(index: number) {
    if (!this.#imageMaskDataset)
      throw Error(`Cannot get image mask without image mask dataset`);
    const block = await this._loadBlock(Math.floor(index / blockSize));
    return block[index % blockSize];
  }
  async getPixelMask(index: number) {
    const i1 = index > 0 ? this.#pixelMaskIndex![index - 1] : 0;
    const i2 = this.#pixelMaskIndex![index];
    const data = await this.nwbFile.getDatasetData(
      `${this.objectPath}/pixel_mask`,
      { slice: [[i1, i2]] },
    );
    return data;
  }
  private async _loadBlock(chunkIndex: number) {
    if (!this.#imageMaskDataset)
      throw Error(`Cannot load block without image mask dataset`);
    if (this.#blocks[chunkIndex]) return this.#blocks[chunkIndex];
    const i1 = chunkIndex * blockSize;
    const i2 = Math.min(this.shape[0], i1 + blockSize);
    const data = await this.nwbFile.getDatasetData(
      `${this.objectPath}/image_mask`,
      {
        slice: [
          [i1, i2],
          [0, this.shape[1]],
          [0, this.shape[2]],
        ],
      },
    );
    if (!data) throw Error(`Unable to load image mask data`);
    const block: ImageMask[] = [];
    for (let i = 0; i < i2 - i1; i++) {
      const plane: number[][] = [];
      for (let j = 0; j < this.shape[1]; j++) {
        const row: number[] = [];
        for (let k = 0; k < this.shape[2]; k++) {
          row.push(
            data[i * this.shape[1] * this.shape[2] + j * this.shape[2] + k],
          );
        }
        plane.push(row);
      }
      // important to store localized masks, otherwise we run out of RAM quick
      const { x0, y0, w0, h0 } = getBoundingRect(plane);
      const data0: number[][] = [];
      for (let j = 0; j < w0; j++) {
        const row: number[] = [];
        for (let k = 0; k < h0; k++) {
          row.push(plane[x0 + j][y0 + k]);
        }
        data0.push(row);
      }
      block.push({
        x0,
        y0,
        w0,
        h0,
        data: data0,
      });
    }

    this.#blocks[chunkIndex] = block;
    return block;
  }
}

const determineImageSizeFromNwbFileContext = async (
  nwbFile: RemoteH5FileX,
  objectPath: string,
) => {
  /*
      In the case of pixel mask, we unfortunately do not have any direct way to get the image size.
      We need to determine it from the context. In other words, the sibling objects.
      */
  let parentPath = objectPath.split("/").slice(0, -1).join("/");
  let parentGroup = await nwbFile.getGroup(parentPath);
  if (!parentGroup)
    throw Error(`Unable to get parent group for determining image size`);
  if (parentGroup.attrs["neurodata_type"] === "ImageSegmentation") {
    // need to go up one more level
    parentPath = parentPath.split("/").slice(0, -1).join("/");
    parentGroup = await nwbFile.getGroup(parentPath);
    if (!parentGroup)
      throw Error(`Unable to get parent group for determining image size`);
  }
  for (const sg of parentGroup.subgroups) {
    if (sg.attrs["neurodata_type"] === "Images") {
      const imagesGroup = await nwbFile.getGroup(`${parentPath}/${sg.name}`);
      if (!imagesGroup) {
        continue;
      }
      for (const ds of imagesGroup.datasets) {
        if (
          ds.attrs["neurodata_type"] === "Image" ||
          ds.attrs["neurodata_type"] === "GrayscaleImage"
        ) {
          if (ds.shape.length === 2) {
            return ds.shape;
          }
        }
      }
    }
  }
  return undefined;
};

const getBoundingRect = (data: number[][]) => {
  let x0 = undefined;
  let y0 = undefined;
  let x1 = undefined;
  let y1 = undefined;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (let j = 0; j < row.length; j++) {
      const v = row[j];
      if (v) {
        if (x0 === undefined) x0 = i;
        if (y0 === undefined) y0 = j;
        if (x1 === undefined) x1 = i;
        if (y1 === undefined) y1 = j;
        x0 = Math.min(x0, i);
        y0 = Math.min(y0, j);
        x1 = Math.max(x1, i);
        y1 = Math.max(y1, j);
      }
    }
  }
  if (
    x0 === undefined ||
    y0 === undefined ||
    x1 === undefined ||
    y1 === undefined
  )
    return { x0: 0, y0: 0, w0: 0, h0: 0 };
  return { x0, y0, w0: x1 - x0 + 1, h0: y1 - y0 + 1 };
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

const useReferenceImage = (nwbFile: RemoteH5FileX | null) => {
  const [image, setImage] = useState<number[][] | undefined>(undefined);
  useEffect(() => {
    let canceled = false;
    if (!nwbFile) return;
    const load = async () => {
      setImage(undefined);
      const ds = await nwbFile.getDataset(
        "/acquisition/TwoPhotonSeries_000/data",
      );
      if (!ds) return;
      const N0 = ds.shape[0];
      const N1 = ds.shape[1];
      const N2 = ds.shape[2];
      const M0 = Math.min(N0, 10);
      const data = await nwbFile.getDatasetData(
        "/acquisition/TwoPhotonSeries_000/data",
        { slice: [[0, M0]] },
      );
      if (!data) return;
      if (canceled) return;
      const x: number[][] = [];
      for (let i = 0; i < N1; i++) {
        const row: number[] = [];
        for (let j = 0; j < N2; j++) {
          row.push(0);
        }
        x.push(row);
      }
      for (let a = 0; a < M0; a++) {
        for (let i = 0; i < N1; i++) {
          for (let j = 0; j < N2; j++) {
            x[i][j] = Math.max(x[i][j], data[a * N1 * N2 + i * N2 + j]);
          }
        }
      }
      setImage(x);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile]);
  return image;
};

export default RoiView;
