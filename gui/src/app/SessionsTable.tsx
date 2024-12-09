import { FunctionComponent, useContext, useEffect, useState } from "react";
import { useDocumentWidth } from "../DocumentWidthContext";
import { getNwbFileFromUrl } from "../neurosift-lib/misc/ProvideNwbFile";
import { MainContext } from "./MainContext";
import { Hyperlink } from "@fi-sci/misc";

type SessionsTableProps = {};

export type Session = {
  assetPath: string;
  assetId: string;
  assetUrl: string;
  numAcquisitions: number;
};

const SessionsTable: FunctionComponent<SessionsTableProps> = () => {
  const { selectedSession, setSelectedSession } = useContext(MainContext)!;
  const [maxToLoad, setMaxToLoad] = useState(5);
  const { sessions, loading, truncated } = useSessions({ maxToLoad });
  const width = useDocumentWidth();
  return (
    <div
      style={{ position: "relative", width, maxHeight: 200, overflowY: "auto" }}
    >
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Session</th>
            <th>Num. acquisitions</th>
            <th>Links</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.assetId}>
              <td>
                <input
                  type="radio"
                  name="session"
                  checked={session.assetId === selectedSession?.assetId}
                  onChange={() => setSelectedSession(session)}
                />
              </td>
              <td>{session.assetPath.split("/")[1]}</td>
              <td>{session.numAcquisitions}</td>
              <td>
                <a href={neurosiftLinkForAsset(session.assetUrl)}>
                  View in Neurosift
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && truncated ? (
        <div>
          <Hyperlink
            onClick={() => {
              setMaxToLoad((v) => v + 20);
            }}
          >
            Show more...
          </Hyperlink>
        </div>
      ) : (
        <span />
      )}
    </div>
  );
};

type AssetsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AssetsResponseAsset[];
};

type AssetsResponseAsset = {
  asset_id: string;
  blob: string;
  zarr: string | null;
  path: string;
  size: number;
  created: string;
  modified: string;
};

const dandisetId = "001256";
const dandisetVersion = "0.241120.2150";

const useSessions = (o: {
  maxToLoad: number;
}): { sessions: Session[]; loading: boolean; truncated: boolean } => {
  // https://api.dandiarchive.org/api/dandisets/001256/versions/0.241120.2150/assets/?order=path&metadata=false
  const url = `https://api.dandiarchive.org/api/dandisets/${dandisetId}/versions/${dandisetVersion}/assets/?order=path&metadata=false`;
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [errorMesssage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setErrorMessage(null);
      setSessions(null);
      setLoading(true);
      const response = await fetch(url);
      if (canceled) {
        return;
      }
      if (!response.ok) {
        console.error(
          `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
        );
        setErrorMessage(
          `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
        );
        return;
      }
      const json = await response.json();
      if (canceled) {
        return;
      }
      const x: Session[] = [];
      let timer = Date.now();
      let results = (json as AssetsResponse).results;
      if (results.length > o.maxToLoad) {
        results = results.slice(0, o.maxToLoad);
        setTruncated(true);
      } else {
        setTruncated(false);
      }
      for (const r of results) {
        const assetUrl = `https://api.dandiarchive.org/api/assets/${r.asset_id}/download/`;
        const getInfoForAsset = async (assetUrl: string) => {
          const ff = await getNwbFileFromUrl(assetUrl, dandisetId, {
            requireLindi: true,
          });
          if (ff) {
            const g = await ff.getGroup("/acquisition");
            return {
              numAcquisitions:
                g?.subgroups.filter((x) =>
                  x.name.startsWith("TwoPhotonSeries_"),
                ).length || 0,
            };
          } else {
            return null;
          }
        };
        const info = await getInfoForAsset(assetUrl);
        if (!info) {
          console.warn(`Failed to get info for asset ${r.asset_id}`);
          continue;
        }
        if (canceled) {
          return;
        }
        x.push({
          assetPath: r.path,
          assetId: r.asset_id,
          assetUrl,
          numAcquisitions: info.numAcquisitions,
        });
        if (Date.now() - timer > 500) {
          timer = Date.now();
          setSessions([...x]);
          // if (x.length > 10) {
          //     break;
          // }
        }
      }
      setSessions(x);
      setLoading(false);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [url, o.maxToLoad]);
  return { sessions: sessions || [], loading, truncated };
};

const neurosiftLinkForAsset = (assetUrl: string): string => {
  return `https://neurosift.app/?p=/nwb&url=${assetUrl}&dandisetId=${dandisetId}&dandisetVersion=${dandisetVersion}`;
};

export default SessionsTable;
