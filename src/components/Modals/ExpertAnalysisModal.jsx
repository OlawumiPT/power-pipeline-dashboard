import React, { useEffect, useMemo, useState, useCallback } from "react";
import { X, Save, RefreshCw, Edit3 } from "lucide-react";
import PropTypes from "prop-types";
import axios from "axios";

/**
 * ExpertAnalysisModal
 * - Loads expert analysis + transmission data for a selected project.
 * - Allows editing the expert analysis + transmission data.
 * - Saves to backend and updates parent state through callback(s).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const ratingFromScore = (score) => {
  const s = Number(score) || 0;
  if (s >= 85) return "Excellent";
  if (s >= 70) return "Good";
  if (s >= 55) return "Moderate";
  if (s >= 40) return "Low";
  return "Very Low";
};

const clamp0to100 = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

function KPI({ label, value }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function SliderRow({ label, value, onChange, disabled }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 60px", gap: 12, alignItems: "center" }}>
      <div style={{ fontSize: 13, opacity: 0.9 }}>{label}</div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clamp0to100(e.target.value))}
        style={{ width: "100%" }}
      />
      <div style={{ fontSize: 13, textAlign: "right" }}>{value}</div>
    </div>
  );
}

function TextArea({ label, value, onChange, disabled, rows = 4 }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 13, opacity: 0.9 }}>{label}</div>
      <textarea
        rows={rows}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          borderRadius: 10,
          padding: 10,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(0,0,0,0.25)",
          color: "white",
          outline: "none",
        }}
      />
    </div>
  );
}

/**
 * Avoid cursor jumps while typing by:
 * - using defaultValue (uncontrolled)
 * - committing changes on blur
 * This prevents state updates on every keystroke.
 */
const TransmissionEditTable = React.memo(function TransmissionEditTable({ transmissionData, setTransmissionData }) {
  const handleBlurUpdate = useCallback(
    (index, field, value) => {
      const updated = [...transmissionData];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      setTransmissionData(updated);
    },
    [transmissionData, setTransmissionData]
  );

  const columns = [
    { key: "line", label: "Line" },
    { key: "kV", label: "kV" },
    { key: "substations", label: "Substations" },
    { key: "capacity_MVA", label: "Capacity (MVA)" },
    { key: "distance_miles", label: "Distance (miles)" },
  ];

  return (
    <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.08)" }}>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  borderBottom: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transmissionData?.map((row, index) => (
            <tr key={index} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: "10px 12px" }}>
                  <input
                    type="text"
                    defaultValue={row?.[c.key] ?? ""}
                    onBlur={(e) => handleBlurUpdate(index, c.key, e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      padding: "8px 10px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.25)",
                      color: "white",
                      outline: "none",
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
          {!transmissionData?.length && (
            <tr>
              <td colSpan={columns.length} style={{ padding: 14, opacity: 0.8 }}>
                No transmission rows found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

function TransmissionViewTable({ transmissionData }) {
  const columns = [
    { key: "line", label: "Line" },
    { key: "kV", label: "kV" },
    { key: "substations", label: "Substations" },
    { key: "capacity_MVA", label: "Capacity (MVA)" },
    { key: "distance_miles", label: "Distance (miles)" },
  ];

  return (
    <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.08)" }}>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  borderBottom: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transmissionData?.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: "10px 12px", fontSize: 13, opacity: 0.95 }}>
                  {row?.[c.key] ?? ""}
                </td>
              ))}
            </tr>
          ))}
          {!transmissionData?.length && (
            <tr>
              <td colSpan={columns.length} style={{ padding: 14, opacity: 0.8 }}>
                No transmission rows found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ExpertAnalysisModal({
  project,
  onClose,
  onRefresh,
  onUpdateProject,
  onSaveSuccess,
}) {
  const projectName = project?.projectName || project?.name || "Project";
  const projectId = project?.id || project?.project_id || project?.projectId || projectName;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [expertAnalysis, setExpertAnalysis] = useState(null);
  const [transmissionData, setTransmissionData] = useState([]);

  // Editable fields
  const [overallScore, setOverallScore] = useState(0);
  const [thermalScore, setThermalScore] = useState(0);
  const [redevelopmentScore, setRedevelopmentScore] = useState(0);
  const [infraScore, setInfraScore] = useState(0);
  const [confidence, setConfidence] = useState(0);

  const [summary, setSummary] = useState("");
  const [recommendations, setRecommendations] = useState("");

  const overallRating = useMemo(() => ratingFromScore(overallScore), [overallScore]);

  const hydrateFromAnalysis = useCallback((analysis) => {
    setExpertAnalysis(analysis);

    setOverallScore(clamp0to100(analysis?.overall_score ?? analysis?.overallScore ?? 0));
    setThermalScore(clamp0to100(analysis?.thermal_suitability_score ?? analysis?.thermalScore ?? 0));
    setRedevelopmentScore(clamp0to100(analysis?.redevelopment_potential_score ?? analysis?.redevelopmentScore ?? 0));
    setInfraScore(clamp0to100(analysis?.infrastructure_score ?? analysis?.infraScore ?? 0));
    setConfidence(clamp0to100(analysis?.confidence_score ?? analysis?.confidence ?? 0));

    setSummary(analysis?.summary ?? "");
    setRecommendations(analysis?.recommendations ?? "");
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1) Expert analysis
      const analysisResp = await axios.get(`${API_BASE_URL}/api/expert-analysis`, {
        params: { project_id: projectId },
      });
      const analysis = analysisResp?.data || null;
      hydrateFromAnalysis(analysis);

      // 2) Transmission
      const txResp = await axios.get(`${API_BASE_URL}/api/transmission`, {
        params: { project_id: projectId },
      });
      setTransmissionData(Array.isArray(txResp?.data) ? txResp.data : []);
    } catch (err) {
      console.error("❌ Failed to load expert analysis modal data:", err);
      // fallback safe defaults
      hydrateFromAnalysis(null);
      setTransmissionData([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, hydrateFromAnalysis]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    await fetchData();
    if (typeof onRefresh === "function") onRefresh();
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updatedAnalysis = {
        project_id: projectId,
        project_name: projectName,
        overall_score: clamp0to100(overallScore),
        overall_rating: ratingFromScore(overallScore),

        thermal_suitability_score: clamp0to100(thermalScore),
        redevelopment_potential_score: clamp0to100(redevelopmentScore),
        infrastructure_score: clamp0to100(infraScore),
        confidence_score: clamp0to100(confidence),

        summary: summary || "",
        recommendations: recommendations || "",
        updated_at: new Date().toISOString(),
      };

      // Save Expert Analysis
      await axios.post(`${API_BASE_URL}/api/expert-analysis`, updatedAnalysis);

      // Save Transmission (send as array)
      await axios.post(`${API_BASE_URL}/api/transmission`, {
        project_id: projectId,
        rows: transmissionData || [],
      });

      // ✅ Update the selected project so card/list updates immediately
      if (typeof onUpdateProject === "function") {
        onUpdateProject(projectId, updatedAnalysis);
      }

      // ✅ Notify parent (DashboardContent) if they provided callback
      if (typeof onSaveSuccess === "function") {
        onSaveSuccess(projectId, updatedAnalysis);
      }

      // ✅ Support the “pass callback inside selected project” pattern (your current approach)
      if (typeof project?.onSaveSuccess === "function") {
        project.onSaveSuccess(projectId, updatedAnalysis);
      }

      // Optional: persist in localStorage (safe fallback)
      try {
        const key = "expert_analyses";
        const raw = localStorage.getItem(key);
        const existing = raw ? JSON.parse(raw) : [];
        const updated = Array.isArray(existing) ? [...existing] : [];
        const idx = updated.findIndex((a) => a.project_id === projectId || a.projectId === projectId);
        if (idx >= 0) updated[idx] = { ...updated[idx], ...updatedAnalysis };
        else updated.push(updatedAnalysis);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {
        // ignore localStorage errors
      }

      setIsEditing(false);
      await fetchData();
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("Save failed. Please check the server logs and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onMouseDown={(e) => {
        // click outside to close
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "92vh",
          overflow: "auto",
          borderRadius: 16,
          background: "#0b1020",
          color: "white",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "linear-gradient(180deg, rgba(11,16,32,1) 0%, rgba(11,16,32,0.92) 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Expert Analysis</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{projectName}</div>
          </div>

          <button
            onClick={() => setIsEditing((v) => !v)}
            style={btnStyle("secondary")}
            disabled={loading}
            title="Toggle edit mode"
          >
            <Edit3 size={16} />
            {isEditing ? "Viewing" : "Edit"}
          </button>

          <button onClick={handleRefresh} style={btnStyle("secondary")} disabled={loading || saving}>
            <RefreshCw size={16} />
            Refresh
          </button>

          <button onClick={handleSave} style={btnStyle("primary")} disabled={!isEditing || loading || saving}>
            <Save size={16} />
            {saving ? "Saving..." : "Save"}
          </button>

          <button onClick={onClose} style={btnStyle("danger")}>
            <X size={16} />
            Close
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, display: "grid", gap: 18 }}>
          {loading ? (
            <div style={{ padding: 14, opacity: 0.85 }}>Loading expert analysis...</div>
          ) : (
            <>
              {/* KPI Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
                <KPI label="Overall Score" value={overallScore} />
                <KPI label="Overall Rating" value={overallRating} />
                <KPI label="Thermal Suitability" value={thermalScore} />
                <KPI label="Infrastructure" value={infraScore} />
                <KPI label="Confidence" value={`${confidence}%`} />
              </div>

              {/* Scores */}
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  padding: 16,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Scoring Breakdown</div>

                <SliderRow label="Overall Score" value={overallScore} onChange={setOverallScore} disabled={!isEditing} />
                <SliderRow
                  label="Thermal Suitability Score"
                  value={thermalScore}
                  onChange={setThermalScore}
                  disabled={!isEditing}
                />
                <SliderRow
                  label="Redevelopment Potential Score"
                  value={redevelopmentScore}
                  onChange={setRedevelopmentScore}
                  disabled={!isEditing}
                />
                <SliderRow
                  label="Infrastructure Score"
                  value={infraScore}
                  onChange={setInfraScore}
                  disabled={!isEditing}
                />
                <SliderRow label="Confidence Score (%)" value={confidence} onChange={setConfidence} disabled={!isEditing} />
              </div>

              {/* Narrative */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)",
                    padding: 16,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Summary</div>
                  <TextArea label="" value={summary} onChange={setSummary} disabled={!isEditing} rows={8} />
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)",
                    padding: 16,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Recommendations</div>
                  <TextArea label="" value={recommendations} onChange={setRecommendations} disabled={!isEditing} rows={8} />
                </div>
              </div>

              {/* Transmission */}
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  padding: 16,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Transmission Data</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {isEditing ? "Edits are committed on field blur" : "Read-only view"}
                  </div>
                </div>

                {isEditing ? (
                  <TransmissionEditTable
                    transmissionData={transmissionData}
                    setTransmissionData={setTransmissionData}
                  />
                ) : (
                  <TransmissionViewTable transmissionData={transmissionData} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function btnStyle(variant) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 800,
    border: "1px solid rgba(255,255,255,0.15)",
    cursor: "pointer",
    background: "rgba(255,255,255,0.08)",
    color: "white",
  };

  if (variant === "primary") {
    return { ...base, background: "rgba(0, 200, 140, 0.18)", border: "1px solid rgba(0,200,140,0.35)" };
  }
  if (variant === "danger") {
    return { ...base, background: "rgba(255, 80, 80, 0.16)", border: "1px solid rgba(255,80,80,0.35)" };
  }
  return base;
}

ExpertAnalysisModal.propTypes = {
  project: PropTypes.object,
  onClose: PropTypes.func,
  onRefresh: PropTypes.func,
  onUpdateProject: PropTypes.func,
  onSaveSuccess: PropTypes.func,
};
