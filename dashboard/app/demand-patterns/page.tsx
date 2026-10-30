"use client";

import {
  ReactNode,
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


type Range =
  | "24H"
  | "7D"
  | "30D";


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

        weekday:
          "short",

        hourCycle:
          "h23",
      }
    ).formatToParts(
      new Date(timestamp)
    );


  function get(
    type: Intl.DateTimeFormatPartTypes
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

    weekday:
      get("weekday"),
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


  const start =
    formatter.format(
      new Date(
        rows[0].timestamp
      )
    );


  const end =
    formatter.format(
      new Date(
        rows[
          rows.length - 1
        ].timestamp
      )
    );


  return `${start} – ${end}`;
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
    range,
    setRange,
  ] =
    useState<Range>(
      "7D"
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
  // FILTER RANGE
  // ======================================================

  const filteredRows =
    useMemo(() => {
      const hours = {
        "24H": 24,
        "7D": 168,
        "30D": 720,
      }[range];


      return rows.slice(
        -hours
      );
    }, [
      rows,
      range,
    ]);


  const selectedRange =
    useMemo(
      () =>
        formatTexasRange(
          filteredRows
        ),
      [
        filteredRows,
      ]
    );


  // ======================================================
  // SUMMARY
  // ======================================================

  const summary =
    useMemo(() => {
      if (
        filteredRows.length ===
        0
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
          (
            highest,
            row
          ) =>
            row.demand >
            highest.demand
              ? row
              : highest,

          filteredRows[0]
        );


      const lowRow =
        filteredRows.reduce(
          (
            lowest,
            row
          ) =>
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

        minimumTimestamp:
          lowRow.timestamp,

        observations:
          filteredRows.length,
      };
    }, [
      filteredRows,
    ]);


  // ======================================================
  // AVERAGE DEMAND BY TEXAS HOUR
  // ======================================================

  const demandByHour =
    useMemo(() => {
      return Array.from(
        {
          length: 24,
        },

        (
          _,
          hour
        ) => {
          const matching =
            filteredRows.filter(
              (row) =>
                texasParts(
                  row.timestamp
                ).hour === hour
            );


          const hourLabel =
            new Intl.DateTimeFormat(
              "en-US",
              {
                hour:
                  "numeric",

                timeZone:
                  "UTC",
              }
            ).format(
              new Date(
                Date.UTC(
                  2026,
                  0,
                  1,
                  hour
                )
              )
            );


          return {
            hour:
              hourLabel,

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
    }, [
      filteredRows,
    ]);


  // ======================================================
  // DAILY AVERAGES
  // ======================================================

  const demandByDay =
    useMemo(() => {
      const groups =
        new Map<
          string,
          {
            timestamp: string;
            demands: number[];
          }
        >();


      filteredRows.forEach(
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


          if (
            existing
          ) {
            existing.demands.push(
              row.demand
            );
          } else {
            groups.set(
              key,
              {
                timestamp:
                  row.timestamp,

                demands: [
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

                weekday:
                  "short",

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
                group.demands
              )
            ),
        })
      );
    }, [
      filteredRows,
    ]);


  // ======================================================
  // MONTHLY AVERAGES
  // ======================================================

  const demandByMonth =
    useMemo(() => {
      const groups =
        new Map<
          string,
          {
            timestamp: string;
            demands: number[];
          }
        >();


      filteredRows.forEach(
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


          if (
            existing
          ) {
            existing.demands.push(
              row.demand
            );
          } else {
            groups.set(
              key,
              {
                timestamp:
                  row.timestamp,

                demands: [
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

                year:
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
                group.demands
              )
            ),
        })
      );
    }, [
      filteredRows,
    ]);


  // ======================================================
  // PEAK HOURS
  // ======================================================

  const peakHours =
    useMemo(() => {
      return [
        ...filteredRows,
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
        );
    }, [
      filteredRows,
    ]);


  if (
    loading
  ) {
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
          Loading demand
          patterns...
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
              changes throughout
              the day and across
              recent dates.
            </p>

          </div>


          <ThemeToggle />

        </header>


        <DashboardNav />


        {/* RANGE FILTER */}

        <div
          className="
            mb-5
            flex
            flex-col
            gap-3

            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >

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

            {(
              [
                "24H",
                "7D",
                "30D",
              ] as Range[]
            ).map(
              (option) => (

                <button
                  key={
                    option
                  }

                  onClick={() =>
                    setRange(
                      option
                    )
                  }

                  className={`
                    rounded-md
                    px-3
                    py-1.5
                    text-xs
                    font-medium
                    transition-colors

                    ${
                      range ===
                      option

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

              )
            )}

          </div>


          <p
            className="
              text-xs
              text-neutral-400
            "
          >
            Texas time ·{" "}
            {selectedRange}
          </p>

        </div>


        {/* METRICS */}

        {summary && (

          <section
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

              description={
                selectedRange
              }
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

          </section>

        )}


        {/* AVERAGE BY HOUR */}

        <ChartCard
          title="Average Demand by Hour"

          description={
            `Texas local hour · ${selectedRange}`
          }
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={
                demandByHour
              }
            >

              <CartesianGrid
                stroke="var(--border)"
                vertical={
                  false
                }
              />


              <XAxis
                dataKey="hour"

                minTickGap={
                  20
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

                  fontSize:
                    11,
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

                  fontSize:
                    11,
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
                  <DemandTooltip />
                }
              />


              <Line
                type="monotone"

                dataKey="demand"

                stroke="var(--chart-actual)"

                strokeWidth={
                  2
                }

                dot={
                  false
                }

                connectNulls
              />

            </LineChart>

          </ResponsiveContainer>

        </ChartCard>


        {/* DAILY AVERAGE */}

        <ChartCard
          title="Daily Average Demand"

          description={
            `Each bar is a Texas calendar day · ${selectedRange}`
          }
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={
                demandByDay
              }
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
                  15
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

                  fontSize:
                    11,
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

                  fontSize:
                    11,
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
                  <DemandTooltip />
                }
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


        {/* MONTHLY AVERAGE */}

        <ChartCard
          title="Average Demand by Month"

          description={
            `Texas calendar month and year · ${selectedRange}`
          }
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={
                demandByMonth
              }
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

                  fontSize:
                    11,
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

                  fontSize:
                    11,
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
                  <DemandTooltip />
                }
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


        {/* HIGHEST DEMAND HOURS */}

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
            Highest Demand
            Hours
          </h2>


          <p
            className="
              mt-1
              text-xs
              text-neutral-500
            "
          >
            Top hourly
            observations within{" "}
            {selectedRange} ·
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

                  <th
                    className="
                      pb-3
                      font-medium
                    "
                  >
                    Rank
                  </th>


                  <th
                    className="
                      pb-3
                      font-medium
                    "
                  >
                    Date
                  </th>


                  <th
                    className="
                      pb-3
                      font-medium
                    "
                  >
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


                      <td
                        className="
                          py-3
                        "
                      >
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
   CUSTOM TOOLTIP
   ======================================================== */

function DemandTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;

  payload?: Array<{
    value?:
      | number
      | string;
  }>;

  label?: string;
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
        min-w-[170px]
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
          Average demand
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
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
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


      <div
        className="
          mt-6
          h-[320px]
          w-full
        "
      >
        {children}
      </div>

    </section>
  );
}