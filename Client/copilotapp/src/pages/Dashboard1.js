import React, { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react';
import { Card, Button, Typography, Row, Col, Space, Radio, Statistic, Select, Tag, Input, Skeleton, Empty, Alert, Modal, Divider } from 'antd';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { ArrowLeftOutlined, TeamOutlined, BookOutlined, FileTextOutlined, FilterOutlined, RiseOutlined, ReloadOutlined, EyeOutlined, FileSearchOutlined, LinkOutlined, FilePdfOutlined } from '@ant-design/icons';
import { debounce } from 'lodash';
import InfiniteScroll from 'react-infinite-scroll-component';
import api from "../utils/api";
import { useAuth } from '../utils/auth';

const { Text, Paragraph } = Typography;

// Constants and Configuration
const CONFIG = {
  arrayFields: {
    authors: 'authors',
    categories: 'categories',
  },
  fields: {
    title: 'title',
    abstract: 'abstract',
    date: 'publication_date',
    links: {
      url: 'url',
      pdfUrl: 'pdf_url'
    }
  },
  chart: {
    colors: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'],
    itemsPerPage: 10,
    batchSize: 100,
    debounceDelay: 300
  },
  timeRangeOptions: [
    { value: 'all', label: 'All Time' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'last_6_months', label: 'Last 6 Months' },
    { value: 'last_3_months', label: 'Last 3 Months' }
  ]
};


const processChartData = (dataMap, limit = false) => {
  let data = Array.from(dataMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  return limit ? data.slice(0, 10) : data;
};

const filterData = (data, timeRange, filters) => {
  return data.filter(item => {
    if (timeRange !== 'all') {
      const date = new Date(item[CONFIG.fields.date]);
      const now = new Date();
      const months = {
        'last_3_months': 3,
        'last_6_months': 6,
        'last_year': 12
      }[timeRange];
      
      if (months && date < new Date(now.setMonth(now.getMonth() - months))) {
        return false;
      }
    }
    
    return Object.entries(filters).every(([field, values]) => {
      if (!values?.length) return true;
      const itemValues = Array.isArray(item[field]) ? item[field] : [item[field]];
      return values.some(value => itemValues.includes(value));
    });
  });
};

// Chart Components
const RenderActiveShape = React.memo(({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value }) => (
  <g>
    <text x={cx} y={cy - 20} textAnchor="middle" fill="#000">
      {payload.name}
    </text>
    <text x={cx} y={cy + 20} textAnchor="middle" fill="#666">
      {`${value} items (${(percent * 100).toFixed(1)}%)`}
    </text>
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
    <Sector
      cx={cx}
      cy={cy}
      startAngle={startAngle}
      endAngle={endAngle}
      innerRadius={outerRadius + 6}
      outerRadius={outerRadius + 10}
      fill={fill}
    />
  </g>
));


// Main Component
const ResearchDashboard = () => {
  const { state, dispatch } = useAuth();
  

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!state.searchCache) {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          const response = await api.scraping().getPapaerWithoutPagination({ search: "m" });
          dispatch({ type: 'INITIALIZE_DATA', payload: response.data });
        } catch (err) {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load data' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };
    fetchInitialData();
  }, []);
 

  const processMainData = useCallback((mode, data) => {
    if (!data?.length) return;
    
    const field = CONFIG.arrayFields[mode] || mode;
    const yearMap = new Map();
    const categoryMap = new Map();
    
    data.forEach(item => {
      const year = new Date(item[CONFIG.fields.date]).getFullYear();
      const yearEntry = yearMap.get(year) || { value: 0, items: [] };
      yearEntry.value += 1;
      yearEntry.items.push(item);
      yearMap.set(year, yearEntry);
      
      const values = Array.isArray(item[field]) ? item[field] : [item[field]];
      values.forEach(value => {
        if (value) {
          const categoryEntry = categoryMap.get(value) || { value: 0, items: [] };
          categoryEntry.value += 1;
          categoryEntry.items.push(item);
          categoryMap.set(value, categoryEntry);
        }
      });
    });
    
    const yearData = Array.from(yearMap.entries())
      .map(([name, { value, items }]) => ({ name: name.toString(), value, items }))
      .sort((a, b) => b.name - a.name);
      
    const categoryData = Array.from(categoryMap.entries())
      .map(([name, { value, items }]) => ({ name, value, items }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
      
    dispatch({
      type: 'SET_MAIN_DATA',
      payload: {
        yearData,
        categoryData
      }
    });
  }, [dispatch]);



  useEffect(() => {
    if (state.searchResults.length) {
      const applyFilters = debounce(() => {
        const filtered = filterData(state.searchResults, state.selectedTimeRange, state.selectedFilters);
        dispatch({ type: 'SET_FILTERED_DATA', payload: filtered });
        processMainData(state.analysisMode, filtered);
      }, CONFIG.chart.debounceDelay);
      
      applyFilters();
      return () => applyFilters.cancel();
    }
  }, [state.searchResults, state.selectedTimeRange, state.selectedFilters, state.analysisMode, processMainData]);

  const renderLabel = useCallback((props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, name, startAngle, endAngle } = props;
    const RADIAN = Math.PI / 180;
    const arcLength = Math.abs(endAngle - startAngle);
    
    if (arcLength < 6) return null;
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    let fontSize = Math.min(14, arcLength < 15 ? 6 : arcLength < 30 ? 8 : arcLength < 45 ? 10 : 14);
    if (name.length > 20) {
      fontSize = Math.min(fontSize, Math.floor((2 * Math.PI * radius * (arcLength / 360)) / name.length) * 1.5);
    }
    
    return (
      <text 
        x={x} 
        y={y}
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: 500
        }}
      >
        {name =='Natural Language Processing' ? 'NLP' : name}
      </text>
    );
  }, []);
  return (
    <div className="research-dashboard" style={{
      padding: 24,
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden'
      
    }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {state.error && (
          <Alert
            message="Error"
            description={state.error}
            type="error"
            closable
            onClose={() => dispatch({ type: 'CLEAR_ERROR' })}
          />
        )}
        
        {state.isLoading ? (
          <SkeletonUI />
        ) : !state.searchResults.length ? (
          <InitialState />
        ) : !state.hasData ? (
          <NoDataUI 
            searchQuery={state.searchQuery} 
            onReset={() => dispatch({ type: 'RESET' })} 
          />
        ) : (
          <MainContent state={state} dispatch={dispatch} renderLabel={renderLabel} />
        )}
      </Space>
    </div>
  );
};

// UI Components
const MainContent = React.memo(({ state, dispatch, renderLabel }) => (
  <>
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <ChartCard state={state} dispatch={dispatch} renderLabel={renderLabel} />
      </Col>
      <Col span={12}>
        <StatisticsCard state={state} />
        <FiltersCard state={state} dispatch={dispatch} />
      </Col>
    </Row>
    {state.selectedTopic && <DetailSection state={state} dispatch={dispatch} />}
  </>
));


const ChartCard = React.memo(({ state, dispatch,renderLabel }) => {
  const { mainData, selectedCategoryIndex, activeIndex, analysisMode, selectedTopic } = state;



  const handleYearClick = useCallback((data) => {
    if (!data?.payload) return;
    
    const year = data.payload.name;
    const yearFilteredData = state.filteredData.filter(item => 
      new Date(item[CONFIG.fields.date]).getFullYear().toString() === year
    );
    
    const field = CONFIG.arrayFields[state.analysisMode];
    const categoryData = yearFilteredData.reduce((acc, item) => {
      const values = Array.isArray(item[field]) ? item[field] : [item[field]];
      values.forEach(value => {
        if (!value) return;
        const entry = acc.get(value) || { value: 0, items: [] };
        entry.value += 1;
        entry.items.push(item);
        acc.set(value, entry);
      });
      return acc;
    }, new Map());
  
    const newCategoryData = Array.from(categoryData.entries())
      .map(([name, entry]) => ({
        name,
        value: entry.value,
        items: entry.items
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  
    dispatch({ 
      type: 'SELECT_YEAR', 
      payload: { 
        data,
        categoryData: newCategoryData,
        items: yearFilteredData
      } 
    });
  }, [state.filteredData, state.analysisMode]);

  const handleCategoryClick = useCallback((data, index) => {
    dispatch({
      type: 'SELECT_CATEGORY',
      payload: {
        data,
        index,
        items: state.filteredData.filter(item => {
          const categories = Array.isArray(item.categories) ? item.categories : [item.categories];
          return categories.includes(data.payload.name);
        })
      }
    });
  }, [state.filteredData]);
  return (
    <Card 
      title={
        <Row justify="space-between" align="middle" style={{ width: '100%' }}>
          <Space>
            {selectedTopic && (
              <Button 
                icon={<ArrowLeftOutlined />}
                onClick={() => dispatch({ type: 'RESET_SELECTION' })}
              />
            )}
            <RiseOutlined />
            <span>Primary Distribution</span>
          </Space>
          <Radio.Group 
            value={analysisMode}
            onChange={(e) => dispatch({ type: 'SET_ANALYSIS_MODE', payload: e.target.value })}
            buttonStyle="solid"
            size="small"
          >
            {Object.keys(CONFIG.arrayFields).map(field => (
              <Radio.Button key={field} value={field}>
                <BookOutlined /> {field.charAt(0).toUpperCase() + field.slice(1)}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Row>
      }
    >
      <div style={{ height: 500 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              activeIndex={selectedCategoryIndex ?? activeIndex}
              activeShape={RenderActiveShape}
              data={mainData.categoryData}
              cx="50%"
              cy="50%"
              innerRadius={140}
              outerRadius={210}
              paddingAngle={5}
              dataKey="value"
              onMouseEnter={(_, index) => dispatch({ type: 'SET_ACTIVE_INDEX', payload: index })}
              onClick={(data, index) => dispatch({ type: 'SELECT_CATEGORY', payload: { data, index } })}
              cursor="pointer"
              label={renderLabel}
              labelLine={false}
            >
              {mainData.categoryData.map((_, index) => (
                <Cell key={`category-${index}`} fill={CONFIG.chart.colors[index % CONFIG.chart.colors.length]} />
              ))}
            </Pie>
            <Pie
              data={mainData.yearData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={130}
              paddingAngle={2}
              dataKey="value"
              onClick={handleYearClick}
              cursor="pointer"
              label={renderLabel}
              labelLine={false}
            >
              {mainData.yearData.map((_, index) => (
                <Cell key={`year-${index}`} fill={CONFIG.chart.colors[(index + 3) % CONFIG.chart.colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});

const StatisticsCard = React.memo(({ state }) => {
  const { filteredData } = state;
  
  return (
    <Card>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Statistic 
            title={<Space><FileTextOutlined /> Total Items</Space>}
            value={filteredData.length}
          />
        </Col>
        {Object.entries(CONFIG.arrayFields).map(([key, field]) => (
          <Col span={8} key={key}>
            <Statistic 
              title={<Space><TeamOutlined /> {key.charAt(0).toUpperCase() + key.slice(1)}</Space>}
              value={new Set(filteredData.flatMap(item => item[field])).size}
            />
          </Col>
        ))}
      </Row>
    </Card>
  );
});

const FiltersCard = React.memo(({ state, dispatch }) => {
  const { selectedTimeRange, selectedFilters, searchResults } = state;

  const getFilterOptions = (field) => {
    if (field === "source") {
      return Array.from(new Set(searchResults.map(item => item.source)))
        .filter(Boolean)
        .map(value => ({ value, label: value }));
    }
    if (field === "authors" || field === "categories") {
      return Array.from(new Set(searchResults.flatMap(item => item[field])))
        .filter(Boolean)
        .map(value => ({ value, label: value }));
    }
    return [];
  };

  return (
    <Card
      title={<Space><FilterOutlined />Analysis Filters</Space>}
      style={{ marginTop: 16 }}
      className="filter-card"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text strong>Time Period</Text>
          <Select 
            style={{ width: '100%', marginTop: 8 }}
            value={selectedTimeRange}
            onChange={(value) => dispatch({ type: 'SET_TIME_RANGE', payload: value })}
            options={CONFIG.timeRangeOptions}
          />
        </div>

        <div>
          <Text strong>Source</Text>
          <Select
            mode="multiple"
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Select sources"
            value={selectedFilters.source || []}
            onChange={(values) => dispatch({
              type: 'SET_FILTER',
              payload: { field: 'source', values }
            })}
            options={getFilterOptions('source')}
            maxTagCount={2}
          />
        </div>

        <div>
          <Text strong>Authors</Text>
          <Select 
            mode="multiple"
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Select authors"
            value={selectedFilters.authors || []}
            onChange={(values) => dispatch({
              type: 'SET_FILTER',
              payload: { field: 'authors', values }
            })}
            options={getFilterOptions('authors')}
            maxTagCount={2}
          />
        </div>

        <div>
          <Text strong>Categories</Text>
          <Select 
            mode="multiple"
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Select categories"
            value={selectedFilters.categories || []}
            onChange={(values) => dispatch({
              type: 'SET_FILTER',
              payload: { field: 'categories', values }
            })}
            options={getFilterOptions('categories')}
            maxTagCount={2}
          />
        </div>
      </Space>
    </Card>
  );
});

const DetailSection = React.memo(({ state, dispatch }) => {
  const { selectedTopic, selectedYear, detailData } = state;
  const [visibleItems, setVisibleItems] = useState([]);
  const [page, setPage] = useState(0);
  const getDetailTitle = () => {
    if (selectedYear && selectedTopic && !selectedTopic.startsWith('Year')) {
      return `${selectedTopic} (${selectedYear}) - Detailed Analysis`;
    }
    return `${selectedTopic} - Detailed Analysis`;
  };

  useEffect(() => {
    setVisibleItems([]);
    setPage(0);
    if (detailData.length) {
      const initialItems = detailData.slice(0, CONFIG.chart.itemsPerPage);
      setVisibleItems(initialItems);
      setPage(1);
    }
  }, [detailData]);

  const loadMoreItems = useCallback(() => {
    const start = page * CONFIG.chart.itemsPerPage;
    const end = start + CONFIG.chart.itemsPerPage;
    const newItems = detailData.slice(start, end);
    
    if (newItems.length) {
      setVisibleItems(prev => [...prev, ...newItems]);
      setPage(prev => prev + 1);
    }
  }, [page, detailData]);

  return (
    <Card 
      title={<Space><FileTextOutlined />{getDetailTitle()}</Space>}
      style={{ marginTop: 16, maxHeight: '600px', overflow: 'auto' }}
      extra={<Tag color="blue">{detailData.length} items</Tag>}
      id="scrollableDiv"
    >
      <style>
        {
          `#scrollableDiv {
  scrollbar-width: thin;
  scrollbar-color: #d9d9d9 #f0f0f0;
}

#scrollableDiv::-webkit-scrollbar {
  width: 6px;
}

#scrollableDiv::-webkit-scrollbar-track {
  background: #f0f0f0;
}

#scrollableDiv::-webkit-scrollbar {
 display: none !important;
}

#scrollableDiv {
 -ms-overflow-style: none;  /* IE and Edge */
 scrollbar-width: none;  /* Firefox */
}`
        }
      </style>
      <InfiniteScroll
        dataLength={visibleItems.length}
        next={loadMoreItems}
        hasMore={visibleItems.length < detailData.length}
        loader={<Skeleton active paragraph={{ rows: 1 }} />}
        scrollableTarget="scrollableDiv"
      >
        {visibleItems.map((item, index) => (
          <ItemCard key={`${item.id || index}-${index}`} item={item} />
        ))}
      </InfiniteScroll>
    </Card>
  );
});

const ItemCard = React.memo(({ item }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderDetailItem = useCallback((label, value) => (
    <div style={{ marginBottom: 16 }}>
      <Text strong>{label}: </Text>
      {Array.isArray(value) ? (
        <Space wrap>
          {value.map((v, i) => (
            <Tag key={i}>{v}</Tag>
          ))}
        </Space>
      ) : (
        <Text>{value}</Text>
      )}
    </div>
  ), []);

  return (
    <>
      <Card 
        hoverable
        className="item-card"
        style={{ marginBottom: 16 }}
        title={item[CONFIG.fields.title]}
        extra={
          <Button 
            type="text" 
            icon={<EyeOutlined />}
            onClick={() => setIsModalOpen(true)}
            title="View Details"
          />
        }
      >
        <Space direction="vertical" size="small">
          <Text type="secondary">
            <TeamOutlined /> Authors: {item[CONFIG.arrayFields.authors].join(', ')}
          </Text>
          <Text type="secondary">
            <BookOutlined /> Categories: {item[CONFIG.arrayFields.categories].join(', ')}
          </Text>
          <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>
            {item[CONFIG.fields.abstract]}
          </Paragraph>
          <Space>
            {item[CONFIG.fields.links.url] && (
              <Button type="link" href={item[CONFIG.fields.links.url]} target="_blank">
                View Source
              </Button>
            )}
            {item[CONFIG.fields.links.pdfUrl] && (
              <Button type="link" href={item[CONFIG.fields.links.pdfUrl]} target="_blank">
                PDF
              </Button>
            )}
          </Space>
        </Space>
      </Card>

      <Modal
        title={<Space><FileSearchOutlined />Paper Details</Space>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        <div style={{ padding: '20px 0' }}>
          {renderDetailItem('Title', item[CONFIG.fields.title])}
          {renderDetailItem('Authors', item[CONFIG.arrayFields.authors])}
          {renderDetailItem('Categories', item[CONFIG.arrayFields.categories])}
          {renderDetailItem('Publication Date', new Date(item[CONFIG.fields.date]).toLocaleDateString())}
          <Divider />
          <div>
            <Text strong>Abstract:</Text>
            <Paragraph style={{ marginTop: 8 }}>
              {item[CONFIG.fields.abstract]}
            </Paragraph>
          </div>
          <Divider />
          <Space>
            {item[CONFIG.fields.links.url] && (
              <Button 
                type="primary" 
                href={item[CONFIG.fields.links.url]} 
                target="_blank" 
                icon={<LinkOutlined />}
              >
                View Source
              </Button>
            )}
            {item[CONFIG.fields.links.pdfUrl] && (
              <Button 
                type="default" 
                href={item[CONFIG.fields.links.pdfUrl]} 
                target="_blank" 
                icon={<FilePdfOutlined />}
              >
                View PDF
              </Button>
            )}
          </Space>
        </div>
      </Modal>
    </>
  );
});

const SkeletonUI = React.memo(() => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card>
          {/* Chart skeleton */}
          <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Skeleton.Avatar active size={400} shape="circle" />
          </div>
        </Card>
      </Col>
      <Col span={12}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Statistics skeleton */}
          <Card>
            <Row gutter={[16, 16]}>
              {[1, 2, 3].map(key => (
                <Col span={8} key={key}>
                  <Skeleton.Input active block style={{ width: '100%' }} />
                  <Skeleton.Input active block size="small" style={{ width: '60%', marginTop: 8 }} />
                </Col>
              ))}
            </Row>
          </Card>
          
          {/* Filters skeleton */}
          <Card>
            <Skeleton.Input active block style={{ width: '30%', marginBottom: 16 }} />
            {[1, 2, 3, 4].map(key => (
              <div key={key} style={{ marginBottom: 16 }}>
                <Skeleton.Input active block style={{ width: '20%', marginBottom: 8 }} />
                <Skeleton.Input active block style={{ width: '100%' }} />
              </div>
            ))}
          </Card>
        </Space>
      </Col>
    </Row>
  </Space>
));

const InitialState = React.memo(() => (
  <Card style={{ textAlign: 'center', padding: '40px' }}>
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <Text type="secondary">
          Enter a search term to begin exploring the research papers
        </Text>
      }
    />
  </Card>
));

const NoDataUI = React.memo(({ searchQuery, onReset }) => (
  <Card style={{ textAlign: 'center', padding: '40px' }}>
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <Text type="secondary">
          {searchQuery ? `No results found for "${searchQuery}"` : 'No data available'}
        </Text>
      }
    >
      <Button type="primary" onClick={onReset} icon={<ReloadOutlined />}>
        Reset Search
      </Button>
    </Empty>
  </Card>
));

export default React.memo(ResearchDashboard);

// Add CSS styles
const styles = `
.research-dashboard {
    padding: 24px;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;

.item-card {
  transition: all 0.3s ease;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

#scrollableDiv {
  scrollbar-width: thin;
  scrollbar-color: #d9d9d9 #f0f0f0;
}

#scrollableDiv::-webkit-scrollbar {
  width: 6px;
}

#scrollableDiv::-webkit-scrollbar-track {
  background: #f0f0f0;
}

#scrollableDiv::-webkit-scrollbar {
 display: none !important;
}

#scrollableDiv {
 -ms-overflow-style: none;  /* IE and Edge */
 scrollbar-width: none;  /* Firefox */
}

/* Dark theme scrollbar background */
.ant-card {
 background: #1f1f1f;
}

#scrollableDiv::-webkit-scrollbar-thumb {
  background-color: #d9d9d9;
  border-radius: 3px;
}
`;