import { PlotlyContent } from "./codeExecution/PythonSessionClient";
import { ORTool } from "./openRouterTypes";

export type ExecuteScript = (
  script: string,
  handlers: {
    onStdout?: (message: string) => void;
    onStderr?: (message: string) => void;
    onImage?: (format: "png", content: string) => void;
    onFigure?: (
      a: { format: "plotly"; content: PlotlyContent },
      // | { format: "neurosift_figure"; content: NeurosiftFigureContent },
    ) => void;
  },
) => Promise<void>;

export type ToolItem = {
  serial?: boolean;
  function: (
    args: any,
    onLogMessage: (title: string, message: string) => void,
    o: {
      modelName: string;
      openRouterKey: string | null;
      executeScript?: ExecuteScript;
      onAddImage?: (name: string, url: string) => void;
      onAddFigureData?: (name: string, content: string) => void;
      onStdout?: (message: string) => void;
      onStderr?: (message: string) => void;
      confirmOkayToRun?: (script: string) => Promise<boolean>;
    },
  ) => Promise<any>;
  detailedDescription?: string;
  tool: ORTool;
};
