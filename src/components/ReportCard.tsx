export default function ReportCard({
report,
approveReport,
rejectReport
}: any) {

return (

<div
  style={{
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    backgroundColor: "#ffffff",
  }}
>

  <div style={{ marginBottom: "10px" }}>
    <strong style={{ fontSize: "16px", textTransform: "capitalize" }}>
      {report.category}
    </strong>
  </div>

  <p style={{ marginBottom: "15px", lineHeight: "1.5" }}>
    {report.description}
  </p>

  <img
    src={report.photoURL}
    alt="Report"
    style={{
      width: "100%",
      maxHeight: "250px",
      objectFit: "cover",
      borderRadius: "8px",
      marginBottom: "15px",
    }}
  />

  {approveReport && rejectReport && (
    <div style={{ display: "flex", gap: "10px" }}>

      <button
        onClick={() => approveReport(report.id)}
        style={{
          backgroundColor: "#28a745",
          color: "#fff",
          border: "none",
          padding: "10px 16px",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Approve
      </button>

      <button
        onClick={() => rejectReport(report.id)}
        style={{
          backgroundColor: "#dc3545",
          color: "#fff",
          border: "none",
          padding: "10px 16px",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Reject
      </button>

    </div>
  )}

</div>

);

}