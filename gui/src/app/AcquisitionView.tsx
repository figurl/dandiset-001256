/* eslint-disable react-refresh/only-export-components */
import "./App.css";

import { FunctionComponent, PropsWithChildren, useContext } from "react";
import { ReactElement } from "react-markdown/lib/react-markdown";
import { useDocumentWidth } from "../DocumentWidthContext";
import { useNwbFileSafe } from "../neurosift-lib/misc/NwbFileContext";
import ImageSeriesItemView from "../neurosift-lib/viewPlugins/ImageSeries/ImageSeriesItemView";
import NeurodataTimeSeriesItemView from "../neurosift-lib/viewPlugins/TimeSeries/NeurodataTimeSeriesItemView";
import TwoPhotonSeriesItemView from "../neurosift-lib/viewPlugins/TwoPhotonSeries/TwoPhotonSeriesItemView";
import { AnnotationsContext } from "./App";
import { MainContext } from "./MainContext";

const AcquisitionView: FunctionComponent = () => {
  const width = useDocumentWidth();
  const annotations = useContext(AnnotationsContext);
  const { acquisitionId, roiIndex } = useContext(MainContext)!;

  const nwbFile = useNwbFileSafe();
  if (!nwbFile) {
    return <div>No NWB file selected</div>;
  }
  return (
    <Layout1 width={width} height={800}>
      {/* PupilVideo */}
      <ImageSeriesItemView
        width={0}
        height={400}
        path={`/processing/behavior/pupil_video_${acquisitionId}`}
        initialBrightnessFactor={2}
        showOrientationControls={false}
      />
      {/* TwoPhotonVideo */}
      <TwoPhotonSeriesItemView
        width={0}
        height={0}
        path={`/acquisition/TwoPhotonSeries_${acquisitionId}`}
        initialBrightnessFactor={2}
        showOrientationControls={false}
      />
      {/* PupilRadiusTimeseriesPlot */}
      <NeurodataTimeSeriesItemView
        width={0}
        height={0}
        path={`/processing/behavior/PupilTracking/pupil_radius_${acquisitionId}`}
        annotations={annotations}
        yLabel="Pupil radius"
        showTimeseriesToolbar={true}
        showTimeseriesNavbar={true}
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
  const H1 = height * 0.3;
  const H2 = height * 0.3;
  const H3 = height - H1 - H2;
  const W1 = width / 2;
  const W2 = width - W1;
  /*
    +-----------------+-----------------+
    | PupilRadiusTimeseriesPlot         |
    |                                   |
    +-----------------------------------+
    | RoiTimeseriesPlot                 |
    |                                   |
    +-----------------------------------+
    |     PupilVideo  | TwoPhotonVideo  |
    |                 |                 |
    +-----------------+-----------------+
    */
  const C1: ReactElement = children[0];
  const C2: ReactElement = children[1];
  const C3: ReactElement = children[2];
  const C4: ReactElement = children[3];

  return (
    <div style={{ position: "relative", width, height }}>
      <div style={{ position: "absolute", width, height: H1, top: 0, left: 0 }}>
        <C3.type key={C3.key} {...C3.props} width={width} height={H1} />
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
        <C4.type key={C4.key} {...C4.props} width={width} height={H2} />
      </div>
      <div
        style={{
          position: "absolute",
          width: W1,
          height: H3,
          top: H1 + H2,
          left: 0,
        }}
      >
        <C1.type key={C1.key} {...C1.props} width={W1} height={H3} />
      </div>
      <div
        style={{
          position: "absolute",
          width: W2,
          height: H3,
          top: H1 + H2,
          left: W1,
        }}
      >
        <C2.type key={C2.key} {...C2.props} width={W2} height={H3} />
      </div>
    </div>
  );
};

export default AcquisitionView;
