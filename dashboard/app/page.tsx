"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Download } from "lucide-react";

import { DashboardNav } from "../components/dashboard-nav";
import { ThemeToggle } from "../components/theme-toggle";

type GridRow = {
  timestamp: string;
  demand: number;
  forecast: number | null;
  baseline_prediction: number;
  gridpulse_prediction: number;
};

type ChartRow = GridRow & {
  displayTime: string;
};

type Range = "24H" | "7D" | "30D";

type SeriesKey =
  | "actual"
  | "ercot"
  | "gridpulse"
  | "baseline";

function parseNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }

  return Number(value);
}

function parseCsv(csv: string): GridRow[] {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");

    const row = Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index] ?? "",
      ])
    );

    return {
      timestamp: row.timestamp,
      demand: Number(row.demand),
      forecast: parseNumber(row.forecast),
      baseline_prediction: Number(
        row.baseline_prediction
      ),
      gridpulse_prediction: Number(
        row.gridpulse_prediction
      ),
    };
  });
}

function getDate(timestamp: string) {
  return new Date(timestamp.replace(" ", "T"));
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function formatRange(rows: GridRow[]) {
  if (rows.length === 0) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  return `${formatter.format(
    getDate(rows[0].timestamp)
  )} – ${formatter.format(
    getDate(rows[rows.length - 1].timestamp)
  )}`;
}

export default function Home() {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [range, setRange] =
    useState<Range>("7D");

  const [visibleSeries, setVisibleSeries] =
    useState<Record<SeriesKey, boolean>>({
      actual: true,
      ercot: true,
      gridpulse: true,
      baseline: true,
    });

  useEffect(() => {
    async function loadData() {
      const response = await fetch(
        "/model_predictions.csv"
      );

      const csv = await response.text();

      setRows(parseCsv(csv));
      setLoading(false);
    }

    loadData();
  }, []);

  function toggleSeries(series: SeriesKey) {
    setVisibleSeries((current) => ({
      ...current,
      [series]: !current[series],
    }));
  }

  const filteredRows = useMemo(() => {
    const hours = {
      "24H": 24,
      "7D": 168,
      "30D": 720,
    }[range];

    return rows.slice(-hours);
  }, [rows, range]);

  const selectedRange = useMemo(
    () => formatRange(filteredRows),
    [filteredRows]
  );

  const metrics = useMemo(() => {
    const comparableRows = filteredRows.filter(
      (
        row
      ): row is GridRow & {
        forecast: number;
      } => row.forecast !== null
    );

    if (comparableRows.length === 0) {
      return null;
    }

    const baselineMae =
      comparableRows.reduce(
        (total, row) =>
          total +
          Math.abs(
            row.demand -
              row.baseline_prediction
          ),
        0
      ) / comparableRows.length;

    const ercotMae =
      comparableRows.reduce(
        (total, row) =>
          total +
          Math.abs(
            row.demand - row.forecast
          ),
        0
      ) / comparableRows.length;

    const gridPulseMae =
      comparableRows.reduce(
        (total, row) =>
          total +
          Math.abs(
            row.demand -
              row.gridpulse_prediction
          ),
        0
      ) / comparableRows.length;

    const peakDemand = Math.max(
      ...filteredRows.map(
        (row) => row.demand
      )
    );

    const scores = [
      {
        key: "ercot",
        value: ercotMae,
      },
      {
        key: "baseline",
        value: baselineMae,
      },
      {
        key: "gridpulse",
        value: gridPulseMae,
      },
    ];

    const bestModel = scores.reduce(
      (best, current) =>
        current.value < best.value
          ? current
          : best
    );

    const gridPulseVsBaseline =
      ((gridPulseMae - baselineMae) /
        baselineMae) *
      100;

    return {
      baselineMae,
      ercotMae,
      gridPulseMae,
      peakDemand,
      comparisonRows:
        comparableRows.length,
      bestModel: bestModel.key,
      gridPulseVsBaseline,
    };
  }, [filteredRows]);

  const chartData =
    useMemo<ChartRow[]>(() => {
      return filteredRows.map((row) => ({
        ...row,

        displayTime: getDate(
          row.timestamp
        ).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
        }),
      }));
    }, [filteredRows]);

  const peakInRange = useMemo(() => {
    if (chartData.length === 0) {
      return null;
    }

    return chartData.reduce(
      (peak, row) =>
        row.demand > peak.demand
          ? row
          : peak,
      chartData[0]
    );
  }, [chartData]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">
          Loading GridPulse...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">

        <header className="mb-6 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                GridPulse
              </h1>

              <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                ERCOT
              </span>
            </div>

            <p className="mt-2 text-sm text-neutral-500">
              Texas Grid Intelligence
            </p>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              Explore Texas electricity demand,
              forecast accuracy, and time-series
              model performance using hourly EIA data.
            </p>
          </div>

          <ThemeToggle />
        </header>

        <DashboardNav />

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-fit rounded-lg border border-neutral-200 p-1 dark:border-neutral-800">
            {(
              [
                "24H",
                "7D",
                "30D",
              ] as Range[]
            ).map((option) => (
              <button
                key={option}
                onClick={() =>
                  setRange(option)
                }
                className={`
                  rounded-md px-3 py-1.5
                  text-xs font-medium
                  transition-colors

                  ${
                    range === option
                      ? `
                        bg-neutral-900
                        text-white
                        dark:bg-neutral-100
                        dark:text-neutral-900
                      `
                      : `
                        text-neutral-500
                        hover:text-neutral-900
                        dark:text-neutral-400
                        dark:hover:text-neutral-100
                      `
                  }
                `}
              >
                {option}
              </button>
            ))}
          </div>

          <p className="text-xs text-neutral-400">
            Showing {selectedRange}
          </p>
        </div>

        {metrics && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <MetricCard
              label="ERCOT MAE"
              value={metrics.ercotMae.toFixed(
                2
              )}
              description="Day-ahead forecast"
              badge={
                metrics.bestModel ===
                "ercot"
                  ? "Best"
                  : undefined
              }
            />

            <MetricCard
              label="Baseline MAE"
              value={metrics.baselineMae.toFixed(
                2
              )}
              description="Same hour yesterday"
              badge={
                metrics.bestModel ===
                "baseline"
                  ? "Best"
                  : undefined
              }
            />

            <MetricCard
              label="GridPulse MAE"
              value={metrics.gridPulseMae.toFixed(
                2
              )}
              description={
                metrics.gridPulseVsBaseline >
                0
                  ? `${metrics.gridPulseVsBaseline.toFixed(
                      1
                    )}% worse than baseline`
                  : `${Math.abs(
                      metrics.gridPulseVsBaseline
                    ).toFixed(
                      1
                    )}% better than baseline`
              }
              badge={
                metrics.bestModel ===
                "gridpulse"
                  ? "Best"
                  : undefined
              }
            />

            <MetricCard
              label="Peak Demand"
              value={metrics.peakDemand.toLocaleString()}
              description={selectedRange}
            />

          </section>
        )}

        <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-base font-medium">
                Demand & Forecasts
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Actual demand compared with ERCOT,
                GridPulse, and the historical baseline
              </p>
            </div>

            <a
              href="/model_predictions.csv"
              download
              className="flex w-fit items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
            >
              <Download size={14} />
              Export CSV
            </a>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <SeriesButton
              label="Actual"
              active={visibleSeries.actual}
              onClick={() =>
                toggleSeries("actual")
              }
            />

            <SeriesButton
              label="ERCOT"
              active={visibleSeries.ercot}
              onClick={() =>
                toggleSeries("ercot")
              }
            />

            <SeriesButton
              label="GridPulse"
              active={
                visibleSeries.gridpulse
              }
              onClick={() =>
                toggleSeries(
                  "gridpulse"
                )
              }
            />

            <SeriesButton
              label="Baseline"
              active={
                visibleSeries.baseline
              }
              onClick={() =>
                toggleSeries(
                  "baseline"
                )
              }
            />
          </div>

          <div className="mt-6 h-[430px] w-full">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 10,
                  bottom: 0,
                  left: 0,
                }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  vertical={false}
                />

                <XAxis
                  dataKey="displayTime"
                  minTickGap={55}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--muted)",
                    fontSize: 11,
                  }}
                />

                <YAxis
                  width={60}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--muted)",
                    fontSize: 11,
                  }}
                  tickFormatter={(value) =>
                    `${Math.round(
                      value / 1000
                    )}k`
                  }
                />

                <Tooltip
                  content={
                    <CustomTooltip
                      visibleSeries={
                        visibleSeries
                      }
                    />
                  }
                />

                <Legend
                  wrapperStyle={{
                    fontSize: "12px",
                    paddingTop: "16px",
                  }}
                />

                {peakInRange &&
                  visibleSeries.actual && (
                    <ReferenceDot
                      x={
                        peakInRange.displayTime
                      }
                      y={
                        peakInRange.demand
                      }
                      r={4}
                      fill="var(--chart-actual)"
                      stroke="var(--card)"
                      strokeWidth={2}
                      label={{
                        value: `Peak ${formatNumber(
                          peakInRange.demand
                        )}`,
                        position: "top",
                        fill: "var(--muted)",
                        fontSize: 11,
                      }}
                    />
                  )}

                {visibleSeries.actual && (
                  <Line
                    type="monotone"
                    dataKey="demand"
                    name="Actual"
                    stroke="var(--chart-actual)"
                    strokeWidth={2.2}
                    dot={false}
                  />
                )}

                {visibleSeries.ercot && (
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="ERCOT"
                    stroke="var(--chart-ercot)"
                    strokeWidth={1.8}
                    dot={false}
                    connectNulls
                  />
                )}

                {visibleSeries.gridpulse && (
                  <Line
                    type="monotone"
                    dataKey="gridpulse_prediction"
                    name="GridPulse"
                    stroke="var(--chart-gridpulse)"
                    strokeWidth={1.8}
                    dot={false}
                  />
                )}

                {visibleSeries.baseline && (
                  <Line
                    type="monotone"
                    dataKey="baseline_prediction"
                    name="Baseline"
                    stroke="var(--chart-baseline)"
                    strokeWidth={1.4}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {metrics && (
          <section className="mt-4 grid gap-4 md:grid-cols-2">

            <InfoCard title="Model evaluation">
              ERCOT currently has the lowest
              MAE within the selected period.
              GridPulse uses residual XGBoost
              forecasting and historical demand
              features.
            </InfoCard>

            <InfoCard title="Evaluation">
              <div className="space-y-2">

                <DataRow
                  label="Selected period"
                  value={selectedRange}
                />

                <DataRow
                  label="Comparable forecasts"
                  value={metrics.comparisonRows.toLocaleString()}
                />

                <DataRow
                  label="Validation"
                  value="Chronological holdout"
                />

                <DataRow
                  label="Model"
                  value="Residual XGBoost"
                />

              </div>
            </InfoCard>

          </section>
        )}

        <footer className="mt-10 border-t border-neutral-200 py-6 text-xs text-neutral-400 dark:border-neutral-800">
          GridPulse · Texas Grid Intelligence
        </footer>

      </div>
    </main>
  );
}

function CustomTooltip({
  active,
  payload,
  visibleSeries,
}: {
  active?: boolean;

  payload?: Array<{
    payload: ChartRow;
  }>;

  visibleSeries: Record<
    SeriesKey,
    boolean
  >;
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  const row =
    payload[0].payload;

  const ercotError =
    row.forecast !== null
      ? Math.abs(
          row.demand -
            row.forecast
        )
      : null;

  const gridPulseError =
    Math.abs(
      row.demand -
        row.gridpulse_prediction
    );

  const baselineError =
    Math.abs(
      row.demand -
        row.baseline_prediction
    );

  return (
    <div className="min-w-[220px] rounded-lg border border-neutral-200 bg-white p-3 text-xs shadow-lg dark:border-neutral-800 dark:bg-neutral-950">

      <p className="mb-3 font-medium">
        {row.displayTime}
      </p>

      <div className="space-y-2">

        {visibleSeries.actual && (
          <TooltipRow
            label="Actual"
            value={formatNumber(
              row.demand
            )}
          />
        )}

        {visibleSeries.ercot && (
          <TooltipRow
            label="ERCOT"
            value={
              row.forecast !==
              null
                ? formatNumber(
                    row.forecast
                  )
                : "No data"
            }
            error={
              ercotError !== null
                ? formatNumber(
                    ercotError
                  )
                : undefined
            }
          />
        )}

        {visibleSeries.gridpulse && (
          <TooltipRow
            label="GridPulse"
            value={formatNumber(
              row.gridpulse_prediction
            )}
            error={formatNumber(
              gridPulseError
            )}
          />
        )}

        {visibleSeries.baseline && (
          <TooltipRow
            label="Baseline"
            value={formatNumber(
              row.baseline_prediction
            )}
            error={formatNumber(
              baselineError
            )}
          />
        )}

      </div>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  error,
}: {
  label: string;
  value: string;
  error?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6">

      <span className="text-neutral-500">
        {label}
      </span>

      <div className="text-right">
        <span className="font-medium">
          {value}
        </span>

        {error && (
          <span className="ml-2 text-neutral-400">
            ±{error}
          </span>
        )}
      </div>

    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  badge,
}: {
  label: string;
  value: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">

      <div className="flex items-center justify-between gap-3">

        <p className="text-xs text-neutral-500">
          {label}
        </p>

        {badge && (
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            {badge}
          </span>
        )}

      </div>

      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-neutral-400">
        {description}
      </p>

    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">

      <h2 className="text-sm font-medium">
        {title}
      </h2>

      <div className="mt-3 text-sm leading-6 text-neutral-500">
        {children}
      </div>

    </div>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4">

      <span>
        {label}
      </span>

      <span className="font-medium text-neutral-800 dark:text-neutral-200">
        {value}
      </span>

    </div>
  );
}

function SeriesButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        rounded-md border
        px-3 py-1.5
        text-xs font-medium
        transition-colors

        ${
          active
            ? `
              border-neutral-300
              bg-neutral-100
              text-neutral-900
              dark:border-neutral-700
              dark:bg-neutral-800
              dark:text-neutral-100
            `
            : `
              border-neutral-200
              text-neutral-400
              dark:border-neutral-800
              dark:text-neutral-600
            `
        }
      `}
    >
      {label}
    </button>
  );
}