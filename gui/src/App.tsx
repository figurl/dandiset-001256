import { useWindowDimensions } from "@fi-sci/misc";
import "./App.css";
import mainMdTemplate from "./main.md?raw";
import Markdown from "./Markdown";

import nunjucks from "nunjucks";
import { FunctionComponent, PropsWithChildren, useCallback, useMemo, useState } from "react";
import ImageSeriesItemView from "./neurosift-lib/viewPlugins/ImageSeries/ImageSeriesItemView";
import ProvideNwbFile from "./neurosift-lib/misc/ProvideNwbFile";
import { SetupTimeseriesSelection } from "./neurosift-lib/contexts/context-timeseries-selection";
import { Route, RouteContext } from "./neurosift-lib/contexts/useRoute";
import NeurodataTimeSeriesItemView from "./neurosift-lib/viewPlugins/TimeSeries/NeurodataTimeSeriesItemView";
import TwoPhotonSeriesItemView from "./neurosift-lib/viewPlugins/TwoPhotonSeries/TwoPhotonSeriesItemView";
import ImageSegmentationItemView from "./neurosift-lib/viewPlugins/ImageSegmentation/ImageSegmentationItemView";
import { ProvideDocumentWidth, useDocumentWidth } from "./DocumentWidthContext";

nunjucks.configure({ autoescape: false });

const data = {};

const mainMd = nunjucks.renderString(mainMdTemplate, data);

function App() {
  const { width, height } = useWindowDimensions();
  const mainAreaWidth = Math.min(width - 30, 1200);
  const offsetLeft = (width - mainAreaWidth) / 2;
  const [okayToViewSmallScreen, setOkayToViewSmallScreen] = useState(false);
  const divHandler = useDivHandler({});
  if (width < 800 && !okayToViewSmallScreen) {
    return <SmallScreenMessage onOkay={() => setOkayToViewSmallScreen(true)} />;
  }
  return (
    <div
      style={{
        position: "absolute",
        width,
        height: height,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: offsetLeft,
          width: mainAreaWidth,
        }}
      >
        <DummyRouteProvider>
          <ProvideNwbFile nwbUrl={nwbUrl} dandisetId={dandisetId}>
            <SetupTimeseriesSelection>
              <ProvideDocumentWidth width={mainAreaWidth}>
                <Markdown
                  source={mainMd}
                  linkTarget="_self"
                  divHandler={divHandler}
                />
              </ProvideDocumentWidth>
            </SetupTimeseriesSelection>
          </ProvideNwbFile>
        </DummyRouteProvider>
      </div>
    </div>
  );
}

const DummyRouteProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const route = useMemo(() => {
    return {page: "home"} as Route;
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setRoute = useCallback((r: Route) => {}, []);
  return (
    <RouteContext.Provider value={{ route, setRoute }}>
      {children}
    </RouteContext.Provider>
  )
}

const SmallScreenMessage: FunctionComponent<{ onOkay: () => void }> = ({
  onOkay,
}) => {
  return (
    <div style={{ padding: 20 }}>
      <p>
        This page is not optimized for small screens or mobile devices. Please
        use a larger screen or expand your browser window width.
      </p>
      <p>
        <button onClick={onOkay}>I understand, continue anyway</button>
      </p>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type DivHandlerConfig = {
  //
}

interface DivHandlerProps {
  className?: string;
  props: Record<string, unknown>;
  children: React.ReactNode;
}

type DivHandlerComponent = (props: DivHandlerProps) => JSX.Element;

const nwbUrl =
  "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/";
const dandisetId = "001256";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useDivHandler = (config: DivHandlerConfig): DivHandlerComponent => {
  return useMemo(() => {
    return ({ className, props, children }: DivHandlerProps) => {
      switch (className) {
        case "pupil-video": {
          return (
            <PupilVideoComponent />
          );
        }

        case "pupil-radius-timeseries-plot": {
          return (
            <PupilRadiusTimeseriesPlot />
          )
        }

        case "two-photon-video": {
          return (
            <TwoPhotonVideoComponent />
          )
        }

        case "image-segmentation": {
          return (
            <ImageSegmentationComponent />
          )
        }

        case "roi-timeseries-plot": {
          return (
            <RoiTimeseriesPlot />
          )
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
  return (
    <div
      style={{ position: "relative", width, height: 400 }}
    >
      <ImageSeriesItemView
        width={width}
        height={400}
        path="/processing/behavior/pupil_video_000"
        initialBrightnessFactor={2}
      />
    </div>
  )
}

const PupilRadiusTimeseriesPlot: FunctionComponent = () => {
  const width = useDocumentWidth();
  return (
    <div
      style={{ position: "relative", width, height: 400 }}
    >
      <NeurodataTimeSeriesItemView
        width={width}
        height={400}
        path="/processing/behavior/PupilTracking/pupil_radius_000"
      />
    </div>
  )
}

const TwoPhotonVideoComponent: FunctionComponent = () => {
  const width = useDocumentWidth();
  return (
    <div
      style={{ position: "relative", width, height: 400 }}
    >
      <TwoPhotonSeriesItemView
        width={width}
        height={400}
        path="/acquisition/TwoPhotonSeries_000"
        initialBrightnessFactor={2}
      />
    </div>
  )
}

const ImageSegmentationComponent: FunctionComponent = () => {
  const width = useDocumentWidth();
  return (
    <div
      style={{ position: "relative", width, height: 400 }}
    >
      <ImageSegmentationItemView
        width={width}
        height={400}
        path="/processing/ophys/ImageSegmentation"
      />
    </div>
  )
}

const RoiTimeseriesPlot: FunctionComponent = () => {
  const width = useDocumentWidth();
  return (
    <div
      style={{ position: "relative", width, height: 400 }}
    >
      <NeurodataTimeSeriesItemView
        width={width}
        height={400}
        path="/processing/ophys/Fluorescence/RoiResponseSeries_000"
        initialShowAllChannels={true}
        initialChannelSeparation={0}
      />
    </div>
  )
}

export default App;
