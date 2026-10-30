"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardNav } from "../../components/dashboard-nav";
import { ThemeToggle } from "../../components/theme-toggle";

type DemandRow = {
  timestamp: string;
  demand: number;
  forecast: number | null;
};

type Range = "24H" | "7D" | "30D";

function parseNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }

  return Number(value);
}

function parseCsv(csv: string): DemandRow[] {
  const lines =
    csv.trim().split(/\r?\n/);

  const headers =
    lines[0].split(",");

  return lines
    .slice(1)
    .map((line) => {
      const values =
        line.split(",");

      const row =
        Object.fromEntries(
          headers.map(
            (header, index) => [
              header,
              values[index] ?? "",
            ]
          )
        );

      return {
        timestamp: row.timestamp,
        demand: Number(row.demand),
        forecast: parseNumber(
          row.forecast
        ),
      };
    });
}

function getDate(timestamp: string) {
  return new Date(
    timestamp.replace(" ", "T")
  );
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}

function formatRange(
  rows: DemandRow[]
) {
  if (rows.length === 0) {
    return "";
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );

  return `${formatter.format(
    getDate(
      rows[0].timestamp
    )
  )} – ${formatter.format(
    getDate(
      rows[
        rows.length - 1
      ].timestamp
    )
  )}`;
}

export default function DemandPatterns() {
  const [rows, setRows] =
    useState<DemandRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [range, setRange] =
    useState<Range>("7D");

  useEffect(() => {
    async function loadData() {
      const response =
        await fetch(
          "/ercot_demand_forecast_clean.csv"
        );

      const csv =
        await response.text();

      setRows(parseCsv(csv));
      setLoading(false);
    }

    loadData();
  }, []);

  const filteredRows =
    useMemo(() => {
      const hours = {
        "24H": 24,
        "7D": 168,
        "30D": 720,
      }[range];

      return rows.slice(-hours);
    }, [rows, range]);

  const selectedRange =
    useMemo(
      () =>
        formatRange(
          filteredRows
        ),
      [filteredRows]
    );

  const summary =
    useMemo(() => {
      if (
        filteredRows.length === 0
      ) {
        return null;
      }

      const avg =
        average(
          filteredRows.map(
            (row) =>
              row.demand
          )
        );

      const peakRow =
        filteredRows.reduce(
          (highest, row) =>
            row.demand >
            highest.demand
              ? row
              : highest,
          filteredRows[0]
        );

      const lowRow =
        filteredRows.reduce(
          (lowest, row) =>
            row.demand <
            lowest.demand
              ? row
              : lowest,
          filteredRows[0]
        );

      return {
        averageDemand:
          avg,

        peakDemand:
          peakRow.demand,

        peakTimestamp:
          peakRow.timestamp,

        minimumDemand:
          lowRow.demand,

        observations:
          filteredRows.length,
      };
    }, [filteredRows]);

  const demandByHour =
    useMemo(() => {
      return Array.from(
        { length: 24 },
        (_, hour) => {
          const matching =
            filteredRows.filter(
              (row) =>
                getDate(
                  row.timestamp
                ).getHours() ===
                hour
            );

          return {
            hour:
              new Date(
                2026,
                0,
                1,
                hour
              ).toLocaleTimeString(
                "en-US",
                {
                  hour:
                    "numeric",
                }
              ),

            demand:
              matching.length >
              0
                ? Math.round(
                    average(
                      matching.map(
                        (row) =>
                          row.demand
                      )
                    )
                  )
                : null,
          };
        }
      );
    }, [filteredRows]);

  const demandByDay =
    useMemo(() => {
      const groups =
        new Map<
          string,
          number[]
        >();

      filteredRows.forEach(
        (row) => {
          const date =
            getDate(
              row.timestamp
            );

          const key =
            `${date.getFullYear()}-${String(
              date.getMonth() +
                1
            ).padStart(
              2,
              "0"
            )}-${String(
              date.getDate()
            ).padStart(
              2,
              "0"
            )}`;

          const existing =
            groups.get(key) ??
            [];

          existing.push(
            row.demand
          );

          groups.set(
            key,
            existing
          );
        }
      );

      return Array.from(
        groups.entries()
      ).map(
        ([date, demands]) => {
          const parsed =
            new Date(
              `${date}T12:00:00`
            );

          return {
            label:
              parsed.toLocaleDateString(
                "en-US",
                {
                  weekday:
                    "short",
                  month:
                    "short",
                  day:
                    "numeric",
                }
              ),

            demand:
              Math.round(
                average(
                  demands
                )
              ),
          };
        }
      );
    }, [filteredRows]);

  const demandByMonth =
    useMemo(() => {
      const groups =
        new Map<
          string,
          number[]
        >();

      filteredRows.forEach(
        (row) => {
          const date =
            getDate(
              row.timestamp
            );

          const key =
            `${date.getFullYear()}-${String(
              date.getMonth() +
                1
            ).padStart(
              2,
              "0"
            )}`;

          const existing =
            groups.get(key) ??
            [];

          existing.push(
            row.demand
          );

          groups.set(
            key,
            existing
          );
        }
      );

      return Array.from(
        groups.entries()
      ).map(
        ([key, demands]) => {
          const [
            year,
            month,
          ] = key.split("-");

          const date =
            new Date(
              Number(year),
              Number(month) - 1,
              1
            );

          return {
            label:
              date.toLocaleDateString(
                "en-US",
                {
                  month:
                    "short",
                  year:
                    "numeric",
                }
              ),

            demand:
              Math.round(
                average(
                  demands
                )
              ),
          };
        }
      );
    }, [filteredRows]);

  const peakHours =
    useMemo(() => {
      return [
        ...filteredRows,
      ]
        .sort(
          (a, b) =>
            b.demand -
            a.demand
        )
        .slice(0, 10);
    }, [filteredRows]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">
          Loading demand patterns...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">

        <header className="mb-6 flex items-start justify-between gap-6">

          <div>

            <p className="text-sm text-neutral-500">
              GridPulse
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Demand Patterns
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
              Explore how Texas electricity
              demand changes throughout the
              day and across recent dates.
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
                  rounded-md
                  px-3
                  py-1.5
                  text-xs
                  font-medium
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

        {summary && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <MetricCard
              label="Average Demand"
              value={Math.round(
                summary.averageDemand
              ).toLocaleString()}
              description={selectedRange}
            />

            <MetricCard
              label="Peak Demand"
              value={summary.peakDemand.toLocaleString()}
              description={getDate(
                summary.peakTimestamp
              ).toLocaleString(
                "en-US",
                {
                  month:
                    "short",
                  day:
                    "numeric",
                  hour:
                    "numeric",
                }
              )}
            />

            <MetricCard
              label="Lowest Demand"
              value={summary.minimumDemand.toLocaleString()}
              description={selectedRange}
            />

            <MetricCard
              label="Observations"
              value={summary.observations.toLocaleString()}
              description="Hourly records"
            />

          </section>
        )}

        <ChartCard
          title="Average Demand by Hour"
          description={`Hourly profile · ${selectedRange}`}
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={demandByHour}
            >

              <CartesianGrid
                stroke="var(--border)"
                vertical={false}
              />

              <XAxis
                dataKey="hour"
                minTickGap={20}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill:
                    "var(--muted)",
                  fontSize: 11,
                }}
              />

              <YAxis
                width={60}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  `${Math.round(
                    value / 1000
                  )}k`
                }
              />

              <Tooltip
                formatter={(value) => [
                  Number(
                    value
                  ).toLocaleString(),

                  "Average demand",
                ]}
              />

              <Line
                type="monotone"
                dataKey="demand"
                stroke="var(--chart-actual)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />

            </LineChart>

          </ResponsiveContainer>

        </ChartCard>

        <ChartCard
          title="Daily Average Demand"
          description={`Each bar represents one calendar day · ${selectedRange}`}
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={demandByDay}
            >

              <CartesianGrid
                stroke="var(--border)"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                minTickGap={15}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 11,
                }}
              />

              <YAxis
                width={60}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  `${Math.round(
                    value / 1000
                  )}k`
                }
              />

              <Tooltip
                formatter={(value) => [
                  Number(
                    value
                  ).toLocaleString(),

                  "Average demand",
                ]}
              />

              <Bar
                dataKey="demand"
                fill="var(--chart-actual)"
                radius={[
                  4,
                  4,
                  0,
                  0,
                ]}
              />

            </BarChart>

          </ResponsiveContainer>

        </ChartCard>

        <ChartCard
          title="Average Demand by Month"
          description={`Monthly average with year · ${selectedRange}`}
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={demandByMonth}
            >

              <CartesianGrid
                stroke="var(--border)"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                width={60}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  `${Math.round(
                    value / 1000
                  )}k`
                }
              />

              <Tooltip
                formatter={(value) => [
                  Number(
                    value
                  ).toLocaleString(),

                  "Average demand",
                ]}
              />

              <Bar
                dataKey="demand"
                fill="var(--chart-actual)"
                radius={[
                  4,
                  4,
                  0,
                  0,
                ]}
              />

            </BarChart>

          </ResponsiveContainer>

        </ChartCard>

        <section className="mt-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">

          <h2 className="text-base font-medium">
            Highest Demand Hours
          </h2>

          <p className="mt-1 text-xs text-neutral-500">
            Top hourly observations within{" "}
            {selectedRange}
          </p>

          <div className="mt-5 overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="text-xs text-neutral-400">

                <tr>

                  <th className="pb-3 font-medium">
                    Rank
                  </th>

                  <th className="pb-3 font-medium">
                    Date
                  </th>

                  <th className="pb-3 font-medium">
                    Time
                  </th>

                  <th className="pb-3 text-right font-medium">
                    Demand
                  </th>

                </tr>

              </thead>

              <tbody>

                {peakHours.map(
                  (
                    row,
                    index
                  ) => {
                    const date =
                      getDate(
                        row.timestamp
                      );

                    return (
                      <tr
                        key={
                          row.timestamp
                        }
                        className="border-t border-neutral-100 dark:border-neutral-900"
                      >

                        <td className="py-3 text-neutral-400">
                          {index + 1}
                        </td>

                        <td className="py-3">
                          {date.toLocaleDateString(
                            "en-US",
                            {
                              weekday:
                                "short",
                              month:
                                "short",
                              day:
                                "numeric",
                              year:
                                "numeric",
                            }
                          )}
                        </td>

                        <td className="py-3 text-neutral-500">
                          {date.toLocaleTimeString(
                            "en-US",
                            {
                              hour:
                                "numeric",
                            }
                          )}
                        </td>

                        <td className="py-3 text-right font-medium">
                          {row.demand.toLocaleString()}
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">

      <p className="text-xs text-neutral-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-neutral-400">
        {description}
      </p>

    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">

      <h2 className="text-base font-medium">
        {title}
      </h2>

      <p className="mt-1 text-xs text-neutral-500">
        {description}
      </p>

      <div className="mt-6 h-[320px] w-full">
        {children}
      </div>

    </section>
  );
}