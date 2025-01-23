import { Col, Row, Button, Modal, List, theme, Input, Typography, message} from "antd";
import React, { useState, useRef, useEffect } from "react";
import { UploadOutlined, DeleteOutlined, EditOutlined, SaveOutlined, PlusOutlined, BoldOutlined, ItalicOutlined, UnderlineOutlined, OrderedListOutlined, UnorderedListOutlined } from "@ant-design/icons";
import AIChat from "./Chat/AIChat";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { Picker } from 'emoji-mart';
// import 'emoji-mart/css/emoji-mart.css';
// import Underline from "./extensions/Underline"; 


const { useToken } = theme;
const { TextArea } = Input;

const EmojiPicker = ({ onSelect }) => {
    return (
        <Picker
            onSelect={(emoji) => onSelect(emoji.native)}
            style={{ position: 'absolute', bottom: '60px', right: '20px' }}
        />
    );
};

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

    // Upload files to the backend
    const uploadFiles = async () => {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        try {
            const response = await fetch('/api/get_list_documents/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming you store your token in local storage
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('File upload failed');
            }

            const data = await response.json();
            message.success('Files uploaded successfully');
            console.log('Uploaded file names:', data.file_names);
            handleCloseModal(); // Close modal after successful upload
            setFiles([]); // Clear files after upload
        } catch (error) {
            message.error(error.message);
        }
    };

    const listItemStyle = {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px",
        marginBottom: "8px",
        background: "#333",
        borderRadius: "5px",
        border: "1px solid #444",
        transition: "border-color 0.3s, background-color 0.3s",
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
                    <List.Item style={listItemStyle}>
                        <span>{file.name}</span>
                        <DeleteOutlined
                            onClick={() => handleRemoveFile(file)}
                            style={{ color: 'red', cursor: 'pointer' }}
                        />
                    </List.Item>
                )}
            />

            <Modal
                title="Upload Files"
                open={isModalOpen}
                onCancel={handleCloseModal}
                footer={[
                    <Button key="submit" type="primary" onClick={uploadFiles}>
                        Upload
                    </Button>,
                    <Button key="back" onClick={handleCloseModal}>
                        Cancel
                    </Button>
                ]}
            >
                <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    style={{ marginBottom: "10px" }}
                />
            </Modal>
        </div>
    );
};
// instead of having title and notes we store like [{title: "", notes: ""}, {title: "", notes: ""}]

const NoteTaking = () => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [notes, setNotes] = useState([]);
    const [currentTitle, setCurrentTitle] = useState("");
    const [currentNoteIndex, setCurrentNoteIndex] = useState(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4, 5, 6] },
            }),
            Bold,
            Italic,
            // Underline,
            BulletList,
            OrderedList,
            ListItem,
        ],
        content: "",
        editorProps: {
            attributes: {
                class: "editor-content focus:outline-none bg-gray-900 text-white p-4 rounded-md",
                style: "min-height: 300px;",
            },
        },
    });

    useEffect(() => {
        const savedNotes = JSON.parse(localStorage.getItem('notes')) || [];
        setNotes(savedNotes);
    }, []);

    useEffect(() => {
        localStorage.setItem('notes', JSON.stringify(notes));
    }, [notes]);

    const handleEmojiSelect = (emojiObject) => {
        editor.chain().focus().insertContent(emojiObject.emoji).run();
        setShowEmojiPicker(false);
    };

    const handleSave = () => {
        if (editor && currentTitle) {
            const newNote = {
                title: currentTitle,
                notes: editor.getHTML(),
            };

            if (currentNoteIndex !== null) {
                // Update existing note
                const updatedNotes = [...notes];
                updatedNotes[currentNoteIndex] = newNote;
                setNotes(updatedNotes);
            } else {
                // Add new note
                setNotes([...notes, newNote]);
            }

            // Reset fields
            setCurrentTitle("");
            editor.commands.clearContent();
            setCurrentNoteIndex(null);
        }
    };

    const deleteIconStyle = {
        display: "none",
        color: "red",
        fontSize: "16px",
        cursor: "pointer",
    };

    const addNewNote = () => {
        handleSave(); // Save existing note before adding a new one
        setCurrentTitle('');
        editor.commands.clearContent();
        setCurrentNoteIndex(null);
    };

    const handleEditNote = (index) => {
        setCurrentTitle(notes[index].title);
        editor.commands.setContent(notes[index].notes);
        setCurrentNoteIndex(index);
    };

    const handleDelete = (index) => {
        setNotes(notes.filter((_, i) => i !== index));
    };

    if (!editor) return null;

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
            <Button type="primary" onClick={addNewNote} style={{ marginBottom: "10px", width: '100%' }}>
                New Note
            </Button>

            <Input
                placeholder="Enter note title"
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
                style={{ marginBottom: "10px" }}
            />

            {/* Toolbar */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px", backgroundColor: "#1e1e1e", padding: "10px", borderRadius: "8px" }}>
                <Button onClick={() => editor.chain().focus().toggleBold().run()} type={editor.isActive("bold") ? "primary" : "default"} icon={<BoldOutlined />}>
                </Button>
                <Button onClick={() => editor.chain().focus().toggleItalic().run()} type={editor.isActive("italic") ? "primary" : "default"} icon={<ItalicOutlined />}>

                </Button>
                <Button onClick={() => editor.chain().focus().toggleUnderline().run()} type={editor.isActive("underline") ? "primary" : "default"} icon={<UnderlineOutlined />}>

                </Button>
                <Button onClick={() => editor.chain().focus().toggleBulletList().run()} type={editor.isActive("bulletList") ? "primary" : "default"} icon={<UnorderedListOutlined />}>
                </Button>
                <Button onClick={() => editor.chain().focus().toggleOrderedList().run()} type={editor.isActive("orderedList") ? "primary" : "default"} icon={<OrderedListOutlined />}>
                </Button>
                <Button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} type={editor?.isActive('heading', { level: 1 }) ? 'primary' : 'default'}>
                    H1
                </Button>
                <Button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} type={editor?.isActive('heading', { level: 2 }) ? 'primary' : 'default'}>
                    H2
                </Button>
                <Button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} type={editor?.isActive('heading', { level: 3 }) ? 'primary' : 'default'}>
                    H3
                </Button>
                <Button onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊 Emoji</Button>

                {showEmojiPicker && (
                    <EmojiPicker onEmojiClick={handleEmojiSelect} style={{ position: 'absolute', bottom: '60px', right: '20px' }} />
                )}
            </div>

            {/* Editor */}
            <EditorContent editor={editor} style={{ background: "#1e1e1e", padding: "10px" }} />

            {/* Save Button */}
            <Button type="primary" onClick={handleSave} disabled={!currentTitle} style={{ marginTop: "20px" }}>
                Save Note
            </Button>

            <Typography.Title level={4}>Saved Notes</Typography.Title>
            <List dataSource={notes} renderItem={(note, index) => (
                <List.Item
                    actions={[
                        <EditOutlined key="edit" onClick={() => handleEditNote(index)} />,
                        <DeleteOutlined key="delete" onClick={() => handleDelete(index)} className="delete-icon" />
                    ]}
                    style={{
                        cursor: 'pointer',
                        transition: 'background-color 0.3s',
                        border: '1px solid #444444',
                        borderRadius: '4px',
                        padding: '10px',
                        '&:hover': {
                            backgroundColor: '#f0f0f0'
                        }
                    }}
                    className="note-item"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333333'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                >
                    <Typography.Text strong>{note.title}</Typography.Text>
                </List.Item>
            )} />
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
                <Col span={8}>
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
                <Col span={10}>
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