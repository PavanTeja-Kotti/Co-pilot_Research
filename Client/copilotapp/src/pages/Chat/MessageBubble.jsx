import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Typography, Progress, Modal } from 'antd';
import { 
  DownloadOutlined,
  ExpandOutlined,
  CloseCircleOutlined,
  FileImageOutlined
} from '@ant-design/icons';
import { useAuth } from '../../utils/auth';

const { Text } = Typography;

// Custom hook for handling intersection observer
const useIntersectionObserver = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        // Once visible, stop observing
        if (elementRef.current) {
          observer.unobserve(elementRef.current);
        }
      }
    }, {
      root: options.root || null,
      rootMargin: options.rootMargin || '50px',
      threshold: options.threshold || 0
    });

    observerRef.current = observer;

    return () => {
      if (observer && elementRef.current) {
        observer.disconnect();
      }
    };
  }, [options.root, options.rootMargin, options.threshold]);

  useEffect(() => {
    const currentElement = elementRef.current;
    const currentObserver = observerRef.current;

    if (currentElement && currentObserver) {
      currentObserver.observe(currentElement);
    }

    return () => {
      if (currentElement && currentObserver) {
        currentObserver.unobserve(currentElement);
      }
    };
  }, [elementRef.current]);

  return [elementRef, isVisible];
};

// Image Modal Component
const ImageModal = ({ visible, imageUrl, onClose }) => (
  <Modal
    open={visible}
    footer={null}
    onCancel={onClose}
    width="auto"
    centered
    styles={{
      content: {
        maxWidth: '90vw',
        maxHeight: '90vh',
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
  >
    <img
      src={imageUrl}
      alt="Full size"
      style={{
        maxWidth: '90vw',
        maxHeight: '90vh',
        objectFit: 'contain'
      }}
    />
  </Modal>
);

// Lazy Loading Image Component
const LazyImage = ({ attachment, onLoad, onError, isOwnMessage }) => {
  const [ref, isVisible] = useIntersectionObserver({
    rootMargin: '50px',
    threshold: 0.1
  });
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isVisible && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [isVisible, hasLoaded]);

  return (
    <div 
      ref={ref}
      style={{
        width: '180px',
        height: '120px',
        backgroundColor: isOwnMessage ? 'rgba(22,119,255,0.1)' : 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {hasLoaded ? (
        onLoad({ attachment })
      ) : (
        <FileImageOutlined 
          style={{ 
            fontSize: 24, 
            opacity: 0.5,
            color: isOwnMessage ? '#fff' : '#1677ff'
          }} 
        />
      )}
    </div>
  );
};

// Main Message Bubble Component
const MessageBubble = ({ message, type = 'private' }) => {
  const { user, downloadFile } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const sender = message.sender;
  const isOwnMessage = sender?.id === user?.id;

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  // Download handler
  const handleDownload = async (attachment, e) => {
    e.stopPropagation();
    if (downloading) return;
    
    try {
      setDownloading(true);
      setDownloadProgress(0);

      const fileData = await downloadFile(
        attachment.file_path,
        (progress) => setDownloadProgress(progress)
      );

      const url = URL.createObjectURL(fileData.blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileData.fileName || attachment.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setDownloadProgress(100);
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Download failed:', error);
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Fullscreen handler
  const handleFullscreen = (e) => {
    e.stopPropagation();
    setModalVisible(true);
  };

  // Load image handler
  const loadImage = useCallback(async (attachment) => {
    if (imageUrl) return;

    try {
      setDownloading(true);
      const fileData = await downloadFile(
        attachment.file_path,
        (progress) => setDownloadProgress(progress)
      );
      
      if (fileData?.blob instanceof Blob) {
        const url = URL.createObjectURL(fileData.blob);
        setImageUrl(url);
        setImageError(false);
      } else {
        setImageError(true);
      }
    } catch (error) {
      console.error('Failed to load image:', error);
      setImageError(true);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  }, [downloadFile, imageUrl]);

  // Render image content
  const renderImageContent = useCallback(({ attachment }) => {
    if (!imageUrl && !imageError) {
      loadImage(attachment);
    }

    return (
      <div 
        style={{ 
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
        onMouseEnter={() => setShowOverlay(true)}
        onMouseLeave={() => setShowOverlay(false)}
      >
        {!imageError && imageUrl ? (
          <>
            <img 
              src={imageUrl}
              alt={attachment.file_name}
              onError={() => setImageError(true)}
              onLoad={() => setImageLoaded(true)}
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: 'rgba(0,0,0,0.03)',
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease'
              }}
            />
            {showOverlay && (
              <>
                {/* Download button */}
                <div 
                  onClick={(e) => handleDownload(attachment, e)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                >
                  <DownloadOutlined style={{ color: '#ffffff', fontSize: 16 }} />
                </div>
                {/* Fullscreen button */}
                <div 
                  onClick={handleFullscreen}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                >
                  <ExpandOutlined style={{ color: '#ffffff', fontSize: 20 }} />
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isOwnMessage ? '#fff' : '#ff4d4f'
          }}>
            {imageError ? 'Failed to load image' : 'Loading image...'}
          </div>
        )}
        {downloading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3
          }}>
            <Progress
              type="circle"
              percent={downloadProgress}
              width={44}
              strokeWidth={4}
              strokeColor="#ffffff"
              trailColor="rgba(255,255,255,0.3)"
              format={() => ''}
            />
          </div>
        )}
      </div>
    );
  }, [imageUrl, imageError, imageLoaded, showOverlay, downloading, downloadProgress, handleDownload]);

  // Render main content
  const renderContent = () => {
    if (message.message_type === 'IMAGE' && message.attachments?.length > 0) {
      const attachment = message.attachments[0];
      return (
        <>
          <LazyImage 
            attachment={attachment}
            onLoad={renderImageContent}
            onError={() => setImageError(true)}
            isOwnMessage={isOwnMessage}
          />
          <ImageModal
            visible={modalVisible}
            imageUrl={imageUrl}
            onClose={() => setModalVisible(false)}
          />
        </>
      );
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
        {message.text_content}
      </Text>
    );
  };

  return (
    <div style={{
      textAlign: isOwnMessage ? 'right' : 'left',
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
        display: 'inline-block'
      }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default MessageBubble;