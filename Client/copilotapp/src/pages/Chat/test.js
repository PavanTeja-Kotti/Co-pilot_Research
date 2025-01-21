import React, { useEffect, useState } from "react";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from "chart.js";
import api from "../utils/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const GraphsDashboard = ({ papersData }) => {
  // Data Preparation
  const publicationSources = papersData.reduce((acc, paper) => {
    acc[paper.source] = (acc[paper.source] || 0) + 1;
    return acc;
  }, {});

  const categoriesCount = papersData.reduce((acc, paper) => {
    paper.categories.forEach((category) => {
      acc[category] = (acc[category] || 0) + 1;
    });
    return acc;
  }, {});

  const authorsPerPaper = papersData.map((paper) => paper.authors.length);

  const publicationDates = papersData.reduce((acc, paper) => {
    const date = new Date(paper.publication_date).getFullYear();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  // Chart Configurations

  const barData = {
    labels: Object.keys(publicationSources),
    datasets: [
      {
        label: "Publications by Source",
        data: Object.values(publicationSources),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const doughnutData = {
    labels: Object.keys(categoriesCount),
    datasets: [
      {
        label: "Categories Distribution",
        data: Object.values(categoriesCount),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
        ],
        hoverOffset: 4,
      },
    ],
  };

  const lineData = {
    labels: Object.keys(publicationDates),
    datasets: [
      {
        label: "Publications Over the Years",
        data: Object.values(publicationDates),
        fill: false,
        borderColor: "rgba(255, 99, 132, 1)",
        tension: 0.1,
      },
    ],
  };

  const pieData = {
    labels: Object.keys(categoriesCount),
    datasets: [
      {
        data: Object.values(categoriesCount),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
        ],
        hoverOffset: 4,
      },
    ],
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      {/* Bar Chart */}
      <div>
        <h3>Publications by Source</h3>
        <Bar data={barData} />
      </div>

      {/* Doughnut Chart */}
      <div>
        <h3>Categories Distribution</h3>
        <Doughnut data={doughnutData} />
      </div>

      {/* Line Chart */}
      <div>
        <h3>Publications Over the Years</h3>
        <Line data={lineData} />
      </div>

      {/* Pie Chart */}
      <div>
        <h3>Categories Proportion</h3>
        <Pie data={pieData} />
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [papersData, setPapers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPapers = async () => {
      setIsLoading(true);
      try {
        const response = await api.scraping().getPapers(0, 5000);
        if (response.success) {
          setPapers(response.data.results || []);
        }
      } catch (error) {
        console.error("Error fetching papers:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPapers();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <GraphsDashboard papersData={papersData} />;
};

export default Dashboard;
