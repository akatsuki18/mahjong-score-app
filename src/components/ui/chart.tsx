"use client"

import * as React from "react"
import { TooltipProps } from "recharts"

export interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartContextValue {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

export function ChartContainer({
  config,
  children,
}: {
  config: ChartConfig
  children: React.ReactNode
}) {
  const value = React.useMemo(() => ({ config }), [config])

  // カスタムCSSプロパティを生成
  const cssVars = Object.entries(config).reduce((acc, [key, value]) => {
    acc[`--color-${key}`] = value.color;
    return acc;
  }, {} as Record<string, string>);

  return (
    <ChartContext.Provider value={value}>
      <div
        className="h-[240px] w-full"
        style={cssVars as React.CSSProperties}
      >
        {children}
      </div>
    </ChartContext.Provider>
  )
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  indicator = "line",
}: TooltipProps<any, any> & { indicator?: "line" | "dashed" }) {
  const context = React.useContext(ChartContext)

  if (!active || !payload?.length || !context) {
    return null
  }

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
        <div className="grid gap-1">
          {payload.map((item: any, index: number) => {
            const config = context.config[item.dataKey]
            return (
              <div key={index} className="flex items-center gap-2">
                <div
                  className={`h-1 w-4 rounded-full ${
                    indicator === "dashed" ? "border border-dashed" : ""
                  }`}
                  style={{
                    background: indicator === "line" ? config?.color : "transparent",
                    borderColor: indicator === "dashed" ? config?.color : "transparent",
                  }}
                />
                <div className="flex items-center gap-1">
                  <div className="text-sm font-medium">{config?.label}</div>
                  <div className="text-sm text-muted-foreground">{item.value.toLocaleString()}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}