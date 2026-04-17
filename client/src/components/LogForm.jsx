export default function LogForm({ onSubmit, loading }) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const clampInputValue = (event, min, max) => {
    const raw = event.target.value;
    if (raw === "") return;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return;
    event.target.value = String(clamp(numeric, min, max));
  };

  return (
    <form
      className="card log-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const values = Object.fromEntries(formData.entries());
        const toNumber = (raw) => (raw === "" || raw === undefined ? undefined : Number(raw));

        const payload = {
          date: values.date ? values.date : undefined,
          sleepHours:
            toNumber(values.sleepHours) === undefined
              ? undefined
              : clamp(toNumber(values.sleepHours), 0, 24),
          mood:
            toNumber(values.mood) === undefined
              ? undefined
              : clamp(toNumber(values.mood), 0, 10),
          energy:
            toNumber(values.energy) === undefined
              ? undefined
              : clamp(toNumber(values.energy), 0, 10),
          focus:
            toNumber(values.focus) === undefined
              ? undefined
              : clamp(toNumber(values.focus), 0, 10),
          waterLiters: values.waterLiters ? Number(values.waterLiters) : undefined,
          exerciseMinutes: values.exerciseMinutes ? Number(values.exerciseMinutes) : undefined,
          symptoms: values.symptoms
            ? values.symptoms
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : undefined,
          foodNotes: values.foodNotes || undefined,
          notes: values.notes || undefined,
        };

        onSubmit(payload, () => {
          form.reset();
          const dateInput = form.elements.namedItem("date");
          if (dateInput && "value" in dateInput) {
            dateInput.value = new Date().toISOString().slice(0, 10);
          }
        });
      }}
    >
      <div className="card-head">
        <h2>Daily Log</h2>
        <p>Track one day in under a minute.</p>
      </div>

      <div className="grid cols-2">
        <label className="field">
          <span>date</span>
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label className="field">
          <span>sleepHours (0-24)</span>
          <input
            name="sleepHours"
            type="number"
            min="0"
            max="24"
            step="0.1"
            onInput={(event) => clampInputValue(event, 0, 24)}
          />
        </label>
        <label className="field">
          <span>mood (0-10)</span>
          <input
            name="mood"
            type="number"
            min="0"
            max="10"
            step="1"
            onInput={(event) => clampInputValue(event, 0, 10)}
          />
        </label>
        <label className="field">
          <span>energy (0-10)</span>
          <input
            name="energy"
            type="number"
            min="0"
            max="10"
            step="1"
            onInput={(event) => clampInputValue(event, 0, 10)}
          />
        </label>
        <label className="field">
          <span>focus (0-10)</span>
          <input
            name="focus"
            type="number"
            min="0"
            max="10"
            step="1"
            onInput={(event) => clampInputValue(event, 0, 10)}
          />
        </label>
        <label className="field">
          <span>waterLiters</span>
          <input name="waterLiters" type="number" min="0" max="10" step="0.1" />
        </label>
        <label className="field">
          <span>exercise Minutes</span>
          <input name="exerciseMinutes" type="number" min="0" max="300" step="1" />
        </label>
      </div>

      <label className="field">
        <span>symptoms (comma separated)</span>
        <input name="symptoms" placeholder="headache, bloating" />
      </label>

      <label className="field">
        <span>foodNotes</span>
        <textarea name="foodNotes" rows={2} placeholder="late dinner, more protein" />
      </label>

      <label className="field">
        <span>notes</span>
        <textarea name="notes" rows={2} placeholder="anything else about the day" />
      </label>

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Daily Log"}
      </button>
    </form>
  );
}
