import {
  FunctionComponent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTimeseriesSelection } from "../../neurosift-lib/contexts/context-timeseries-selection";
import { useNwbFileSafe } from "../../neurosift-lib/misc/NwbFileContext";
import {
  RemoteH5Dataset,
  RemoteH5FileX,
} from "../../neurosift-lib/remote-h5-file";
import { MainContext } from "../MainContext";
import RoiViewWidget from "./RoiViewWidget";
import { getTwoPhotonSeriesPath } from "../util";
import IfHasBeenVisible from "../../neurosift-lib/viewPlugins/PSTH/IfHasBeenVisible";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type RoiViewProps = {
  // none
};

const RoiView: FunctionComponent<RoiViewProps> = () => {
  const nwbFile = useNwbFileSafe();
  const { rois, N1, N2 } = useRois(nwbFile);
  const {
    selectedSession,
    roiNumber,
    setRoiNumber,
    acquisitionId,
    motionCorrected,
  } = useContext(MainContext)!;
  const { currentTime } = useTimeseriesSelection();
  const referenceImage = useReferenceImage(
    nwbFile,
    acquisitionId,
    currentTime,
    motionCorrected,
  );
  const width = 400;
  const height = 400;
  const handleClickRoi = useCallback(
    (roiNumber: number | "all") => {
      setRoiNumber(roiNumber);
    },
    [setRoiNumber],
  );
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
    <IfHasBeenVisible width={width} height={height}>
      <RoiViewWidget
        width={width}
        height={height}
        rois={rois}
        referenceImage={referenceImage}
        N1={N1}
        N2={N2}
        selectedRoi={roiNumber}
        onClickRoi={handleClickRoi}
      />
    </IfHasBeenVisible>
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

export type Roi = {
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
      const imageSegmentationGroupPath = "/processing/ophys/ImageSegmentation";
      const g = await nwbFile.getGroup(imageSegmentationGroupPath);
      if (!g) {
        console.warn(`No ImageSegmentation group found at ${imageSegmentationGroupPath}`);
        return;
      }
      if (canceled) return;
      const planeSegmentationName = g.subgroups.map((sg) => sg.name).filter(name => (name.startsWith("PlaneSegmentation_")))[0];
      if (!planeSegmentationName) {
        console.warn(`No PlaneSegmentation found in ${imageSegmentationGroupPath}`);
        return;
      }
      const c = new PlaneSegmentationClient(
        nwbFile,
        `${imageSegmentationGroupPath}/${planeSegmentationName}`,
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

const useReferenceImage = (
  nwbFile: RemoteH5FileX | null,
  acquisitionId: string,
  currentTime: number | undefined,
  motionCorrected: boolean,
) => {
  const [image, setImage] = useState<number[][] | undefined>(undefined);
  const currentTimeThrottled = useThrottledState(currentTime, 500);
  useEffect(() => {
    let canceled = false;
    if (!nwbFile) return;
    const load = async () => {
      setImage(undefined);
      if (currentTimeThrottled === undefined) return;
      const dsStartingTimeDsPath = `${getTwoPhotonSeriesPath(acquisitionId, { motionCorrected })}/starting_time`;
      const startingTimeDataset =
        await nwbFile.getDataset(dsStartingTimeDsPath);
      if (!startingTimeDataset) return;
      const startingTime = (await nwbFile.getDatasetData(
        dsStartingTimeDsPath,
        {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any as number;
      if (typeof startingTime !== "number") return;
      if (canceled) return;
      const rate = startingTimeDataset.attrs["rate"] as number;
      if (typeof rate !== "number") return;
      const index = Math.round((currentTimeThrottled - startingTime) * rate);
      const ds = await nwbFile.getDataset(
        `${getTwoPhotonSeriesPath(acquisitionId, { motionCorrected })}/data`,
      );
      if (!ds) return;
      if (canceled) return;
      const N0 = ds.shape[0];
      const N1 = ds.shape[1];
      const N2 = ds.shape[2];
      if (index < 0 || index >= N0) return;
      const data = await nwbFile.getDatasetData(
        `${getTwoPhotonSeriesPath(acquisitionId, { motionCorrected })}/data`,
        { slice: [[index, index + 1]] },
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
      for (let i = 0; i < N1; i++) {
        for (let j = 0; j < N2; j++) {
          x[i][j] = Math.max(x[i][j], data[i * N2 + j]);
        }
      }
      if (canceled) return;
      setImage(x);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, acquisitionId, currentTimeThrottled, motionCorrected]);
  return image;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useThrottledState(value: any, delay: number) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdateTimeRef = useRef(Date.now());
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

    // If enough time has passed, update immediately
    if (timeSinceLastUpdate >= delay) {
      setThrottledValue(value);
      lastUpdateTimeRef.current = now;
    } else {
      // Otherwise, set a timeout to update after the remaining time
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastUpdateTimeRef.current = Date.now();
      }, delay - timeSinceLastUpdate);
    }

    return () => {
      // Clear timeout on cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return throttledValue;
}

export default RoiView;
