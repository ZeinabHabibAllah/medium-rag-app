"use client";

import { useState } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setResponse({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <div style={{
      maxWidth: 800,
      margin: "40px auto",
      padding: "20px",
      fontFamily: "system-ui, sans-serif",
      lineHeight: 1.6,
    }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Medium Article RAG Assistant</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Ask questions about Medium articles. Answers come strictly from the dataset.
      </p>

      <div style={{
        background: "#f5f5f5",
        padding: "12px 16px",
        borderRadius: 8,
        marginBottom: 24,
        fontSize: 14,
      }}>
        <strong>RAG Config:</strong> chunk_size=512, overlap_ratio=0.2, top_k=7
        <br />
        <strong>Endpoints:</strong> <code>POST /api/prompt</code>, <code>GET /api/stats</code>
      </div>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Type your question here..."
        rows={4}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 16,
          border: "1px solid #ccc",
          borderRadius: 8,
          fontFamily: "inherit",
          marginBottom: 12,
        }}
      />
      <button
        onClick={askQuestion}
        disabled={loading || !question.trim()}
        style={{
          background: "#000",
          color: "#fff",
          padding: "10px 24px",
          fontSize: 16,
          border: "none",
          borderRadius: 8,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Asking..." : "Ask"}
      </button>

      {response && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Response</h2>
          <div style={{
            background: "#f9f9f9",
            padding: 16,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            marginBottom: 16,
          }}>
            {response.response || response.error}
          </div>

          {response.context && (
            <details>
              <summary style={{ cursor: "pointer", marginBottom: 8 }}>
                Retrieved context ({response.context.length} chunks)
              </summary>
              <div style={{
                background: "#f9f9f9",
                padding: 16,
                borderRadius: 8,
                fontSize: 13,
                maxHeight: 400,
                overflow: "auto",
              }}>
                {response.context.map((c: any, i: number) => (
                  <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #ddd" }}>
                    <strong>{i + 1}. {c.title}</strong> (score: {c.score?.toFixed(4)})
                    <br />
                    <span style={{ color: "#666" }}>Article ID: {c.article_id}</span>
                    <p style={{ marginTop: 6 }}>{c.chunk?.substring(0, 300)}...</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}