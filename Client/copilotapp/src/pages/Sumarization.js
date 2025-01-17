import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Card, 
  Typography, 
  Tag, 
  theme,
  Input,
  Skeleton,
  Empty,
  Space,
  Select,
  Button,
  message,
  Spin,
  Tooltip
} from "antd";
import { 
  SearchOutlined, 
  ReloadOutlined, 
  BookOutlined, 
  BookFilled 
} from "@ant-design/icons";
import debounce from 'lodash/debounce';
import PdfViewer from "../components/common/PdfViewer";
import AIChat from "./Chat/AIChat";
import InfiniteScroll from 'react-infinite-scroll-component';
import api from "../utils/api";

const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

const PAGE_SIZE = 10;

const ResearchPapers = () => {

  const { token } = useToken();
  // State
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    source: ""
  });
  const [categories, setCategories] = useState([]);
  
  // Refs
  const isInitialLoad = useRef(true);
  const totalItems = useRef(0);


  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.categories().getCategories();
        if (response.success) {
          setCategories(response.data || []);
        } else {
          message.error('Failed to fetch categories');
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        message.error('Failed to fetch categories');
      }
    };

    fetchCategories();
  }, []);


  // Fetch papers with current filters and pagination
  const fetchPapers = async (currentOffset = 0, append = false) => {
    try {
      const response = await api.scraping().getPapers(
        currentOffset,
        PAGE_SIZE,
        {
          search: filters.search,
          category: filters.category,
          source: filters.source
        }
      );

      if (response.success) {
        const newPapers = response.data.results || [];
        totalItems.current = response.data.count || 0;
        
        setPapers(prev => append ? [...prev, ...newPapers] : newPapers);
        setHasMore(response.data.next !== null);
        return true;
      } else {
        message.error(response.error || 'Failed to fetch papers');
        return false;
      }
    } catch (error) {
      console.error('Error fetching papers:', error);
      message.error('Failed to fetch papers');
      return false;
    }
    // setPapers([
    //   {
    //     id: 1,
    //     title: "Exploring AI in Healthcare",
    //     abstract: "This paper explores the applications of AI in modern healthcare systems.",
    //     authors: ["John Doe", "Jane Smith"],
    //     source: "ScienceDirect",
    //     url: "https://sciencedirect.com/ai-healthcare",
    //     pdf_url: "https://www.antennahouse.com/hubfs/xsl-fo-sample/pdf/basic-link-1.pdf",
    //     categories: ["AI", "Healthcare"],
    //     publication_date: "2024-01-15",
    //     created_at: "2024-01-16T12:00:00Z",
    //   },
    //   {
    //     id: 2,
    //     title: "Quantum Computing Revolution",
    //     abstract: "This paper discusses advancements in quantum computing.",
    //     authors: ["Alice Johnson", "Bob Lee"],
    //     source: "IEEE",
    //     url: "https://ieee.org/quantum-computing",
    //     pdf_url: "https://www.antennahouse.com/hubfs/xsl-fo-sample/pdf/basic-link-1.pdf",
    //     categories: ["Quantum Computing", "Technology"],
    //     publication_date: "2024-02-01",
    //     created_at: "2024-02-02T15:00:00Z",
    //   },
    // ])
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async () => {
      try {
        setSearching(true);
        setOffset(0);
        await fetchPapers(0, false);
      } finally {
        setSearching(false);
      }
    }, 2000),
    [filters]
  );

  // Load more data for infinite scroll
  const loadMoreData = async () => {
    if (loading || searching || !hasMore) return;
    
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    await fetchPapers(newOffset, true);
  };

  // Toggle paper bookmark
  const handleToggleBookmark = async (paperId, e) => {
    e.stopPropagation();
    try {
      const response = await api.scraping().toggleBookmark(paperId);
      console.log(response);
      if (response.success) {
        setPapers(prev => prev.map(paper => 
          paper.id === paperId 
            ? { ...paper, is_bookmarked: !paper.is_bookmarked }
            : paper
        ));
        message.success(response.message || 'Bookmark updated successfully');
      } else {
        message.error(response.error || 'Failed to update bookmark');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      message.error('Failed to update bookmark');
    }
  };

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchPapers(0, false);
      setLoading(false);
      isInitialLoad.current = false;
    };

    loadInitialData();
  }, []);

  // Handle filter changes
  useEffect(() => {
    if (!isInitialLoad.current) {
      debouncedSearch();
    }
  }, [filters, debouncedSearch]);

  const handleCardClick = (id) => {
    setExpandedCardId(prev => prev === id ? null : id);
  };

  const handleReset = () => {
    setFilters({
      search: "",
      category: "",
      source: ""
    });
  };

  // Render functions
  const renderSkeletonCard = () => (
    <Card style={{ width: "100%", marginBottom: 16 }}>
      <Skeleton active paragraph={{ rows: 4 }} />
    </Card>
  );

  const renderExpandedContent = (paper) => {
    if (expandedCardId !== paper.id) return null;

    return (
      <div
        style={{
          maxHeight: 600,
          overflow: "hidden",
          marginTop: 16,
          background: token.colorBgElevated,
          padding: 12,
          borderRadius: token.borderRadiusLG,
          display: "flex",
          gap: 12
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          flex: 1, 
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          // padding: 16
        }}>
          <AIChat uniqueID={paper.id} />
        </div>
        <div style={{ 
          flex: 1,
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          // padding: 16
        }}>
          {paper.pdf_url && <PdfViewer pdfUrl={paper.pdf_url} />}
        </div>
      </div>
    );
  };

  const renderPaperCard = (paper) => (
    <Card
      key={paper.id}
      hoverable
      style={{
        width: "100%",
        marginBottom: 16,
        backgroundColor: token.colorBgContainer,
        borderRadius: token.borderRadiusLG
      }}
      bodyStyle={{ padding: 20 }}
      onClick={() => handleCardClick(paper.id)}
    >
      <Space 
        direction="vertical" 
        size="middle" 
        style={{ width: "100%" }}
      >
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title 
            level={4} 
            style={{ 
              margin: 0,
              color: token.colorTextHeading
            }}
          >
            {paper.title}
          </Title>
          <Tooltip title={paper.is_bookmarked ? "Remove bookmark" : "Add bookmark"}>
            <Button
              type="text"
              icon={paper.is_bookmarked ? <BookFilled /> : <BookOutlined />}
              onClick={(e) => handleToggleBookmark(paper.id, e)}
            />
          </Tooltip>
        </Space>

        <Paragraph 
          style={{ 
            color: token.colorTextSecondary,
            margin: 0
          }}
        >
          {paper.abstract}
        </Paragraph>

        <Space direction="vertical" size="small">
          <Text strong style={{ color: token.colorText }}>
            Authors: {paper.authors.join(", ")}
          </Text>
          <Space wrap>
            <Tag color="blue">{paper.source}</Tag>
            {paper.categories?.map((category) => (
              <Tag color="green" key={category}>
                {category}
              </Tag>
            ))}
          </Space>
        </Space>
      </Space>
      {expandedCardId && renderExpandedContent(paper)}
    </Card>
  );

  // Update only the Input section within renderSearchBar
  const renderSearchBar = () => (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Space wrap align="center" style={{ justifyContent: "space-between", width: "100%" }}>
        <Space>
          <Title level={2} style={{ margin: 0 }}>
            Research Papers
          </Title>
          {!loading && (
            <Text type="secondary">
              {totalItems.current} {totalItems.current === 1 ? 'paper' : 'papers'} found
            </Text>
          )}
        </Space>

        <Space wrap>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Input
              placeholder="Search papers..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              allowClear
            />
            {searching && (
              <Spin 
                size="small" 
                style={{ 
                  position: 'absolute',
                  right: '40px',
                }}
              />
            )}
          </div>
          <Select
            placeholder="Category"
            style={{ width: 200 }}
            allowClear
            value={filters.category}
            onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {categories.map(category => (
              <Select.Option key={category.id} value={category.name}>
                {category.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Source"
            style={{ width: 150 }}
            allowClear
            value={filters.source}
            onChange={(value) => setFilters(prev => ({ ...prev, source: value }))}
          >
            {/* Source options remain the same */}
          </Select>
          <Button 
            icon={<ReloadOutlined />}
            onClick={handleReset}
          >
            Reset
          </Button>
        </Space>
      </Space>
    </Space>
  );

  return (
    <div style={{ padding: 24, minHeight: "100vh" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {renderSearchBar()}

        {loading ? (
          Array(3).fill().map((_, i) => (
            <div key={i}>{renderSkeletonCard()}</div>
          ))
        ) : papers.length === 0 ? (
          <Empty
            description="No papers found"
            style={{ 
              background: token.colorBgContainer,
              padding: 24,
              borderRadius: token.borderRadiusLG
            }}
          />
        ) : (
          <InfiniteScroll
            dataLength={papers.length}
            next={loadMoreData}
            hasMore={hasMore}
            loader={
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin tip="Loading more papers..." />
              </div>
            }
            endMessage={
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Text type="secondary">No more papers to load</Text>
              </div>
            }
          >
            {papers.map(renderPaperCard)}
          </InfiniteScroll>
        )}
      </Space>
    </div>
  );
};

export default ResearchPapers;