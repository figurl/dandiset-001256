/* eslint-disable @typescript-eslint/no-explicit-any */
// import "katex/dist/katex.min.css";
import { FunctionComponent, useMemo, useState } from "react";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { darcula as highlighterStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
// import rehypeKatexPlugin from 'rehype-katex';
import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { CopyAll, PlayArrow } from "@mui/icons-material";
import "github-markdown-css/github-markdown-light.css";
import { SpecialComponents } from "react-markdown/lib/ast-to-react";
import { NormalComponents } from "react-markdown/lib/complex-types";
import rehypeMathJaxSvg from "rehype-mathjax";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMathPlugin from "remark-math";

type Props = {
  source: string;
  onSpecialLinkClick?: (link: string) => void;
  onRunCode?: (code: string) => void;
  runCodeReady?: boolean;
  files?: { [name: string]: string };
  linkTarget?: string;
  divHandler?: (args: { className: string | undefined; props: any, children: any }) => JSX.Element;
};

const Markdown: FunctionComponent<Props> = ({
  source,
  onSpecialLinkClick,
  onRunCode,
  runCodeReady,
  files,
  linkTarget,
  divHandler
}) => {
  const components: Partial<
    Omit<NormalComponents, keyof SpecialComponents> & SpecialComponents
  > = useMemo(
    () => ({
      code: ({ inline, className, children, ...props }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [copied, setCopied] = useState<boolean>(false);
        const match = /language-(\w+)/.exec(className || "");
        return !inline && match ? (
          <>
            <div>
              <SmallIconButton
                icon={<CopyAll />}
                title="Copy code"
                onClick={() => {
                  navigator.clipboard.writeText(String(children));
                  setCopied(true);
                }}
              />
              {copied && <>&nbsp;copied</>}
              {onRunCode && (
                <span style={{ color: runCodeReady ? "black" : "lightgray" }}>
                  <SmallIconButton
                    icon={<PlayArrow />}
                    title="Run code"
                    onClick={() => {
                      const code = String(children);
                      onRunCode(code);
                    }}
                    disabled={!runCodeReady}
                  />
                </span>
              )}
            </div>
            <SyntaxHighlighter
              children={String(children).replace(/\n$/, "")}
              style={highlighterStyle as any}
              language={match[1]}
              PreTag="div"
              {...props}
            />
          </>
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      div: ({ node, className, children, ...props }) => {
        if (divHandler) {
          return divHandler({ className, props, children });
        } else {
          return (
            <div className={className} {...props}>
              {children}
            </div>
          );
        }
      },
      a: ({ node, children, href, ...props }) => {
        if (href && href.startsWith("?") && onSpecialLinkClick) {
          return (
            <Hyperlink
              onClick={() => {
                onSpecialLinkClick(href);
              }}
            >
              {children}
            </Hyperlink>
          );
        } else {
          return (
            <a href={href} {...props}>
              {children}
            </a>
          );
        }
      },
      img: ({ node, src, ...props }) => {
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
      // }
    }),
    [onSpecialLinkClick, onRunCode, runCodeReady, files, divHandler],
  );
  return (
    <div className="markdown-body" style={{ fontSize: 16 }}>
      <ReactMarkdown
        children={source}
        remarkPlugins={[remarkGfm, remarkMathPlugin]}
        rehypePlugins={[rehypeRaw, rehypeMathJaxSvg /*, rehypeKatexPlugin*/]}
        components={components}
        linkTarget={linkTarget || "_blank"}
      />
    </div>
  );
};

export default Markdown;
