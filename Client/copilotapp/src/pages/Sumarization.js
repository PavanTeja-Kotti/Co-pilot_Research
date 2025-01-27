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
  Tooltip,
  DatePicker
} from "antd";
import { 
  SearchOutlined, 
  ReloadOutlined, 
  BookOutlined, 
  BookFilled,
  CheckOutlined, 
  MinusOutlined
} from "@ant-design/icons";
import PdfViewer from "../components/common/PdfViewer";
import AIChat from "./Chat/AIChat";
import InfiniteScroll from 'react-infinite-scroll-component';
import api from "../utils/api";
import Search from "antd/es/input/Search";

const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;
const { RangePicker } = DatePicker;

const PAGE_SIZE = 10;

const ResearchPapers = () => {
  const { token } = useToken();
  
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    dateRange: {
      start: null,
      end: null
    }
  });
  const [categories, setCategories] = useState([]);
  const [Resarchcategories, setResarchcategories] = useState([]);
  
  const isInitialLoad = useRef(true);
  const totalItems = useRef(0);
  const debounceTimeout = useRef(null);

  const fetchPapers = useCallback(async (currentOffset = 0, append = false,search="") => {
    try {
      setLoading(currentOffset === 0 && !append);
      
      const response = await api.scraping().getPapers(
        currentOffset,
        PAGE_SIZE,
        {
          search: search.trim(),
          categories: filters.category,
          startDate: filters.dateRange.start?.toISOString(),
          endDate: filters.dateRange.end?.toISOString()
        }
      );

      if (response.success) {
        const newPapers = response.data.results || [];
        totalItems.current = response.data.count || 0;
        setPapers(prev => append ? [...prev, ...newPapers] : newPapers);
        setHasMore(response.data.next !== null);
      } else {
        message.error(response.error || 'Failed to fetch papers');
      }
    } catch (error) {
      console.error('Error fetching papers:', error);
      message.error('Failed to fetch papers');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [filters]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    
    if (filters.category || filters.dateRange.start || filters.dateRange.end) {
      setSearching(true);
      setOffset(0);
      fetchPapers(0, false);
    }
  }, [filters.category, filters.dateRange, fetchPapers]);

  const loadMoreData = useCallback(async () => {
    if (loading || searching || !hasMore) return;
    
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    await fetchPapers(newOffset, true);
  }, [loading, searching, hasMore, offset, fetchPapers]);

  const handleToggleBookmark = useCallback(async (paperId, e) => {
    e.stopPropagation();
    try {
      const response = await api.scraping().toggleBookmark(paperId);
      
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
  }, []);

  const handleToggleRead = useCallback(async (paperId, e) => {
    e.stopPropagation();
    try {
      const response = await api.scraping().toggleRead(paperId);
      
      if (response.success) {
        setPapers(prev => prev.map(paper => 
          paper.id === paperId 
            ? { ...paper, is_paper_read: !paper.is_paper_read }
            : paper
        ));
        message.success(response.message || 'Read status updated successfully');
      } else {
        message.error(response.error || 'Failed to update read status');
      }
    } catch (error) {
      console.error('Error toggling read status:', error);
      message.error('Failed to update read status');
    }
  }, []);

  const handleCardClick = useCallback((id) => {
    setExpandedCardId(prev => prev === id ? null : id);
  }, []);

  const handleSearch = useCallback((value) => {
    setFilters(prev => ({ ...prev, search: value }));
  }, []);

  const handleCategoryChange = useCallback((value) => {
    setFilters(prev => ({ ...prev, category: value }));
  }, []);

  const handleDateRangeChange = useCallback((dates) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: dates?.[0] || null,
        end: dates?.[1] || null
      }
    }));
  }, []);

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

  const fetchinlineCategories = async () => {
    try {
      const response = await api.scraping().getresearchfocus();
      if (response.success) {
        setResarchcategories(response.data.research_focus?.topic_distribution || []);
      } else {
        message.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchinlineCategories();
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchPapers(0, false);
      isInitialLoad.current = false;
    };

    loadInitialData();
  }, [fetchPapers]);

  const renderSkeletonCard = () => (
    <Card style={{ width: "100%", marginBottom: 16 }}>
      <Skeleton active paragraph={{ rows: 4 }} />
    </Card>
  );

  const renderExpandedContent = useCallback((paper) => {
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
        }}>
          <AIChat uniqueID={paper.id} paper={paper} />
        </div>
        <div style={{ 
          flex: 1,
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
        }}>
          {paper.pdf_url && <PdfViewer pdfUrl={paper.pdf_url} />}
        </div>
      </div>
    );
  }, [expandedCardId, token.colorBgContainer, token.colorBgElevated, token.borderRadiusLG]);

  const renderPaperCard = useCallback((paper) => (
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
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0, color: token.colorTextHeading }}>
            {paper.title}
          </Title>
          <Space>
            <Tooltip title={!paper.is_paper_read ? "Mark as read" : "Mark as unread"}>
              <Button
                type="text"
                onClick={(e) => handleToggleRead(paper.id, e)}
                icon={!paper.is_paper_read ? <CheckOutlined className="h-5 w-5" /> : <MinusOutlined className="h-5 w-5" />}
              />
            </Tooltip>
            <Tooltip title={paper.is_bookmarked ? "Remove bookmark" : "Add bookmark"}>
              <Button
                type="text"
                onClick={(e) => handleToggleBookmark(paper.id, e)}
                icon={paper.is_bookmarked ? <BookFilled className="h-5 w-5" /> : <BookOutlined className="h-5 w-5" />}
              />
            </Tooltip>
          </Space>
        </Space>

        <Paragraph style={{ color: token.colorTextSecondary, margin: 0 }}>
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
      {renderExpandedContent(paper)}
    </Card>
  ), [token, handleCardClick, handleToggleRead, handleToggleBookmark, renderExpandedContent]);

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
            <Search
              placeholder="Search papers..."
              style={{ width: 240 }}
              // value={filters.search}
              // onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onSearch={(value) => {
                setSearching(true);
                setOffset(0);
                fetchPapers(0, false,value);
              }}
              allowClear
            />
            {searching && (
              <Spin size="small" style={{ position: 'absolute', right: '40px' }} />
            )}
          </div>
          
          <Select
            placeholder="Category"
            style={{ width: 220 }}
            allowClear
            value={filters.category}
            onChange={handleCategoryChange}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {[
              ...new Set([
                ...categories.map(c => c.name.toLowerCase().charAt(0).toUpperCase() + c.name.toLowerCase().slice(1)),
                ...Resarchcategories?.map(c => c.category.toLowerCase().charAt(0).toUpperCase() + c.category.toLowerCase().slice(1))
              ])
            ].map((category, index) => (
              <Select.Option key={index} value={category}>
                {category}
              </Select.Option>
            ))}
          </Select>

          <RangePicker 
            value={[filters.dateRange.start, filters.dateRange.end]}
            onChange={handleDateRangeChange}
            allowEmpty={[true, true]}
            style={{ width: 220 }}
          />
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