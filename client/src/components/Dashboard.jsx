import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function compact(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "-";
}

export default function Dashboard({ trends }) {
  if (!trends) {
    return (
      <section className="card">
        <div className="card-head">
          <h2>Trend Dashboard</h2>
          <p>Add a few logs to unlock your trend analysis.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Trend Dashboard</h2>
        <p>{trends.points} data points in the selected window.</p>
      </div>

      <div className="stats-row">
        <div className="stat-tile">
          <span>Avg Sleep</span>
          <strong>{compact(trends.summary?.sleepHours?.avg)}h</strong>
        </div>
        <div className="stat-tile">
          <span>Avg Mood</span>
          <strong>{compact(trends.summary?.mood?.avg)}</strong>
        </div>
        <div className="stat-tile">
          <span>Avg Focus</span>
          <strong>{compact(trends.summary?.focus?.avg)}</strong>
        </div>
        <div className="stat-tile">
          <span>Avg Exercise</span>
          <strong>{compact(trends.summary?.exerciseMinutes?.avg)}m</strong>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trends.chartSeries || []}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(128, 128, 128, 0.2)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="mood" stroke="#2b6cb0" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="focus" stroke="#c05621" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="energy" stroke="#2f855a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="patterns">
        <h3>Lagged Patterns</h3>
        {trends.laggedPatterns?.length ? (
          <ul>
            {trends.laggedPatterns.slice(0, 4).map((item) => (
              <li key={`${item.sourceMetric}-${item.targetMetric}-${item.lagDays}`}>
                {item.sourceMetric} {item.direction === "positive" ? "improves" : "reduces"} {item.targetMetric} after {item.lagDays} day(s)
                (corr {item.correlation}, n={item.sampleSize})
              </li>
            ))}
          </ul>
        ) : (
          <p>Not enough signal yet. Keep logging consistently.</p>
        )}
      </div>
    </section>
  );
}
