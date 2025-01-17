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
  // Helper function to detect if content contains HTML
  const containsHTML = (str) => /<[a-z][\s\S]*>/i.test(str);
  
  // Helper function to detect if content is a table structure
  const isTableStructure = (str) => {
    try {
      const data = JSON.parse(str);
      return Array.isArray(data) && data.every(row => typeof row === 'object');
    } catch {
      return false;
    }
  };

  // Helper function to detect if content is a list (numbered or bullet points)
  const isList = (str) => {
    const listPattern = /^(\d+\.|[\*\-])\s/m;
    return listPattern.test(str);
  };

  // Helper function to detect code blocks
  const isCodeBlock = (str) => {
    return str.startsWith('```') || str.includes('class ') || str.includes('function ');
  };

  // Handle different types of content
  const renderContent = () => {
    if (typeof content !== 'string') {
      return <Text color='inherit' >{JSON.stringify(content)}</Text>;
    }

    // Handle HTML content
    if (containsHTML(content)) {
      return (
        <div 
          dangerouslySetInnerHTML={{ __html: content }}
          style={{
            color: 'inherit',
            maxWidth: '100%',
            overflow: 'auto'
          }}
        />
      );
    }

    // Handle table structure
    if (isTableStructure(content)) {
      try {
        const tableData = JSON.parse(content);
        return (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {Object.keys(tableData[0]).map((header, index) => (
                  <th key={index} style={{ 
                    border: '1px solid #ddd',
                    padding: '8px',
                    backgroundColor: '#f5f5f5'
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.values(row).map((cell, cellIndex) => (
                    <td key={cellIndex} style={{ 
                      border: '1px solid #ddd',
                      padding: '8px'
                    }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      } catch {
        return <Text color='inherit'>{content}</Text>;
      }
    }

    // Handle lists
    if (isList(content)) {
      const lines = content.split('\n');
      return (
        <div style={{ paddingLeft: '20px' }}>
          {lines.map((line, index) => {
            const isNumbered = /^\d+\.\s/.test(line);
            const isBullet = /^[\*\-]\s/.test(line);
            
            if (isNumbered || isBullet) {
              return (
                <div key={index} style={{ 
                  marginBottom: '8px',
                  display: 'flex' 
                }}>
                  <span style={{ color:'inherit',marginRight: '8px' }}>
                    {isNumbered ? line.match(/^\d+\./)[0] : '•'}
                  </span>
                  <span >{line.replace(/^(\d+\.|\*|\-)\s/, '')}</span>
                </div>
              );
            }
            return <div style={{color:'inherit'}} key={index}>{line}</div>;
          })}
        </div>
      );
    }

    // Handle code blocks
    if (isCodeBlock(content)) {
      return (
        <pre style={{
          backgroundColor: '#f5f5f5',
          padding: '12px',
          borderRadius: '4px',
          overflowX: 'auto',
          fontFamily: 'monospace',
          color:'inherit'
        }}>
          <code>{content.replace(/^```\w*\n?/, '').replace(/```$/, '')}</code>
        </pre>
      );
    }

    // Handle markdown-style text formatting
    if (content.includes('**') || content.includes('*') || content.includes('_')) {
      return content.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_)/).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong  key={index}>{part.slice(2, -2)}</strong>;
        }
        if ((part.startsWith('*') && part.endsWith('*')) || 
            (part.startsWith('_') && part.endsWith('_'))) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }
        return part;
      });
    }

    // Default text rendering
    return <Text style={{color:'inherit'}}>{content}</Text>;
  };

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden',color:'inherit' }}>
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
    if (message.attachments?.length > 0) {
      return message.attachments.map((attachment, index) => (
        <FilePreview
          key={`${attachment.file_path}-${index}`}
          attachment={attachment}
          isOwnMessage={isOwnMessage}
          onDownload={(e) => handleDownload(attachment, e)}
        />
      ));
    }

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
       <RichContent  content={message.text_content} />
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