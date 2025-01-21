import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";

// Register all required components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const Homepage = () => {
  const [drilldownData, setDrilldownData] = useState(null);

  const papersData = [
    {
      id: "a1888554-ed25-4b7f-997f-d0fcbd1d37a5",
      title: "Learning Chordal Markov Networks by Constraint Satisfaction",
      abstract: "We investigate the problem of learning the structure of a Markov network ...",
      authors: [
        "Jukka Corander",
        "Tomi Janhunen",
        "Jussi Rintanen",
        "Henrik Nyman",
        "Johan Pensar",
      ],
      source: "Science direct",
      url: "http://arxiv.org/abs/1310.0927v1",
      pdf_url: "http://arxiv.org/pdf/1310.0927v1",
      categories: ["Artificial Intelligence"],
      publication_date: "2025-01-10",
      created_at: "2025-01-16T09:33:48.421124Z",
      is_bookmarked: false,
      bookmark_id: null,
      active_bookmarks_count: 0,
      bookmarks: [],
    },
  ];

  const donutData = {
    labels: ["Artificial Intelligence"],
    datasets: [
      {
        data: [1], // Number of papers per category
        backgroundColor: ["#FF6384"],
        hoverBackgroundColor: ["#FF6384"],
      },
    ],
  };

  const drilldownDataset = {
    labels: papersData.map((paper) => paper.title),
    datasets: [
      {
        label: "Authors per Paper",
        data: papersData.map((paper) => paper.authors.length),
        backgroundColor: "#36A2EB",
      },
    ],
  };

  const handleDrilldown = () => {
    setDrilldownData(drilldownDataset);
  };

  const barData = {
    labels: papersData.map((paper) => paper.title),
    datasets: [
      {
        label: "Authors per Paper",
        data: papersData.map((paper) => paper.authors.length),
        backgroundColor: "#36A2EB",
      },
    ],
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center" }}>Research Papers Dashboard</h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          justifyContent: "center",
          marginTop: "20px",
        }}
      >
        {/* Donut Chart */}
        <div style={{ width: "300px", height: "300px" }}>
          <h3 style={{ textAlign: "center" }}>Donut Chart: Categories</h3>
          <Pie
            data={donutData}
            options={{
              onClick: handleDrilldown, // Handle drill-down on click
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      return `Category: ${context.label}, Papers: ${context.raw}`;
                    },
                  },
                },
              },
            }}
          />
        </div>

        {/* Drilldown Chart */}
        {drilldownData && (
          <div style={{ width: "300px", height: "300px" }}>
            <h3 style={{ textAlign: "center" }}>Drilldown: Authors per Paper</h3>
            <Bar data={drilldownData} options={{ responsive: true }} />
          </div>
        )}

        {/* Bar Chart */}
        <div style={{ width: "300px", height: "300px" }}>
          <h3 style={{ textAlign: "center" }}>Bar Chart: Authors per Paper</h3>
          <Bar data={barData} options={{ responsive: true }} />
        </div>

        {/* Line Chart */}
        <div style={{ width: "300px", height: "300px" }}>
          <h3 style={{ textAlign: "center" }}>Line Chart: Publication Dates</h3>
          <Line
            data={{
              labels: papersData.map((paper) => paper.publication_date),
              datasets: [
                {
                  label: "Number of Papers",
                  data: papersData.map(() => 1), // 1 paper per date
                  fill: false,
                  borderColor: "#FFCE56",
                },
              ],
            }}
            options={{ responsive: true }}
          />
        </div>
      </div>
    </div>
  );
};

export default Homepage;
