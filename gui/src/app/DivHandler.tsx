/* eslint-disable react-refresh/only-export-components */
import "./App.css";

import { useMemo } from "react";
import AcquisitionSelector, { ROISelector } from "./AcquisitionSelector";
import AcquisitionView from "./AcquisitionView";
import ImageSegmentationComponent from "./ImageSegmentationComponent";
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

        case "acquisition-view": {
          return <AcquisitionView />;
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
