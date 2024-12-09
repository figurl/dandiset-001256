import { useWindowDimensions } from "@fi-sci/misc";
import Markdown from "../Markdown";
import "./App.css";
import mainMdTemplate from "../main.md?raw";

import nunjucks from "nunjucks";
import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { ProvideDocumentWidth } from "../DocumentWidthContext";
import { SetupTimeseriesSelection } from "../neurosift-lib/contexts/context-timeseries-selection";
import { Route, RouteContext } from "../neurosift-lib/contexts/useRoute";
import ProvideNwbFile from "../neurosift-lib/misc/ProvideNwbFile";
import { MainContext } from "./MainContext";
import { useDivHandler } from "./DivHandler";
import { useAnnotations } from "./useAnnotations";
import { BrowserRouter, useLocation } from "react-router-dom";
import ChatPage from "./ChatPage/ChatPage";
import { TimeseriesAnnotation } from "../neurosift-lib/viewPlugins/TimeSeries/TimeseriesItemView/WorkerTypes";
import { Session } from "./SessionsTable";

nunjucks.configure({ autoescape: false });

const data = {};

const mainMd = nunjucks.renderString(mainMdTemplate, data);

const defaultNwbUrl =
  "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/";
const dandisetId = "001256";

export const AnnotationsContext = createContext<
  TimeseriesAnnotation[] | undefined
>(undefined);

const App: FunctionComponent = () => {
  return (
    <BrowserRouter>
      <AppChild0 />
    </BrowserRouter>
  );
};

const AppChild0: FunctionComponent = () => {
  const location = useLocation();
  const queryParameters = new URLSearchParams(location.search);
  const p = queryParameters.get("p");
  const { width, height } = useWindowDimensions();
  if (p === "/chat") {
    return <ChatPage width={width} height={height} nwbUrl={defaultNwbUrl} />;
  }
  return <AppChild1 />;
};

const AppChild1: FunctionComponent = () => {
  const [selectedSession, setSelectedSession] = useState<Session | undefined>(
    undefined,
  );
  const [roiIndex, setRoiIndex] = useState<number | "all">(27);
  const [acquisitionId, setAcquisitionId] = useState("000");
  return (
    <MainContext.Provider
      value={{
        selectedSession,
        setSelectedSession,
        acquisitionId,
        setAcquisitionId,
        roiIndex,
        setRoiIndex,
      }}
    >
      <AppChild1b />
    </MainContext.Provider>
  );
};

const AppChild1b: FunctionComponent = () => {
  const { selectedSession } = useContext(MainContext)!;
  return (
    <ProvideNwbFile nwbUrl={selectedSession?.assetUrl} dandisetId={dandisetId}>
      <AppChild2 />
    </ProvideNwbFile>
  );
};

const AppChild2: FunctionComponent = () => {
  const { acquisitionId } = useContext(MainContext)!;
  const annotations = useAnnotations(acquisitionId);
  const { width, height } = useWindowDimensions();
  const mainAreaWidth = Math.min(width - 30, 1200);
  const offsetLeft = (width - mainAreaWidth) / 2;
  const [okayToViewSmallScreen, setOkayToViewSmallScreen] = useState(false);
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
        <AnnotationsContext.Provider value={annotations}>
          <DummyRouteProvider>
            <SetupTimeseriesSelection>
              <ProvideDocumentWidth width={mainAreaWidth}>
                <Markdown
                  source={mainMd}
                  linkTarget="_self"
                  divHandler={divHandler}
                />
              </ProvideDocumentWidth>
            </SetupTimeseriesSelection>
          </DummyRouteProvider>
        </AnnotationsContext.Provider>
      </div>
    </div>
  );
};

const DummyRouteProvider: FunctionComponent<PropsWithChildren> = ({
  children,
}) => {
  const route = useMemo(() => {
    return { page: "home" } as Route;
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setRoute = useCallback((r: Route) => {}, []);
  return (
    <RouteContext.Provider value={{ route, setRoute }}>
      {children}
    </RouteContext.Provider>
  );
};

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

export default App;
