/* eslint-disable react-refresh/only-export-components */
import "./App.css";

import {
  FunctionComponent,
  PropsWithChildren,
  ReactElement,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useDocumentWidth } from "../DocumentWidthContext";
import { useTimeseriesSelection } from "../neurosift-lib/contexts/context-timeseries-selection";
import ImageSegmentationItemView from "../neurosift-lib/viewPlugins/ImageSegmentation/ImageSegmentationItemView";
import ImageSeriesItemView from "../neurosift-lib/viewPlugins/ImageSeries/ImageSeriesItemView";
import NeurodataTimeSeriesItemView from "../neurosift-lib/viewPlugins/TimeSeries/NeurodataTimeSeriesItemView";
import TwoPhotonSeriesItemView from "../neurosift-lib/viewPlugins/TwoPhotonSeries/TwoPhotonSeriesItemView";
import { MainContext } from "./MainContext";

export interface DivHandlerProps {
  className?: string;
  props: Record<string, unknown>;
  children: React.ReactNode;
}

export type DivHandlerComponent = (props: DivHandlerProps) => JSX.Element;

export const useDivHandler = (): DivHandlerComponent => {
  return useMemo(() => {
    return ({ className, props, children }: DivHandlerProps) => {
      switch (className) {
        case "acquisition-view": {
          return <AcquisitionView />;
        }

        case "image-segmentation": {
          return <ImageSegmentationComponent />;
        }

        case "acquisition-selector": {
          return <AcquisitionSelector />;
        }

        default:
          return (
            <div className={className} {...props}>
              {children}
            </div>
          );
      }
    };
  }, []);
};

const Layout1: FunctionComponent<
  PropsWithChildren<{ width: number; height: number }>
> = ({ width, height, children }) => {
  if (!children || children.length !== 4) {
    throw new Error("Layout1 requires exactly 4 children");
  }
  if (!Array.isArray(children)) {
    throw new Error("Layout1 requires children to be an array");
  }
  const H1 = height * 0.4;
  const H2 = (height - H1) / 2;
  const W1 = width / 2;
  const W2 = width - W1;
  /*
    +-----------------+-----------------+
    |     PupilVideo  | TwoPhotonVideo  |
    |                 |                 |
    +-----------------+-----------------+
    | PupilRadiusTimeseriesPlot         |
    |                                   |
    +-----------------------------------+
    | RoiTimeseriesPlot                 |
    |                                   |
    +-----------------------------------+
    */
  const C1: ReactElement = children[0];
  const C2: ReactElement = children[1];
  const C3: ReactElement = children[2];
  const C4: ReactElement = children[3];

  return (
    <div style={{ position: "relative", width, height }}>
      <div
        style={{ position: "absolute", width: W1, height: H1, top: 0, left: 0 }}
      >
        <C1.type key={C1.key} {...C1.props} width={W1} height={H1} />
      </div>
      <div
        style={{
          position: "absolute",
          width: W2,
          height: H1,
          top: 0,
          left: W1,
        }}
      >
        <C2.type key={C2.key} {...C2.props} width={W2} height={H1} />
      </div>
      <div
        style={{ position: "absolute", width, height: H2, top: H1, left: 0 }}
      >
        <C3.type key={C3.key} {...C3.props} width={width} height={H2} />
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: H2,
          top: H1 + H2,
          left: 0,
        }}
      >
        <C4.type key={C4.key} {...C4.props} width={width} height={H2} />
      </div>
    </div>
  );
};

const AcquisitionView: FunctionComponent = () => {
  const width = useDocumentWidth();
  const { acquisitionId, annotations } = useContext(MainContext)!;
  return (
    <Layout1 width={width} height={800}>
      {/* PupilVideo */}
      <ImageSeriesItemView
        width={0}
        height={400}
        path={`/processing/behavior/pupil_video_${acquisitionId}`}
        initialBrightnessFactor={2}
      />
      {/* TwoPhotonVideo */}
      <TwoPhotonSeriesItemView
        width={0}
        height={0}
        path={`/acquisition/TwoPhotonSeries_${acquisitionId}`}
        initialBrightnessFactor={2}
      />
      {/* PupilRadiusTimeseriesPlot */}
      <NeurodataTimeSeriesItemView
        width={0}
        height={0}
        path={`/processing/behavior/PupilTracking/pupil_radius_${acquisitionId}`}
        annotations={annotations}
        yLabel="Pupil radius"
      />
      {/* RoiTimeseriesPlot */}
      <NeurodataTimeSeriesItemView
        width={width}
        height={0}
        path={`/processing/ophys/Fluorescence/RoiResponseSeries_${acquisitionId}`}
        initialShowAllChannels={true}
        initialChannelSeparation={0}
        annotations={annotations}
        yLabel="Fluorescence"
      />
    </Layout1>
  );
};

const ImageSegmentationComponent: FunctionComponent = () => {
  const width = useDocumentWidth();
  return (
    <div style={{ position: "relative", width, height: 400 }}>
      <ImageSegmentationItemView
        width={width}
        height={400}
        path="/processing/ophys/ImageSegmentation"
      />
    </div>
  );
};

// acquisitions 000 through 036
const options = Array.from({ length: 37 }, (_, i) =>
  i.toString().padStart(3, "0"),
);

const AcquisitionSelector: FunctionComponent = () => {
  const { acquisitionId, setAcquisitionId } = useContext(MainContext)!;

  const { resetTimeseriesSelection } = useTimeseriesSelection();

  useEffect(() => {
    resetTimeseriesSelection();
  }, [acquisitionId, resetTimeseriesSelection]);

  return (
    <div>
      Acquisition:{" "}
      <select
        value={acquisitionId}
        onChange={(e) => setAcquisitionId(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};
