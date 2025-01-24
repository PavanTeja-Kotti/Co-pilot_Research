import { Col, Row, Button, Modal, List, theme, Input, Typography, message } from "antd";
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
import { useAuth } from "../utils/auth";
import JSZip from 'jszip'; // Import JSZip for unzipping files
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
    const [loading, setLoading] = useState(false);
    const { addUploadedFiles, SetaddUploadedFiles } = useAuth(); // Get the function to add uploaded files

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    const handleFileUpload = (event) => {
        const uploadedFiles = Array.from(event.target.files);
        const validFiles = uploadedFiles.filter(file => 
            file.type === 'application/pdf' || file.type === 'application/zip'
        );

        if (validFiles.length !== uploadedFiles.length) {
            message.error('Only PDF and ZIP files are allowed.');
        }

        setFiles((prevFiles) => [...prevFiles, ...validFiles]);
    };

    const handleRemoveFile = (fileToRemove) => {
        setFiles((prevFiles) =>
            prevFiles.filter((file) => file.name !== fileToRemove.name)
        );
    };

    const uploadFiles = async () => {
        const pdfFilesToUpload = [];

        // Process each file and prepare for upload
        for (const file of files) {
            if (file.type === 'application/pdf') {
                pdfFilesToUpload.push(file);
            } else if (file.type === 'application/zip') {
                const zip = new JSZip();
                const content = await zip.loadAsync(file);
                // Extract PDF files from ZIP
                for (const filename of Object.keys(content.files)) {
                    if (filename.endsWith('.pdf')) {
                        const pdfBlob = await content.files[filename].async('blob');
                        pdfFilesToUpload.push(new File([pdfBlob], filename)); // Create a new File object
                    }
                }
            }
        }

        // Add all valid PDF files to the auth context
        SetaddUploadedFiles(pdfFilesToUpload);

        // Uploading logic
        const formData = new FormData();
        pdfFilesToUpload.forEach(pdfFile => {
            formData.append('files', pdfFile);
        });

        setLoading(true);
        try {
            const response = await fetch('/api/get_list_documents/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            message.success('Files uploaded successfully');
            console.log('Uploaded file names:', data.file_names);
            handleCloseModal();
            setFiles([]);
        } catch (error) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
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
                    <List.Item style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                    <Button key="submit" type="primary" loading={loading} onClick={uploadFiles}>
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
                    accept=".pdf,.zip" // Accept only PDF and ZIP files
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
                style: "min-height: 250px; max-height: 250px; overflow-y: auto;",
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
        height: "92vh",
        background: "#1f1f1f",
        display: "flex",
        flexDirection: "column",
    };

    const rowStyle = {
        display: "flex",
        flex: 1,
        overflow: "hidden", // Prevent overflow in the main container
        margin: "10px"
    };

    const boxStyle = {
        flex: 1,
        background: "#292929",
        border: "1px solid #303030",
        borderRadius: "6px",
        color: "#e6e6e6",
        margin: "0 6px", // Spacing between columns
        display: "flex",
        flexDirection: "column",
    };

    const headingStyle = {
        margin: "10px",
        borderBottom: "1px solid #37383b",
        paddingBottom: "5px",
        color: "white",
    };

    const contentStyle = {
        flex: 1,
        overflowY: "auto", // Allow vertical scrolling
        padding: "10px", // Padding for better spacing
        height: "300px",
        overflow: "hidden",
    };

    return (
        <div style={containerStyle}>
            <div style={rowStyle}>
                <div style={{ flexBasis: '25%', maxWidth: '25%', display: 'flex', flexDirection: 'column' }}>
                    <div style={boxStyle}>
                        <h3 style={headingStyle}>Sources</h3>
                        <div style={contentStyle}>
                            <PDFWindow />
                        </div>
                    </div>
                </div>
                <div style={{ flexBasis: '35%', maxWidth: '35%', display: 'flex', flexDirection: 'column' }}>
                    <div style={boxStyle}>
                        <h3 style={headingStyle}>Chat</h3>
                        <div style={contentStyle}>
                            <AIChat />
                        </div>
                    </div>
                </div>
                <div style={{ flexBasis: '40%', maxWidth: '40%', display: 'flex', flexDirection: 'column' }}>
                    <div style={boxStyle}>
                        <h3 style={headingStyle}>Notes</h3>
                        <div style={contentStyle}>
                            <NoteTaking />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiAssistant;