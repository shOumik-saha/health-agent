import { useState } from "react";

export default function ChatPanel({ onAsk, loading }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");

  return (
    <section className="card">
      <div className="card-head">
        <h2>Ask Your Data</h2>
        <p>Use the weekly report engine to answer habit questions.</p>
      </div>

      <div className="chat-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Example: Why is my focus low on Wednesdays?"
        />
        <button
          className="btn"
          disabled={loading || !query.trim()}
          onClick={async () => {
            const result = await onAsk(query);
            setAnswer(result || "No response.");
          }}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>

      {answer ? <p className="chat-answer">{answer}</p> : null}
    </section>
  );
}
