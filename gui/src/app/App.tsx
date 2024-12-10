import { useWindowDimensions } from "@fi-sci/misc";
import Markdown from "../Markdown";
import "./App.css";
import intro_md_template from "../001_intro.md?raw";
import session_md_template from "../002_session.md?raw";

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
  const [roiNumber, setRoiNumber] = useState<number | "all">("all");
  const [acquisitionId, setAcquisitionId] = useState("000");
  const [channelSeparation, setChannelSeparation] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [motionCorrected, setMotionCorrected] = useState(true);
  return (
    <MainContext.Provider
      value={{
        selectedSession,
        setSelectedSession,
        acquisitionId,
        setAcquisitionId,
        roiNumber,
        setRoiNumber,
        channelSeparation,
        setChannelSeparation,
        playing,
        setPlaying,
        playbackRate,
        setPlaybackRate,
        motionCorrected,
        setMotionCorrected,
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
  const { selectedSession, acquisitionId } = useContext(MainContext)!;
  const annotations = useAnnotations(acquisitionId);
  const { width } = useWindowDimensions();
  const mainAreaWidth = Math.min(width - 30, 1000);
  const offsetLeft = (width - mainAreaWidth) / 2;
  const [okayToViewSmallScreen, setOkayToViewSmallScreen] = useState(false);
  const divHandler = useDivHandler();
  const markdown = useMemo(() => {
    let mdTemplate = intro_md_template;
    if (selectedSession) {
      mdTemplate += "\n" + session_md_template;
    } else {
      mdTemplate += "\n" + "Select a session above to view data.";
    }
    const data = {};
    return nunjucks.renderString(mdTemplate, data);
  }, [selectedSession]);
  if (width < 800 && !okayToViewSmallScreen) {
    return <SmallScreenMessage onOkay={() => setOkayToViewSmallScreen(true)} />;
  }
  const padding = 10;
  return (
    <div
      style={{
        position: "absolute",
        left: offsetLeft,
        width: mainAreaWidth,
        top: 10,
      }}
    >
      <AnnotationsContext.Provider value={annotations}>
        <DummyRouteProvider>
          <SetupTimeseriesSelection>
            <ProvideDocumentWidth width={mainAreaWidth - 2 * padding}>
              <Markdown
                source={markdown}
                linkTarget="_self"
                divHandler={divHandler}
                border="1px solid #ccc"
                padding={padding}
              />
            </ProvideDocumentWidth>
          </SetupTimeseriesSelection>
        </DummyRouteProvider>
      </AnnotationsContext.Provider>
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
