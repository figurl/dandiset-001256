import { useWindowDimensions } from "@fi-sci/misc";
import "./App.css";
import mainMdTemplate from "./main.md?raw";
import Markdown from "./Markdown";

import nunjucks from "nunjucks";
import { createContext, FunctionComponent, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ProvideDocumentWidth, useDocumentWidth } from "./DocumentWidthContext";
import { SetupTimeseriesSelection, useTimeseriesSelection } from "./neurosift-lib/contexts/context-timeseries-selection";
import { Route, RouteContext } from "./neurosift-lib/contexts/useRoute";
import ProvideNwbFile from "./neurosift-lib/misc/ProvideNwbFile";
import ImageSegmentationItemView from "./neurosift-lib/viewPlugins/ImageSegmentation/ImageSegmentationItemView";
import ImageSeriesItemView from "./neurosift-lib/viewPlugins/ImageSeries/ImageSeriesItemView";
import NeurodataTimeSeriesItemView from "./neurosift-lib/viewPlugins/TimeSeries/NeurodataTimeSeriesItemView";
import TwoPhotonSeriesItemView from "./neurosift-lib/viewPlugins/TwoPhotonSeries/TwoPhotonSeriesItemView";

nunjucks.configure({ autoescape: false });

const data = {};

const mainMd = nunjucks.renderString(mainMdTemplate, data);

type MainContextType = {
  acquisitionId: string;
  setAcquisitionId: (id: string) => void;
};

const MainContext = createContext<MainContextType | null>(null);

function App() {
  const { width, height } = useWindowDimensions();
  const mainAreaWidth = Math.min(width - 30, 1200);
  const offsetLeft = (width - mainAreaWidth) / 2;
  const [okayToViewSmallScreen, setOkayToViewSmallScreen] = useState(false);
  const [acquisitionId, setAcquisitionId] = useState("000");
  const divHandler = useDivHandler();
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
        <MainContext.Provider value={{ acquisitionId, setAcquisitionId }}>
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
        </MainContext.Provider>
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

interface DivHandlerProps {
  className?: string;
  props: Record<string, unknown>;
  children: React.ReactNode;
}

type DivHandlerComponent = (props: DivHandlerProps) => JSX.Element;

const nwbUrl =
  "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/";
const dandisetId = "001256";

const useDivHandler = (): DivHandlerComponent => {
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

        case "acquisition-selector": {
          return (
            <AcquisitionSelector />
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
  const { acquisitionId } = useContext(MainContext)!;
  return (
    <div
      style={{ position: "relative", width, height: 400 }}
    >
      <ImageSeriesItemView
        width={width}
        height={400}
        path={`/processing/behavior/pupil_video_${acquisitionId}`}
        initialBrightnessFactor={2}
      />
    </div>
  )
}

const PupilRadiusTimeseriesPlot: FunctionComponent = () => {
  const width = useDocumentWidth();
  const { acquisitionId } = useContext(MainContext)!;
  return (
    <div
      style={{ position: "relative", width, height: 400 }}
    >
      <NeurodataTimeSeriesItemView
        width={width}
        height={400}
        path={`/processing/behavior/PupilTracking/pupil_radius_${acquisitionId}`}
      />
    </div>
  )
}

const TwoPhotonVideoComponent: FunctionComponent = () => {
  const width = useDocumentWidth();
  const { acquisitionId } = useContext(MainContext)!;
  return (
    <div
      style={{ position: "relative", width, height: 400 }}
    >
      <TwoPhotonSeriesItemView
        width={width}
        height={400}
        path={`/acquisition/TwoPhotonSeries_${acquisitionId}`}
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
  const { acquisitionId } = useContext(MainContext)!;
  return (
    <div
      style={{ position: "relative", width, height: 400 }}
    >
      <NeurodataTimeSeriesItemView
        width={width}
        height={400}
        path={`/processing/ophys/Fluorescence/RoiResponseSeries_${acquisitionId}`}
        initialShowAllChannels={true}
        initialChannelSeparation={0}
      />
    </div>
  )
}

// acquisitions 000 through 036
const options = Array.from({ length: 37 }, (_, i) => i.toString().padStart(3, '0'));

const AcquisitionSelector: FunctionComponent = () => {
  const { acquisitionId, setAcquisitionId } = useContext(MainContext)!;

  const {resetTimeseriesSelection} = useTimeseriesSelection();

  useEffect(() => {
    resetTimeseriesSelection();
  }, [acquisitionId, resetTimeseriesSelection]);

  return (
    <div>
      Acquisition: <select
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
  )
}

export default App;
