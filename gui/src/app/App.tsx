import { useWindowDimensions } from "@fi-sci/misc";
import Markdown from "../Markdown";
import "./App.css";
import mainMdTemplate from "../main.md?raw";

import nunjucks from "nunjucks";
import {
  FunctionComponent,
  PropsWithChildren,
  useCallback,
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

nunjucks.configure({ autoescape: false });

const data = {};

const mainMd = nunjucks.renderString(mainMdTemplate, data);

const nwbUrl =
  "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/";
const dandisetId = "001256";

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
    return <ChatPage width={width} height={height} nwbUrl={nwbUrl} />;
  }
  return (
    <ProvideNwbFile nwbUrl={nwbUrl} dandisetId={dandisetId}>
      <AppChild1 />
    </ProvideNwbFile>
  );
};

const AppChild1: FunctionComponent = () => {
  const [acquisitionId, setAcquisitionId] = useState("000");
  const annotations = useAnnotations(acquisitionId);
  return (
    <MainContext.Provider
      value={{ acquisitionId, setAcquisitionId, annotations }}
    >
      <AppChild2 />
    </MainContext.Provider>
  );
};

const AppChild2: FunctionComponent = () => {
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
