import React, { useState, useEffect } from 'react';
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
  // States
  const [mainData, setMainData] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [detailData, setDetailData] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [analysisMode, setAnalysisMode] = useState('authors');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]); // Original search results

  // Configuration
  const arrayFields = {
    authors: 'authors',
    categories: 'categories'
  };

  const titleField = 'title';
  const abstractField = 'abstract';
  const dateField = 'publication_date';
  const linkFields = {
    url: 'url',
    pdfUrl: 'pdf_url'
  };

  // Effects
  useEffect(() => {
    if (hasSearched && filteredData.length > 0) {
      processMainData(analysisMode, filteredData);
    }
  }, [analysisMode]);

  useEffect(() => {
    if (hasSearched) {
      applyDataFilters();
    }
  }, [selectedTimeRange, selectedFilters, searchResults]);

  // Data processing functions
  const processMainData = (mode, data) => {
    const field = arrayFields[mode] || mode;
    let categorizedData = {};
    
    try {
      data.forEach(item => {
        if (Array.isArray(item[field])) {
          item[field].forEach(value => {
            categorizedData[value] = (categorizedData[value] || 0) + 1;
          });
        } else if (item[field]) {
          categorizedData[item[field]] = (categorizedData[item[field]] || 0) + 1;
        }
      });

      const chartData = Object.entries(categorizedData)
        .map(([name, value]) => ({
          name,
          value,
          items: data.filter(item => {
            if (Array.isArray(item[field])) {
              return item[field].includes(name);
            }
            return item[field] === name;
          })
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      setMainData(chartData);
      setError(null);
    } catch (err) {
      setError('Error processing data. Please try again.');
      console.error('Error in processMainData:', err);
    }
  };

  const applyDataFilters = () => {
    try {
      let filtered = [...searchResults];

      // Time range filter
      if (selectedTimeRange !== 'all') {
        const now = new Date();
        const months = {
          'last_3_months': 3,
          'last_6_months': 6,
          'last_year': 12
        }[selectedTimeRange];
        
        if (months) {
          const cutoff = new Date(now.setMonth(now.getMonth() - months));
          filtered = filtered.filter(item => new Date(item[dateField]) >= cutoff);
        }
      }

      // Apply selected filters
      Object.entries(selectedFilters).forEach(([field, values]) => {
        if (values && values.length > 0) {
          filtered = filtered.filter(item => {
            if (Array.isArray(item[field])) {
              return item[field].some(value => values.includes(value));
            }
            return values.includes(item[field]);
          });
        }
      });

      setFilteredData(filtered);
      setHasData(filtered.length > 0);
      processMainData(analysisMode, filtered);
    } catch (err) {
      setError('Error applying filters. Please try again.');
      console.error('Error in applyDataFilters:', err);
    }
  };

  // Event Handlers
  const handleSearch = async (value) => {
    if (!value.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setSearchQuery(value);
    setError(null);
    setSelectedTopic(null);
    
    try {

      const response = await api.scraping().getPapaerWithoutPagination({ search: value });
      const results = response.data;
      
      setSearchResults(results);
      setFilteredData(results);
      setHasData(results.length > 0);
      setSelectedFilters({});
      setSelectedTimeRange('all');
      setHasSearched(true);
      
      processMainData(analysisMode, results);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedFilters({});
    setSelectedTimeRange('all');
    setFilteredData([]);
    setSearchResults([]);
    setHasData(false);
    setError(null);
    setSelectedTopic(null);
    setHasSearched(false);
    setMainData([]);
  };

  const handleFilterChange = (field, values) => {
    setSelectedFilters(prev => ({
      ...prev,
      [field]: values
    }));
  };

  const handleTimeRangeChange = (value) => {
    setSelectedTimeRange(value);
  };

  const handlePieClick = (data) => {
    if (!data || !data.payload) return;
    setSelectedTopic(data.payload.name);
    setDetailData(data.payload.items);
  };

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    
    return (
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
    );
  };



  const renderSkeletonUI = () => (
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
  );

  const renderInitialState = () => (
    <Card style={{ textAlign: 'center', padding: '40px' }}>
      <Space direction="vertical" size="large">
        <FileTextOutlined style={{ fontSize: '48px', color: '#bfbfbf' }} />
        <Text type="secondary">
          Enter a search term to begin exploring the research papers
        </Text>
      </Space>
    </Card>
  );

  const renderNoDataUI = () => (
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
        <Button type="primary" onClick={handleReset} icon={<ReloadOutlined />}>
          Reset Search
        </Button>
      </Space>
    </Card>
  );

  return (
    <div className="research-dashboard">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Search Header */}
        <Row gutter={[16, 16]} align="middle">
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
          {hasSearched && (
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
        </Row>

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
          renderSkeletonUI()
        ) : !hasSearched ? (
          renderInitialState()
        ) : !hasData ? (
          renderNoDataUI()
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
                            onClick={() => setSelectedTopic(null)}
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
                  <div style={{ height: 347 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          activeIndex={activeIndex}
                          activeShape={renderActiveShape}
                          data={mainData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                          onMouseEnter={(_, index) => setActiveIndex(index)}
                          onClick={handlePieClick}
                          cursor="pointer"
                        >
                          {mainData.map((entry, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
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
                          onChange={handleTimeRangeChange}
                          options={[
                            { value: 'all', label: 'All Time' },
                            { value: 'last_year', label: 'Last Year' },
                            { value: 'last_6_months', label: 'Last 6 Months' },
                            { value: 'last_3_months', label: 'Last 3 Months' }
                          ]}
                        />
                      </div>

                      {/* Dynamic Filters */}
                      {Object.entries(arrayFields).map(([key, field]) => (
                        <div key={key}>
                          <Text strong>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                          <Select 
                            mode="multiple"
                            style={{ width: '100%', marginTop: 8 }}
                            placeholder={`Select ${key}`}
                            value={selectedFilters[field] || []}
                            onChange={(values) => handleFilterChange(field, values)}
                            options={Array.from(new Set(searchResults.flatMap(item => item[field])))
                              .map(value => ({ value, label: value }))}
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
                    <div key={index}>
                      <ItemCard
                        item={item}
                        titleField={titleField}
                        abstractField={abstractField}
                        arrayFields={arrayFields}
                        linkFields={linkFields}
                      />
                    </div>
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





export default ResearchDashboard


const ItemCard = ({ 
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
};

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