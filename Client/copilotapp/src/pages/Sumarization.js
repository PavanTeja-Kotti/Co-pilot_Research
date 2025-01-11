import React, { useState } from "react";
import { List, Card, Typography, Tag, Spin, message } from "antd";
import axios from "axios";

const { Title, Text } = Typography;

const mockData = [
  {
    id: 1,
    title: "Exploring AI in Healthcare",
    abstract: "This paper explores the applications of AI in modern healthcare systems.",
    authors: ["John Doe", "Jane Smith"],
    source: "ScienceDirect",
    url: "https://sciencedirect.com/ai-healthcare",
    pdf_url: "https://sciencedirect.com/pdf/ai-healthcare.pdf",
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
    pdf_url: "https://ieee.org/pdf/quantum-computing.pdf",
    categories: ["Quantum Computing", "Technology"],
    publication_date: "2024-02-01",
    created_at: "2024-02-02T15:00:00Z",
  },
];

const Sumarization = () => {
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [loadingCardId, setLoadingCardId] = useState(null);
  const [summaries, setSummaries] = useState({});

  const handleTitleClick = async (id, pdfUrl) => {
    setLoadingCardId(id);
    setExpandedCardId(null); // Close any previously expanded card

    // try {
    //   const response = await axios.post(
    //     "http://your-backend-url/summarization/",
    //     { pdf_url: pdfUrl },
    //     {
    //       headers: {
    //         Authorization: `Bearer ${yourAccessToken}`, // Replace with your JWT token
    //       },
    //     }
    //   );

    //   setSummaries((prevSummaries) => ({
    //     ...prevSummaries,
    //     [id]: response.data.summary,
    //   }));
    //   setExpandedCardId(id); // Expand the card
    //   message.success("Summary fetched successfully!");
    // } catch (error) {
    //   message.error("Failed to fetch summary. Please try again.");
    // } finally {
    //   setLoadingCardId(null);
    // }
  };

  return (
    <div style={{ padding: "20px" }}>
      <Title level={2}>Research Papers</Title>

      <List
        grid={{ gutter: 16, column: 1 }}
        dataSource={mockData}
        renderItem={(paper) => (
          <List.Item>
            <Card
              hoverable
              style={{ width: "100%", transition: "all 0.3s ease" }}
              bodyStyle={{ padding: "16px" }}
              actions={[
                loadingCardId === paper.id ? (
                  <Spin size="small" />
                ) : (
                  <span
                    onClick={() => handleTitleClick(paper.id, paper.pdf_url)}
                    style={{ cursor: "pointer", color: "#1890ff" }}
                  >
                    {expandedCardId === paper.id ? "Hide Summary" : "Show Summary"}
                  </span>
                ),
              ]}
            >
              <Title level={4} style={{ marginBottom: "8px" }}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleTitleClick(paper.id, paper.pdf_url);
                  }}
                  style={{ textDecoration: "none", color: "#007BFF" }}
                >
                  {paper.title}
                </a>
              </Title>
              <Text type="secondary" style={{ display: "block", marginBottom: "8px" }}>
                {paper.abstract}
              </Text>
              <div style={{ marginBottom: "8px" }}>
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
              {expandedCardId === paper.id && summaries[paper.id] && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "16px",
                    border: "1px solid #e6f7ff",
                    borderRadius: "8px",
                    background: "#f6ffed",
                    transition: "max-height 0.3s ease",
                  }}
                >
                  <Title level={5} style={{ marginBottom: "8px" }}>
                    Summary
                  </Title>
                  <Text>{summaries[paper.id]}</Text>
                </div>
              )}
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
};

export default Sumarization;
