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

interface IncidentMetrics {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  criticalIncidents: number;
  slaBreaches: number;
  averageResolutionHours: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byTeam: Record<string, number>;
}

interface KnowledgeArticle {
  id: number; title: string; summary: string; content: string; category: string;
  status: string; author: string; createdAt: string; updatedAt: string;
}
interface KnowledgeArticleForm {
  title: string; summary: string; content: string; category: string; status: string; author: string;
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
const KNOWLEDGE_API_URL = "http://localhost:5286/api/knowledge-articles";

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
  const [metrics, setMetrics] = useState<IncidentMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
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
  const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [knowledgeError, setKnowledgeError] = useState("");
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [knowledgeCategoryFilter, setKnowledgeCategoryFilter] = useState("All");
  const [knowledgeStatusFilter, setKnowledgeStatusFilter] = useState("All");
  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
  const [selectedKnowledgeArticleId, setSelectedKnowledgeArticleId] = useState<number | null>(null);
  const [editingKnowledgeArticleId, setEditingKnowledgeArticleId] = useState<number | null>(null);
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState<KnowledgeArticleForm>({
    title: "", summary: "", content: "", category: "General", status: "Draft", author: "Kevin Jordan",
  });

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

  const loadMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const response = await fetch(`${API_URL}/metrics`);

      if (!response.ok) {
        throw new Error("Unable to load incident metrics.");
      }

      const data: IncidentMetrics = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error("Unable to load incident metrics:", err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const loadKnowledgeArticles = useCallback(async () => {
    try {
      setKnowledgeLoading(true); setKnowledgeError("");
      const response = await fetch(KNOWLEDGE_API_URL);
      if (!response.ok) throw new Error("Unable to load knowledge articles.");
      setKnowledgeArticles(await response.json());
    } catch (err) {
      setKnowledgeError(err instanceof Error ? err.message : "Unable to load knowledge articles.");
    } finally { setKnowledgeLoading(false); }
  }, []);

  useEffect(() => {
    void loadIncidents(); void loadMetrics(); void loadKnowledgeArticles();
  }, [loadIncidents, loadMetrics, loadKnowledgeArticles]);

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
      await Promise.all([loadIncidents(), loadMetrics()]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create incident."
      );
    } finally {
      setSaving(false);
    }
  };

  const resetKnowledgeForm = () => {
    setKnowledgeForm({ title: "", summary: "", content: "", category: "General", status: "Draft", author: "Kevin Jordan" });
    setEditingKnowledgeArticleId(null);
  };

  const handleKnowledgeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setKnowledgeSaving(true); setKnowledgeError("");
    try {
      const editing = editingKnowledgeArticleId !== null;
      const response = await fetch(editing ? `${KNOWLEDGE_API_URL}/${editingKnowledgeArticleId}` : KNOWLEDGE_API_URL, {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(knowledgeForm),
      });
      if (!response.ok) throw new Error(editing ? "Unable to update knowledge article." : "Unable to create knowledge article.");
      await loadKnowledgeArticles(); resetKnowledgeForm(); setShowKnowledgeForm(false);
    } catch (err) {
      setKnowledgeError(err instanceof Error ? err.message : "Unable to save knowledge article.");
    } finally { setKnowledgeSaving(false); }
  };

  const startKnowledgeEdit = (article: KnowledgeArticle) => {
    setKnowledgeForm({ title: article.title, summary: article.summary, content: article.content, category: article.category, status: article.status, author: article.author });
    setEditingKnowledgeArticleId(article.id); setSelectedKnowledgeArticleId(article.id); setShowKnowledgeForm(true);
  };

  const deleteKnowledgeArticle = async (article: KnowledgeArticle) => {
    if (!window.confirm(`Delete knowledge article "${article.title}"?`)) return;
    try {
      setKnowledgeError("");
      const response = await fetch(`${KNOWLEDGE_API_URL}/${article.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete knowledge article.");
      if (selectedKnowledgeArticleId === article.id) setSelectedKnowledgeArticleId(null);
      if (editingKnowledgeArticleId === article.id) { resetKnowledgeForm(); setShowKnowledgeForm(false); }
      await loadKnowledgeArticles();
    } catch (err) {
      setKnowledgeError(err instanceof Error ? err.message : "Unable to delete knowledge article.");
    }
  };

  const filteredKnowledgeArticles = knowledgeArticles.filter((article) => {
    const s = knowledgeSearch.trim().toLowerCase();
    const search = !s || article.title.toLowerCase().includes(s) || article.summary.toLowerCase().includes(s) || article.content.toLowerCase().includes(s) || article.author.toLowerCase().includes(s);
    const category = knowledgeCategoryFilter === "All" || article.category.toLowerCase() === knowledgeCategoryFilter.toLowerCase();
    const status = knowledgeStatusFilter === "All" || article.status.toLowerCase() === knowledgeStatusFilter.toLowerCase();
    return search && category && status;
  });
  const knowledgeCategories = Array.from(new Set(knowledgeArticles.map((a) => a.category))).sort();
  const selectedKnowledgeArticle = selectedKnowledgeArticleId === null ? null : knowledgeArticles.find((a) => a.id === selectedKnowledgeArticleId) ?? null;

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

  const renderMetricBars = (values: Record<string, number>) => {
    const entries = Object.entries(values);
    const maxValue = Math.max(...entries.map(([, value]) => value), 1);

    if (entries.length === 0) {
      return <p className="analytics-empty">No data available.</p>;
    }

    return (
      <div className="analytics-bars">
        {entries.map(([label, value]) => (
          <div className="analytics-bar-row" key={label}>
            <div className="analytics-bar-meta">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
            <div className="analytics-bar-track">
              <div
                className="analytics-bar-fill"
                style={{ width: `${(value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

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

        <section className="analytics-panel">
          <div className="analytics-heading">
            <div>
              <p className="eyebrow">OPERATIONS ANALYTICS</p>
              <h2>Incident Metrics</h2>
              <p>Live reporting from the incident management API.</p>
            </div>
          </div>

          {metricsLoading ? (
            <p className="analytics-empty">Loading incident metrics...</p>
          ) : metrics ? (
            <>
              <div className="analytics-summary">
                <article className="analytics-summary-card">
                  <span>Resolved Incidents</span>
                  <strong>{metrics.resolvedIncidents}</strong>
                </article>
                <article className="analytics-summary-card">
                  <span>Average Resolution Time</span>
                  <strong>{metrics.averageResolutionHours.toFixed(2)} hrs</strong>
                </article>
                <article className="analytics-summary-card">
                  <span>SLA Breaches</span>
                  <strong>{metrics.slaBreaches}</strong>
                </article>
              </div>

              <div className="analytics-grid">
                <article className="analytics-card">
                  <h3>Incidents by Category</h3>
                  {renderMetricBars(metrics.byCategory)}
                </article>

                <article className="analytics-card">
                  <h3>Incidents by Severity</h3>
                  {renderMetricBars(metrics.bySeverity)}
                </article>

                <article className="analytics-card">
                  <h3>Incidents by Assigned Team</h3>
                  {renderMetricBars(metrics.byTeam)}
                </article>
              </div>
            </>
          ) : (
            <p className="analytics-empty">
              Incident metrics are currently unavailable.
            </p>
          )}
        </section>

        <section className="knowledge-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">KNOWLEDGE MANAGEMENT</p><h2>Knowledge Base</h2></div>
            <button type="button" onClick={() => { if (showKnowledgeForm) { resetKnowledgeForm(); setShowKnowledgeForm(false); } else { resetKnowledgeForm(); setShowKnowledgeForm(true); } }}>
              {showKnowledgeForm ? "Cancel" : "+ New Article"}
            </button>
          </div>

          <div className="knowledge-filters">
            <div className="filter-group search-group"><label htmlFor="knowledgeSearch">Search</label><input id="knowledgeSearch" type="search" value={knowledgeSearch} onChange={(e) => setKnowledgeSearch(e.target.value)} placeholder="Search knowledge articles..." /></div>
            <div className="filter-group"><label htmlFor="knowledgeCategoryFilter">Category</label><select id="knowledgeCategoryFilter" value={knowledgeCategoryFilter} onChange={(e) => setKnowledgeCategoryFilter(e.target.value)}><option value="All">All Categories</option>{knowledgeCategories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="filter-group"><label htmlFor="knowledgeStatusFilter">Status</label><select id="knowledgeStatusFilter" value={knowledgeStatusFilter} onChange={(e) => setKnowledgeStatusFilter(e.target.value)}><option value="All">All Statuses</option><option value="Draft">Draft</option><option value="Published">Published</option><option value="Archived">Archived</option></select></div>
          </div>

          {showKnowledgeForm && <form className="knowledge-form" onSubmit={handleKnowledgeSubmit}>
            <div className="form-group"><label htmlFor="knowledgeTitle">Title</label><input id="knowledgeTitle" required value={knowledgeForm.title} onChange={(e) => setKnowledgeForm({...knowledgeForm,title:e.target.value})} /></div>
            <div className="form-group"><label htmlFor="knowledgeCategory">Category</label><input id="knowledgeCategory" value={knowledgeForm.category} onChange={(e) => setKnowledgeForm({...knowledgeForm,category:e.target.value})} /></div>
            <div className="form-group"><label htmlFor="knowledgeStatus">Status</label><select id="knowledgeStatus" value={knowledgeForm.status} onChange={(e) => setKnowledgeForm({...knowledgeForm,status:e.target.value})}><option>Draft</option><option>Published</option><option>Archived</option></select></div>
            <div className="form-group"><label htmlFor="knowledgeAuthor">Author</label><input id="knowledgeAuthor" value={knowledgeForm.author} onChange={(e) => setKnowledgeForm({...knowledgeForm,author:e.target.value})} /></div>
            <div className="form-group full-width"><label htmlFor="knowledgeSummary">Summary</label><textarea id="knowledgeSummary" rows={3} value={knowledgeForm.summary} onChange={(e) => setKnowledgeForm({...knowledgeForm,summary:e.target.value})} /></div>
            <div className="form-group full-width"><label htmlFor="knowledgeContent">Article Content</label><textarea id="knowledgeContent" rows={8} required value={knowledgeForm.content} onChange={(e) => setKnowledgeForm({...knowledgeForm,content:e.target.value})} /></div>
            <div className="form-actions full-width"><button type="submit" disabled={knowledgeSaving}>{knowledgeSaving ? "Saving..." : editingKnowledgeArticleId !== null ? "Update Article" : "Create Article"}</button></div>
          </form>}

          {knowledgeError && <p className="error">{knowledgeError}</p>}
          {selectedKnowledgeArticle && !showKnowledgeForm && <article className="knowledge-detail">
            <div className="knowledge-detail-header"><div><p className="eyebrow">ARTICLE #{selectedKnowledgeArticle.id}</p><h3>{selectedKnowledgeArticle.title}</h3></div><button type="button" onClick={() => setSelectedKnowledgeArticleId(null)}>Close</button></div>
            <div className="knowledge-meta"><span>{selectedKnowledgeArticle.category}</span><span>{selectedKnowledgeArticle.status}</span><span>By {selectedKnowledgeArticle.author || "Unknown"}</span><span>Updated {new Date(selectedKnowledgeArticle.updatedAt).toLocaleString()}</span></div>
            {selectedKnowledgeArticle.summary && <p className="knowledge-detail-summary">{selectedKnowledgeArticle.summary}</p>}
            <div className="knowledge-detail-content">{selectedKnowledgeArticle.content}</div>
            <div className="knowledge-card-actions"><button type="button" onClick={() => startKnowledgeEdit(selectedKnowledgeArticle)}>Edit Article</button><button type="button" className="knowledge-delete-button" onClick={() => void deleteKnowledgeArticle(selectedKnowledgeArticle)}>Delete</button></div>
          </article>}

          {knowledgeLoading ? <p className="knowledge-empty">Loading knowledge articles...</p> : filteredKnowledgeArticles.length ? <div className="knowledge-grid">
            {filteredKnowledgeArticles.map((article) => <article className="knowledge-card" key={article.id}>
              <div className="knowledge-card-top"><span className="knowledge-category">{article.category}</span><span className={`knowledge-status ${article.status.toLowerCase()}`}>{article.status}</span></div>
              <h3>{article.title}</h3><p>{article.summary || "No summary provided."}</p>
              <div className="knowledge-card-meta"><span>By {article.author || "Unknown"}</span><span>{new Date(article.updatedAt).toLocaleDateString()}</span></div>
              <div className="knowledge-card-actions"><button type="button" onClick={() => { setSelectedKnowledgeArticleId(article.id); setShowKnowledgeForm(false); }}>View</button><button type="button" onClick={() => startKnowledgeEdit(article)}>Edit</button><button type="button" className="knowledge-delete-button" onClick={() => void deleteKnowledgeArticle(article)}>Delete</button></div>
            </article>)}
          </div> : <p className="knowledge-empty">No knowledge articles match your search or filters.</p>}
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
                await Promise.all([loadIncidents(), loadMetrics()]);
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