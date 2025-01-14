import React, { useState, useEffect } from "react";
import { Card, Typography, Tag } from "antd";
import PdfViewer from "../components/common/PdfViewer";
import ChatWindow from "../components/common/ChatWindow";
import AIChat from "./Chat/AIChat"

const { Title, Text } = Typography;

const mockData = [
  {
    id: 1,
    title: "Exploring AI in Healthcare",
    abstract: "This paper explores the applications of AI in modern healthcare systems.",
    authors: ["John Doe", "Jane Smith"],
    source: "ScienceDirect",
    url: "https://sciencedirect.com/ai-healthcare",
    pdf_url: "https://www.antennahouse.com/hubfs/xsl-fo-sample/pdf/basic-link-1.pdf",
    categories: ["AI", "Healthcare"],
    publication_date: "2024-01-15",
    created_at: "2024-01-16T12:00:00Z",
  },
  {
    id: 2,
    title: "Quantum Computing Revolution",
    abstract: "This paper discusses advancements in quantum computing.",
    authors: ["Alice Johnson", "Bob Lee"],
    source: "IEEE",
    url: "https://ieee.org/quantum-computing",
    pdf_url: "https://www.antennahouse.com/hubfs/xsl-fo-sample/pdf/basic-link-1.pdf",
    categories: ["Quantum Computing", "Technology"],
    publication_date: "2024-02-01",
    created_at: "2024-02-02T15:00:00Z",
  },
];

const Summarization = () => {
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [animateCards, setAnimateCards] = useState(false);

  useEffect(() => {
    setAnimateCards(true);
  }, []);

  const handleCardClick = (id) => {
    setExpandedCardId((prevId) => (prevId === id ? null : id));
  };

  const renderExpandedContent = (paper) => {
    if (expandedCardId !== paper.id) return null;

    return (
      <div
        style={{
          maxHeight: "600px",
          overflow: "hidden",
          transition: "max-height 0.9s ease",
          marginTop: "16px",
          background: "rgb(41, 41, 41)",
          padding: "16px",
          borderRadius: "8px",
          display: "flex",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ flex: 1, paddingRight: "8px", background: "rgb(30, 30, 30)" }}>
          <AIChat uniqueID ={paper.id} />
        </div>
        <div style={{ flex: 1, paddingLeft: "8px", background: "rgb(30, 30, 30)" }}>
          <PdfViewer pdfUrl={paper.pdf_url} />
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "rgb(20, 20, 20)",
        minHeight: "100vh",
      }}
    >
      <Title level={2} style={{ color: "#fff" }}>Research Papers</Title>

      {mockData.map((paper) => (
        <Card
          key={paper.id}
          hoverable
          style={{
            width: "100%",
            marginBottom: "16px",
            cursor: "pointer",
            overflow: "hidden",
            backgroundColor: "rgb(30, 30, 30)",
            color: "#fff",
          }}
          bodyStyle={{ padding: "16px" }}
          onClick={() => handleCardClick(paper.id)}
        >
          <Title level={4} style={{ marginTop: "0.5px", color: "#fff" }}>
            {paper.title}
          </Title>
          <Text type="secondary" style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>
            {paper.abstract}
          </Text>
          <div style={{ marginBottom: "8px", color: "#fff" }}>
            <strong>Authors:</strong> {paper.authors.join(", ")}
          </div>
          <div style={{ marginBottom: "8px" }}>
            <Tag color="blue">{paper.source}</Tag>
            {paper.categories.map((category) => (
              <Tag color="green" key={category}>
                {category}
              </Tag>
            ))}
          </div>
          
          {renderExpandedContent(paper)}
        </Card>
      ))}
    </div>
  );
};

export default Summarization;