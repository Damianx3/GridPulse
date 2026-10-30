"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Area,
  AreaChart,
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

import {
  DashboardNav,
} from "../../components/dashboard-nav";

import {
  ThemeToggle,
} from "../../components/theme-toggle";


const TEXAS_TIME_ZONE =
  "America/Chicago";


type DemandRow = {
  timestamp: string;
  demand: number;
  forecast: number | null;
};


type DailyRange =
  | "7D"
  | "30D";


type MonthlyRange =
  | "6M"
  | "12M";


function parseNumber(
  value: string
) {
  if (
    value.trim() === ""
  ) {
    return null;
  }

  return Number(value);
}


function parseCsv(
  csv: string
): DemandRow[] {
  const lines =
    csv
      .trim()
      .split(/\r?\n/);

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
            (
              header,
              index
            ) => [
              header,
              values[index] ?? "",
            ]
          )
        );

      return {
        timestamp:
          row.timestamp,

        demand:
          Number(
            row.demand
          ),

        forecast:
          parseNumber(
            row.forecast
          ),
      };
    });
}


function average(
  values: number[]
) {
  if (
    values.length === 0
  ) {
    return 0;
  }

  return (
    values.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    ) /
    values.length
  );
}


function getDailyRows(
  rows: DemandRow[],
  range: DailyRange
) {
  const hours = {
    "7D": 168,
    "30D": 720,
  }[range];

  return rows.slice(
    -hours
  );
}


function getMonthlyRows(
  rows: DemandRow[],
  range: MonthlyRange
) {
  if (
    rows.length === 0
  ) {
    return [];
  }

  const latest =
    new Date(
      rows[
        rows.length - 1
      ].timestamp
    );

  const months =
    range === "6M"
      ? 6
      : 12;

  const cutoff =
    new Date(latest);

  cutoff.setUTCMonth(
    cutoff.getUTCMonth() -
      months
  );

  return rows.filter(
    (row) =>
      new Date(
        row.timestamp
      ) >= cutoff
  );
}


function texasParts(
  timestamp: string
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          TEXAS_TIME_ZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        hourCycle:
          "h23",
      }
    ).formatToParts(
      new Date(timestamp)
    );


  function get(
    type:
      Intl.DateTimeFormatPartTypes
  ) {
    return (
      parts.find(
        (part) =>
          part.type === type
      )?.value ?? ""
    );
  }


  return {
    year:
      Number(
        get("year")
      ),

    month:
      Number(
        get("month")
      ),

    day:
      Number(
        get("day")
      ),

    hour:
      Number(
        get("hour")
      ),
  };
}


function formatTexasDate(
  timestamp: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        TEXAS_TIME_ZONE,

      weekday:
        "short",

      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    }
  ).format(
    new Date(timestamp)
  );
}


function formatTexasTime(
  timestamp: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        TEXAS_TIME_ZONE,

      hour:
        "numeric",
    }
  ).format(
    new Date(timestamp)
  );
}


function formatTexasShort(
  timestamp: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        TEXAS_TIME_ZONE,

      month:
        "short",

      day:
        "numeric",

      hour:
        "numeric",
    }
  ).format(
    new Date(timestamp)
  );
}


function formatTexasRange(
  rows: DemandRow[]
) {
  if (
    rows.length === 0
  ) {
    return "";
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          TEXAS_TIME_ZONE,

        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      }
    );

  return `${
    formatter.format(
      new Date(
        rows[0].timestamp
      )
    )
  } – ${
    formatter.format(
      new Date(
        rows[
          rows.length - 1
        ].timestamp
      )
    )
  }`;
}


export default function DemandPatterns() {
  const [
    rows,
    setRows,
  ] =
    useState<
      DemandRow[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    dailyRange,
    setDailyRange,
  ] =
    useState<DailyRange>(
      "7D"
    );


  const [
    monthlyRange,
    setMonthlyRange,
  ] =
    useState<MonthlyRange>(
      "12M"
    );


  // ======================================================
  // LOAD DATA
  // ======================================================

  useEffect(() => {
    async function loadData() {
      const response =
        await fetch(
          "/ercot_demand_forecast_clean.csv"
        );

      const csv =
        await response.text();

      setRows(
        parseCsv(csv)
      );

      setLoading(false);
    }

    loadData();
  }, []);


  // ======================================================
  // SUMMARY — 30 DAYS
  // ======================================================

  const summaryRows =
    useMemo(
      () =>
        rows.slice(-720),
      [rows]
    );


  const summary =
    useMemo(() => {
      if (
        summaryRows.length === 0
      ) {
        return null;
      }

      const avg =
        average(
          summaryRows.map(
            (row) =>
              row.demand
          )
        );


      const peak =
        summaryRows.reduce(
          (
            highest,
            row
          ) =>
            row.demand >
            highest.demand
              ? row
              : highest,
          summaryRows[0]
        );


      const low =
        summaryRows.reduce(
          (
            lowest,
            row
          ) =>
            row.demand <
            lowest.demand
              ? row
              : lowest,
          summaryRows[0]
        );


      return {
        averageDemand:
          avg,

        peakDemand:
          peak.demand,

        peakTimestamp:
          peak.timestamp,

        minimumDemand:
          low.demand,

        minimumTimestamp:
          low.timestamp,

        observations:
          summaryRows.length,
      };
    }, [
      summaryRows,
    ]);


  // ======================================================
  // LAST 24 HOURS
  // ======================================================

  const last24Rows =
    useMemo(
      () =>
        rows.slice(-24),
      [rows]
    );


  const last24Data =
    useMemo(
      () =>
        last24Rows.map(
          (row) => ({
            label:
              formatTexasShort(
                row.timestamp
              ),

            demand:
              row.demand,
          })
        ),
      [
        last24Rows,
      ]
    );


  // ======================================================
  // DAILY
  // ======================================================

  const dailyRows =
    useMemo(
      () =>
        getDailyRows(
          rows,
          dailyRange
        ),
      [
        rows,
        dailyRange,
      ]
    );


  const dailyData =
    useMemo(() => {
      const groups =
        new Map<
          string,
          {
            timestamp: string;
            values: number[];
          }
        >();


      dailyRows.forEach(
        (row) => {
          const parts =
            texasParts(
              row.timestamp
            );


          const key =
            `${parts.year}-${
              String(
                parts.month
              ).padStart(
                2,
                "0"
              )
            }-${
              String(
                parts.day
              ).padStart(
                2,
                "0"
              )
            }`;


          const existing =
            groups.get(key);


          if (existing) {
            existing.values.push(
              row.demand
            );
          } else {
            groups.set(
              key,
              {
                timestamp:
                  row.timestamp,

                values: [
                  row.demand,
                ],
              }
            );
          }
        }
      );


      return Array.from(
        groups.values()
      ).map(
        (group) => ({
          label:
            new Intl.DateTimeFormat(
              "en-US",
              {
                timeZone:
                  TEXAS_TIME_ZONE,

                month:
                  "short",

                day:
                  "numeric",
              }
            ).format(
              new Date(
                group.timestamp
              )
            ),

          demand:
            Math.round(
              average(
                group.values
              )
            ),
        })
      );
    }, [
      dailyRows,
    ]);


  // ======================================================
  // MONTHLY
  // ======================================================

  const monthlyRows =
    useMemo(
      () =>
        getMonthlyRows(
          rows,
          monthlyRange
        ),
      [
        rows,
        monthlyRange,
      ]
    );


  const monthlyData =
    useMemo(() => {
      const groups =
        new Map<
          string,
          {
            timestamp: string;
            values: number[];
          }
        >();


      monthlyRows.forEach(
        (row) => {
          const parts =
            texasParts(
              row.timestamp
            );


          const key =
            `${parts.year}-${
              String(
                parts.month
              ).padStart(
                2,
                "0"
              )
            }`;


          const existing =
            groups.get(key);


          if (existing) {
            existing.values.push(
              row.demand
            );
          } else {
            groups.set(
              key,
              {
                timestamp:
                  row.timestamp,

                values: [
                  row.demand,
                ],
              }
            );
          }
        }
      );


      return Array.from(
        groups.entries()
      )
        .sort(
          (
            [a],
            [b]
          ) =>
            a.localeCompare(b)
        )
        .map(
          (
            [
              ,
              group,
            ]
          ) => ({
            label:
              new Intl.DateTimeFormat(
                "en-US",
                {
                  timeZone:
                    TEXAS_TIME_ZONE,

                  month:
                    "short",

                  year:
                    "2-digit",
                }
              ).format(
                new Date(
                  group.timestamp
                )
              ),

            demand:
              Math.round(
                average(
                  group.values
                )
              ),
          })
        );
    }, [
      monthlyRows,
    ]);


  // ======================================================
  // PEAK HOURS
  // ======================================================

  const peakHours =
    useMemo(
      () =>
        [
          ...summaryRows,
        ]
          .sort(
            (
              a,
              b
            ) =>
              b.demand -
              a.demand
          )
          .slice(
            0,
            10
          ),
      [
        summaryRows,
      ]
    );


  if (loading) {
    return (
      <main
        className="
          flex
          min-h-screen
          items-center
          justify-center
        "
      >
        <p
          className="
            text-sm
            text-neutral-500
          "
        >
          Loading demand patterns...
        </p>
      </main>
    );
  }


  return (
    <main
      className="
        min-h-screen
      "
    >

      <div
        className="
          mx-auto
          max-w-7xl
          px-5
          py-8

          sm:px-8
        "
      >

        {/* HEADER */}

        <header
          className="
            mb-6
            flex
            items-start
            justify-between
            gap-6
          "
        >

          <div>

            <p
              className="
                text-sm
                text-neutral-500
              "
            >
              GridPulse
            </p>


            <h1
              className="
                mt-1
                text-3xl
                font-semibold
                tracking-tight
              "
            >
              Demand Patterns
            </h1>


            <p
              className="
                mt-3
                max-w-2xl
                text-sm
                leading-6
                text-neutral-500
              "
            >
              Explore how Texas
              electricity demand
              changes over time.
            </p>

          </div>


          <ThemeToggle />

        </header>


        <DashboardNav />


        {/* SUMMARY */}

        {summary && (

          <section>

            <p
              className="
                mb-3
                text-xs
                text-neutral-400
              "
            >
              Latest 30 days
            </p>


            <div
              className="
                grid
                gap-3

                sm:grid-cols-2
                lg:grid-cols-4
              "
            >

              <MetricCard
                label="Average Demand"

                value={
                  Math.round(
                    summary.averageDemand
                  ).toLocaleString()
                }

                description="Latest 30 days"
              />


              <MetricCard
                label="Peak Demand"

                value={
                  summary.peakDemand.toLocaleString()
                }

                description={
                  `${
                    formatTexasDate(
                      summary.peakTimestamp
                    )
                  } · ${
                    formatTexasTime(
                      summary.peakTimestamp
                    )
                  }`
                }
              />


              <MetricCard
                label="Lowest Demand"

                value={
                  summary.minimumDemand.toLocaleString()
                }

                description={
                  `${
                    formatTexasDate(
                      summary.minimumTimestamp
                    )
                  } · ${
                    formatTexasTime(
                      summary.minimumTimestamp
                    )
                  }`
                }
              />


              <MetricCard
                label="Observations"

                value={
                  summary.observations.toLocaleString()
                }

                description="Hourly records"
              />

            </div>

          </section>

        )}


        {/* 24 HOUR CHART */}

        <ChartCard
          title="Demand — Last 24 Hours"

          description={
            `Hourly ERCOT demand · ${formatTexasRange(
              last24Rows
            )}`
          }
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={
                last24Data
              }

              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >

              <CartesianGrid
                stroke="var(--border)"
                vertical={
                  false
                }
              />


              <XAxis
                dataKey="label"

                minTickGap={
                  30
                }

                axisLine={
                  false
                }

                tickLine={
                  false
                }

                tick={{
                  fill:
                    "var(--muted)",

                  fontSize: 11,
                }}
              />


              <YAxis
                width={
                  60
                }

                axisLine={
                  false
                }

                tickLine={
                  false
                }

                tick={{
                  fill:
                    "var(--muted)",

                  fontSize: 11,
                }}

                tickFormatter={(
                  value
                ) =>
                  `${Math.round(
                    value /
                      1000
                  )}k`
                }
              />


              <Tooltip
                content={
                  <DemandTooltip
                    metricLabel="Demand"
                  />
                }
              />


              <Line
                type="monotone"

                dataKey="demand"

                stroke="var(--chart-actual)"

                strokeWidth={
                  2.25
                }

                dot={
                  false
                }

                activeDot={{
                  r: 4,
                }}
              />

            </LineChart>

          </ResponsiveContainer>

        </ChartCard>


        {/* DAILY CHART */}

        <ChartCard
          title="Daily Average Demand"

          description={
            `Average daily ERCOT demand · ${formatTexasRange(
              dailyRows
            )}`
          }

          filter={
            <DailyRangeFilter
              range={
                dailyRange
              }

              setRange={
                setDailyRange
              }
            />
          }
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <AreaChart
              data={
                dailyData
              }

              margin={{
                top: 12,
                right: 12,
                left: 0,
                bottom: 0,
              }}
            >

              <defs>

                <linearGradient
                  id="dailyDemandFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >

                  <stop
                    offset="0%"
                    stopColor="var(--chart-actual)"
                    stopOpacity={
                      0.22
                    }
                  />


                  <stop
                    offset="100%"
                    stopColor="var(--chart-actual)"
                    stopOpacity={
                      0
                    }
                  />

                </linearGradient>

              </defs>


              <CartesianGrid
                stroke="var(--border)"
                vertical={
                  false
                }
              />


              <XAxis
                dataKey="label"

                minTickGap={
                  25
                }

                axisLine={
                  false
                }

                tickLine={
                  false
                }

                tick={{
                  fill:
                    "var(--muted)",

                  fontSize: 11,
                }}
              />


              <YAxis
                width={
                  60
                }

                axisLine={
                  false
                }

                tickLine={
                  false
                }

                tick={{
                  fill:
                    "var(--muted)",

                  fontSize: 11,
                }}

                tickFormatter={(
                  value
                ) =>
                  `${Math.round(
                    value /
                      1000
                  )}k`
                }
              />


              <Tooltip
                content={
                  <DemandTooltip
                    metricLabel="Daily average"
                  />
                }
              />


              <Area
                type="monotone"

                dataKey="demand"

                stroke="var(--chart-actual)"

                strokeWidth={
                  2.25
                }

                fill="url(#dailyDemandFill)"

                dot={{
                  r: 2.5,
                  fill:
                    "var(--card)",
                  stroke:
                    "var(--chart-actual)",
                  strokeWidth:
                    1.5,
                }}

                activeDot={{
                  r: 5,
                }}
              />

            </AreaChart>

          </ResponsiveContainer>

        </ChartCard>


        {/* MONTHLY CHART */}

        <ChartCard
          title="Average Demand by Month"

          description={
            `Monthly average ERCOT demand · ${formatTexasRange(
              monthlyRows
            )}`
          }

          filter={
            <MonthlyRangeFilter
              range={
                monthlyRange
              }

              setRange={
                setMonthlyRange
              }
            />
          }
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={
                monthlyData
              }

              barCategoryGap="24%"

              margin={{
                top: 15,
                right: 12,
                left: 0,
                bottom: 0,
              }}
            >

              <CartesianGrid
                stroke="var(--border)"
                vertical={
                  false
                }
              />


              <XAxis
                dataKey="label"

                axisLine={
                  false
                }

                tickLine={
                  false
                }

                tick={{
                  fill:
                    "var(--muted)",

                  fontSize: 11,
                }}
              />


              <YAxis
                width={
                  60
                }

                axisLine={
                  false
                }

                tickLine={
                  false
                }

                tick={{
                  fill:
                    "var(--muted)",

                  fontSize: 11,
                }}

                tickFormatter={(
                  value
                ) =>
                  `${Math.round(
                    value /
                      1000
                  )}k`
                }
              />


              <Tooltip
                cursor={{
                  fill:
                    "var(--border)",

                  opacity:
                    0.25,
                }}

                content={
                  <DemandTooltip
                    metricLabel="Monthly average"
                  />
                }
              />


              <Bar
                dataKey="demand"

                fill="var(--chart-actual)"

                maxBarSize={
                  70
                }

                radius={[
                  6,
                  6,
                  2,
                  2,
                ]}
              />

            </BarChart>

          </ResponsiveContainer>

        </ChartCard>


        {/* PEAK HOURS */}

        <section
          className="
            mt-4
            rounded-xl
            border
            border-neutral-200
            bg-white
            p-5

            dark:border-neutral-800
            dark:bg-neutral-950
          "
        >

          <h2
            className="
              text-base
              font-medium
            "
          >
            Highest Demand Hours
          </h2>


          <p
            className="
              mt-1
              text-xs
              text-neutral-500
            "
          >
            Top hourly observations
            from the latest 30 days ·
            Texas local time
          </p>


          <div
            className="
              mt-5
              overflow-x-auto
            "
          >

            <table
              className="
                w-full
                text-left
                text-sm
              "
            >

              <thead
                className="
                  text-xs
                  text-neutral-400
                "
              >

                <tr>

                  <th className="pb-3 font-medium">
                    Rank
                  </th>

                  <th className="pb-3 font-medium">
                    Date
                  </th>

                  <th className="pb-3 font-medium">
                    Texas Time
                  </th>

                  <th
                    className="
                      pb-3
                      text-right
                      font-medium
                    "
                  >
                    Demand
                  </th>

                </tr>

              </thead>


              <tbody>

                {peakHours.map(
                  (
                    row,
                    index
                  ) => (

                    <tr
                      key={
                        row.timestamp
                      }

                      className="
                        border-t
                        border-neutral-100

                        dark:border-neutral-900
                      "
                    >

                      <td
                        className="
                          py-3
                          text-neutral-400
                        "
                      >
                        {index + 1}
                      </td>


                      <td className="py-3">
                        {
                          formatTexasDate(
                            row.timestamp
                          )
                        }
                      </td>


                      <td
                        className="
                          py-3
                          text-neutral-500
                        "
                      >
                        {
                          formatTexasTime(
                            row.timestamp
                          )
                        }
                      </td>


                      <td
                        className="
                          py-3
                          text-right
                          font-medium
                        "
                      >
                        {
                          row.demand.toLocaleString()
                        }
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

    </main>
  );
}


/* ========================================================
   DAILY FILTER
   ======================================================== */

function DailyRangeFilter({
  range,
  setRange,
}: {
  range: DailyRange;

  setRange:
    (
      range:
        DailyRange
    ) => void;
}) {
  return (
    <FilterShell>

      {(
        [
          "7D",
          "30D",
        ] as DailyRange[]
      ).map(
        (option) => (

          <FilterButton
            key={
              option
            }

            active={
              range === option
            }

            onClick={() =>
              setRange(
                option
              )
            }
          >
            {option}
          </FilterButton>

        )
      )}

    </FilterShell>
  );
}


/* ========================================================
   MONTH FILTER
   ======================================================== */

function MonthlyRangeFilter({
  range,
  setRange,
}: {
  range:
    MonthlyRange;

  setRange:
    (
      range:
        MonthlyRange
    ) => void;
}) {
  return (
    <FilterShell>

      <FilterButton
        active={
          range === "6M"
        }

        onClick={() =>
          setRange(
            "6M"
          )
        }
      >
        6M
      </FilterButton>


      <FilterButton
        active={
          range === "12M"
        }

        onClick={() =>
          setRange(
            "12M"
          )
        }
      >
        Rolling 12M
      </FilterButton>

    </FilterShell>
  );
}


/* ========================================================
   FILTER COMPONENTS
   ======================================================== */

function FilterShell({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <div
      className="
        flex
        w-fit
        rounded-lg
        border
        border-neutral-200
        p-1

        dark:border-neutral-800
      "
    >
      {children}
    </div>
  );
}


function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;

  onClick:
    () => void;

  children:
    ReactNode;
}) {
  return (
    <button
      onClick={
        onClick
      }

      className={`
        rounded-md
        px-3
        py-1.5
        text-xs
        font-medium
        transition-colors

        ${
          active

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
      {children}
    </button>
  );
}


/* ========================================================
   TOOLTIP
   ======================================================== */

function DemandTooltip({
  active,
  payload,
  label,
  metricLabel,
}: {
  active?: boolean;

  payload?: Array<{
    value?:
      | number
      | string;
  }>;

  label?: string;

  metricLabel:
    string;
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }


  const value =
    Number(
      payload[0].value ??
        0
    );


  return (
    <div
      className="
        min-w-[180px]
        rounded-lg
        border
        border-neutral-200
        bg-white
        px-3
        py-2.5
        shadow-lg

        dark:border-neutral-700
        dark:bg-neutral-900
      "
    >

      <p
        className="
          text-xs
          font-semibold
          text-neutral-900

          dark:text-neutral-100
        "
      >
        {label}
      </p>


      <div
        className="
          mt-2
          flex
          items-center
          justify-between
          gap-5
        "
      >

        <span
          className="
            text-xs
            text-neutral-500

            dark:text-neutral-400
          "
        >
          {metricLabel}
        </span>


        <span
          className="
            text-xs
            font-semibold
            text-neutral-900

            dark:text-white
          "
        >
          {
            value.toLocaleString()
          }
        </span>

      </div>

    </div>
  );
}


/* ========================================================
   METRIC CARD
   ======================================================== */

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
    <div
      className="
        rounded-xl
        border
        border-neutral-200
        bg-white
        p-5

        dark:border-neutral-800
        dark:bg-neutral-950
      "
    >

      <p
        className="
          text-xs
          text-neutral-500
        "
      >
        {label}
      </p>


      <p
        className="
          mt-2
          text-2xl
          font-semibold
          tracking-tight
        "
      >
        {value}
      </p>


      <p
        className="
          mt-1
          text-xs
          text-neutral-400
        "
      >
        {description}
      </p>

    </div>
  );
}


/* ========================================================
   CHART CARD
   ======================================================== */

function ChartCard({
  title,
  description,
  filter,
  children,
}: {
  title: string;

  description:
    string;

  filter?:
    ReactNode;

  children:
    ReactNode;
}) {
  return (
    <section
      className="
        mt-4
        rounded-xl
        border
        border-neutral-200
        bg-white
        p-5

        dark:border-neutral-800
        dark:bg-neutral-950
      "
    >

      <div
        className="
          flex
          flex-col
          gap-4

          sm:flex-row
          sm:items-start
          sm:justify-between
        "
      >

        <div>

          <h2
            className="
              text-base
              font-medium
            "
          >
            {title}
          </h2>


          <p
            className="
              mt-1
              text-xs
              text-neutral-500
            "
          >
            {description}
          </p>

        </div>


        {filter}

      </div>


      <div
        className="
          mt-6
          h-[330px]
          w-full
        "
      >
        {children}
      </div>

    </section>
  );
}