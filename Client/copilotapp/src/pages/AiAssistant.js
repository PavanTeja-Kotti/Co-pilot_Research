import { Col, Row, Button, Modal, List, theme, Input, Typography, Space, Tooltip, Collapse, Divider } from "antd";
import React, { useState, useRef } from "react";
import { UploadOutlined, DeleteOutlined, EditOutlined, SaveOutlined, PlusOutlined, BoldOutlined, ItalicOutlined, UnderlineOutlined, OrderedListOutlined, UnorderedListOutlined } from "@ant-design/icons";
import AIChat from "./Chat/AIChat";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
// import Underline from "./extensions/Underline"; 


const { useToken } = theme;
const { TextArea } = Input;

const PDFWindow = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [files, setFiles] = useState([]);

    // Open and close the modal
    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    // Handle file upload
    const handleFileUpload = (event) => {
        const uploadedFiles = Array.from(event.target.files);
        setFiles((prevFiles) => [...prevFiles, ...uploadedFiles]);
    };

    // Handle file removal
    const handleRemoveFile = (fileToRemove) => {
        setFiles((prevFiles) =>
            prevFiles.filter((file) => file.name !== fileToRemove.name)
        );
    };

    const listItemStyle = {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px",
        marginBottom: "8px", // Spacing between items
        background: "#333",
        borderRadius: "5px",
        border: "1px solid #444",
        transition: "border-color 0.3s, background-color 0.3s",
        cursor: "pointer",
    };

    const listItemHoverStyle = {
        borderColor: "linear-gradient(to right, #444, #666)",
        background: "#3a3a3a",
    };

    const deleteIconStyle = {
        display: "none",
        color: "red",
        fontSize: "16px",
        cursor: "pointer",
    };

    return (
        <div style={{ padding: "10px", height: "100%" }}>

            <Button
                type="primary"
                onClick={handleOpenModal}
                icon={<UploadOutlined />}
                style={{ marginBottom: "10px", width: '100%' }}
            >
                Add Source
            </Button>

            <List
                dataSource={files}
                renderItem={(file) => (
                    <List.Item
                        style={listItemStyle}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#666";
                            e.currentTarget.style.backgroundColor = "#3a3a3a";
                            const deleteIcon = e.currentTarget.querySelector(".delete-icon");
                            if (deleteIcon) deleteIcon.style.display = "inline-block";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "#444";
                            e.currentTarget.style.backgroundColor = "#333";
                            const deleteIcon = e.currentTarget.querySelector(".delete-icon");
                            if (deleteIcon) deleteIcon.style.display = "none";
                        }}
                    >
                        <span>{file.name}</span>
                        <DeleteOutlined
                            className="delete-icon"
                            onClick={() => handleRemoveFile(file)}
                            style={deleteIconStyle}
                        />
                    </List.Item>
                )} />

            <Modal
                title="Upload Files"
                open={isModalOpen}
                onCancel={handleCloseModal}
                footer={null}>
                <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    style={{ marginBottom: "10px" }}
                />
                <Button type="primary" onClick={handleCloseModal}>
                    Done
                </Button>
            </Modal>
        </div>
    );
};

const NoteTaking = () => {
    const [savedNote, setSavedNote] = useState("");
  
    const editor = useEditor({
      extensions: [
        StarterKit,
        Bold,
        Italic,
        // Underline, // Custom underline extension
        BulletList,
        OrderedList,
        ListItem,
      ],
      content: "",
      editorProps: {
        attributes: {
          class:
            "editor-content focus:outline-none bg-gray-900 text-white p-4 rounded-md",
          style: "min-height: 200px;",
        },
      },
    });
  
    const handleSave = () => {
      if (editor) {
        setSavedNote(editor.getHTML());
      }
    };
  
    if (!editor) {
      return null;
    }
  
    return (
      <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
        <Typography.Title level={4} style={{ color: "#fff" }}>
          New Note
        </Typography.Title>
  
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "10px",
            backgroundColor: "#1e1e1e",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          <Button
            icon={<BoldOutlined />}
            onClick={() => editor.chain().focus().toggleBold().run()}
            type={editor.isActive("bold") ? "primary" : "default"}
          >
            Bold
          </Button>
          <Button
            icon={<ItalicOutlined />}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            type={editor.isActive("italic") ? "primary" : "default"}
          >
            Italic
          </Button>
          <Button
            icon={<UnderlineOutlined />}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            type={editor.isActive("underline") ? "primary" : "default"}
          >
            Underline
          </Button>
          <Button
            icon={<UnorderedListOutlined />}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            type={editor.isActive("bulletList") ? "primary" : "default"}
          >
            Bullet List
          </Button>
          <Button
            icon={<OrderedListOutlined />}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            type={editor.isActive("orderedList") ? "primary" : "default"}
          >
            Ordered List
          </Button>
        </div>
  
        {/* Editor */}
        <div
          style={{
            border: "1px solid #555",
            borderRadius: "8px",
            background: "#1e1e1e",
            padding: "10px",
          }}
        >
          <EditorContent editor={editor} />
        </div>
  
        {/* Save Button */}
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          style={{ marginTop: "20px" }}
        >
          Save
        </Button>
  
        {/* Saved Note */}
        <Typography.Title level={5} style={{ color: "#fff", marginTop: "20px" }}>
          Saved Note
        </Typography.Title>
        <div
          dangerouslySetInnerHTML={{ __html: savedNote }}
          style={{
            padding: "10px",
            border: "1px solid #555",
            borderRadius: "8px",
            background: "#1e1e1e",
            color: "#fff",
          }}
        ></div>
      </div>
    );
  };

const AiAssistant = () => {

    const { token } = useToken();

    const containerStyle = {
        height: "100vh",
        background: "#1f1f1f",
        padding: "10px",
    };

    const boxStyle = {
        height: "100%",
        background: "#292929",
        border: "1px solid #303030",
        borderRadius: "6px",
        color: "#e6e6e6",
    };

    const headingStyle = {
        margin: "10px",
        borderBottom: "1px solid #37383b",
        paddingBottom: "5px",
        color: "white",
    };

    return (
        <div style={containerStyle}>
            <Row gutter={16} style={{ height: "100%" }}>
                <Col span={6}>
                    <div style={boxStyle}>
                        <h3 style={headingStyle}>Sources</h3>
                        <PDFWindow />
                    </div>
                </Col>
                <Col span={10}>
                    <div style={boxStyle}>
                        <h3 style={headingStyle}>Chat</h3>
                        <div style={{
                            flex: 1,
                            background: token.colorBgContainer,
                            borderRadius: token.borderRadiusLG,
                            // padding: 16
                        }}>
                            <AIChat />
                        </div>
                    </div>
                </Col>
                <Col span={8}>
                    <div style={boxStyle}>
                        <h3 style={headingStyle}>Notes</h3>
                        <NoteTaking />
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default AiAssistant;
