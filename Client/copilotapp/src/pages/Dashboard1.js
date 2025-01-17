// components/ResearchDashboard/index.jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Divider, 
  Button, 
  Typography, 
  Row, 
  Col, 
  Space, 
  Radio, 
  Statistic,
  Select,
  List,
  Timeline,
  Tag,
  Progress
} from 'antd';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { 
  ArrowLeftOutlined, 
  TeamOutlined, 
  BookOutlined, 
  ExperimentOutlined,
  FileTextOutlined,
  FilterOutlined,
  RiseOutlined
} from '@ant-design/icons';

import './style.css';
import {data} from './data'

const { Title, Text, Paragraph } = Typography;



  
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

const ResearchDashboard = ({ data, config }) => {
  // Configuration with defaults
  const {
    titleField = 'title',
    abstractField = 'abstract',
    dateField = 'publication_date',
    arrayFields = {
      authors: 'authors',
      categories: 'categories'
    },
    linkFields = {
      url: 'url',
      pdfUrl: 'pdf_url'
    }
  } = config || {};

  // States
  const [mainData, setMainData] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [detailData, setDetailData] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [analysisMode, setAnalysisMode] = useState('authors');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [filteredData, setFilteredData] = useState(data);

  // Color palettes
  const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];
  const NESTED_COLORS = ['#40a9ff', '#73d13d', '#ffc53d', '#ff4d4f', '#9254de', '#36cfc9'];

  useEffect(() => {
    processMainData(analysisMode);
  }, [analysisMode, filteredData]);

  useEffect(() => {
    applyDataFilters();
  }, [selectedTimeRange, selectedFilters]);

  const applyDataFilters = () => {
    let filtered = [...data];

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
  };

  const processMainData = (mode) => {
    const field = arrayFields[mode] || mode;
    let categorizedData = {};
    
    filteredData.forEach(item => {
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
        items: filteredData.filter(item => {
          if (Array.isArray(item[field])) {
            return item[field].includes(name);
          }
          return item[field] === name;
        })
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    setMainData(chartData);
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

  const handlePieClick = (data) => {
    if (!data || !data.payload) return;
    setSelectedTopic(data.payload.name);
    const analysis = generateAnalysis(data.payload.items, config);
    setDetailData(analysis);
  };

  const renderItemCard = (item) => (
    <Card 
      className="item-card" 
      style={{ marginBottom: 16 }}
      hoverable
    >
      <Title level={5}>{item[titleField]}</Title>
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
  );

  return (
    <div className="research-dashboard">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              {selectedTopic && (
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => setSelectedTopic(null)}
                />
              )}
              <Title level={2} style={{ margin: 0 }}>
                Analysis Dashboard
              </Title>
            </Space>
          </Col>
          <Col>
            <Radio.Group 
              value={analysisMode}
              onChange={(e) => setAnalysisMode(e.target.value)}
              buttonStyle="solid"
            >
              {Object.keys(arrayFields).map(field => (
                <Radio.Button key={field} value={field}>
                  <BookOutlined /> {field.charAt(0).toUpperCase() + field.slice(1)}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Col>
        </Row>

        {/* Main Content */}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card 
              title={
                <Space>
                  <RiseOutlined />
                  <span>Primary Distribution</span>
                </Space>
              }
            >
              <div style={{ height: 400 }}>
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
                  {Object.entries(arrayFields).map(([key, field], index) => (
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
                      onChange={setSelectedTimeRange}
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
                        onChange={(values) => setSelectedFilters(prev => ({
                          ...prev,
                          [field]: values
                        }))}
                        options={Array.from(new Set(data.flatMap(item => item[field])))
                          .map(value => ({ value, label: value }))}
                        maxTagCount={3}
                      />
                    </div>
                  ))}
                </Space>
              </Card>

              {/* Analysis Summary */}
              <Card
                title={
                  <Space>
                    <RiseOutlined />
                    <span>Distribution Analysis</span>
                  </Space>
                }
              >
                <List
                  size="small"
                  dataSource={mainData}
                  renderItem={(item) => (
                    <List.Item>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text>{item.name}</Text>
                        <Space>
                          <Tag color="blue">{item.value} items</Tag>
                          <Progress 
                            percent={(item.value/filteredData.length)*100} 
                            size="small" 
                            style={{ width: 80 }}
                            showInfo={false}
                          />
                        </Space>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Space>
          </Col>
        </Row>

        {/* Detail Section */}
        {selectedTopic && detailData && (
          <Card 
            title={`${selectedTopic} - Detailed Analysis`}
            style={{ marginTop: 16 }}
          >
            <Row gutter={[16, 16]}>
              {Object.entries(detailData).map(([category, data]) => (
                <Col span={12} key={category}>
                  <Card title={category}>
                    <div style={{ height: 300 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => 
                              `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                          >
                            {data.map((entry, index) => (
                              <Cell 
                                key={index} 
                                fill={NESTED_COLORS[index % NESTED_COLORS.length]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            <Divider />

            <div className="item-list">
              {selectedTopic && mainData.find(d => d.name === selectedTopic)?.items.map((item, index) => (
                <div key={index}>
                  {renderItemCard(item)}
                </div>
              ))}
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};



// utils.js - Utility functions for data processing
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



const App = () => {    

  return (
    <ResearchDashboard 
      data={data} 
      config={config} 
    />
  );
};

export default App;