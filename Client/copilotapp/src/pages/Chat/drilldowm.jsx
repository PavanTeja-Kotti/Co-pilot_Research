import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Space,
  Typography,
} from "antd";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const { Title } = Typography;

// Mock Data for Drill-Down Donut
const mockData = [
  {
    name: "Artificial Intelligence",
    value: 5,
    subcategories: [
      { name: "Deep Learning", value: 2 },
      { name: "Machine Learning", value: 3 },
    ],
  },
  {
    name: "Intelligence",
    value: 3,
    subcategories: [
      { name: "Probabilistic Models", value: 1 },
      { name: "Decision Trees", value: 2 },
    ],
  },
];

const DrillDownDonut = () => {
  const [primaryData, setPrimaryData] = useState([]);
  const [secondaryData, setSecondaryData] = useState(null);

  // Color palette for charts
  const COLORS = ["#89CFF0", "#A1DFFB", "#FFCCCB", "#FFDEAD", "#C6EBC9"];
  const HOVER_COLORS = ["#63B8E3", "#7DCAED", "#FFA4A4", "#FFC48D", "#9FDCB0"];

  useEffect(() => {
    // Process and load the primary chart data
    const formattedData = mockData.map((item, index) => ({
      name: item.name,
      value: item.value,
      color: COLORS[index % COLORS.length],
      hoverColor: HOVER_COLORS[index % HOVER_COLORS.length],
    }));
    setPrimaryData(formattedData);
  }, []);

  const handleDrillDown = (index) => {
    const selectedCategory = mockData[index];
    if (selectedCategory && selectedCategory.subcategories) {
      const subData = selectedCategory.subcategories.map((item, subIndex) => ({
        name: item.name,
        value: item.value,
        color: COLORS[subIndex % COLORS.length],
        hoverColor: HOVER_COLORS[subIndex % HOVER_COLORS.length],
      }));
      setSecondaryData({ name: selectedCategory.name, data: subData });
    }
  };

  const renderDonutChart = (data, onClickHandler = null) => {
    const labels = data.map((item) => item.name);
    const values = data.map((item) => item.value);
    const backgroundColors = data.map((item) => item.color);
    const hoverBackgroundColors = data.map((item) => item.hoverColor);

    return (
      <Pie
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: backgroundColors,
              hoverBackgroundColor: hoverBackgroundColors,
            },
          ],
        }}
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
          onClick: (_, elements) => {
            if (elements.length > 0 && onClickHandler) {
              const index = elements[0].index;
              onClickHandler(index);
            }
          },
          responsive: true,
        }}
      />
    );
  };

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Row>
          <Col span={24}>
            <Title level={3}>Drill-Down Donut Chart</Title>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* Primary Donut Chart */}
          {!secondaryData && (
            <Col span={24}>
              <Card title="Primary Donut Chart">
                <div style={{ height: 400 }}>
                  {renderDonutChart(primaryData, handleDrillDown)}
                </div>
              </Card>
            </Col>
          )}

          {/* Secondary Donut Chart */}
          {secondaryData && (
            <Col span={24}>
              <Card
                title={`Drill-Down Donut Chart: ${secondaryData.name}`}
                extra={
                  <a onClick={() => setSecondaryData(null)}>Back to Main</a>
                }
              >
                <div style={{ height: 400 }}>
                  {renderDonutChart(secondaryData.data)}
                </div>
              </Card>
            </Col>
          )}
        </Row>
      </Space>
    </div>
  );
};

export default DrillDownDonut;
