import "./App.css";

import { useMemo } from "react";
import AcquisitionPupilVideoView from "./AcquisitionPupilVideoView";
import AcquisitionSelector, {
  ChannelSeparationSelector,
  ROISelector,
} from "./AcquisitionSelector";
import AcquisitionTimeseriesView from "./AcquisitionTimeseriesView";
import AcquisitionTwoPhotonSeriesView from "./AcquisitionTwoPhotonSeriesView";
import RoiView from "./RoiView";
import SessionsTable from "./SessionsTable";

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

        case "roi-view": {
          return <RoiView />;
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
