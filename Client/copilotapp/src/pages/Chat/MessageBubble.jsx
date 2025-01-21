import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Typography, Progress, Modal } from 'antd';
import { 
  DownloadOutlined,
  ExpandOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  VideoCameraOutlined,
  FileUnknownOutlined,
  EyeOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useAuth } from '../../utils/auth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import 'pdfjs-dist/build/pdf.worker.entry';

const { Text } = Typography;

// Global file cache
const fileCache = new Map();

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;


const RichContent = ({ content }) => {
  // Helper function to detect if content contains HTML - improved regex
  const containsHTML = (str) => {
    const htmlRegex = /<(?!.*?markdown-renderer)([a-z][a-z0-9]*)\b[^>]*>/i;
    return htmlRegex.test(str);
  };
  
  // Helper function to detect if content is a table structure
  const isTableStructure = (str) => {
    if (typeof str !== 'string') return false;
    try {
      const data = JSON.parse(str);
      return Array.isArray(data) && 
             data.length > 0 && 
             data.every(row => row && typeof row === 'object' && !Array.isArray(row));
    } catch {
      return false;
    }
  };

  // Helper function to detect if content is a list with improved pattern matching
  const isList = (str) => {
    if (typeof str !== 'string') return false;
    const listPattern = /^[ \t]*(?:\d+\.|\*|\-|\+)[ \t]+\S/m;
    const lines = str.split('\n');
    return lines.some(line => listPattern.test(line)) && 
           lines.filter(line => line.trim()).length > 0;
  };

  // Helper function to detect code blocks with improved detection
  const isCodeBlock = (str) => {
    if (typeof str !== 'string') return false;
    const codePatterns = [
      /^```[\s\S]*```$/m,  // Markdown code blocks
      /^(class\s+\w+|function\s+\w+|const\s+\w+\s*=\s*(?:function|\([^)]*\)\s*=>))/m,  // Code declarations
      /^import\s+.*from\s+['"].*['"];?$/m  // Import statements
    ];
    return codePatterns.some(pattern => pattern.test(str));
  };

  // Helper function to sanitize HTML content
  const sanitizeHTML = (html) => {
    // Basic HTML sanitization
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
               .replace(/on\w+="[^"]*"/g, '')
               .replace(/javascript:/gi, '');
  };

  // Helper function for parsing markdown-style formatting
  const parseMarkdown = (text) => {
    if (typeof text !== 'string') return text;
    
    const parts = [];
    let currentIndex = 0;
    const markdownRegex = /(\*\*.*?\*\*|\*.*?\*|_.*?_|`.*?`)/g;
    let match;

    while ((match = markdownRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index));
      }

      const [fullMatch] = match;
      if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
        parts.push(<strong key={match.index}>{fullMatch.slice(2, -2)}</strong>);
      } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
        parts.push(<code key={match.index} className="inline-code">{fullMatch.slice(1, -1)}</code>);
      } else if ((fullMatch.startsWith('*') && fullMatch.endsWith('*')) || 
                 (fullMatch.startsWith('_') && fullMatch.endsWith('_'))) {
        parts.push(<em key={match.index}>{fullMatch.slice(1, -1)}</em>);
      }

      currentIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }

    return parts;
  };

  // Main render function with proper type checking
  const renderContent = () => {
    if (content === null || content === undefined) {
      return null;
    }

    if (typeof content !== 'string') {
      return <div className="text-inherit">{JSON.stringify(content, null, 2)}</div>;
    }

    // Handle empty or whitespace-only content
    if (!content.trim()) {
      return null;
    }

    // Handle HTML content
    if (containsHTML(content)) {
      return (
        <div 
          dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
          className="max-w-full overflow-auto text-inherit"
        />
      );
    }

    // Handle table structure
    if (isTableStructure(content)) {
      try {
        const tableData = JSON.parse(content);
        const headers = Object.keys(tableData[0]);
        
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} className="border border-gray-300 p-2 bg-gray-50 text-inherit">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map((header, cellIndex) => (
                      <td key={cellIndex} className="border border-gray-300 p-2 text-inherit">
                        {row[header]?.toString() || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      } catch {
        return <div className="text-inherit">{content}</div>;
      }
    }

    // Handle lists
    if (isList(content)) {
      const lines = content.split('\n');
      return (
        <div className="pl-5">
          {lines.map((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return null;

            const isNumbered = /^\d+\.\s/.test(trimmedLine);
            const isBullet = /^[\*\-\+]\s/.test(trimmedLine);
            
            if (isNumbered || isBullet) {
              const marker = isNumbered ? trimmedLine.match(/^\d+\./)[0] : '•';
              const content = trimmedLine.replace(/^(\d+\.|\*|\-|\+)\s+/, '');
              
              return (
                <div key={index} className="mb-2 flex text-inherit">
                  <span className="mr-2 min-w-[20px] text-right">{marker}</span>
                  <span>{parseMarkdown(content)}</span>
                </div>
              );
            }
            return <div key={index} className="text-inherit">{parseMarkdown(trimmedLine)}</div>;
          })}
        </div>
      );
    }

    // Handle code blocks
    if (isCodeBlock(content)) {
      const code = content.replace(/^```\w*\n?/, '').replace(/```$/, '');
      return (
        <pre className="bg-gray-50 p-3 rounded overflow-x-auto font-mono text-inherit">
          <code>{code}</code>
        </pre>
      );
    }

    // Handle markdown-style text formatting for regular text
    return <div className="text-inherit">{parseMarkdown(content)}</div>;
  };

  return (
    <div className="max-w-full overflow-hidden text-inherit">
      {renderContent()}
    </div>
  );
};


// Custom hook for intersection observer
const useIntersectionObserver = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (observerRef.current) return; // Only create observer once

    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        // Once visible, disconnect observer
        observerRef.current?.disconnect();
      }
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    if (elementRef.current) {
      observerRef.current.observe(elementRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, []); // Empty dependency array - only run once

  return [elementRef, isVisible];
};

// File type configurations
const FILE_TYPES = {
  IMAGE: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
    icon: FileImageOutlined,
    preview: true,
    contentType: 'image'
  },
  VIDEO: {
    extensions: ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
    icon: VideoCameraOutlined,
    preview: true,
    contentType: 'video'
  },
  PDF: {
    extensions: ['.pdf'],
    icon: FilePdfOutlined,
    preview: true,
    contentType: 'pdf'
  },
  WORD: {
    extensions: ['.doc', '.docx'],
    icon: FileWordOutlined,
    preview: false
  },
  EXCEL: {
    extensions: ['.xls', '.xlsx', '.csv'],
    icon: FileExcelOutlined,
    preview: false
  },
  TEXT: {
    extensions: ['.txt', '.rtf', '.md'],
    icon: FileTextOutlined,
    preview: true,
    contentType: 'text'
  },
  DEFAULT: {
    extensions: [],
    icon: FileUnknownOutlined,
    preview: false
  }
};

// Get file type from extension
const getFileType = (fileName) => {
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return Object.entries(FILE_TYPES).find(([_, config]) => 
    config.extensions.includes(extension)
  )?.[0] || 'DEFAULT';
};

// Preview Modal Component
const PreviewModal = ({ visible, fileUrl, fileType, onClose, fileName }) => {
  const [pdfPages, setPdfPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (fileType === 'PDF' && visible && fileUrl) {
      loadPdfPreview();
    }
  }, [fileUrl, visible, fileType]);

  const loadPdfPreview = async () => {
    if (!fileUrl) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Import both pdfjs library and worker
      const pdfjsLib = await import('pdfjs-dist/build/pdf');
      const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
      
      // Set up the worker
      pdfjsLib.GlobalWorkerOptions.workerPort = new pdfjsWorker.default();
      
      const loadingTask = pdfjsLib.getDocument(fileUrl);
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const pagesPromises = [];
      
      for (let i = 1; i <= Math.min(totalPages, 3); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        pagesPromises.push(canvas.toDataURL());
      }
      
      setPdfPages(await Promise.all(pagesPromises));
    } catch (error) {
      console.error('Error loading PDF:', error);
      setError('Failed to load PDF preview');
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    switch (fileType) {
      case 'IMAGE':
        return (
          <img
            src={fileUrl}
            alt={fileName}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain'
            }}
          />
        );
      case 'VIDEO':
        return (
          <video
            src={fileUrl}
            controls
            autoPlay={false}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}
          />
        );
      case 'PDF':
        return (
          <div style={{ 
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: '#f0f0f0',
            padding: '20px'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <LoadingOutlined style={{ fontSize: 24 }} />
                <p>Loading PDF preview...</p>
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#ff4d4f' }}>
                {error}
              </div>
            ) : (
              pdfPages.map((pageUrl, index) => (
                <img
                  key={index}
                  src={pageUrl}
                  alt={`Page ${index + 1}`}
                  style={{
                    width: '100%',
                    marginBottom: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                />
              ))
            )}
          </div>
        );
      case 'TEXT':
        return (
          <div style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            padding: '20px',
            backgroundColor: '#fff',
            overflowY: 'auto'
          }}>
            <pre style={{ 
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace'
            }}>
              {fileUrl}
            </pre>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      open={visible}
      footer={null}
      onCancel={onClose}
      width="auto"
      centered
      styles={{
        content: {
          maxWidth: '95vw',
          maxHeight: '95vh',
          padding: 0,
          backgroundColor: 'transparent',
        },
        body: {
          padding: 0,
        },
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
        }
      }}
      title={fileName}
    >
      {renderPreview()}
    </Modal>
  );
};

// Lazy Loading Preview Component
const LazyPreviewLoader = ({ attachment, onLoad, isOwnMessage }) => {
  const [ref, isVisible] = useIntersectionObserver();
  const hasTriggeredLoad = useRef(false);
  const fileType = getFileType(attachment.file_name);
  const FileIcon = FILE_TYPES[fileType].icon;

  useEffect(() => {
    if (isVisible && !hasTriggeredLoad.current) {
      hasTriggeredLoad.current = true;
      onLoad();
    }
  }, [isVisible, onLoad]);

  return (
    <div 
      ref={ref}
      style={{
        width: '100%',
        height: '160px',
        backgroundColor: isOwnMessage ? 'rgba(22,119,255,0.1)' : 'rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {!hasTriggeredLoad.current && (
        <FileIcon style={{ 
          fontSize: 32,
          opacity: 0.5,
          color: isOwnMessage ? '#1677ff' : '#8c8c8c'
        }} />
      )}
    </div>
  );
};

// File Preview Component
const FilePreview = ({ attachment, isOwnMessage, onDownload }) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { downloadFile } = useAuth();
  
  const fileType = getFileType(attachment.file_name);
  const FileIcon = FILE_TYPES[fileType].icon;
  const canPreview = FILE_TYPES[fileType].preview;
  const contentType = FILE_TYPES[fileType].contentType;

  const loadPreview = useCallback(async () => {
    if (!canPreview || fileCache.has(attachment.file_path)) {
      if (fileCache.has(attachment.file_path)) {
        setPreviewUrl(fileCache.get(attachment.file_path));
      }
      return;
    }

    try {
      setIsLoading(true);
      const fileData = await downloadFile(attachment.file_path);
      
      if (fileData?.blob) {
        if (contentType === 'text') {
          const text = await fileData.blob.text();
          setPreviewUrl(text);
          fileCache.set(attachment.file_path, text);
        } else {
          const url = URL.createObjectURL(fileData.blob);
          setPreviewUrl(url);
          fileCache.set(attachment.file_path, url);
        }
      }
    } catch (error) {
      console.error('Failed to load preview:', error);
    } finally {
      setIsLoading(false);
    }
  }, [attachment, canPreview, contentType, downloadFile]);

  useEffect(() => {
    return () => {
      if (previewUrl && !fileCache.has(attachment.file_path) && contentType !== 'text') {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, attachment, contentType]);

  const handlePreviewClick = async () => {
    if (!previewUrl) {
      await loadPreview();
    }
    setModalVisible(true);
  };

  return (
    <div 
      className="file-preview"
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
      style={{
        width: '240px',
        backgroundColor: isOwnMessage ? 'rgba(22,119,255,0.1)' : 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '8px'
      }}
    >
      {/* File Info Section */}
      <div style={{
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <FileIcon style={{ 
          fontSize: 24,
          color: isOwnMessage ? '#1677ff' : '#8c8c8c'
        }} />
        <div style={{
          flex: 1,
          overflow: 'hidden'
        }}>
          <Text
            style={{
              color: isOwnMessage ? '#1677ff' : '#000000',
              display: 'block',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {attachment.file_name}
          </Text>
          <Text
            style={{
              color: '#8c8c8c',
              fontSize: '12px'
            }}
          >
            {(attachment.file_size / 1024).toFixed(1)} KB
          </Text>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Preview Button */}
          {canPreview && (
            <div 
              onClick={handlePreviewClick}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: isOwnMessage ? '#1677ff20' : '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {isLoading ? (
                <LoadingOutlined style={{ 
                  color: isOwnMessage ? '#1677ff' : '#8c8c8c',
                  fontSize: 16 
                }} />
              ) : (
                <EyeOutlined style={{ 
                  color: isOwnMessage ? '#1677ff' : '#8c8c8c',
                  fontSize: 16 
                }} />
              )}
            </div>
          )}
          
          {/* Download Button */}
          <div 
            onClick={onDownload}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: isOwnMessage ? '#1677ff' : '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <DownloadOutlined style={{ 
              color: isOwnMessage ? '#ffffff' : '#1677ff',
              fontSize: 16 
            }} />
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {canPreview && (
        <>
          {!previewUrl ? (
            <LazyPreviewLoader
              attachment={attachment}
              onLoad={loadPreview}
              isOwnMessage={isOwnMessage}
            />
          ) : (contentType === 'image' || contentType === 'video') && (
            <div style={{
              width: '100%',
              height: '160px',
              backgroundColor: '#000000',
              position: 'relative'
            }}>
              {contentType === 'image' ? (
                <img
                  src={previewUrl}
                  alt={attachment.file_name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  onClick={handlePreviewClick}
                />
              ) : (
                <video
                  src={previewUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  controls
                  preload="metadata"
                />
              )}
              {contentType === 'image' && showOverlay && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ExpandOutlined 
                    onClick={handlePreviewClick}
                    style={{ 
                      color: '#fff',
                      fontSize: 24,
                      cursor: 'pointer'
                    }} 
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {modalVisible && (
        <PreviewModal
          visible={modalVisible}
          fileUrl={previewUrl}
          fileType={fileType}
          fileName={attachment.file_name}
          onClose={() => setModalVisible(false)}
        />
      )}
    </div>
  );
};

// MessageBubble Component
const MessageBubble = ({ message, type = 'private' ,Aichat=false}) => {
  const { user, downloadFile } = useAuth();
  const sender = message.sender;
  const isOwnMessage = sender?.id === user?.id;

  const handleDownload = useCallback(async (attachment, e) => {
    if (e) e.stopPropagation();
    
    try {
      const fileData = await downloadFile(attachment.file_path);

      if (fileData?.blob) {
        const url = URL.createObjectURL(fileData.blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', attachment.file_name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [downloadFile]);
 
  const renderContent = () => {
    const renderAttachmentsGrid = (attachments) => {
      // Calculate grid layout based on number of attachments
      const getGridLayout = (count) => {
        if (count === 1) return { columns: 1, width: '240px' };
        if (count === 2) return { columns: 2, width: '480px' };
        if (count === 3) return { columns: 2, width: '480px' }; // 2 in first row, 1 in second
        return { columns: 2, width: '480px' }; // 2x2 grid for 4 or more
      };
  
      const { columns, width } = getGridLayout(attachments.length);
  
      return (
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '8px',
          maxWidth: width,
          width: '100%'
        }}>
          {attachments.map((attachment, index) => (
            <FilePreview
              key={`${attachment.file_path}-${index}`}
              attachment={attachment}
              isOwnMessage={isOwnMessage}
              onDownload={(e) => handleDownload(attachment, e)}
            />
          ))}
        </div>
      );
    };
  
    if (message.message_type === "MULTIPLE") {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
        }}>
          {/* Render text content if exists */}
          {message.text_content && (
            <Text style={{
              display: 'inline-block',
              padding: '10px 12px',
              backgroundColor: isOwnMessage ? '#1677ff' : '#ffffff',
              color: isOwnMessage ? '#ffffff' : '#000000',
              borderRadius: 16,
              fontSize: 14,
              wordBreak: 'break-word'
            }}>
              <RichContent content={message.text_content} />
            </Text>
          )}
          
          {/* Render attachments in grid */}
          {message.attachments?.length > 0 && renderAttachmentsGrid(message.attachments)}
        </div>
      );
    }
  
    // Handle single attachment messages
    if (message.attachments?.length > 0) {
      return renderAttachmentsGrid(message.attachments);
    }
  
    // Handle text-only messages
    return (
      <Text style={{
        display: 'inline-block',
        padding: '10px 12px',
        backgroundColor: isOwnMessage ? '#1677ff' : '#ffffff',
        color: isOwnMessage ? '#ffffff' : '#000000',
        borderRadius: 16,
        fontSize: 14,
        wordBreak: 'break-word'
      }}>
        <RichContent content={message.text_content} />
      </Text>
    );
  };

  return (
    <div style={{
      textAlign: !isOwnMessage ||Aichat ? 'left' : 'right',
      marginBottom: 12,
      padding: '0 12px'
    }}>
      {type === 'group' && !isOwnMessage && (
        <Text style={{ 
          fontSize: 12,
          color: '#8c8c8c',
          marginLeft: 12,
          marginBottom: 4,
          display: 'block'
        }}>
          {sender?.username || sender?.email}
        </Text>
      )}
      <div style={{ 
        maxWidth: '70%',
        display: 'inline-block',
        position: 'relative'
      }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default MessageBubble;