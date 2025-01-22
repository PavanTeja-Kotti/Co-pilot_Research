import React, { useState, useEffect ,useCallback, useMemo} from 'react';
import { 
  Card, 
  Button, 
  Typography, 
  Row, 
  Col, 
  Space, 
  Radio, 
  Statistic,
  Select,
  Tag,
  Input,
  Skeleton,
  Empty,
  Alert,
  Modal, 
  Divider
} from 'antd';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { 
  ArrowLeftOutlined, 
  TeamOutlined, 
  BookOutlined, 
  FileTextOutlined,
  FilterOutlined,
  SearchOutlined,
  RiseOutlined,
  ReloadOutlined,
  EyeOutlined, 
  FileSearchOutlined, 
  LinkOutlined, 
  FilePdfOutlined 
} from '@ant-design/icons';
import './style.css';
import api from "../utils/api";

const { Search } = Input;
const { Title, Text, Paragraph } = Typography;

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];



const ResearchDashboard = () => {
  // Constants
  const arrayFields = useMemo(() => ({
    authors: 'authors',
    categories: 'categories',
  }), []);

  const fields = useMemo(() => ({
    title: 'title',
    abstract: 'abstract',
    date: 'publication_date',
    links: {
      url: 'url',
      pdfUrl: 'pdf_url'
    }
  }), []);

  // States
  const [mainData, setMainData] = useState({
    yearData: [],
    categoryData: [],
    originalCategoryData: []
  });
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [detailData, setDetailData] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('categories');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  // Memoized data processing functions
  const processMainData = useCallback((mode, data) => {
    const field = arrayFields[mode] || mode;
    
    try {
      // Process year data using reduce for better performance
      const yearMap = data.reduce((acc, item) => {
        const year = new Date(item[fields.date]).getFullYear();
        acc.set(year, (acc.get(year) || 0) + 1);
        return acc;
      }, new Map());

      const yearChartData = Array.from(yearMap.entries())
        .map(([name, value]) => ({
          name: name.toString(),
          value,
          items: data.filter(item => 
            new Date(item[fields.date]).getFullYear().toString() === name.toString()
          )
        }))
        .sort((a, b) => b.name - a.name);

      // Process category data using reduce
      const categoryData = data.reduce((acc, item) => {
        const values = Array.isArray(item[field]) ? item[field] : [item[field]];
        values.forEach(value => {
          if (!value) return;
          acc.set(value, (acc.get(value) || 0) + 1);
        });
        return acc;
      }, new Map());

      const categoryChartData = Array.from(categoryData.entries())
        .map(([name, value]) => ({
          name,
          value,
          items: data.filter(item => {
            if (Array.isArray(item[field])) return item[field].includes(name);
            return item[field] === name;
          })
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      setMainData({
        yearData: yearChartData,
        categoryData: categoryChartData,
        originalCategoryData: categoryChartData
      });
      setError(null);
    } catch (err) {
      setError('Error processing data. Please try again.');
      console.error('Error in processMainData:', err);
    }
  }, [arrayFields, fields.date]);

  // Memoized filter function
  const applyDataFilters = useCallback(() => {
    try {
      let filtered = [...searchResults];

      if (selectedTimeRange !== 'all') {
        const now = new Date();
        const months = {
          'last_3_months': 3,
          'last_6_months': 6,
          'last_year': 12
        }[selectedTimeRange];
        
        if (months) {
          const cutoff = new Date(now.setMonth(now.getMonth() - months));
          filtered = filtered.filter(item => new Date(item[fields.date]) >= cutoff);
        }
      }

      filtered = Object.entries(selectedFilters).reduce((acc, [field, values]) => {
        if (!values?.length) return acc;
        return acc.filter(item => {
          const itemValues = Array.isArray(item[field]) ? item[field] : [item[field]];
          return itemValues.some(value => values.includes(value));
        });
      }, filtered);

      setFilteredData(filtered);
      setHasData(filtered.length > 0);
      processMainData(analysisMode, filtered);
    } catch (err) {
      setError('Error applying filters. Please try again.');
      console.error('Error in applyDataFilters:', err);
    }
  }, [searchResults, selectedTimeRange, selectedFilters, fields.date, analysisMode, processMainData]);

  // Event Handlers
  const handleSearch = useCallback(async (value) => {
    if (!value.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setSearchQuery(value);
    setError(null);
    setSelectedTopic(null);
    setSelectedYear(null);
    setSelectedCategoryIndex(null);
    
    try {
      const response = await api.scraping().getPapaerWithoutPagination({ search: value });
      const results = response.data;
      
      setSearchResults(results);
      setFilteredData(results);
      setHasData(results.length > 0);
      setSelectedFilters({});
      setSelectedTimeRange('all');
      
      processMainData(analysisMode, results);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  }, [analysisMode, processMainData]);


  useEffect(() => {


    async function fetchData() {
    
      await handleSearch("machine learning");

    }

    fetchData();
  },[])
  const handleYearClick = useCallback((data) => {
    if (!data?.payload) return;
    
    const year = data.payload.name;
    setSelectedYear(year);
    
    const yearFilteredData = filteredData.filter(item => 
      new Date(item[fields.date]).getFullYear().toString() === year
    );

    const field = arrayFields[analysisMode] || analysisMode;
    const categorizedData = yearFilteredData.reduce((acc, item) => {
      const values = Array.isArray(item[field]) ? item[field] : [item[field]];
      values.forEach(value => {
        if (!value) return;
        acc.set(value, (acc.get(value) || 0) + 1);
      });
      return acc;
    }, new Map());

    const categoryChartData = Array.from(categorizedData.entries())
      .map(([name, value]) => ({
        name,
        value,
        items: yearFilteredData.filter(item => {
          if (Array.isArray(item[field])) return item[field].includes(name);
          return item[field] === name;
        })
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    setMainData(prev => ({
      ...prev,
      categoryData: categoryChartData
    }));
    
    setSelectedTopic(`Year ${year}`);
    setDetailData(yearFilteredData);
  }, [analysisMode, arrayFields, fields.date, filteredData]);

  const handleCategoryClick = useCallback((data, index) => {
    if (!data?.payload) return;
    
    setSelectedCategoryIndex(index);
    const category = data.payload.name;
    const field = arrayFields[analysisMode] || analysisMode;
    
    let filteredItems = filteredData;
    
    if (selectedYear) {
      filteredItems = filteredItems.filter(item => 
        new Date(item[fields.date]).getFullYear().toString() === selectedYear
      );
    }
    
    filteredItems = filteredItems.filter(item => {
      if (Array.isArray(item[field])) return item[field].includes(category);
      return item[field] === category;
    });
    
    setSelectedTopic(selectedYear ? `${category} (${selectedYear})` : category);
    setDetailData(filteredItems);
  }, [analysisMode, arrayFields, fields.date, filteredData, selectedYear]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setSelectedFilters({});
    setSelectedTimeRange('all');
    setFilteredData([]);
    setSearchResults([]);
    setHasData(false);
    setError(null);
    setSelectedTopic(null);
    setSelectedYear(null);
    setSelectedCategoryIndex(null);
    setMainData({
      yearData: [],
      categoryData: [],
      originalCategoryData: []
    });
  }, []);

  const handleBackClick = useCallback(() => {
    setSelectedTopic(null);
    setSelectedYear(null);
    setSelectedCategoryIndex(null);
    setMainData(prev => ({
      ...prev,
      categoryData: prev.originalCategoryData
    }));
    setDetailData([]);
  }, []);

  // Effects
  useEffect(() => {
    if (searchResults.length > 0) {
      applyDataFilters();
    }
  }, [analysisMode, selectedTimeRange, selectedFilters, searchResults, applyDataFilters]);

  // Memoized filter options
  const filterOptions = useMemo(() => {
    return Object.entries(arrayFields).map(([key, field]) => ({
      key,
      field,
      options: Array.from(new Set(searchResults.flatMap(item => item[field])))
        .map(value => ({ value, label: value }))
    }));
  }, [arrayFields, searchResults]);

  const timeRangeOptions = useMemo(() => [
    { value: 'all', label: 'All Time' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'last_6_months', label: 'Last 6 Months' },
    { value: 'last_3_months', label: 'Last 3 Months' }
  ], []);



  return (
    <div className="research-dashboard">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Search Header */}
        {/* <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Search by title, abstract, authors, or categories..."
              allowClear
              enterButton={<Button type="primary" icon={<SearchOutlined />}>Search</Button>}
              size="large"
              onSearch={handleSearch}
              loading={isLoading}
              defaultValue={searchQuery}
            />
          </Col>
          {searchResults.length > 0 && (
            <Col>
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={isLoading}
              >
                Reset
              </Button>
            </Col>
          )}
        </Row> */}

        {/* Error Message */}
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* Main Content */}
        {isLoading ? (
          <SkeletonUI />
        ) : !searchResults.length ? (
          <InitialState />
        ) : !hasData ? (
          <NoDataUI searchQuery={searchQuery} onReset={handleReset} />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card 
                  title={
                    <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                      <Space>
                        {selectedTopic && (
                          <Button 
                            icon={<ArrowLeftOutlined />} 
                            onClick={handleBackClick}
                          />
                        )}
                        <RiseOutlined />
                        <span>Primary Distribution</span>
                      </Space>
                      <Radio.Group 
                        value={analysisMode}
                        onChange={(e) => setAnalysisMode(e.target.value)}
                        buttonStyle="solid"
                        size="small"
                      >
                        {Object.keys(arrayFields).map(field => (
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
                          activeIndex={selectedCategoryIndex !== null ? selectedCategoryIndex : activeIndex}
                          activeShape={RenderActiveShape}
                          data={mainData.categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={140}
                          outerRadius={210}
                          paddingAngle={5}
                          dataKey="value"
                          onMouseEnter={(_, index) => setActiveIndex(index)}
                          onClick={(data, index) => handleCategoryClick(data, index)}
                          cursor="pointer"
                          label={renderLabel}
                          labelLine={false}
                        >
                          {mainData.categoryData.map((_, index) => (
                            <Cell key={`category-${index}`} fill={COLORS[index % COLORS.length]} />
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
                            <Cell key={`year-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                          ))}
                        </Pie>
                        
                        <Tooltip />
                        {/* <Legend  ></Legend> */}
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>

              <Col span={12}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {/* Statistics */}
                  <Card>
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Statistic 
                          title={<Space><FileTextOutlined /> Total Items</Space>}
                          value={filteredData.length}
                        />
                      </Col>
                      {Object.entries(arrayFields).map(([key, field]) => (
                        <Col span={8} key={key}>
                          <Statistic 
                            title={
                              <Space>
                                <TeamOutlined /> 
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                              </Space>
                            }
                            value={new Set(filteredData.flatMap(item => item[field])).size}
                          />
                        </Col>
                      ))}
                    </Row>
                  </Card>

                  {/* Filters */}
                  <Card
                    title={
                      <Space>
                        <FilterOutlined />
                        <span>Analysis Filters</span>
                      </Space>
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      {/* Time Filter */}
                      <div>
                        <Text strong>Time Period</Text>
                        <Select 
                          style={{ width: '100%', marginTop: 8 }}
                          value={selectedTimeRange}
                          onChange={(value) => setSelectedTimeRange(value)}
                          options={timeRangeOptions}
                        />
                      </div>

                      {/* Dynamic Filters */}
                      {filterOptions.map(({ key, field, options }) => (
                        <div key={key}>
                          <Text strong>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                          <Select 
                            mode="multiple"
                            style={{ width: '100%', marginTop: 8 }}
                            placeholder={`Select ${key}`}
                            value={selectedFilters[field] || []}
                            onChange={(values) => setSelectedFilters(prev => ({ ...prev, [field]: values }))}
                            options={options}
                            maxTagCount={3}
                          />
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Space>
              </Col>
            </Row>

            {/* Detail Section */}
            {selectedTopic && detailData && (
              <Card 
                title={
                  <Space>
                    <FileTextOutlined />
                    {`${selectedTopic} - Detailed Analysis`}
                  </Space>
                }
                style={{ marginTop: 16 }}
                extra={
                  <Tag color="blue">
                    {detailData.length} {detailData.length === 1 ? 'item' : 'items'}
                  </Tag>
                }
              >
                <div className="item-list">
                  {detailData.map((item, index) => (
                    <ItemCard
                      key={index}
                      item={item}
                      arrayFields={arrayFields}
                      titleField={fields.title}
                      abstractField={fields.abstract}
                      linkFields={fields.links}
                    />
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </Space>
    </div>
  );
};

export default React.memo(ResearchDashboard);




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

// Memoized UI Components
const SkeletonUI = React.memo(() => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card>
          <Skeleton.Avatar size={200} active shape="circle" />
          <Skeleton active />
        </Card>
      </Col>
      <Col span={12}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card>
            <Skeleton.Button active block size="large" />
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
          <Card>
            <Skeleton.Input active size="large" block />
            <Skeleton active paragraph={{ rows: 4 }} />
          </Card>
        </Space>
      </Col>
    </Row>
  </Space>
));

const InitialState = React.memo(() => (
  <Card style={{ textAlign: 'center', padding: '40px' }}>
    <Space direction="vertical" size="large">
      <FileTextOutlined style={{ fontSize: '48px', color: '#bfbfbf' }} />
      <Text type="secondary">
        Enter a search term to begin exploring the research papers
      </Text>
    </Space>
  </Card>
));

const NoDataUI = React.memo(({ searchQuery, onReset }) => (
  <Card style={{ textAlign: 'center', padding: '40px' }}>
    <Space direction="vertical" size="large">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Text type="secondary">
            {searchQuery 
              ? `No results found for "${searchQuery}"`
              : 'No data available'}
          </Text>
        }
      />
      <Button type="primary" onClick={onReset} icon={<ReloadOutlined />}>
        Reset Search
      </Button>
    </Space>
  </Card>
));

const renderLabel = (props) => {
  const { 
    cx, 
    cy, 
    midAngle, 
    innerRadius, 
    outerRadius, 
    value, 
    name, 
    startAngle, 
    endAngle 
  } = props;
  
  const RADIAN = Math.PI / 180;
  const arcLength = Math.abs(endAngle - startAngle);
  
  // Calculate the middle radius for text placement
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  
  // Calculate position
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Calculate available width based on arc length and radius
  const availableWidth = 2 * Math.PI * radius * (arcLength / 360);
  
  // Dynamic font sizing based on segment size and text length
  let fontSize = 14; // Default size
  if (arcLength < 6) {
    return null; // Don't render text for very small segments
  } 
  else if (arcLength < 15) {
    fontSize=6;
    
  } else if (arcLength < 30) {
    fontSize = 8;
  } else if (arcLength < 45) {
    fontSize = 10;
  } else if (name.length > 20) {
    // Reduce font size for long text
    fontSize = Math.min(14, Math.floor(availableWidth / name.length) * 1.5);
  }
  
  // For very large segments (like main categories)
  if (arcLength > 60) {
    fontSize = Math.min(18, fontSize); // Cap maximum size
  }
  
  // Split long text into multiple lines if segment is large enough
  const words = name.split(' ');
  const shouldWrap = arcLength > 45 && words.length > 1;
  
  if (shouldWrap) {
    // Calculate middle word index
    const middleIndex = Math.floor(words.length / 2);
    const firstLine = words.slice(0, middleIndex).join(' ');
    const secondLine = words.slice(middleIndex).join(' ');
    
    return (
      <g>
        <text 
          x={x} 
          y={y - fontSize/2}
          fill="white" 
          textAnchor="middle" 
          dominantBaseline="central"
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: 500
          }}
        >
          {firstLine}
        </text>
        <text 
          x={x} 
          y={y + fontSize/2}
          fill="white" 
          textAnchor="middle" 
          dominantBaseline="central"
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: 500
          }}
        >
          {secondLine}
        </text>
      </g>
    );
  }
  
  // Single line text
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
      {name}
    </text>
  );
};

const ItemCard = React.memo (({ 
  item, 
  titleField, 
  abstractField, 
  arrayFields, 
  linkFields 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => setIsModalOpen(true);
  const handleCancel = () => setIsModalOpen(false);

  const renderDetailItem = (label, value) => (
    <div style={{ marginBottom: 16 }}>
      <Text strong>{label}: </Text>
      {Array.isArray(value) ? (
        <div style={{ marginTop: 8 }}>
          {value.map((v, i) => (
            <Tag key={i} style={{ marginBottom: 4 }}>{v}</Tag>
          ))}
        </div>
      ) : typeof value === 'boolean' ? (
        <Tag color={value ? 'green' : 'red'}>
          {value ? 'Yes' : 'No'}
        </Tag>
      ) : (
        <Text>{value}</Text>
      )}
    </div>
  );

  return (
    <>
      <Card 
        title={item[titleField]}
        className="item-card" 
        style={{ marginBottom: 16 }}
        hoverable
        extra={
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={showModal}
            title="View Details"
          />
        }
      >
        {/* <Title level={5}>{item[titleField]}</Title> */}
        <Space direction="vertical" size="small">
          {Object.entries(arrayFields).map(([key, field]) => (
            <Text key={key} type="secondary">
              <TeamOutlined /> {key.charAt(0).toUpperCase() + key.slice(1)}: {
                Array.isArray(item[field]) ? item[field].join(', ') : item[field]
              }
            </Text>
          ))}
          <Paragraph 
            ellipsis={{ 
              rows: 2, 
              expandable: true, 
              symbol: 'more' 
            }}
          >
            {item[abstractField]}
          </Paragraph>
          <Space>
            {Object.entries(linkFields).map(([key, field]) => (
              item[field] && (
                <Button key={key} type="link" href={item[field]} target="_blank">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Button>
              )
            ))}
          </Space>
        </Space>
      </Card>

      <Modal
        title={
          <Space>
            <FileSearchOutlined />
            <span>Paper Details</span>
          </Space>
        }
        open={isModalOpen}
        onCancel={handleCancel}
        footer={[
          <Button key="close" onClick={handleCancel}>
            Close
          </Button>
        ]}
        width={700}
      >
        <div style={{ padding: '20px 0' }}>
          {renderDetailItem('ID', item.id)}
          {renderDetailItem('Title', item.title)}
          {renderDetailItem('Authors', item.authors)}
          {renderDetailItem('Source', item.source)}
          {renderDetailItem('Categories', item.categories)}
          {renderDetailItem('Publication Date', new Date(item.publication_date).toLocaleDateString())}
          {renderDetailItem('Created At', new Date(item.created_at).toLocaleString())}
          {renderDetailItem('Is Bookmarked', item.is_bookmarked)}
          {renderDetailItem('Bookmark ID', item.bookmark_id)}
          {renderDetailItem('Active Bookmarks Count', item.active_bookmarks_count)}
          {renderDetailItem('Paper Read', item.is_paper_read)}
          
          <Divider />
          
          <div>
            <Text strong>Abstract:</Text>
            <Paragraph style={{ marginTop: 8 }}>
              {item.abstract}
            </Paragraph>
          </div>

          <Divider />

          <Space>
            {item.url && (
              <Button type="primary" href={item.url} target="_blank" icon={<LinkOutlined />}>
                View Source
              </Button>
            )}
            {item.pdf_url && (
              <Button type="default" href={item.pdf_url} target="_blank" icon={<FilePdfOutlined />}>
                View PDF
              </Button>
            )}
          </Space>
        </div>
      </Modal>
    </>
  );
});

const config = {
  titleField: 'title',
  abstractField: 'abstract',
  dateField: 'publication_date',
  arrayFields: {
    authors: 'authors',
    categories: 'categories'
  },
  linkFields: {
    url: 'url',
    pdfUrl: 'pdf_url'
  }
};

export const generateAnalysis = (items, config) => {
  const { abstractField = 'abstract', arrayFields = {} } = config;

  const analyses = {
    'Content Analysis': items.map(item => {
      const text = item[abstractField]?.toLowerCase() || '';
      const length = text.length;
      
      return {
        name: length < 500 ? 'Short' : length < 1000 ? 'Medium' : 'Long',
        value: 1
      };
    }).reduce((acc, curr) => {
      acc[curr.name] = (acc[curr.name] || 0) + curr.value;
      return acc;
    }, {}),

    'Team Size': items.map(item => {
      const count = Array.isArray(item[arrayFields.authors]) 
        ? item[arrayFields.authors].length 
        : 0;
      
      return {
        name: count <= 2 ? 'Small (1-2)' : count <= 4 ? 'Medium (3-4)' : 'Large (5+)',
        value: 1
      };
    }).reduce((acc, curr) => {
      acc[curr.name] = (acc[curr.name] || 0) + curr.value;
      return acc;
    }, {})
  };

  return Object.entries(analyses).reduce((acc, [key, value]) => {
    acc[key] = Object.entries(value).map(([name, value]) => ({
      name,
      value
    }));
    return acc;
  }, {});
};