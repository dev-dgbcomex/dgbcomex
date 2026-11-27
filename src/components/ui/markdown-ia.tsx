"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type MarkdownIaProps = {
  conteudo: string
  className?: string
}

function urlTransformSeguro(url: string): string {
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return url
  if (url.startsWith("/") || url.startsWith("#")) return url
  return ""
}

export function MarkdownIa({ conteudo, className = "" }: MarkdownIaProps) {
  return (
    <div className={`prose prose-sm max-w-none break-words dark:prose-invert sm:prose-base ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={urlTransformSeguro}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-3 w-full overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[32rem] border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th
              scope="col"
              className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-slate-200 px-3 py-2 align-top text-slate-700 last:border-0 dark:border-slate-800 dark:text-slate-300">
              {children}
            </td>
          ),
          input: ({ type, checked }) =>
            type === "checkbox" ? (
              <input
                type="checkbox"
                checked={Boolean(checked)}
                readOnly
                disabled
                className="mr-2 accent-blue-600"
              />
            ) : null,
        }}
      >
        {conteudo}
      </ReactMarkdown>
    </div>
  )
}
