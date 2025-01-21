import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Space,
  Radio,
  Typography,
  Statistic,
  Tag,
} from "antd";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import {
  FileTextOutlined,
  TeamOutlined,
  BookOutlined,
} from "@ant-design/icons";
import DrillDownDonut from "./Chat/drilldowm";

ChartJS.register(ArcElement, Tooltip, Legend);

const { Title, Text } = Typography;

// Mock Data
const mockData = [
  {
    id: "6ac14eb0-fdd5-464f-b467-cb304aefcfa9",
    title:
      "Iterated Variable Neighborhood Search for the resource constrained multi-mode multi-project scheduling problem",
    abstract:
      "The resource constrained multi-mode multi-project scheduling problem (RCMMMPSP) ...",
    authors: ["Martin Josef Geiger"],
    source: "abcd",
    url: "http://arxiv.org/abs/1310.0602v1",
    pdf_url: "http://arxiv.org/pdf/1310.0602v1",
    categories: ["Artificial Intelligence"],
    publication_date: "2025-01-10",
    created_at: "2025-01-16T09:33:48.346389Z",
  },
  {
    id: "ec42c731-4ba5-4dcc-bd28-b7239a2b3bfc",
    title:
      "Proceedings of the Twenty-Ninth Conference on Uncertainty in Artificial Intelligence (2013)",
    abstract:
      "This is the Proceedings of the Twenty-Ninth Conference on Uncertainty in ...",
    authors: ["Ann Nicholson", "Padhriac Smyth"],
    source: "direct",
    url: "http://arxiv.org/abs/1309.7971v2",
    pdf_url: "http://arxiv.org/pdf/1309.7971v2",
    categories: ["Intelligence"],
    publication_date: "2025-01-10",
    created_at: "2025-01-16T09:33:48.279146Z",
  },
];

// Light Color Palette
const LIGHT_COLORS = [
  'rgb(255, 99, 132)',
  'rgb(54, 162, 235)',
  'rgb(255, 205, 86)',
  'rgba(75, 192, 192, 0.2)',
  'rgba(54, 162, 235, 0.2)',
  'rgba(153, 102, 255, 0.2)', // Light Purple
];

const LIGHT_HOVER_COLORS = [
  "#63B8E3", // Hover Blue
  "#7DCAED", // Softer Blue Hover
  "#FFA4A4", // Hover Light Red
  "#FFC48D", // Hover Orange
  "#9FDCB0", // Hover Light Green
  "#D6BEE8", // Hover Purple
];

const ResearchDashboard = () => {
  const [mainData, setMainData] = useState([]);
  const [analysisMode, setAnalysisMode] = useState("categories");

  useEffect(() => {
    processMainData(analysisMode);
  }, [analysisMode]);

  const processMainData = (mode) => {
    const categorizedData = {};

    mockData.forEach((item) => {
      const field = item[mode];
      if (Array.isArray(field)) {
        field.forEach((value) => {
          categorizedData[value] = (categorizedData[value] || 0) + 1;
        });
      } else if (field) {
        categorizedData[field] = (categorizedData[field] || 0) + 1;
      }
    });

    const chartData = Object.entries(categorizedData).map(([name, value]) => ({
      name,
      value,
    }));

    setMainData(chartData);
  };

  const renderPieChart = () => {
    const labels = mainData.map((item) => item.name);
    const dataValues = mainData.map((item) => item.value);

    const pieData = {
      labels,
      datasets: [
        {
          label: "Distribution",
          data: dataValues,
          backgroundColor: LIGHT_COLORS,
          hoverBackgroundColor: LIGHT_HOVER_COLORS,
        },
      ],
    };

    return (
      <Pie
        data={pieData}
        options={{
          plugins: {
            legend: {
              position: "bottom",
            },
            tooltip: {
              callbacks: {
                label: (context) => `${context.raw} items`,
              },
            },
          },
          responsive: true,
        }}
      />
    );
  };

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Header */}
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Research Dashboard</Title>
          </Col>
          <Col>
            <Radio.Group
              value={analysisMode}
              onChange={(e) => setAnalysisMode(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="categories">Categories</Radio.Button>
              <Radio.Button value="authors">Authors</Radio.Button>
            </Radio.Group>
          </Col>
        </Row>

        {/* Main Content */}
        <Row gutter={[16, 16]}>
          {/* Pie Chart */}
          <Col span={12}>
            <Card title="Distribution Analysis">
              <div style={{ height: 400 }}>{renderPieChart()}</div>
            </Card>
          </Col>

          {/* Statistics */}
          <Col span={12}>
            <Card title="Statistics">
              <Space direction="vertical" size="middle">
                <Statistic
                  title={<Text style={{ color: "#63B8E3" }}>Total Papers</Text>}
                  value={mockData.length}
                  prefix={<FileTextOutlined style={{ color: "#63B8E3" }} />}
                />
                <Statistic
                  title={
                    <Text style={{ color: "#9FDCB0" }}>Unique Categories</Text>
                  }
                  value={new Set(
                    mockData.flatMap((item) => item.categories)
                  ).size}
                  prefix={<Tag color="#C6EBC9">C</Tag>}
                />
                <Statistic
                  title={<Text style={{ color: "#FFC48D" }}>Unique Authors</Text>}
                  value={new Set(
                    mockData.flatMap((item) => item.authors)
                  ).size}
                  prefix={<Tag color="#FFDEAD">A</Tag>}
                />
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
      <DrillDownDonut />
    </div>
  );
};

export default ResearchDashboard;
