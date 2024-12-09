/* eslint-disable react-refresh/only-export-components */
import "./App.css";

import { FunctionComponent, PropsWithChildren, useContext } from "react";
import { ReactElement } from "react-markdown/lib/react-markdown";
import { useDocumentWidth } from "../DocumentWidthContext";
import { useNwbFileSafe } from "../neurosift-lib/misc/NwbFileContext";
import NeurodataTimeSeriesItemView from "../neurosift-lib/viewPlugins/TimeSeries/NeurodataTimeSeriesItemView";
import { AnnotationsContext } from "./App";
import { MainContext } from "./MainContext";

const AcquisitionTimeseriesView: FunctionComponent = () => {
  const width = useDocumentWidth();
  const annotations = useContext(AnnotationsContext);
  const { acquisitionId, roiIndex } = useContext(MainContext)!;

  const nwbFile = useNwbFileSafe();
  if (!nwbFile) {
    return <div>No NWB file selected</div>;
  }
  return (
    <Layout1 width={width} height={400}>
      {/* PupilRadiusTimeseriesPlot */}
      <NeurodataTimeSeriesItemView
        width={0}
        height={0}
        path={`/processing/behavior/PupilTracking/pupil_radius_${acquisitionId}`}
        annotations={annotations}
        yLabel="Pupil radius"
        showTimeseriesToolbar={true}
        showTimeseriesNavbar={true}
        showBottomToolbar={false}
      />
      {/* RoiTimeseriesPlot */}
      <NeurodataTimeSeriesItemView
        width={width}
        height={0}
        path={`/processing/ophys/Fluorescence/RoiResponseSeries_${acquisitionId}`}
        initialShowAllChannels={roiIndex === "all"}
        initialNumVisibleChannels={roiIndex === "all" ? undefined : 1}
        initialVisibleStartChannel={roiIndex === "all" ? undefined : roiIndex}
        initialChannelSeparation={0}
        annotations={annotations}
        yLabel="Fluorescence"
        showTimeseriesToolbar={false}
        showTimeseriesNavbar={false}
        showBottomToolbar={false}
      />
    </Layout1>
  );
};

const Layout1: FunctionComponent<
  PropsWithChildren<{ width: number; height: number }>
> = ({ width, height, children }) => {
  if (!children) {
    throw new Error("Layout1 requires exactly 4 children");
  }
  if (!Array.isArray(children)) {
    throw new Error("Layout1 requires children to be an array");
  }
  const H1 = height * 0.5;
  const H2 = height * 0.5;
  /*
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

  return (
    <div style={{ position: "relative", width, height }}>
      <div style={{ position: "absolute", width, height: H1, top: 0, left: 0 }}>
        <C1.type key={C1.key} {...C1.props} width={width} height={H1} />
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: H2,
          top: H1,
          left: 0,
        }}
      >
        <C2.type key={C2.key} {...C2.props} width={width} height={H2} />
      </div>
    </div>
  );
};

export default AcquisitionTimeseriesView;
