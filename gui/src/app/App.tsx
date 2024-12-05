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

nunjucks.configure({ autoescape: false });

const data = {};

const mainMd = nunjucks.renderString(mainMdTemplate, data);

const nwbUrl =
  "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/";
const dandisetId = "001256";

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
