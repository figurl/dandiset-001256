import React, { FunctionComponent, PropsWithChildren } from "react";

/*
This should be used along with the Markdown component when divHandler is used so
that the markdown is not rerendered every time the width changes.
*/

const DocumentWidthContext = React.createContext<number | undefined>(undefined);

export const ProvideDocumentWidth: FunctionComponent<
  PropsWithChildren<{ width: number }>
> = ({ width, children }) => {
  return (
    <DocumentWidthContext.Provider value={width}>
      {children}
    </DocumentWidthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDocumentWidth = () => {
  const w = React.useContext(DocumentWidthContext);
  if (w === undefined) {
    return 600;
  }
  return w;
};
