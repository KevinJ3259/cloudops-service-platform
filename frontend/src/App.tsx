import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import IncidentDetails from "./IncidentDetails";

interface Incident {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  assignedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
}

interface IncidentForm {
  title: string;
  description: string;
  severity: string;
  assignedTo: string;
}

const API_URL = "http://localhost:5286/api/incidents";

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(
    null
  );

  const [form, setForm] = useState<IncidentForm>({
    title: "",
    description: "",
    severity: "Medium",
    assignedTo: "",
  });

  const loadIncidents = useCallback(async () => {
    try {
      setError("");
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Unable to load incidents.");
      }

      const data: Incident[] = await response.json();
      setIncidents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          severity: form.severity,
          status: "Open",
          assignedTo: form.assignedTo || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create incident.");
      }

      setForm({
        title: "",
        description: "",
        severity: "Medium",
        assignedTo: "",
      });

      setShowForm(false);
      await loadIncidents();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create incident."
      );
    } finally {
      setSaving(false);
    }
  };

  const openIncidents = incidents.filter(
    (incident) => incident.status.toLowerCase() === "open"
  ).length;

  const criticalIncidents = incidents.filter(
    (incident) =>
      incident.severity.toLowerCase() === "critical" &&
      incident.status.toLowerCase() !== "resolved"
  ).length;

  const platformStatus = criticalIncidents > 0 ? "Critical" : "Operational";

  const filteredIncidents = incidents.filter((incident) => {
    const matchesStatus =
      statusFilter === "All" ||
      incident.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesSeverity =
      severityFilter === "All" ||
      incident.severity.toLowerCase() === severityFilter.toLowerCase();

    return matchesStatus && matchesSeverity;
  });

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">CLOUD OPERATIONS</p>
          <h1>CloudOps Service Platform</h1>
          <p className="subtitle">
            Incident monitoring and service operations dashboard
          </p>
        </div>

        <div className="environment">
          <span className="status-dot"></span>
          Development
        </div>
      </header>

      <main>
        <section className="stats">
          <article className="stat-card">
            <span>Total Incidents</span>
            <strong>{incidents.length}</strong>
          </article>

          <article className="stat-card">
            <span>Open Incidents</span>
            <strong>{openIncidents}</strong>
          </article>

          <article className="stat-card">
            <span>Critical Incidents</span>
            <strong>{criticalIncidents}</strong>
          </article>

          <article className="stat-card">
            <span>Platform Status</span>
            <strong
              className={
                platformStatus === "Critical" ? "critical-status" : "healthy"
              }
            >
              {platformStatus}
            </strong>
          </article>
        </section>

        <section className="incidents-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">INCIDENT MANAGEMENT</p>
              <h2>Recent Incidents</h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForm((current) => !current);
                setSelectedIncidentId(null);
              }}
            >
              {showForm ? "Cancel" : "+ New Incident"}
            </button>
          </div>

          <div className="incident-filters">
            <div className="filter-group">
              <label htmlFor="statusFilter">Status</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Investigating">Investigating</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="severityFilter">Severity</label>
              <select
                id="severityFilter"
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value)}
              >
                <option value="All">All Severities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {(statusFilter !== "All" || severityFilter !== "All") && (
              <button
                type="button"
                className="clear-filters"
                onClick={() => {
                  setStatusFilter("All");
                  setSeverityFilter("All");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {showForm && (
            <form className="incident-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Incident Title</label>
                <input
                  id="title"
                  type="text"
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  placeholder="Example: Customer API latency"
                />
              </div>

              <div className="form-group">
                <label htmlFor="severity">Severity</label>
                <select
                  id="severity"
                  value={form.severity}
                  onChange={(event) =>
                    setForm({ ...form, severity: event.target.value })
                  }
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  required
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Describe the service issue..."
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="assignedTo">Assigned Team</label>
                <input
                  id="assignedTo"
                  type="text"
                  value={form.assignedTo}
                  onChange={(event) =>
                    setForm({ ...form, assignedTo: event.target.value })
                  }
                  placeholder="Example: Platform Engineering"
                />
              </div>

              <div className="form-actions full-width">
                <button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create Incident"}
                </button>
              </div>
            </form>
          )}

          {selectedIncidentId !== null && (
            <IncidentDetails
              incidentId={selectedIncidentId}
              onClose={() => setSelectedIncidentId(null)}
              onUpdated={async () => {
                await loadIncidents();
              }}
            />
          )}

          {loading && <p>Loading incidents...</p>}
          {error && <p className="error">{error}</p>}

          {!loading && !error && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Incident</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredIncidents.length > 0 ? (
                    filteredIncidents.map((incident) => (
                      <tr
                        key={incident.id}
                        className="incident-row"
                        onClick={() => {
                          setSelectedIncidentId(incident.id);
                          setShowForm(false);
                        }}
                      >
                        <td>#{incident.id}</td>
                        <td>
                          <strong>{incident.title}</strong>
                          <span className="description">
                            {incident.description}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${incident.severity.toLowerCase()}`}
                          >
                            {incident.severity}
                          </span>
                        </td>
                        <td>{incident.status}</td>
                        <td>{incident.assignedTo ?? "Unassigned"}</td>
                        <td>
                          {new Date(incident.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No incidents match the selected filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;

