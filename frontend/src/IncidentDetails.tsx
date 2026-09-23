import { useEffect, useState } from "react";

type Incident = {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  assignedTo: string;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  priority: string;
  slaDueAt: string | null;
  escalationLevel: string;
  escalatedAt: string | null;
};

type IncidentActivity = {
  id: number;
  incidentId: number;
  activityType: string;
  description: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
};

type IncidentWorkNote = {
  id: number;
  incidentId: number;
  author: string;
  note: string;
  createdAt: string;
};

type IncidentDetailsProps = {
  incidentId: number;
  onClose: () => void;
  onUpdated: () => void;
};

type SlaStatus = "On Track" | "At Risk" | "Breached" | "Met" | "Not Set";

function getSlaStatus(incident: Incident): SlaStatus {
  if (!incident.slaDueAt) return "Not Set";
  const dueTime = new Date(incident.slaDueAt).getTime();
  if (incident.status.toLowerCase() === "resolved") {
    if (!incident.resolvedAt) return "Met";
    return new Date(incident.resolvedAt).getTime() <= dueTime ? "Met" : "Breached";
  }
  const remaining = dueTime - Date.now();
  if (remaining <= 0) return "Breached";
  const totalSla = dueTime - new Date(incident.createdAt).getTime();
  const percentRemaining = totalSla > 0 ? remaining / totalSla : 0;
  return percentRemaining <= 0.25 ? "At Risk" : "On Track";
}

function getSlaTimeText(incident: Incident): string {
  if (!incident.slaDueAt) return "No SLA deadline";
  const dueTime = new Date(incident.slaDueAt).getTime();
  const targetTime = incident.status.toLowerCase() === "resolved" && incident.resolvedAt
    ? new Date(incident.resolvedAt).getTime()
    : Date.now();
  const difference = dueTime - targetTime;
  const totalMinutes = Math.floor(Math.abs(difference) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const value = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  if (incident.status.toLowerCase() === "resolved") {
    return difference >= 0 ? `${value} before deadline` : `${value} after deadline`;
  }
  return difference >= 0 ? `${value} remaining` : `${value} overdue`;
}

function getSlaClassName(status: SlaStatus): string {
  switch (status) {
    case "Met": return "sla-met";
    case "At Risk": return "sla-at-risk";
    case "Breached": return "sla-breached";
    case "On Track": return "sla-on-track";
    default: return "sla-not-set";
  }
}

function IncidentDetails({
  incidentId,
  onClose,
  onUpdated,
}: IncidentDetailsProps) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [activities, setActivities] = useState<IncidentActivity[]>([]);
  const [workNotes, setWorkNotes] = useState<IncidentWorkNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [workNotesLoading, setWorkNotesLoading] = useState(true);
  const [workNoteAuthor, setWorkNoteAuthor] = useState("Kevin Jordan");
  const [workNoteText, setWorkNoteText] = useState("");
  const [addingWorkNote, setAddingWorkNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadIncident() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `http://localhost:5286/api/incidents/${incidentId}`
        );

        if (!response.ok) {
          throw new Error("Unable to load incident.");
        }

        const data: Incident = await response.json();
        setIncident(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load incident."
        );
      } finally {
        setLoading(false);
      }
    }

    async function loadActivities() {
      try {
        setActivityLoading(true);

        const response = await fetch(
          `http://localhost:5286/api/incidents/${incidentId}/activities`
        );

        if (!response.ok) {
          throw new Error("Unable to load incident activity.");
        }

        const data: IncidentActivity[] = await response.json();
        setActivities(data);
      } catch (err) {
        console.error("Unable to load incident activity:", err);
      } finally {
        setActivityLoading(false);
      }
    }

    async function loadWorkNotes() {
      try {
        setWorkNotesLoading(true);
        const response = await fetch(
          `http://localhost:5286/api/incidents/${incidentId}/worknotes`
        );
        if (!response.ok) throw new Error("Unable to load work notes.");
        const data: IncidentWorkNote[] = await response.json();
        setWorkNotes(data);
      } catch (err) {
        console.error("Unable to load work notes:", err);
      } finally {
        setWorkNotesLoading(false);
      }
    }

    loadIncident();
    loadActivities();
    loadWorkNotes();
  }, [incidentId]);

  function updateField(field: keyof Incident, value: string) {
    if (!incident) return;

    setIncident({
      ...incident,
      [field]: value,
    });
  }

  async function refreshActivities() {
    try {
      const response = await fetch(
        `http://localhost:5286/api/incidents/${incidentId}/activities`
      );
      if (!response.ok) throw new Error("Unable to refresh incident activity.");
      const data: IncidentActivity[] = await response.json();
      setActivities(data);
    } catch (err) {
      console.error("Unable to refresh incident activity:", err);
    }
  }

  async function handleAddWorkNote() {
    if (!incident) return;

    const author = workNoteAuthor.trim();
    const note = workNoteText.trim();

    if (!author || !note) {
      setError("Author and work note are required.");
      return;
    }

    try {
      setAddingWorkNote(true);
      setError("");

      const response = await fetch(
        `http://localhost:5286/api/incidents/${incident.id}/worknotes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ author, note }),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to add work note.");
      }

      const createdNote: IncidentWorkNote = await response.json();
      setWorkNotes((current) => [createdNote, ...current]);
      setWorkNoteText("");
      await refreshActivities();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add work note.");
    } finally {
      setAddingWorkNote(false);
    }
  }

  async function handleSave() {
    if (!incident) return;

    try {
      setSaving(true);
      setError("");

      const resolvedAt =
        incident.status === "Resolved"
          ? incident.resolvedAt ?? new Date().toISOString()
          : null;

      const response = await fetch(
        `http://localhost:5286/api/incidents/${incident.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: incident.title,
            description: incident.description,
            severity: incident.severity,
            status: incident.status,
            assignedTo: incident.assignedTo,
            resolvedAt,
            resolutionNotes: incident.resolutionNotes,
            escalationLevel: incident.escalationLevel,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to update incident.");
      }

      onUpdated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update incident."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!incident) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete Incident #${incident.id} - ${incident.title}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      const response = await fetch(
        `http://localhost:5286/api/incidents/${incident.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Unable to delete incident.");
      }

      onUpdated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete incident."
      );
    } finally {
      setDeleting(false);
    }
  }

  function formatActivityType(activityType: string) {
    switch (activityType) {
      case "IncidentCreated":
        return "Incident Created";
      case "TitleChanged":
        return "Title Changed";
      case "DescriptionChanged":
        return "Description Changed";
      case "SeverityChanged":
        return "Severity Changed";
      case "StatusChanged":
        return "Status Changed";
      case "AssignmentChanged":
        return "Assigned Team Changed";
      case "ResolutionNotesChanged":
        return "Resolution Notes Updated";
      case "WorkNoteAdded":
        return "Work Note Added";
      case "PriorityChanged":
        return "Priority Changed";
      case "SlaDueAtChanged":
        return "SLA Deadline Changed";
      case "EscalationLevelChanged":
        return "Escalation Level Changed";
      case "AutomaticEscalation":
        return "Automatic SLA Escalation";
      default:
        return activityType;
    }
  }

  function formatActivityDate(date: string) {
    return new Date(date).toLocaleString();
  }

  if (loading) {
    return (
      <div className="incident-details">
        <p>Loading incident...</p>
      </div>
    );
  }

  if (error && !incident) {
    return (
      <div className="incident-details">
        <p className="error">{error}</p>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  if (!incident) {
    return null;
  }

  const slaStatus = getSlaStatus(incident);

  return (
    <div className="incident-details">
      <div className="details-heading">
        <div>
          <p className="eyebrow">INCIDENT #{incident.id}</p>
          <h2>{incident.title}</h2>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="details-grid">
        <div className="form-group full-width">
          <label htmlFor="details-title">Incident Title</label>
          <input
            id="details-title"
            value={incident.title}
            onChange={(event) =>
              updateField("title", event.target.value)
            }
          />
        </div>

        <div className="form-group">
          <label htmlFor="details-severity">Severity</label>
          <select
            id="details-severity"
            value={incident.severity}
            onChange={(event) =>
              updateField("severity", event.target.value)
            }
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="details-status">Status</label>
          <select
            id="details-status"
            value={incident.status}
            onChange={(event) =>
              updateField("status", event.target.value)
            }
          >
            <option value="Open">Open</option>
            <option value="Investigating">Investigating</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <div className="form-group full-width">
          <label htmlFor="details-description">Description</label>
          <textarea
            id="details-description"
            rows={4}
            value={incident.description}
            onChange={(event) =>
              updateField("description", event.target.value)
            }
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="details-assigned">Assigned Team</label>
          <input
            id="details-assigned"
            value={incident.assignedTo}
            onChange={(event) =>
              updateField("assignedTo", event.target.value)
            }
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="details-escalation">Escalation Level</label>
          <select
            id="details-escalation"
            value={incident.escalationLevel || "L1 Support"}
            onChange={(event) =>
              updateField("escalationLevel", event.target.value)
            }
          >
            <option value="L1 Support">L1 Support</option>
            <option value="L2 Engineering">L2 Engineering</option>
            <option value="Cloud Operations">Cloud Operations</option>
          </select>
        </div>

        <div className="form-group full-width">
          <label htmlFor="details-resolution">Resolution Notes</label>
          <textarea
            id="details-resolution"
            rows={4}
            placeholder="Describe the resolution..."
            value={incident.resolutionNotes ?? ""}
            onChange={(event) =>
              updateField("resolutionNotes", event.target.value)
            }
          />
        </div>
      </div>

      <section className="sla-details-section">
        <div className="sla-details-header">
          <div>
            <p className="eyebrow">SERVICE LEVEL AGREEMENT</p>
            <h3>SLA Tracking</h3>
          </div>
          <span className={`sla-badge ${getSlaClassName(slaStatus)}`}>{slaStatus}</span>
        </div>
        <div className="sla-details-grid">
          <div className="sla-detail-card"><span>Priority</span><strong>{incident.priority || "Not Set"}</strong></div>
          <div className="sla-detail-card"><span>SLA Status</span><strong>{slaStatus}</strong></div>
          <div className="sla-detail-card"><span>Time</span><strong>{getSlaTimeText(incident)}</strong></div>
          <div className="sla-detail-card"><span>SLA Deadline</span><strong>{incident.slaDueAt ? new Date(incident.slaDueAt).toLocaleString() : "Not Set"}</strong></div>
        </div>
      </section>

      <section className="escalation-details-section">
        <div className="sla-details-header">
          <div>
            <p className="eyebrow">INCIDENT ESCALATION</p>
            <h3>Escalation Tracking</h3>
          </div>
        </div>

        <div className="sla-details-grid">
          <div className="sla-detail-card">
            <span>Current Level</span>
            <strong>{incident.escalationLevel || "L1 Support"}</strong>
          </div>

          <div className="sla-detail-card">
            <span>Last Escalated</span>
            <strong>
              {incident.escalatedAt
                ? new Date(incident.escalatedAt).toLocaleString()
                : "Not escalated"}
            </strong>
          </div>
        </div>
      </section>

      <section className="work-notes-section">
        <div className="work-notes-header">
          <div>
            <p className="eyebrow">INCIDENT COLLABORATION</p>
            <h3>Work Notes</h3>
          </div>
          <span className="activity-count">
            {workNotes.length} {workNotes.length === 1 ? "note" : "notes"}
          </span>
        </div>

        <div className="work-note-form">
          <div className="form-group">
            <label htmlFor="work-note-author">Author</label>
            <input
              id="work-note-author"
              value={workNoteAuthor}
              onChange={(event) => setWorkNoteAuthor(event.target.value)}
              disabled={addingWorkNote}
            />
          </div>

          <div className="form-group">
            <label htmlFor="work-note-text">Add Work Note</label>
            <textarea
              id="work-note-text"
              rows={3}
              placeholder="Describe troubleshooting performed, findings, or next steps..."
              value={workNoteText}
              onChange={(event) => setWorkNoteText(event.target.value)}
              disabled={addingWorkNote}
            />
          </div>

          <div className="work-note-form-actions">
            <button
              type="button"
              onClick={handleAddWorkNote}
              disabled={addingWorkNote || !workNoteAuthor.trim() || !workNoteText.trim()}
            >
              {addingWorkNote ? "Adding..." : "Add Work Note"}
            </button>
          </div>
        </div>

        {workNotesLoading ? (
          <p className="activity-empty">Loading work notes...</p>
        ) : workNotes.length === 0 ? (
          <p className="activity-empty">
            No work notes have been added to this incident yet.
          </p>
        ) : (
          <div className="work-notes-list">
            {workNotes.map((workNote) => (
              <article className="work-note-card" key={workNote.id}>
                <div className="work-note-meta">
                  <strong>{workNote.author}</strong>
                  <time>{formatActivityDate(workNote.createdAt)}</time>
                </div>
                <p>{workNote.note}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="activity-section">
        <div className="activity-header">
          <div>
            <p className="eyebrow">INCIDENT HISTORY</p>
            <h3>Activity Timeline</h3>
          </div>

          <span className="activity-count">
            {activities.length}{" "}
            {activities.length === 1 ? "event" : "events"}
          </span>
        </div>

        {activityLoading ? (
          <p className="activity-empty">Loading activity...</p>
        ) : activities.length === 0 ? (
          <p className="activity-empty">
            No activity has been recorded for this incident yet.
          </p>
        ) : (
          <div className="activity-timeline">
            {activities.map((activity) => (
              <div className="activity-item" key={activity.id}>
                <div className="activity-marker">
                  <span />
                </div>

                <div className="activity-content">
                  <div className="activity-title-row">
                    <strong>
                      {formatActivityType(activity.activityType)}
                    </strong>

                    <time>
                      {formatActivityDate(activity.createdAt)}
                    </time>
                  </div>

                  <p>{activity.description}</p>

                  {(activity.previousValue !== null ||
                    activity.newValue !== null) && (
                    <div className="activity-change">
                      {activity.previousValue !== null && (
                        <span className="activity-old-value">
                          {activity.previousValue || "None"}
                        </span>
                      )}

                      {activity.previousValue !== null &&
                        activity.newValue !== null && (
                          <span className="activity-arrow">→</span>
                        )}

                      {activity.newValue !== null && (
                        <span className="activity-new-value">
                          {activity.newValue || "None"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="details-actions">
        <button
          type="button"
          className="delete-button"
          onClick={handleDelete}
          disabled={saving || deleting}
        >
          {deleting ? "Deleting..." : "Delete Incident"}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={onClose}
          disabled={saving || deleting}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || deleting}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default IncidentDetails;