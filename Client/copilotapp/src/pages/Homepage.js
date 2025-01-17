import React from "react";
import {
  Bar,
  Line,
  Pie
} from "react-chartjs-2";
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
  ArcElement
} from "chart.js";
import { papersData } from "./Chat/data";

// Make sure to register all necessary Chart.js components:
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

// Import your papers data
 // or wherever you stored the JSON data

const Homepage = () => {
  // 1) Bar Chart: Number of Authors per Paper
  const barData = {
    labels: papersData.map((p) => p.title),
    datasets: [
      {
        label: "Number of Authors",
        data: papersData.map((p) => p.authors.length),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1
      }
    ]
  };

  const barOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Number of Authors per Paper"
      },
      legend: {
        position: "top"
      }
    },
    scales: {
      x: {
        ticks: {
          // If titles are long, you can rotate them
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };

  // 2) Line Chart: Abstract Length for Each Paper
  //    (Just a fun metric: how long is the abstract string?)
  const lineData = {
    labels: papersData.map((p) => p.title),
    datasets: [
      {
        label: "Abstract Length (characters)",
        data: papersData.map((p) => p.abstract.length),
        fill: false,
        borderColor: "rgba(255, 99, 132, 1)",
        tension: 0.1
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Abstract Length for Each Paper"
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // 3) Pie Chart: Bookmarked vs. Not Bookmarked
  //    Count how many are bookmarked vs not
  const bookmarkedCount = papersData.filter((p) => p.is_bookmarked).length;
  const notBookmarkedCount = papersData.length - bookmarkedCount;

  const pieData = {
    labels: ["Bookmarked", "Not Bookmarked"],
    datasets: [
      {
        label: "Papers",
        data: [bookmarkedCount, notBookmarkedCount],
        backgroundColor: [
          "rgba(54, 162, 235, 0.6)", // Bookmarked
          "rgba(255, 159, 64, 0.6)"  // Not Bookmarked
        ],
        borderWidth: 1
      }
    ]
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Bookmarked vs. Not Bookmarked"
      }
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <h1>Homepage</h1>

      <div style={{ marginBottom: "60px" }}>
        <Bar data={barData} options={barOptions} />
      </div>

      <div style={{ marginBottom: "60px" }}>
        <Line data={lineData} options={lineOptions} />
      </div>

      <div style={{ marginBottom: "60px" }}>
        <Pie data={pieData} options={pieOptions} />
      </div>
    </div>
  );
};

export default Homepage;
