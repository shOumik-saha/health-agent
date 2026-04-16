export default function InsightCard({ report, loading }) {
  return (
    <section className="card insight-card">
      <div className="card-head">
        <h2>Weekly Intelligence Report</h2>
        <p>Generated from your personal longitudinal data.</p>
      </div>

      {loading ? <p>Generating report...</p> : null}

      {!loading && !report ? <p>No report yet. Click Generate Weekly Report.</p> : null}

      {!loading && report ? (
        <>
          <div className="meta-row">
            <span>Source: {report.source}</span>
            <span>Confidence: {report.confidence}</span>
          </div>
          <p className="narrative">{report.narrative}</p>
          <h3>Small Experiments</h3>
          <ol>
            {(report.actionItems || []).map((item, idx) => (
              <li key={`${idx}-${item}`}>{item}</li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}
