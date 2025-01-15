import { pdfjs } from "react-pdf";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

// Use the correct version of the worker file
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs`;

const PdfViewer = ({ pdfUrl }) => {
  console.log(pdfUrl)
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  return (
    <div
      style={{
        height: "500px",
        backgroundColor: "rgb(20, 20, 20)", // Set the background to dark
        color: "white", // Ensure text appears white for visibility
        borderRadius: "8px", // Optional: Add rounded corners
      }}
    >
      <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
        <Viewer
          fileUrl={pdfUrl}
          plugins={[defaultLayoutPluginInstance]}
          theme="dark" // Apply the dark theme (specific to the library)
        />
      </Worker>
    </div>
  );
};

export default PdfViewer;

// THIS IS JUST TO DISPLAY THE PDF COMPONENT

// import { pdfjs } from "react-pdf";
// import { Viewer, Worker } from "@react-pdf-viewer/core";
// import "@react-pdf-viewer/core/lib/styles/index.css";

// // Use the correct version of the worker file
// pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs`;

// const PdfViewer = ({ pdfUrl }) => {
//   return (
//     <div
//       style={{
//         height: "500px",
//         backgroundColor: "rgb(20, 20, 20)", // Dark background
//         color: "white",
//         overflow: "hidden", // Prevent scrolling outside the container
//         borderRadius: "8px",
//       }}
//     >
//       <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
//         <Viewer fileUrl={pdfUrl} />
//       </Worker>
//     </div>
//   );
// };

// export default PdfViewer;

