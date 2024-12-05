/* eslint-disable react-refresh/only-export-components */
import "./App.css";

import { FunctionComponent, useContext, useEffect, useMemo } from "react";
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
        case "pupil-video": {
          return <PupilVideoComponent />;
        }

        case "pupil-radius-timeseries-plot": {
          return <PupilRadiusTimeseriesPlot />;
        }

        case "two-photon-video": {
          return <TwoPhotonVideoComponent />;
        }

        case "image-segmentation": {
          return <ImageSegmentationComponent />;
        }

        case "roi-timeseries-plot": {
          return <RoiTimeseriesPlot />;
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

const PupilVideoComponent: FunctionComponent = () => {
  const width = useDocumentWidth();
  const { acquisitionId } = useContext(MainContext)!;
  return (
    <div style={{ position: "relative", width, height: 400 }}>
      <ImageSeriesItemView
        width={width}
        height={400}
        path={`/processing/behavior/pupil_video_${acquisitionId}`}
        initialBrightnessFactor={2}
      />
    </div>
  );
};

const PupilRadiusTimeseriesPlot: FunctionComponent = () => {
  const width = useDocumentWidth();
  const { acquisitionId } = useContext(MainContext)!;
  return (
    <div style={{ position: "relative", width, height: 400 }}>
      <NeurodataTimeSeriesItemView
        width={width}
        height={400}
        path={`/processing/behavior/PupilTracking/pupil_radius_${acquisitionId}`}
      />
    </div>
  );
};

const TwoPhotonVideoComponent: FunctionComponent = () => {
  const width = useDocumentWidth();
  const { acquisitionId } = useContext(MainContext)!;
  return (
    <div style={{ position: "relative", width, height: 400 }}>
      <TwoPhotonSeriesItemView
        width={width}
        height={400}
        path={`/acquisition/TwoPhotonSeries_${acquisitionId}`}
        initialBrightnessFactor={2}
      />
    </div>
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

const RoiTimeseriesPlot: FunctionComponent = () => {
  const width = useDocumentWidth();
  const { acquisitionId } = useContext(MainContext)!;
  return (
    <div style={{ position: "relative", width, height: 400 }}>
      <NeurodataTimeSeriesItemView
        width={width}
        height={400}
        path={`/processing/ophys/Fluorescence/RoiResponseSeries_${acquisitionId}`}
        initialShowAllChannels={true}
        initialChannelSeparation={0}
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
