/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import Markdown from "../../Markdown";
import AgentProgressWindow, {
  AgentProgressMessage,
} from "./Chat/AgentProgressWindow";
import { Chat, ChatAction, chatReducer, emptyChat } from "./Chat/Chat";
import chatCompletion from "./Chat/chatCompletion";
import InputBar from "./Chat/InputBar";
import MessageDisplay from "./Chat/MessageDisplay";
import { ORMessage, ORToolCall } from "./Chat/openRouterTypes";
import SettingsBar from "./Chat/SettingsBar";
import ToolElement from "./Chat/ToolElement";
import { ExecuteScript, ToolItem } from "./Chat/ToolItem";
import ToolResponseView from "./Chat/ToolResponseView";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { generateFigureTool } from "./Chat/tools/generateFigure";
import arrayBufferFromPngDataUrl from "./Chat/arrayBufferFromPngDataUrl";
import PythonSessionClient, {
  PlotlyContent,
} from "./Chat/codeExecution/PythonSessionClient";
import {
  JupyterConnectivityProvider,
  loadJupyterConnectivityStateFromLocalStorage,
  useJupyterConnectivity,
} from "./Chat/codeExecution/JupyterConnectivity";
import ConfirmOkayToRunWindow from "./Chat/ConfirmOkayToRunWindow";
import { computeTool } from "./Chat/tools/compute";

type ChatPageProps = {
  width: number;
  height: number;
};

const systemMessage1 = `
You are a helpful assistant that is responding to technical questions.
Your responses should be concise and informative with a scientific style and certainly not informal or overly verbose.

Do not deviate from the specific capabilities that are spelled out here.
Each capability starts with the word "CAPABILITY" in all caps, followed by a colon and then the description of the capability.
In your responses you should use one or more of the capabilities, using only the tools spelled out there.
Note that it is okay to use more than one capability in a response.

You should also respect information that starts with "NOTE" in all caps followed by a colon.

If the user asks about something that is not related to one of these capabilities, you should respond with a message indicating that you are unable to help with that question.

CAPABILITY: If the user wants create a plot, you should use the figure_script tool.
You pass in a self-contained script that uses matplotlib or plotly, and the output is one or more markdown or html text lines that you can include in your response.

CAPABILITY: If you need to compute or analyze data, you should use the compute_script tool.
You pass in a Python script that performs the computation and prints the results to stdout.
The output of the tool is the stdout output of the script.
You may consider outputing the results as JSON text.
`;

const ChatPage: FunctionComponent<ChatPageProps> = ({ width, height }) => {
  const [chat, chatDispatch] = useReducer(chatReducer, emptyChat);
  const openRouterKey =
    "sk-or" +
    "-v1-" +
    "4515b1afe37b8d66b1877e0a619840cc4561b28e4236dcc6e17a736d9171e" +
    "751";
  return (
    <JupyterConnectivityProvider mode="jupyter-server">
      <ChatPageChild
        width={width}
        height={height}
        chat={chat}
        chatDispatch={chatDispatch}
        openRouterKey={openRouterKey}
        systemMessage1={systemMessage1}
      />
    </JupyterConnectivityProvider>
  );
};

type ChatPageChildProps = {
  width: number;
  height: number;
  chat: Chat;
  chatDispatch: (action: ChatAction) => void;
  openRouterKey: string | null;
  systemMessage1: string;
};

const ChatPageChild: FunctionComponent<ChatPageChildProps> = ({
  width,
  height,
  chat,
  chatDispatch,
  openRouterKey,
  systemMessage1,
}) => {
  // define the tools
  const tools: ToolItem[] = useMemo(() => {
    const ret: ToolItem[] = [];
    ret.push(generateFigureTool);
    ret.push(computeTool);
    return ret;
  }, []);
  const initialMessage = useMemo(() => {
    return `
Explore Dandiset 001256.
`;
  }, []);
  const systemMessage = useSystemMessage(tools, systemMessage1);
  return (
    <ChatWindow
      width={width}
      height={height}
      chat={chat}
      chatDispatch={chatDispatch}
      openRouterKey={openRouterKey}
      systemMessage={systemMessage}
      tools={tools}
      initialMessage={initialMessage}
    />
  );
};

const ChatWindow: FunctionComponent<{
  width: number;
  height: number;
  chat: Chat;
  chatDispatch: (action: ChatAction) => void;
  openRouterKey: string | null;
  systemMessage: string;
  tools: ToolItem[];
  initialMessage: string;
}> = ({
  width,
  height,
  chat,
  chatDispatch,
  openRouterKey,
  systemMessage,
  tools,
  initialMessage,
}) => {
  const inputBarHeight = 30;
  const settingsBarHeight = 20;
  const topBarHeight = 24;

  const [modelName, setModelName] = useState("openai/gpt-4o");

  const handleUserMessage = useCallback(
    (message: string) => {
      chatDispatch({
        type: "add-message",
        message: { role: "user", content: message },
      });
      setAtLeastOneUserMessageSubmitted(true);
    },
    [chatDispatch]
  );

  const messages = chat.messages;

  // last message
  const lastMessage = useMemo(() => {
    const messages2: ORMessage[] = [
      ...messages.filter((x) => x.role !== "client-side-only"),
    ];
    if (messages2.length === 0) return null;
    return messages2[messages2.length - 1];
  }, [messages]);

  // last message is user or tool
  const lastMessageIsUserOrTool = useMemo(() => {
    return lastMessage
      ? lastMessage.role === "user" || lastMessage.role === "tool"
      : false;
  }, [lastMessage]);

  // last message is tool calls
  const lastMessageIsToolCalls = useMemo(() => {
    return lastMessage
      ? !!(
          lastMessage.role === "assistant" &&
          lastMessage.content === null &&
          lastMessage.tool_calls
        )
      : false;
  }, [lastMessage]);

  //   // last message is assistant non-tool call
  //   const lastMessageIsAssistantNonToolCall = useMemo(() => {
  //     return lastMessage
  //       ? lastMessage.role === "assistant" && !(lastMessage as any).tool_calls
  //       : false;
  //   }, [lastMessage]);

  // has no user messages
  const hasNoUserMessages = useMemo(() => {
    return !messages.some((x) => x.role === "user");
  }, [messages]);

  const [editedPromptText, setEditedPromptText] = useState("");

  // backup and erase last user message
  const backUpAndEraseLastUserMessage = useCallback(() => {
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMessageIndex = i;
        break;
      }
    }
    if (lastUserMessageIndex === -1) {
      return;
    }
    const lastUserMessageContent = messages[lastUserMessageIndex].content;
    chatDispatch({
      type: "truncate-messages",
      lastMessage: messages[lastUserMessageIndex - 1] || null,
    });
    if (typeof lastUserMessageContent === "string") {
      setEditedPromptText(lastUserMessageContent);
    }
  }, [messages, chatDispatch]);

  // agent progress
  const [agentProgress, setAgentProgress] = useState<AgentProgressMessage[]>(
    []
  );
  const resetAgentProgress = useCallback(() => {
    setAgentProgress([]);
  }, []);
  const addAgentProgressMessage = useCallback(
    (type: "stdout" | "stderr", message: string) => {
      setAgentProgress((prev) => [
        ...prev,
        {
          type,
          message,
        },
      ]);
    },
    []
  );

  // last completion failed
  const [lastCompletionFailed, setLastCompletionFailed] = useState(false);
  const [lastCompletionFailedRefreshCode, setLastCompletionFailedRefreshCode] =
    useState(0);

  // Last message is user or tool, so we need to do a completion
  useEffect(() => {
    if (!systemMessage) return;
    let canceled = false;
    const messages2: ORMessage[] = [
      {
        role: "system",
        content: systemMessage,
      },
      ...messages.filter((x) => x.role !== "client-side-only"),
    ];
    const lastMessage = messages2[messages2.length - 1];
    if (!lastMessage) return;
    if (!["user", "tool"].includes(lastMessage.role)) return;
    (async () => {
      setLastCompletionFailed(false);
      let assistantMessage: string;
      let toolCalls: any[] | undefined;
      try {
        const x = await chatCompletion({
          messages: messages2,
          modelName,
          openRouterKey,
          tools: tools.map((x) => x.tool),
        });
        assistantMessage = x.assistantMessage;
        toolCalls = x.toolCalls;
      } catch (e: any) {
        if (canceled) return;
        console.warn("Error in chat completion", e);
        setLastCompletionFailed(true);
        return;
      }
      if (canceled) return;
      if (toolCalls) {
        // tool calls
        chatDispatch({
          type: "add-message",
          message: {
            role: "assistant",
            content: assistantMessage || null,
            tool_calls: toolCalls,
          },
        });
      } else {
        if (!assistantMessage) {
          console.warn("Unexpected: no assistant message and no tool calls");
          return;
        }
        chatDispatch({
          type: "add-message",
          message: { role: "assistant", content: assistantMessage },
        });
      }
    })();
    return () => {
      canceled = true;
    };
  }, [
    messages,
    modelName,
    openRouterKey,
    tools,
    systemMessage,
    backUpAndEraseLastUserMessage,
    chatDispatch,
    lastCompletionFailedRefreshCode,
  ]);

  // pending tool calls
  const [pendingToolCalls, setPendingToolCalls] = useState<ORToolCall[]>([]);

  const runningToolCalls = useRef(false);

  const [scriptExecutionStatus, setScriptExecutionStatus] = useState<
    "none" | "starting" | "running"
  >("none");
  const scriptCancelTrigger = useRef<boolean>(false);

  const jupyterConnectivityState = useJupyterConnectivity();

  // confirm okay to run
  const {
    visible: confirmOkayToRunVisible,
    handleOpen: openConfirmOkayToRun,
    handleClose: closeConfirmOkayToRun,
  } = useModalWindow();
  const confirmOkayToRunStatus = useRef<
    "none" | "waiting" | "confirmed" | "canceled"
  >("none");
  const [confirmOkayToRunScript, setConfirmOkayToRunScript] = useState<
    string | null
  >(null);
  const confirmOkayToRun = useMemo(
    () => async (script: string) => {
      confirmOkayToRunStatus.current = "waiting";
      setConfirmOkayToRunScript(script);
      openConfirmOkayToRun();
      return new Promise<boolean>((resolve) => {
        const interval = setInterval(() => {
          if (confirmOkayToRunStatus.current === "confirmed") {
            confirmOkayToRunStatus.current = "none";
            clearInterval(interval);
            resolve(true);
          } else if (confirmOkayToRunStatus.current === "canceled") {
            confirmOkayToRunStatus.current = "none";
            clearInterval(interval);
            resolve(false);
          }
        }, 500);
      });
    },
    [openConfirmOkayToRun]
  );

  // last message is assistant with tool calls, so we need to run the tool calls
  useEffect(() => {
    if (!systemMessage) return;
    let canceled = false;
    const messages2: ORMessage[] = [
      {
        role: "system",
        content: systemMessage,
      },
      ...messages.filter((x) => x.role !== "client-side-only"),
    ];
    const lastMessage = messages2[messages2.length - 1];
    if (!lastMessage) return;
    if (lastMessage.role !== "assistant") return;
    if (!(lastMessage as any).tool_calls) return;
    if (runningToolCalls.current) return;
    (async () => {
      const newMessages: ORMessage[] = [];
      const toolCalls: ORToolCall[] = (lastMessage as any).tool_calls;
      const processToolCall = async (tc: any) => {
        const func = tools.find(
          (x) => x.tool.function.name === tc.function.name
        )?.function;
        if (!func) {
          throw Error(`Unexpected. Did not find tool: ${tc.function.name}`);
        }
        const args = JSON.parse(tc.function.arguments);
        console.info("TOOL CALL: ", tc.function.name, args, tc);
        let response: string;
        try {
          addAgentProgressMessage(
            "stdout",
            `Running tool: ${tc.function.name}`
          );
          console.info(`Running ${tc.function.name}`);
          const executeScript2: ExecuteScript = async (
            script: string,
            o: {
              onStdout?: (message: string) => void;
              onStderr?: (message: string) => void;
              onImage?: (format: "png", content: string) => void;
              onFigure?: (
                a: { format: "plotly"; content: PlotlyContent }
                //   | {
                //       format: "neurosift_figure";
                //       content: NeurosiftFigureContent;
                //     },
              ) => void;
            }
          ) => {
            setScriptExecutionStatus("starting");
            scriptCancelTrigger.current = false;
            // it's important that we don't depend on the state variable jupyterConnectivityState
            const jcState = loadJupyterConnectivityStateFromLocalStorage(
              jupyterConnectivityState.mode,
              jupyterConnectivityState.extensionKernel,
              true
            );
            const pythonSessionClient = new PythonSessionClient(jcState);
            try {
              pythonSessionClient.onOutputItem((item) => {
                if (item.type === "stdout") {
                  if (o.onStdout) o.onStdout(item.content);
                } else if (item.type === "stderr") {
                  if (o.onStderr) o.onStderr(item.content);
                } else if (item.type === "image") {
                  if (o.onImage) o.onImage(item.format, item.content);
                } else if (item.type === "figure") {
                  if (o.onFigure) {
                    o.onFigure({
                      format: item.format as any,
                      content: item.content as any,
                    });
                  }
                }
              });
              await pythonSessionClient.initiate();
              setScriptExecutionStatus("running");
              await new Promise<void>((resolve, reject) => {
                let done = false;
                pythonSessionClient
                  .runCode(script)
                  .then(() => {
                    if (done) return;
                    done = true;
                    resolve();
                  })
                  .catch((e) => {
                    if (done) return;
                    done = true;
                    reject(e);
                  });
                const check = () => {
                  if (done) return;
                  if (scriptCancelTrigger.current) {
                    done = true;
                    reject(new Error("Script execution cancelled by user"));
                    return;
                  }
                  setTimeout(check, 100);
                };
                check();
              });
            } finally {
              pythonSessionClient.shutdown();
              setScriptExecutionStatus("none");
            }
          };
          response = await func(args, () => {}, {
            modelName,
            openRouterKey,
            executeScript: executeScript2,
            onStdout: (message) => {
              addAgentProgressMessage("stdout", message);
            },
            onStderr: (message) => {
              addAgentProgressMessage("stderr", message);
            },
            onAddImage: (name, url) => {
              chatDispatch({
                type: "set-file",
                name,
                content: arrayBufferFromPngDataUrl(url),
              });
            },
            onAddFigureData: (name, content) => {
              chatDispatch({
                type: "set-file",
                name,
                content,
              });
            },
            confirmOkayToRun,
          });
        } catch (e: any) {
          console.error(`Error in tool ${tc.function.name}`, e);
          // errorMessage = e.message;
          response = "Error: " + e.message;
        }
        if (canceled) {
          console.warn(
            `WARNING!!! Hook canceled during tool call ${tc.function.name}`
          );
          return;
        }
        console.info("TOOL RESPONSE: ", response);
        const msg1: ORMessage = {
          role: "tool",
          content:
            typeof response === "object"
              ? JSON.stringify(response)
              : `${response}`,
          tool_call_id: tc.id,
        };
        newMessages.push(msg1);
      };
      // run the tool calls in parallel
      resetAgentProgress();
      runningToolCalls.current = true;
      try {
        setPendingToolCalls(toolCalls);
        const toolItems = toolCalls.map((tc) =>
          tools.find((x) => x.tool.function.name === tc.function.name)
        );
        const serialIndices = toolItems
          .map((x, i) => ({ x, i }))
          .filter((a) => a.x?.serial)
          .map((a) => a.i);
        const nonSerialIndices = toolItems
          .map((x, i) => ({ x, i }))
          .filter((a) => !a.x?.serial)
          .map((a) => a.i);
        for (const i of serialIndices) {
          await processToolCall(toolCalls[i]);
        }
        await Promise.all(
          toolCalls
            .filter((_, i) => nonSerialIndices.includes(i))
            .map(processToolCall)
        );
      } finally {
        runningToolCalls.current = false;
        setPendingToolCalls([]);
        resetAgentProgress();
      }
      if (canceled) return;
      chatDispatch({
        type: "add-messages",
        messages: newMessages,
      });
    })();
    return () => {
      canceled = true;
    };
  }, [
    messages,
    modelName,
    openRouterKey,
    tools,
    systemMessage,
    chatDispatch,
    resetAgentProgress,
    addAgentProgressMessage,
    confirmOkayToRun,
    jupyterConnectivityState.extensionKernel,
    jupyterConnectivityState.mode,
  ]);

  // div refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomElementRef = useRef<HTMLDivElement>(null);

  // at least one user message submitted in this user session
  const [atLeastOneUserMessageSubmitted, setAtLeastOneUserMessageSubmitted] =
    useState(false);

  // whether the input bar is enabled
  const inputBarEnabled = useMemo(() => {
    return !lastMessageIsUserOrTool && !lastMessageIsToolCalls;
  }, [lastMessageIsUserOrTool, lastMessageIsToolCalls]);

  // suggested questions depending on the context
  const suggestedQuestions = useMemo(() => {
    return [];
  }, []);
  const handleClickSuggestedQuestion = useCallback(
    (question: string) => {
      if (!inputBarEnabled) {
        return;
      }
      chatDispatch({
        type: "add-message",
        message: { role: "user", content: question },
      });
      setAtLeastOneUserMessageSubmitted(true);
    },
    [chatDispatch, inputBarEnabled]
  );

  // layout
  const chatAreaWidth = Math.min(width - 30, 800);
  const offsetLeft = (width - chatAreaWidth) / 2;

  // when a new message comes, scroll to the bottom
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    if (!atLeastOneUserMessageSubmitted) {
      return;
    }
    const lastMessage = messages[messages.length - 1];
    if (!["assistant", "client-side-only"].includes(lastMessage.role)) {
      return;
    }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, atLeastOneUserMessageSubmitted]);

  // truncate at a particular message
  const truncateAtMessage = useCallback(
    (m: ORMessage) => {
      const index = messages.indexOf(m);
      if (index < 0) return;
      chatDispatch({
        type: "truncate-messages",
        lastMessage: messages[index - 1] || null,
      });
    },
    [messages, chatDispatch]
  );

  // open window to see the data for a tool response
  const [openToolResponseData, setOpenToolResponseData] = useState<{
    toolCall: ORToolCall;
    toolResponse: ORMessage;
  } | null>(null);
  const {
    handleOpen: openToolResponse,
    handleClose: closeToolResponse,
    visible: toolResponseVisible,
  } = useModalWindow();
  const handleOpenToolResponse = useCallback(
    (toolCall: ORToolCall, toolResponse: ORMessage) => {
      setOpenToolResponseData({ toolCall, toolResponse });
      openToolResponse();
    },
    [openToolResponse]
  );

  const handleDownloadChat = useCallback(() => {
    // download to a .nschat file
    const blob = new Blob([JSON.stringify(chat, null, 2)], {
      type: "application/json",
    });
    const fileName = prompt("Enter a file name", "chat.nschat");
    if (!fileName) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [chat]);

  const handleUploadChat = useCallback(() => {
    // have user select a .nschat file from their machine and load it
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".nschat";
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      const text = await file.text();
      const chat2 = JSON.parse(text);
      chatDispatch({ type: "set", chat: chat2 });
    };
    input.click();
  }, [chatDispatch]);

  const imgHandler = useMemo(
    () => (args: { src: string; props: any }) => {
      const { src, props } = args;
      const files = chat.files;
      if (src?.startsWith("image://") && files) {
        const name = src.slice("image://".length);
        if (name in files) {
          const a = files[name];
          if (a.startsWith("base64:")) {
            const dataBase64 = a.slice("base64:".length);
            const dataUrl = `data:image/png;base64,${dataBase64}`;
            return <img src={dataUrl} {...props} />;
          }
        }
      }
      return <img src={src} {...props} />;
    },
    [chat.files]
  );

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          left: offsetLeft,
          width: chatAreaWidth,
          height,
        }}
      >
        <div
          ref={chatContainerRef}
          style={{
            position: "absolute",
            left: 5,
            width: chatAreaWidth - 10,
            top: topBarHeight,
            height: height - topBarHeight - inputBarHeight - settingsBarHeight,
            overflow: "auto",
          }}
        >
          <div>
            <Markdown source={initialMessage} />
          </div>
          {suggestedQuestions.length > 0 && hasNoUserMessages && (
            <div style={{ marginTop: 5, marginBottom: 5 }}>
              {suggestedQuestions.map((question, index) => (
                <span key={index}>
                  {index > 0 && <br />}
                  <span
                    style={{
                      marginLeft: 0,
                      marginRight: 5,
                      cursor: inputBarEnabled ? "pointer" : undefined,
                      color: inputBarEnabled ? "#aaf" : "lightgray",
                    }}
                    onClick={() => handleClickSuggestedQuestion(question)}
                  >
                    {question}
                  </span>
                </span>
              ))}
            </div>
          )}
          {messages
            .filter((m) => {
              if (m.role === "assistant" && m.content === null) {
                return false;
              }
              return true;
            })
            .map((c, index) => (
              <div
                key={index}
                style={{
                  color: colorForRole(c.role),
                }}
              >
                {c.role === "assistant" && c.content !== null ? (
                  <>
                    <Markdown
                      source={c.content as string}
                      imgHandler={imgHandler}
                    />
                  </>
                ) : c.role === "assistant" && !!(c as any).tool_calls ? (
                  <>
                    <div>Tool calls</div>
                  </>
                ) : c.role === "user" ? (
                  <>
                    <hr />
                    <span style={{ color: "darkblue" }}>YOU: </span>
                    <span style={{ color: "darkblue" }}>
                      <MessageDisplay message={c.content as string} />
                      &nbsp;
                      <SmallIconButton
                        onClick={() => {
                          const ok = confirm(
                            "Delete this prompt and all subsequent messages?"
                          );
                          if (!ok) return;
                          truncateAtMessage(c);
                        }}
                        icon={<span>...</span>}
                        title="Delete this prompt"
                      />
                    </span>
                    <hr />
                  </>
                ) : c.role === "tool" ? (
                  <div>
                    <ToolElement
                      message={c}
                      messages={messages}
                      onOpenToolResponse={(toolCall, toolResponse) => {
                        handleOpenToolResponse(toolCall, toolResponse);
                      }}
                    />
                  </div>
                ) : c.role === "client-side-only" ? (
                  <>
                    <div
                      style={{
                        color: (c as any).color || "#6a6",
                        paddingBottom: 10,
                      }}
                    >
                      {(c as any).content}
                    </div>
                  </>
                ) : (
                  <span>Unknown role: {c.role}</span>
                )}
              </div>
            ))}
          {(lastMessageIsUserOrTool || lastMessageIsToolCalls) && (
            <div>
              <span style={{ color: "#6a6" }}>processing...</span>
            </div>
          )}
          {pendingToolCalls.length > 0 && (
            <div>
              {pendingToolCalls.length === 1
                ? `Processing tool call: ${pendingToolCalls[0].function.name}`
                : `Processing ${
                    pendingToolCalls.length
                  } tool calls: ${pendingToolCalls
                    .map((x) => x.function.name)
                    .join(", ")}`}
            </div>
          )}
          {agentProgress.length > 0 && (
            <AgentProgressWindow
              width={chatAreaWidth - 10}
              height={400}
              agentProgress={agentProgress}
            />
          )}
          {lastCompletionFailed && (
            <div>
              <span style={{ color: "red" }}>
                {`An error occurred retrieving the assistant's response. `}
                <Hyperlink
                  onClick={() => {
                    setLastCompletionFailedRefreshCode((x) => x + 1);
                  }}
                >
                  Try again
                </Hyperlink>
              </span>
            </div>
          )}
          <div ref={bottomElementRef}>&nbsp;</div>
        </div>
        <div
          style={{
            position: "absolute",
            width: chatAreaWidth,
            height: inputBarHeight,
            top: height - inputBarHeight - settingsBarHeight,
            left: 0,
          }}
        >
          <InputBar
            width={chatAreaWidth}
            height={inputBarHeight}
            onMessage={handleUserMessage}
            disabled={!inputBarEnabled}
            waitingForResponse={
              lastMessageIsUserOrTool || lastMessageIsToolCalls
            }
            editedPromptText={editedPromptText}
            setEditedPromptText={setEditedPromptText}
          />
        </div>
        <div
          style={{
            position: "absolute",
            width,
            height: settingsBarHeight,
            top: height - settingsBarHeight,
            left: 0,
          }}
        >
          <SettingsBar
            width={width}
            height={settingsBarHeight}
            onClearAllMessages={() => {
              chatDispatch({
                type: "clear-messages",
              });
            }}
            modelName={modelName}
            setModelName={setModelName}
            onDownloadChat={handleDownloadChat}
            onUploadChat={handleUploadChat}
            onCancelScript={
              scriptExecutionStatus === "running"
                ? () => {
                    scriptCancelTrigger.current = true;
                  }
                : undefined
            }
          />
        </div>
        <ModalWindow visible={toolResponseVisible} onClose={closeToolResponse}>
          {openToolResponseData ? (
            <ToolResponseView
              toolCall={openToolResponseData.toolCall}
              toolResponse={openToolResponseData.toolResponse}
            />
          ) : (
            <span>Unexpected: no tool response data</span>
          )}
        </ModalWindow>
        <ModalWindow
          visible={confirmOkayToRunVisible}
          onClose={() => {
            confirmOkayToRunStatus.current = "canceled";
            closeConfirmOkayToRun();
          }}
        >
          <ConfirmOkayToRunWindow
            script={confirmOkayToRunScript}
            onConfirm={() => {
              console.info("Confirmed okay to run");
              confirmOkayToRunStatus.current = "confirmed";
              closeConfirmOkayToRun();
            }}
            onCancel={() => {
              console.info("Canceled okay to run");
              confirmOkayToRunStatus.current = "canceled";
              closeConfirmOkayToRun();
            }}
          />
        </ModalWindow>
      </div>
    </div>
  );
};

const colorForRole = (role: string) => {
  // for now we do it randomly and see how it looks
  const hash = role.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const r = hash % 200;
  const g = (hash * 2) % 200;
  const b = (hash * 3) % 200;
  return `rgb(${r},${g},${b})`;
};

const useSystemMessage = (tools: ToolItem[], systemMessage1: string) => {
  let systemMessage = `
${systemMessage1}
`;
  for (const tool of tools) {
    if (tool.detailedDescription) {
      systemMessage += `
      ========================
      Here's a detailed description of the ${tool.tool.function.name} tool:
      ${tool.detailedDescription}
      ========================
      `;
    }
  }
  return systemMessage;
};

export default ChatPage;
