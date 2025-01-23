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

            {/* Add Note Button */}
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalOpen(true)}
                style={{ marginBottom: "10px" }}
            >
                Add Note
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