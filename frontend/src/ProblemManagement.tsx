
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

interface Problem {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTeam: string | null;
  rootCause: string | null;
  workaround: string | null;
  permanentFix: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface LinkedIncident {
  incidentId: number;
  title: string;
  status: string;
  severity: string;
}

interface AvailableIncident {
  id: number;
  title: string;
  status: string;
}

type ProblemForm = Pick<
  Problem,
  "title" | "description" | "status" | "priority"
> & {
  assignedTeam: string;
  rootCause: string;
  workaround: string;
  permanentFix: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5286/api";

const API_URL = `${API_BASE_URL}/problems`;
const INCIDENTS_URL = `${API_BASE_URL}/incidents`;

const emptyForm = (): ProblemForm => ({
  title: "",
  description: "",
  status: "Open",
  priority: "Medium",
  assignedTeam: "",
  rootCause: "",
  workaround: "",
  permanentFix: "",
});

export default function ProblemManagement() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProblemForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [selectedProblemId, setSelectedProblemId] =
    useState<number | null>(null);
  const [linkedIncidents, setLinkedIncidents] =
    useState<LinkedIncident[]>([]);
  const [availableIncidents, setAvailableIncidents] =
    useState<AvailableIncident[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [incidentToLink, setIncidentToLink] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  const loadProblems = useCallback(async () => {
    try {
      setError("");
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(
          `Unable to load problems (HTTP ${response.status}).`
        );
      }

      const data: Problem[] = await response.json();
      setProblems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load problems."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProblems();
  }, [loadProblems]);

  const loadLinkedIncidents = async (problemId: number) => {
    setSelectedProblemId(problemId);
    setLoadingIncidents(true);
    setIncidentToLink("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/${problemId}/incidents`
      );

      if (!response.ok) {
        throw new Error("Unable to load linked incidents.");
      }

      const data: LinkedIncident[] = await response.json();
      setLinkedIncidents(data);

      const allResponse = await fetch(INCIDENTS_URL);

      if (!allResponse.ok) {
        throw new Error(
          `Unable to load available incidents (HTTP ${allResponse.status}).`
        );
      }

      const allData: AvailableIncident[] =
        await allResponse.json();

      setAvailableIncidents(allData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load linked incidents."
      );
    } finally {
      setLoadingIncidents(false);
    }
  };

  const handleLinkIncident = async () => {
    if (selectedProblemId === null || !incidentToLink) return;

    const incidentId = incidentToLink;
    setLinkBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/${selectedProblemId}/incidents/${incidentId}`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to link incident (HTTP ${response.status}).`
        );
      }

      await loadLinkedIncidents(selectedProblemId);
      setMessage(`Incident #${incidentId} linked successfully.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to link incident."
      );
    } finally {
      setLinkBusy(false);
    }
  };

  const handleUnlinkIncident = async (incidentId: number) => {
    if (selectedProblemId === null) return;

    const confirmed = window.confirm(
      `Unlink Incident #${incidentId} from Problem #${selectedProblemId}? The incident itself will not be deleted.`
    );

    if (!confirmed) return;

    setLinkBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/${selectedProblemId}/incidents/${incidentId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to unlink incident (HTTP ${response.status}).`
        );
      }

      await loadLinkedIncidents(selectedProblemId);
      setMessage(`Incident #${incidentId} unlinked successfully.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to unlink incident."
      );
    } finally {
      setLinkBusy(false);
    }
  };

  const startNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setMessage("");
    setFormOpen(true);
  };

  const startEdit = (problem: Problem) => {
    setEditingId(problem.id);
    setForm({
      title: problem.title,
      description: problem.description,
      status: problem.status,
      priority: problem.priority,
      assignedTeam: problem.assignedTeam ?? "",
      rootCause: problem.rootCause ?? "",
      workaround: problem.workaround ?? "",
      permanentFix: problem.permanentFix ?? "",
    });
    setError("");
    setMessage("");
    setFormOpen(true);
  };

  const updateField = (
    field: keyof ProblemForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        editingId === null
          ? API_URL
          : `${API_URL}/${editingId}`,
        {
          method: editingId === null ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            status: form.status,
            priority: form.priority,
            assignedTeam: form.assignedTeam.trim(),
            rootCause: form.rootCause.trim(),
            workaround: form.workaround.trim(),
            permanentFix: form.permanentFix.trim(),
          }),
        }
      );

      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `Unable to save problem (HTTP ${response.status}). ${details.slice(0, 300)}`
        );
      }

      setMessage(
        editingId === null
          ? "Problem created successfully."
          : "Problem updated successfully."
      );

      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      await loadProblems();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save problem."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (problem: Problem) => {
    const confirmed = window.confirm(
      `Delete Problem #${problem.id}: ${problem.title}? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(problem.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/${problem.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to delete problem (HTTP ${response.status}).`
        );
      }

      if (editingId === problem.id) {
        setFormOpen(false);
        setEditingId(null);
      }

      if (selectedProblemId === problem.id) {
        setSelectedProblemId(null);
        setLinkedIncidents([]);
      }

      setMessage(`Problem #${problem.id} deleted.`);
      await loadProblems();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete problem."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = problems.filter((problem) => {
    const term = search.trim().toLowerCase();

    const matchesStatus =
      statusFilter === "All" ||
      problem.status.toLowerCase() ===
        statusFilter.toLowerCase();

    const matchesSearch =
      !term ||
      [
        problem.id.toString(),
        problem.title,
        problem.description,
        problem.assignedTeam ?? "",
        problem.rootCause ?? "",
      ].some((value) =>
        value.toLowerCase().includes(term)
      );

    return matchesStatus && matchesSearch;
  });

  const unlinkedIncidents = availableIncidents.filter(
    (incident) =>
      !linkedIncidents.some(
        (linked) => linked.incidentId === incident.id
      )
  );

  return (
    <section
      className="incidents-panel"
      id="problem-management"
      style={{ marginTop: 28 }}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">PROBLEM MANAGEMENT</p>
          <h2>Problem Records</h2>
          <p>
            Investigate recurring issues, document workarounds,
            and track permanent fixes.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            formOpen ? setFormOpen(false) : startNew()
          }
        >
          {formOpen ? "Cancel" : "+ New Problem"}
        </button>
      </div>

      <div className="incident-filters">
        <div className="filter-group search-group">
          <label htmlFor="problem-search">
            Search Problems
          </label>
          <input
            id="problem-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, ID, team, or root cause..."
          />
        </div>

        <div className="filter-group">
          <label htmlFor="problem-status-filter">
            Status
          </label>
          <select
            id="problem-status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Investigating">
              Investigating
            </option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {formOpen && (
        <form
          className="incident-form"
          onSubmit={(event) => void handleSave(event)}
        >
          <div className="form-group full-width">
            <label htmlFor="problem-title">
              Problem Title
            </label>
            <input
              id="problem-title"
              required
              value={form.title}
              onChange={(e) =>
                updateField("title", e.target.value)
              }
              placeholder="Example: Recurring API configuration failures"
            />
          </div>

          <div className="form-group">
            <label htmlFor="problem-status">
              Status
            </label>
            <select
              id="problem-status"
              value={form.status}
              onChange={(e) =>
                updateField("status", e.target.value)
              }
            >
              <option>Open</option>
              <option>Investigating</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="problem-priority">
              Priority
            </label>
            <select
              id="problem-priority"
              value={form.priority}
              onChange={(e) =>
                updateField("priority", e.target.value)
              }
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label htmlFor="problem-team">
              Assigned Team
            </label>
            <select
              id="problem-team"
              value={form.assignedTeam}
              onChange={(e) =>
                updateField("assignedTeam", e.target.value)
              }
            >
              <option value="">Unassigned</option>
              <option>Service Desk</option>
              <option>L1 Support</option>
              <option>L2 Engineering</option>
              <option>Cloud Operations</option>
              <option>Network Operations</option>
              <option>Database Operations</option>
              <option>Security Operations</option>
            </select>
          </div>

          {(
            [
              ["description", "Description"],
              ["rootCause", "Root Cause"],
              ["workaround", "Workaround"],
              ["permanentFix", "Permanent Fix"],
            ] as const
          ).map(([field, label]) => (
            <div
              className="form-group full-width"
              key={field}
            >
              <label htmlFor={`problem-${field}`}>
                {label}
              </label>
              <textarea
                id={`problem-${field}`}
                rows={3}
                required={field === "description"}
                value={form[field]}
                onChange={(e) =>
                  updateField(field, e.target.value)
                }
              />
            </div>
          ))}

          <div className="form-actions full-width">
            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId === null
                  ? "Create Problem"
                  : "Update Problem"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          style={{
            color: "#4ade80",
            padding: "12px 24px",
          }}
        >
          {message}
        </p>
      )}

      {loading ? (
        <p style={{ padding: 24 }}>
          Loading problems...
        </p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Problem</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned Team</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    No problems match your search or filters.
                  </td>
                </tr>
              ) : (
                filtered.map((problem) => (
                  <tr key={problem.id}>
                    <td>#{problem.id}</td>

                    <td>
                      <strong>{problem.title}</strong>
                      <span className="description">
                        {problem.description}
                      </span>

                      {problem.rootCause && (
                        <span className="description">
                          Root cause: {problem.rootCause}
                        </span>
                      )}

                      {problem.workaround && (
                        <span className="description">
                          Workaround: {problem.workaround}
                        </span>
                      )}

                      {problem.permanentFix && (
                        <span className="description">
                          Permanent fix: {problem.permanentFix}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="priority-badge">
                        {problem.priority}
                      </span>
                    </td>

                    <td>{problem.status}</td>
                    <td>
                      {problem.assignedTeam || "Unassigned"}
                    </td>
                    <td>
                      {new Date(
                        problem.updatedAt
                      ).toLocaleString()}
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void loadLinkedIncidents(
                              problem.id
                            )
                          }
                        >
                          View Linked Incidents
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            startEdit(problem)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="knowledge-delete-button"
                          disabled={
                            deletingId === problem.id
                          }
                          onClick={() =>
                            void handleDelete(problem)
                          }
                        >
                          {deletingId === problem.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedProblemId !== null && (
        <div
          className="incidents-panel"
          style={{
            padding: 24,
            marginTop: 20,
          }}
        >
          <h3>
            Linked Incidents — Problem #{selectedProblemId}
          </h3>

          <button
            type="button"
            onClick={() => {
              setSelectedProblemId(null);
              setLinkedIncidents([]);
              setAvailableIncidents([]);
              setIncidentToLink("");
            }}
          >
            Close
          </button>

          <div
            className="form-group"
            style={{
              marginTop: 18,
              marginBottom: 18,
              maxWidth: 600,
            }}
          >
            <label htmlFor="problem-link-incident">
              Link an incident to this problem
            </label>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <select
                id="problem-link-incident"
                value={incidentToLink}
                onChange={(event) =>
                  setIncidentToLink(event.target.value)
                }
                disabled={
                  loadingIncidents || linkBusy
                }
                style={{ flex: "1 1 280px" }}
              >
                <option value="">
                  Select an unlinked incident...
                </option>

                {unlinkedIncidents.map((incident) => (
                  <option
                    key={incident.id}
                    value={incident.id}
                  >
                    #{incident.id} — {incident.title} (
                    {incident.status})
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={
                  !incidentToLink ||
                  linkBusy ||
                  loadingIncidents
                }
                onClick={() =>
                  void handleLinkIncident()
                }
              >
                {linkBusy
                  ? "Working..."
                  : "Link Incident"}
              </button>
            </div>
          </div>

          {loadingIncidents ? (
            <p>Loading linked incidents...</p>
          ) : linkedIncidents.length === 0 ? (
            <p>
              No incidents are linked to this problem.
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Incident</th>
                    <th>Status</th>
                    <th>Severity</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {linkedIncidents.map((incident) => (
                    <tr key={incident.incidentId}>
                      <td>
                        #{incident.incidentId}
                      </td>
                      <td>{incident.title}</td>
                      <td>{incident.status}</td>
                      <td>{incident.severity}</td>

                      <td>
                        <button
                          type="button"
                          disabled={linkBusy}
                          onClick={() =>
                            void handleUnlinkIncident(
                              incident.incidentId
                            )
                          }
                        >
                          Unlink
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
