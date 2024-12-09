/* eslint-disable react-refresh/only-export-components */
import "./App.css";

import { FunctionComponent } from "react";
import { useDocumentWidth } from "../DocumentWidthContext";
import { useNwbFileSafe } from "../neurosift-lib/misc/NwbFileContext";
import ImageSegmentationItemView from "../neurosift-lib/viewPlugins/ImageSegmentation/ImageSegmentationItemView";

const ImageSegmentationComponent: FunctionComponent = () => {
  const width = useDocumentWidth();

  const nwbFile = useNwbFileSafe();
  if (!nwbFile) {
    return <div>No NWB file selected</div>;
  }
  return (
    <div style={{ position: "relative", width, height: 400 }}>
      <ImageSegmentationItemView
        width={width}
        height={400}
        path="/processing/ophys/ImageSegmentation"
      />
    </div>
  );
};

export default ImageSegmentationComponent;
