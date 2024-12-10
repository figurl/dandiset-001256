import "./App.css";

import { FunctionComponent, PropsWithChildren, useContext } from "react";
import { ReactElement } from "react-markdown/lib/react-markdown";
import { useDocumentWidth } from "../DocumentWidthContext";
import { useNwbFileSafe } from "../neurosift-lib/misc/NwbFileContext";
import NeurodataTimeSeriesItemView from "../neurosift-lib/viewPlugins/TimeSeries/NeurodataTimeSeriesItemView";
import TwoPhotonSeriesItemView from "../neurosift-lib/viewPlugins/TwoPhotonSeries/TwoPhotonSeriesItemView";
import { AnnotationsContext } from "./App";
import { MainContext } from "./MainContext";
import PlayControl from "./PlayControl";
import { getTwoPhotonSeriesPath } from "./util";
import IfHasBeenVisible from "../neurosift-lib/viewPlugins/PSTH/IfHasBeenVisible";

const AcquisitionTwoPhotonSeriesView: FunctionComponent = () => {
  const width = useDocumentWidth();
  const annotations = useContext(AnnotationsContext);
  const {
    acquisitionId,
    roiNumber,
    channelSeparation,
    playing,
    setPlaying,
    playbackRate,
    setPlaybackRate,
    motionCorrected,
  } = useContext(MainContext)!;

  const nwbFile = useNwbFileSafe();
  if (!nwbFile) {
    return <div>No NWB file selected</div>;
  }
  const height = 600;
  return (
    <IfHasBeenVisible width={width} height={height}>
      <Layout1 width={width} height={height}>
        {/* Toolbar */}
        <div>
          <PlayControl
            playing={playing}
            setPlaying={setPlaying}
            playbackRate={playbackRate}
            setPlaybackRate={setPlaybackRate}
          />
        </div>
        {/* TwoPhotonVideo */}
        <TwoPhotonSeriesItemView
          width={0}
          height={0}
          path={getTwoPhotonSeriesPath(acquisitionId, { motionCorrected })}
          initialBrightnessFactor={2}
          showOrientationControls={false}
          condensed={true}
          throttleMsec={500}
        />
        {/* RoiTimeseriesPlot */}
        <NeurodataTimeSeriesItemView
          width={width}
          height={0}
          path={`/processing/ophys/Fluorescence/RoiResponseSeries_${acquisitionId}`}
          initialShowAllChannels={roiNumber === "all"}
          initialNumVisibleChannels={roiNumber === "all" ? undefined : 1}
          initialVisibleStartChannel={
            roiNumber === "all" ? undefined : roiNumber - 1
          }
          initialChannelSeparation={roiNumber === "all" ? channelSeparation : 0}
          annotations={annotations}
          yLabel="Fluorescence"
          showTimeseriesToolbar={false}
          showTimeseriesNavbar={false}
          showBottomToolbar={false}
        />
      </Layout1>
    </IfHasBeenVisible>
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
  const H0 = 45;
  const H1 = (height - H0) * 0.7;
  const H2 = height - H0 - H1;
  /*
    +-----------------------------------+
    |               Toolbar             |
    +-----------------+-----------------+
    |           TwoPhotonVideo          |
    |                                   |
    +-----------------------------------+
    |         RoiTimeseriesPlot         |
    |                                   |
    +-----------------------------------+
    */
  const C0: ReactElement = children[0];
  const C1: ReactElement = children[1];
  const C2: ReactElement = children[2];

  return (
    <div style={{ position: "relative", width, height }}>
      <div style={{ position: "absolute", width, height: H0, top: 0, left: 0 }}>
        {C0}
      </div>
      <div
        style={{ position: "absolute", width, height: H1, top: H0, left: 0 }}
      >
        <C1.type key={C1.key} {...C1.props} width={width} height={H1} />
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: H2,
          top: H0 + H1,
          left: 0,
        }}
      >
        <C2.type key={C2.key} {...C2.props} width={width} height={H2} />
      </div>
    </div>
  );
};

export default AcquisitionTwoPhotonSeriesView;
