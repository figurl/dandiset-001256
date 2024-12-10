/* eslint-disable react-refresh/only-export-components */
import "./App.css";

import { useMemo } from "react";
import AcquisitionSelector, {
  ChannelSeparationSelector,
  ROISelector,
} from "./AcquisitionSelector";
import ImageSegmentationComponent from "./ImageSegmentationComponent";
import SessionsTable from "./SessionsTable";
import AcquisitionTimeseriesView from "./AcquisitionTimeseriesView";
import AcquisitionPupilVideoView from "./AcquisitionPupilVideoView";
import AcquisitionTwoPhotonSeriesView from "./AcquisitionTwoPhotonSeriesView";

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
        case "sessions-table": {
          return <SessionsTable />;
        }

        case "acquisition-timeseries-view": {
          return <AcquisitionTimeseriesView />;
        }

        case "acquisition-pupil-video-view": {
          return <AcquisitionPupilVideoView />;
        }

        case "acquisition-two-photon-series-view": {
          return <AcquisitionTwoPhotonSeriesView />;
        }

        case "image-segmentation": {
          return <ImageSegmentationComponent />;
        }

        case "acquisition-selector": {
          return <AcquisitionSelector />;
        }

        case "ROI-selector": {
          return <ROISelector />;
        }

        case "channel-separation-selector": {
          return <ChannelSeparationSelector />;
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
