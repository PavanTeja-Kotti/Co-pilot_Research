import { Col, Row, Button, Modal, List, theme, Input, Typography, Space, Tooltip, Collapse } from "antd";
import React, { useState } from "react";
import { UploadOutlined, DeleteOutlined, EditOutlined, SaveOutlined, PlusOutlined, BoldOutlined, ItalicOutlined, UnderlineOutlined, OrderedListOutlined, UnorderedListOutlined } from "@ant-design/icons";
import AIChat from "./Chat/AIChat";

const { useToken } = theme;
const { Panel } = Collapse;
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
    const [notes, setNotes] = useState([]);
    const [currentNote, setCurrentNote] = useState(null);
    const [editorContent, setEditorContent] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newNoteTitle, setNewNoteTitle] = useState("");

    // Add a new note
    const handleAddNote = () => {
        if (newNoteTitle.trim()) {
            const newNote = { title: newNoteTitle, content: "" };
            setNotes([...notes, newNote]);
            setNewNoteTitle("");
            setIsModalOpen(false);
        }
    };

    // Select a note to edit
    const handleSelectNote = (index) => {
        setCurrentNote(index);
        setEditorContent(notes[index].content);
    };

    // Save the current note's content
    const handleSaveContent = () => {
        if (currentNote !== null) {
            const updatedNotes = [...notes];
            updatedNotes[currentNote].content = editorContent;
            setNotes(updatedNotes);
        }
    };

    // Text formatting handlers
    const applyFormatting = (tag) => {
        const selection = window.getSelection();
        const selectedText = selection.toString();
        if (!selectedText) return;

        const formattedText = {
            bold: `**${selectedText}**`,
            italic: `_${selectedText}_`,
            underline: `<u>${selectedText}</u>`,
            heading: `### ${selectedText}`,
        }[tag];

        const updatedContent = editorContent.replace(selectedText, formattedText);
        setEditorContent(updatedContent);
    };

    return (
        <div style={{ padding: "10px", height: "100%" }}>
            <Typography.Title level={4} style={{ color: "white", marginBottom: "10px" }}>
                Notes
            </Typography.Title>

            {/* Add Note Button */}
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalOpen(true)}
                style={{ marginBottom: "10px" }}
            >
                + Add Note
            </Button>

            {/* Notes List Dropdown */}
            <Collapse accordion>
                {notes.map((note, index) => (
                    <Panel
                        header={note.title}
                        key={index}
                        onClick={() => handleSelectNote(index)}
                    >
                        <Typography.Text>{note.content || "No content yet."}</Typography.Text>
                    </Panel>
                ))}
            </Collapse>

            {/* Rich Text Editor */}
            <div style={{ marginTop: "20px", background: "#333", padding: "10px", borderRadius: "5px" }}>
                <Typography.Text style={{ color: "white", display: "block", marginBottom: "10px" }}>
                    Editing: {currentNote !== null ? notes[currentNote].title : "Select a note to edit"}
                </Typography.Text>

                {/* Formatting Buttons */}
                <Space style={{ marginBottom: "10px" }}>
                    <Tooltip title="Bold">
                        <Button
                            shape="circle"
                            icon={<BoldOutlined />}
                            onClick={() => applyFormatting("bold")}
                        />
                    </Tooltip>
                    <Tooltip title="Italic">
                        <Button
                            shape="circle"
                            icon={<ItalicOutlined />}
                            onClick={() => applyFormatting("italic")}
                        />
                    </Tooltip>
                    <Tooltip title="Underline">
                        <Button
                            shape="circle"
                            icon={<UnderlineOutlined />}
                            onClick={() => applyFormatting("underline")}
                        />
                    </Tooltip>
                    <Tooltip title="Heading">
                        <Button
                            shape="circle"
                            icon={<OrderedListOutlined />}
                            onClick={() => applyFormatting("heading")}
                        />
                    </Tooltip>
                </Space>

                {/* Text Area */}
                <TextArea
                    rows={8}
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    placeholder="Type your note here..."
                    style={{
                        background: "#444",
                        color: "white",
                        borderRadius: "5px",
                        border: "1px solid #555",
                    }}
                />

                <Button
                    type="primary"
                    onClick={handleSaveContent}
                    style={{ marginTop: "10px" }}
                >
                    Save Note
                </Button>
            </div>

            {/* Add Note Modal */}
            {isModalOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "#333",
                        padding: "20px",
                        borderRadius: "10px",
                        zIndex: 1000,
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                    }}
                >
                    <Typography.Title level={5} style={{ color: "white" }}>
                        Add Note
                    </Typography.Title>
                    <Input
                        placeholder="Enter note title"
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        style={{ marginBottom: "10px" }}
                    />
                    <Button type="primary" onClick={handleAddNote}>
                        Add
                    </Button>
                    <Button
                        onClick={() => setIsModalOpen(false)}
                        style={{ marginLeft: "10px" }}
                    >
                        Cancel
                    </Button>
                </div>
            )}
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
