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
  Legend,
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


type ForecastRow = {
  timestamp: string;
  demand: number;
  forecast: number | null;
  baseline_prediction: number;
  gridpulse_prediction: number;
};


type Range =
  | "24H"
  | "7D"
  | "30D";


function parseNumber(
  value: string
) {

  if (
    value.trim() ===
    ""
  ) {
    return null;
  }

  return Number(
    value
  );
}


function parseCsv(
  csv: string
): ForecastRow[] {

  const lines =
    csv
      .trim()
      .split(/\r?\n/);


  const headers =
    lines[
      0
    ].split(",");


  return lines
    .slice(1)
    .map(
      (
        line
      ) => {

        const values =
          line.split(
            ","
          );


        const row =
          Object.fromEntries(
            headers.map(
              (
                header,
                index
              ) => [
                header,
                values[
                  index
                ] ?? "",
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

          baseline_prediction:
            Number(
              row.baseline_prediction
            ),

          gridpulse_prediction:
            Number(
              row.gridpulse_prediction
            ),
        };
      }
    );
}


function texasHour(
  timestamp: string
) {

  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          TEXAS_TIME_ZONE,

        hour:
          "2-digit",

        hourCycle:
          "h23",
      }
    ).formatToParts(
      new Date(
        timestamp
      )
    );


  return Number(
    parts.find(
      (
        part
      ) =>
        part.type ===
        "hour"
    )?.value ??
      0
  );
}


function formatTexasDateTime(
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
    new Date(
      timestamp
    )
  );
}


function formatTexasRange(
  rows: ForecastRow[]
) {

  if (
    rows.length ===
    0
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
        rows[
          0
        ].timestamp
      )
    )
  } – ${
    formatter.format(
      new Date(
        rows[
          rows.length -
          1
        ].timestamp
      )
    )
  }`;
}


function mae(
  rows: {
    actual: number;
    predicted: number;
  }[]
) {

  if (
    rows.length ===
    0
  ) {
    return 0;
  }


  return (
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        Math.abs(
          row.actual -
            row.predicted
        ),
      0
    ) /
    rows.length
  );
}


export default function ForecastPerformance() {

  const [
    rows,
    setRows,
  ] =
    useState<
      ForecastRow[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    range,
    setRange,
  ] =
    useState<Range>(
      "7D"
    );


  useEffect(() => {

    async function loadData() {

      const response =
        await fetch(
          "/model_predictions.csv"
        );


      const csv =
        await response.text();


      setRows(
        parseCsv(
          csv
        )
      );


      setLoading(
        false
      );
    }


    loadData();

  }, []);


  // ======================================================
  // RANGE
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


  const comparableRows =
    useMemo(() => {

      return filteredRows.filter(
        (
          row
        ): row is ForecastRow & {
          forecast:
            number;
        } =>
          row.forecast !==
          null
      );

    }, [
      filteredRows,
    ]);


  // ======================================================
  // METRICS
  // ======================================================

  const metrics =
    useMemo(() => {

      if (
        comparableRows.length ===
        0
      ) {
        return null;
      }


      const ercot =
        mae(
          comparableRows.map(
            (
              row
            ) => ({
              actual:
                row.demand,

              predicted:
                row.forecast,
            })
          )
        );


      const baseline =
        mae(
          comparableRows.map(
            (
              row
            ) => ({
              actual:
                row.demand,

              predicted:
                row.baseline_prediction,
            })
          )
        );


      const gridpulse =
        mae(
          comparableRows.map(
            (
              row
            ) => ({
              actual:
                row.demand,

              predicted:
                row.gridpulse_prediction,
            })
          )
        );


      return {
        ercot,
        baseline,
        gridpulse,
      };

    }, [
      comparableRows,
    ]);


  // ======================================================
  // ERROR OVER TIME
  // ======================================================

  const errorData =
    useMemo(() => {

      return comparableRows.map(
        (
          row
        ) => ({
          timestamp:
            formatTexasDateTime(
              row.timestamp
            ),

          ercotError:
            Math.abs(
              row.demand -
                row.forecast
            ),

          baselineError:
            Math.abs(
              row.demand -
                row.baseline_prediction
            ),

          gridpulseError:
            Math.abs(
              row.demand -
                row.gridpulse_prediction
            ),
        })
      );

    }, [
      comparableRows,
    ]);


  // ======================================================
  // ERROR BY TEXAS HOUR
  // ======================================================

  const errorByHour =
    useMemo(() => {

      return Array.from(
        {
          length:
            24,
        },

        (
          _,
          hour
        ) => {

          const matching =
            comparableRows.filter(
              (
                row
              ) =>
                texasHour(
                  row.timestamp
                ) ===
                hour
            );


          function avg(
            values:
              number[]
          ) {

            if (
              values.length ===
              0
            ) {
              return 0;
            }


            return (
              values.reduce(
                (
                  total,
                  value
                ) =>
                  total +
                  value,
                0
              ) /
              values.length
            );
          }


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

            ercot:
              Math.round(
                avg(
                  matching.map(
                    (
                      row
                    ) =>
                      Math.abs(
                        row.demand -
                          row.forecast
                      )
                  )
                )
              ),

            baseline:
              Math.round(
                avg(
                  matching.map(
                    (
                      row
                    ) =>
                      Math.abs(
                        row.demand -
                          row.baseline_prediction
                      )
                  )
                )
              ),

            gridpulse:
              Math.round(
                avg(
                  matching.map(
                    (
                      row
                    ) =>
                      Math.abs(
                        row.demand -
                          row.gridpulse_prediction
                      )
                  )
                )
              ),
          };
        }
      );

    }, [
      comparableRows,
    ]);


  // ======================================================
  // WORST ERCOT MISSES
  // ======================================================

  const worstMisses =
    useMemo(() => {

      return comparableRows
        .map(
          (
            row
          ) => ({
            ...row,

            ercotError:
              Math.abs(
                row.demand -
                  row.forecast
              ),

            baselineError:
              Math.abs(
                row.demand -
                  row.baseline_prediction
              ),

            gridpulseError:
              Math.abs(
                row.demand -
                  row.gridpulse_prediction
              ),
          })
        )
        .sort(
          (
            a,
            b
          ) =>
            b.ercotError -
            a.ercotError
        )
        .slice(
          0,
          10
        );

    }, [
      comparableRows,
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
          Loading forecast
          performance...
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
              Forecast
              Performance
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
              Compare ERCOT,
              GridPulse, and the
              historical baseline
              to understand where
              each forecast performs
              well and where it
              misses.
            </p>

          </div>


          <ThemeToggle />

        </header>


        <DashboardNav />


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
              (
                option
              ) => (

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


        {metrics && (

          <section
            className="
              grid
              gap-3
              sm:grid-cols-3
            "
          >

            <MetricCard
              label="ERCOT MAE"

              value={
                metrics.ercot.toFixed(
                  2
                )
              }

              description="Day-ahead forecast"
            />


            <MetricCard
              label="Baseline MAE"

              value={
                metrics.baseline.toFixed(
                  2
                )
              }

              description="24-hour historical baseline"
            />


            <MetricCard
              label="GridPulse MAE"

              value={
                metrics.gridpulse.toFixed(
                  2
                )
              }

              description="Residual XGBoost"
            />

          </section>

        )}


        <ChartCard
          title="Forecast Error Over Time"

          description={
            `Absolute prediction error · Texas time · ${selectedRange}`
          }
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={
                errorData
              }
            >

              <CartesianGrid
                stroke="var(--border)"
                vertical={
                  false
                }
              />


              <XAxis
                dataKey="timestamp"

                minTickGap={
                  50
                }

                axisLine={
                  false
                }

                tickLine={
                  false
                }

                tick={{
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
                formatter={(
                  value
                ) =>
                  Number(
                    value
                  ).toLocaleString()
                }
              />


              <Legend />


              <Line
                type="monotone"

                dataKey="ercotError"

                name="ERCOT"

                stroke="var(--chart-ercot)"

                dot={
                  false
                }

                strokeWidth={
                  2
                }
              />


              <Line
                type="monotone"

                dataKey="gridpulseError"

                name="GridPulse"

                stroke="var(--chart-gridpulse)"

                dot={
                  false
                }

                strokeWidth={
                  1.8
                }
              />


              <Line
                type="monotone"

                dataKey="baselineError"

                name="Baseline"

                stroke="var(--chart-baseline)"

                dot={
                  false
                }

                strokeWidth={
                  1.4
                }
              />

            </LineChart>

          </ResponsiveContainer>

        </ChartCard>


        <ChartCard
          title="Average Error by Hour"

          description={
            `Texas local hour · ${selectedRange}`
          }
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={
                errorByHour
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
              />


              <Tooltip
                formatter={(
                  value
                ) =>
                  Number(
                    value
                  ).toLocaleString()
                }
              />


              <Legend />


              <Bar
                dataKey="ercot"

                name="ERCOT"

                fill="var(--chart-ercot)"

                radius={[
                  3,
                  3,
                  0,
                  0,
                ]}
              />


              <Bar
                dataKey="gridpulse"

                name="GridPulse"

                fill="var(--chart-gridpulse)"

                radius={[
                  3,
                  3,
                  0,
                  0,
                ]}
              />


              <Bar
                dataKey="baseline"

                name="Baseline"

                fill="var(--chart-baseline)"

                radius={[
                  3,
                  3,
                  0,
                  0,
                ]}
              />

            </BarChart>

          </ResponsiveContainer>

        </ChartCard>


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
            Largest ERCOT
            Forecast Misses
          </h2>


          <p
            className="
              mt-1
              text-xs
              text-neutral-500
            "
          >
            Highest ERCOT
            errors within{" "}
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
                    Texas Time
                  </th>


                  <th
                    className="
                      pb-3
                      font-medium
                    "
                  >
                    Actual
                  </th>


                  <th
                    className="
                      pb-3
                      font-medium
                    "
                  >
                    ERCOT
                  </th>


                  <th
                    className="
                      pb-3
                      font-medium
                    "
                  >
                    ERCOT Error
                  </th>


                  <th
                    className="
                      pb-3
                      font-medium
                    "
                  >
                    Baseline Error
                  </th>


                  <th
                    className="
                      pb-3
                      text-right
                      font-medium
                    "
                  >
                    GridPulse Error
                  </th>

                </tr>

              </thead>


              <tbody>

                {worstMisses.map(
                  (
                    row
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
                        "
                      >
                        {
                          formatTexasDateTime(
                            row.timestamp
                          )
                        }
                      </td>


                      <td
                        className="
                          py-3
                        "
                      >
                        {
                          row.demand.toLocaleString()
                        }
                      </td>


                      <td
                        className="
                          py-3
                        "
                      >
                        {
                          row.forecast.toLocaleString()
                        }
                      </td>


                      <td
                        className="
                          py-3
                          font-medium
                        "
                      >
                        {
                          Math.round(
                            row.ercotError
                          ).toLocaleString()
                        }
                      </td>


                      <td
                        className="
                          py-3
                        "
                      >
                        {
                          Math.round(
                            row.baselineError
                          ).toLocaleString()
                        }
                      </td>


                      <td
                        className="
                          py-3
                          text-right
                        "
                      >
                        {
                          Math.round(
                            row.gridpulseError
                          ).toLocaleString()
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


function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children:
    React.ReactNode;
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
          h-[330px]
          w-full
        "
      >
        {children}
      </div>

    </section>
  );
}