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
};

type IncidentDetailsProps = {
  incidentId: number;
  onClose: () => void;
  onUpdated: () => void;
};

function IncidentDetails({
  incidentId,
  onClose,
  onUpdated,
}: IncidentDetailsProps) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
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

    loadIncident();
  }, [incidentId]);

  function updateField(field: keyof Incident, value: string) {
    if (!incident) return;

    setIncident({
      ...incident,
      [field]: value,
    });
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
            onChange={(event) => updateField("title", event.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="details-severity">Severity</label>
          <select
            id="details-severity"
            value={incident.severity}
            onChange={(event) => updateField("severity", event.target.value)}
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
            onChange={(event) => updateField("status", event.target.value)}
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