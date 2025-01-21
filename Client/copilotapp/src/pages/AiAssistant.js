import React, { useState } from "react";
import { Row, Col, Upload, Input } from "antd";
import { InboxOutlined, FileAddOutlined } from "@ant-design/icons";

const { Dragger } = Upload;
const { TextArea } = Input;

const AiAssistant = () => {
  const [notes, setNotes] = useState("");

  const draggerProps = {
    name: "file",
    multiple: true,
    action: "/upload.do", // Replace with your upload endpoint
    onChange(info) {
      const { status } = info.file;
      if (status === "done") {
        console.log(`${info.file.name} file uploaded successfully.`);
      } else if (status === "error") {
        console.log(`${info.file.name} file upload failed.`);
      }
    },
  };

  return (
    <div
      style={{
        padding: "24px",
        background: "#141414",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <Row gutter={[16, 16]} style={{ height: "100%" }}>
          {/* Section 1: Drag and Drop File Upload */}
          <Col
            span={8}
            style={{
              background: "#1f1f1f",
              padding: "16px",
              borderRadius: "8px",
              height: "100%",
            }}
          >
            <h3 style={{ color: "#fff", marginBottom: "16px" }}>Upload Files</h3>
            <Dragger {...draggerProps} style={{ height: "calc(100% - 40px)" }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                Click or drag files to this area to upload
              </p>
              <p className="ant-upload-hint">
                Support for single or bulk uploads.
              </p>
            </Dragger>
          </Col>

          {/* Section 2: Empty Placeholder with Background Icon */}
          <Col
            span={8}
            style={{
              background: "#333333",
              padding: "16px",
              borderRadius: "8px",
              textAlign: "center",
              height: "100%",
            }}
          >
            <FileAddOutlined
              style={{ fontSize: "48px", color: "#aaa", marginTop: "20%" }}
            />
            <p style={{ color: "#ccc", marginTop: "16px" }}>
              Placeholder for future content
            </p>
          </Col>

          {/* Section 3: Note-taking Area */}
          <Col
            span={8}
            style={{
              background: "#1f1f1f",
              padding: "16px",
              borderRadius: "8px",
              height: "100%",
            }}
          >
            <h3 style={{ color: "#fff", marginBottom: "16px" }}>Take Notes</h3>
            <TextArea
              placeholder="Write your notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ height: "calc(100% - 40px)", resize: "none" }}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default AiAssistant;
