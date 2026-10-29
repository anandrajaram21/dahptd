"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  differenceLabel,
  hourLabel,
  number,
  publicationLabel,
  type Point,
} from "./dashboard-data";

export default function WindChart({
  points,
  review,
}: {
  points: Point[];
  review: boolean;
}) {
  const data = points.map((point) => ({
    ...point,
    hour: hourLabel(point.start_time),
  }));
  return (
    <>
      <div className="series-key" role="group" aria-label="Chart legend">
        <span>
          <i />
          Forecast
        </span>
        {review && (
          <span>
            <i className="actual" />
            Actual output
          </span>
        )}
        <span>Generation · MW</span>
      </div>
      <div className="plot-canvas">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={data}
            accessibilityLayer
            aria-label={
              review
                ? "Hourly wind forecast and actual output in MW. Use arrow keys to inspect values."
                : "Hourly wind forecast in MW. Use arrow keys to inspect values."
            }
            margin={{ top: 20, right: 16, bottom: 12, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="hour"
              ticks={["00:00", "06:00", "12:00", "18:00", "23:00"]}
              interval="preserveStartEnd"
              minTickGap={40}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#a2adb4", fontSize: 11 }}
              dy={10}
            />
            <YAxis
              width={58}
              domain={[0, "auto"]}
              tickFormatter={number}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#a2adb4", fontSize: 11 }}
            />
            <Tooltip
              isAnimationActive={false}
              filterNull={false}
              cursor={{ stroke: "#66747c", strokeDasharray: "3 4" }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as Point | undefined;
                return active && point ? (
                  <div className="plot-tooltip">
                    <strong>
                      {hourLabel(point.start_time)}–
                      {hourLabel(
                        new Date(
                          new Date(point.start_time).getTime() + 3_600_000,
                        ).toISOString(),
                      )}{" "}
                      GMT
                    </strong>
                    <p>
                      Forecast <b>{number(point.forecast)} MW</b>
                    </p>
                    {review && (
                      <>
                        <p>
                          Actual <b>{number(point.actual)} MW</b>
                        </p>
                        <p>{differenceLabel(point.error)}</p>
                      </>
                    )}
                    <small>
                      {point.publish_time
                        ? `Published ${publicationLabel(point.publish_time)}`
                        : "No eligible forecast"}
                    </small>
                  </div>
                ) : null;
              }}
            />
            <Line
              type="linear"
              dataKey="forecast"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            {review && (
              <Line
                type="linear"
                dataKey="actual"
                stroke="var(--actual)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
