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
  priority: string;
  slaDueAt: string | null;
  escalationLevel: string;
  escalatedAt: string | null;
  category: string;
  subcategory: string | null;
}

type SortOption =
  | "newest"
  | "oldest"
  | "severity-high"
  | "severity-low"
  | "status"
  | "sla-soonest"
  | "sla-latest"
  | "sla-overdue";

type SlaStatus = "On Track" | "At Risk" | "Breached" | "Met" | "Not Set";

interface IncidentForm {
  title: string;
  description: string;
  severity: string;
  assignedTo: string;
  category: string;
  subcategory: string;
}

const API_URL = "http://localhost:5286/api/incidents";

function getSlaStatus(incident: Incident): SlaStatus {
  if (!incident.slaDueAt) {
    return "Not Set";
  }

  const dueTime = new Date(incident.slaDueAt).getTime();

  if (incident.status.toLowerCase() === "resolved") {
    if (!incident.resolvedAt) {
      return "Met";
    }

    const resolvedTime = new Date(incident.resolvedAt).getTime();

    return resolvedTime <= dueTime ? "Met" : "Breached";
  }

  const now = Date.now();
  const remainingMilliseconds = dueTime - now;

  if (remainingMilliseconds <= 0) {
    return "Breached";
  }

  const totalSlaMilliseconds =
    dueTime - new Date(incident.createdAt).getTime();

  const percentRemaining =
    totalSlaMilliseconds > 0
      ? remainingMilliseconds / totalSlaMilliseconds
      : 0;

  if (percentRemaining <= 0.25) {
    return "At Risk";
  }

  return "On Track";
}

function getSlaTimeText(incident: Incident): string {
  if (!incident.slaDueAt) {
    return "No SLA deadline";
  }

  const dueTime = new Date(incident.slaDueAt).getTime();

  if (incident.status.toLowerCase() === "resolved") {
    return `Due ${new Date(incident.slaDueAt).toLocaleString()}`;
  }

  const difference = dueTime - Date.now();

  if (difference <= 0) {
    const overdueMinutes = Math.floor(Math.abs(difference) / 60000);
    const overdueHours = Math.floor(overdueMinutes / 60);
    const remainingMinutes = overdueMinutes % 60;

    if (overdueHours > 0) {
      return `${overdueHours}h ${remainingMinutes}m overdue`;
    }

    return `${remainingMinutes}m overdue`;
  }

  const totalMinutes = Math.floor(difference / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }

  return `${minutes}m remaining`;
}

function getSlaClassName(status: SlaStatus): string {
  switch (status) {
    case "Met":
      return "sla-met";
    case "At Risk":
      return "sla-at-risk";
    case "Breached":
      return "sla-breached";
    case "On Track":
      return "sla-on-track";
    default:
      return "sla-not-set";
  }
}

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [slaFilter, setSlaFilter] = useState("All");
  const [escalationFilter, setEscalationFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [selectedIncidentId, setSelectedIncidentId] =
    useState<number | null>(null);

  const [form, setForm] = useState<IncidentForm>({
    title: "",
    description: "",
    severity: "Medium",
    assignedTo: "",
    category: "Application",
    subcategory: "",
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
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          severity: form.severity,
          status: "Open",
          assignedTo: form.assignedTo || null,
          category: form.category,
          subcategory: form.subcategory.trim() || null,
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
        category: "Application",
        subcategory: "",
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

  const slaBreaches = incidents.filter(
    (incident) => getSlaStatus(incident) === "Breached"
  ).length;

  const platformStatus =
    criticalIncidents > 0 ? "Critical" : "Operational";

  const filteredIncidents = incidents.filter((incident) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const slaStatus = getSlaStatus(incident).toLowerCase();

    const matchesSearch =
      normalizedSearch === "" ||
      incident.title.toLowerCase().includes(normalizedSearch) ||
      incident.description.toLowerCase().includes(normalizedSearch) ||
      (incident.assignedTo ?? "")
        .toLowerCase()
        .includes(normalizedSearch) ||
      incident.status.toLowerCase().includes(normalizedSearch) ||
      incident.severity.toLowerCase().includes(normalizedSearch) ||
      (incident.priority ?? "")
        .toLowerCase()
        .includes(normalizedSearch) ||
      slaStatus.includes(normalizedSearch) ||
      (incident.escalationLevel ?? "")
        .toLowerCase()
        .includes(normalizedSearch) ||
      (incident.category ?? "")
        .toLowerCase()
        .includes(normalizedSearch) ||
      (incident.subcategory ?? "")
        .toLowerCase()
        .includes(normalizedSearch) ||
      String(incident.id).includes(normalizedSearch);

    const matchesStatus =
      statusFilter === "All" ||
      incident.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesSeverity =
      severityFilter === "All" ||
      incident.severity.toLowerCase() === severityFilter.toLowerCase();

    const matchesSla =
      slaFilter === "All" ||
      getSlaStatus(incident).toLowerCase() === slaFilter.toLowerCase();

    const matchesEscalation =
      escalationFilter === "All" ||
      (incident.escalationLevel || "L1 Support").toLowerCase() ===
        escalationFilter.toLowerCase();

    const matchesTeam =
      teamFilter === "All" ||
      (teamFilter === "Unassigned"
        ? !incident.assignedTo
        : (incident.assignedTo ?? "").toLowerCase() ===
          teamFilter.toLowerCase());

    const matchesCategory =
      categoryFilter === "All" ||
      (incident.category || "Application").toLowerCase() ===
        categoryFilter.toLowerCase();

    return (
      matchesSearch &&
      matchesStatus &&
      matchesSeverity &&
      matchesSla &&
      matchesEscalation &&
      matchesTeam &&
      matchesCategory
    );
  });

  const severityRank: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    switch (sortOption) {
      case "oldest":
        return (
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
        );

      case "severity-high":
        return (
          (severityRank[b.severity.toLowerCase()] ?? 0) -
          (severityRank[a.severity.toLowerCase()] ?? 0)
        );

      case "severity-low":
        return (
          (severityRank[a.severity.toLowerCase()] ?? 0) -
          (severityRank[b.severity.toLowerCase()] ?? 0)
        );

      case "sla-soonest": {
        const aDue = a.slaDueAt
          ? new Date(a.slaDueAt).getTime()
          : Number.POSITIVE_INFINITY;
        const bDue = b.slaDueAt
          ? new Date(b.slaDueAt).getTime()
          : Number.POSITIVE_INFINITY;

        return aDue - bDue;
      }

      case "sla-latest": {
        const aDue = a.slaDueAt
          ? new Date(a.slaDueAt).getTime()
          : Number.NEGATIVE_INFINITY;
        const bDue = b.slaDueAt
          ? new Date(b.slaDueAt).getTime()
          : Number.NEGATIVE_INFINITY;

        return bDue - aDue;
      }

      case "sla-overdue": {
        const now = Date.now();

        const getOverdueMilliseconds = (incident: Incident) => {
          if (!incident.slaDueAt) return Number.NEGATIVE_INFINITY;

          const slaStatus = getSlaStatus(incident);

          if (slaStatus !== "Breached") {
            return Number.NEGATIVE_INFINITY;
          }

          const comparisonTime =
            incident.status.toLowerCase() === "resolved" &&
            incident.resolvedAt
              ? new Date(incident.resolvedAt).getTime()
              : now;

          return comparisonTime - new Date(incident.slaDueAt).getTime();
        };

        return (
          getOverdueMilliseconds(b) -
          getOverdueMilliseconds(a)
        );
      }

      case "status":
        return a.status.localeCompare(b.status);

      case "newest":
      default:
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
    }
  });

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    statusFilter !== "All" ||
    severityFilter !== "All" ||
    slaFilter !== "All" ||
    escalationFilter !== "All" ||
    teamFilter !== "All" ||
    categoryFilter !== "All";

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
            <span>SLA Breaches</span>
            <strong
              className={
                slaBreaches > 0 ? "critical-status" : "healthy"
              }
            >
              {slaBreaches}
            </strong>
          </article>

          <article className="stat-card">
            <span>Platform Status</span>

            <strong
              className={
                platformStatus === "Critical"
                  ? "critical-status"
                  : "healthy"
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
            <div className="filter-group search-group">
              <label htmlFor="incidentSearch">Search</label>

              <input
                id="incidentSearch"
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search incidents..."
              />
            </div>

            <div className="filter-group">
              <label htmlFor="statusFilter">Status</label>

              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Investigating">
                  Investigating
                </option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="severityFilter">Severity</label>

              <select
                id="severityFilter"
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(event.target.value)
                }
              >
                <option value="All">All Severities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="slaFilter">SLA Status</label>

              <select
                id="slaFilter"
                value={slaFilter}
                onChange={(event) => setSlaFilter(event.target.value)}
              >
                <option value="All">All SLA Statuses</option>
                <option value="On Track">On Track</option>
                <option value="At Risk">At Risk</option>
                <option value="Breached">Breached</option>
                <option value="Met">Met</option>
                <option value="Not Set">Not Set</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="escalationFilter">Escalation Level</label>

              <select
                id="escalationFilter"
                value={escalationFilter}
                onChange={(event) =>
                  setEscalationFilter(event.target.value)
                }
              >
                <option value="All">All Escalation Levels</option>
                <option value="L1 Support">L1 Support</option>
                <option value="L2 Engineering">L2 Engineering</option>
                <option value="Cloud Operations">Cloud Operations</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="teamFilter">Assigned Team</label>

              <select
                id="teamFilter"
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
              >
                <option value="All">All Teams</option>
                <option value="Unassigned">Unassigned</option>
                <option value="Service Desk">Service Desk</option>
                <option value="L1 Support">L1 Support</option>
                <option value="L2 Engineering">L2 Engineering</option>
                <option value="Cloud Operations">Cloud Operations</option>
                <option value="Network Operations">Network Operations</option>
                <option value="Database Operations">Database Operations</option>
                <option value="Security Operations">Security Operations</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="categoryFilter">Category</label>

              <select
                id="categoryFilter"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Application">Application</option>
                <option value="Cloud / Infrastructure">Cloud / Infrastructure</option>
                <option value="Network">Network</option>
                <option value="Database">Database</option>
                <option value="Security">Security</option>
                <option value="Hardware">Hardware</option>
                <option value="Access / Identity">Access / Identity</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="sortOption">Sort By</label>

              <select
                id="sortOption"
                value={sortOption}
                onChange={(event) =>
                  setSortOption(
                    event.target.value as SortOption
                  )
                }
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="severity-high">
                  Severity: High to Low
                </option>
                <option value="severity-low">
                  Severity: Low to High
                </option>
                <option value="sla-soonest">
                  SLA: Deadline Soonest
                </option>
                <option value="sla-latest">
                  SLA: Deadline Latest
                </option>
                <option value="sla-overdue">
                  SLA: Most Overdue
                </option>
                <option value="status">Status A-Z</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="clear-filters"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                  setSeverityFilter("All");
                  setSlaFilter("All");
                  setEscalationFilter("All");
                  setTeamFilter("All");
                  setCategoryFilter("All");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {showForm && (
            <form
              className="incident-form"
              onSubmit={handleSubmit}
            >
              <div className="form-group">
                <label htmlFor="title">Incident Title</label>

                <input
                  id="title"
                  type="text"
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title: event.target.value,
                    })
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
                    setForm({
                      ...form,
                      severity: event.target.value,
                    })
                  }
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>

                <select
                  id="category"
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value,
                    })
                  }
                >
                  <option value="Application">Application</option>
                  <option value="Cloud / Infrastructure">Cloud / Infrastructure</option>
                  <option value="Network">Network</option>
                  <option value="Database">Database</option>
                  <option value="Security">Security</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Access / Identity">Access / Identity</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subcategory">Subcategory</label>

                <input
                  id="subcategory"
                  type="text"
                  value={form.subcategory}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      subcategory: event.target.value,
                    })
                  }
                  placeholder="Example: API Services"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  required
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  placeholder="Describe the service issue..."
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="assignedTo">
                  Assigned Team
                </label>

                <select
                  id="assignedTo"
                  value={form.assignedTo}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      assignedTo: event.target.value,
                    })
                  }
                >
                  <option value="">Unassigned</option>
                  <option value="Service Desk">Service Desk</option>
                  <option value="L1 Support">L1 Support</option>
                  <option value="L2 Engineering">L2 Engineering</option>
                  <option value="Cloud Operations">Cloud Operations</option>
                  <option value="Network Operations">Network Operations</option>
                  <option value="Database Operations">Database Operations</option>
                  <option value="Security Operations">Security Operations</option>
                </select>
              </div>

              <div className="form-actions full-width">
                <button type="submit" disabled={saving}>
                  {saving
                    ? "Creating..."
                    : "Create Incident"}
                </button>
              </div>
            </form>
          )}

          {selectedIncidentId !== null && (
            <IncidentDetails
              incidentId={selectedIncidentId}
              onClose={() =>
                setSelectedIncidentId(null)
              }
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
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>SLA</th>
                    <th>Escalation</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedIncidents.length > 0 ? (
                    sortedIncidents.map((incident) => {
                      const slaStatus =
                        getSlaStatus(incident);

                      return (
                        <tr
                          key={incident.id}
                          className="incident-row"
                          onClick={() => {
                            setSelectedIncidentId(
                              incident.id
                            );
                            setShowForm(false);
                          }}
                        >
                          <td>#{incident.id}</td>

                          <td>
                            <strong>
                              {incident.title}
                            </strong>

                            <span className="description">
                              {incident.description}
                            </span>
                          </td>

                          <td>
                            <strong>{incident.category || "Application"}</strong>
                            {incident.subcategory && (
                              <span className="description">
                                {incident.subcategory}
                              </span>
                            )}
                          </td>

                          <td>
                            <span
                              className={`badge ${incident.severity.toLowerCase()}`}
                            >
                              {incident.severity}
                            </span>
                          </td>

                          <td>
                            <span className="priority-badge">
                              {incident.priority ||
                                "Not Set"}
                            </span>
                          </td>

                          <td>{incident.status}</td>

                          <td>
                            <div className="sla-cell">
                              <span
                                className={`sla-badge ${getSlaClassName(
                                  slaStatus
                                )}`}
                              >
                                {slaStatus}
                              </span>

                              <span className="sla-time">
                                {getSlaTimeText(
                                  incident
                                )}
                              </span>

                              {incident.slaDueAt && (
                                <span className="sla-due">
                                  Due{" "}
                                  {new Date(
                                    incident.slaDueAt
                                  ).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <span className="escalation-badge">
                              {incident.escalationLevel || "L1 Support"}
                            </span>
                          </td>

                          <td>
                            {incident.assignedTo ??
                              "Unassigned"}
                          </td>

                          <td>
                            {new Date(
                              incident.createdAt
                            ).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10}>
                        No incidents match your search or
                        filters.
                      </td>
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