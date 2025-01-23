import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Select, Tag, Space, Badge, Skeleton,theme } from 'antd';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  BookOutlined, 
  ClockCircleOutlined, 
  StarOutlined, 
  RiseOutlined, 
  FallOutlined, 
  FireOutlined 
} from '@ant-design/icons';
import api from '../utils/api'
import { DynamicIconRenderer } from './InterestPage';
import InfiniteScroll from 'react-infinite-scroll-component';


const { useToken } = theme;

const { Title, Text } = Typography;
const { Option } = Select;

const ITEMS_PER_PAGE = 4;

const Dashboard = () => {
  
  const token = useToken();
  const [loading, setLoading] = useState(true);
  const [paperLoading, setPaperLoading] = useState(false);
  const [data, setData] = useState({
    readingData: [],
    papers: [],
    recommendations: [],
    topicDistribution: [],
    statsData: []
  });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [topicFilter, setTopicFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [totalCount, setTotalCount] = useState(0);
  const [defaultPapers, setDefaultPapers] = useState('ResearchPaper');

  const loadMorePapers = async () => {
    if (paperLoading) return;
    
    setPaperLoading(true);
    try {
      const response = await api.scraping().dynamicPaper({
        limit: ITEMS_PER_PAGE,
        offset,
        // search: topicFilter,
        sort: sortBy,
        Table:defaultPapers,
        pagginated:true
      });
      const { results, count, next } = response.data;
      setTotalCount(count);
      setHasMore(!!next);
      setData(prev => ({
        ...prev,
        papers: [...prev.papers, ...results]
      }));
      setOffset(prev => prev + ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading more papers:', error);
    } finally {
      setPaperLoading(false);
    }
  };

  const resetPapers = () => {
    setOffset(0);
    setHasMore(true);
    setData(prev => ({ ...prev, papers: [] }));
  };

  const handleTopicChange = (value) => {
    setTopicFilter(value);
    resetPapers();
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    resetPapers();
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [readingResponse, recommendationsResponse, topicsResponse, statsResponse] = 
          await Promise.all([
            api.scraping().readingstats(),
            await Promise.resolve({ data: recommendations }),
            await Promise.resolve({ data: topicDistribution }),
            api.scraping().statsdata()
          ]);

        setData(prev => ({
          ...prev,
          readingData: readingResponse.data,
          recommendations: recommendationsResponse.data,
          topicDistribution: topicsResponse.data,
          statsData: statsResponse.data
        }));
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchBookmarks = async () => {
      setPaperLoading(true);
      try {
        const bookmarksResponse = await api.scraping().dynamicPaper({
          limit: ITEMS_PER_PAGE,
          offset: 0,
          search: topicFilter,
          sort: sortBy,
          Table: defaultPapers,
          pagginated: 'True'
        });
        setData(prev => ({
          ...prev,
          papers: bookmarksResponse.data.results
        }));
        setTotalCount(bookmarksResponse.data.count);
        setHasMore(!!bookmarksResponse.data.next);
      } catch (error) {
        console.error('Error fetching papers:', error);
      } finally {
        setPaperLoading(false);
      }
    };

    fetchBookmarks();
  }, [topicFilter, sortBy]);

  

  const recommendations = [
    {
      title: "Emergent Abilities of Large Language Models: A Comprehensive Analysis",
      relevance: 98,
      reason: "Matches your interest in LLM scaling and capabilities",
      citations: 1840,
      authors: "Wei, J., et al.",
      conference: "ACL 2024"
    },
    {
      title: "Transformer Evolution: A Study of Modern Architecture Variants",
      relevance: 96,
      reason: "Related to your recent readings on architecture design",
      citations: 1256,
      authors: "Anderson, M., et al.",
      conference: "ICLR 2024"
    }
  ];

  const topicDistribution = [
    { topic: "Large Language Models", percentage: 35 },
    { topic: "AI Safety & Ethics", percentage: 25 },
    { topic: "Model Architecture", percentage: 20 },
    { topic: "Vision & Multimodal", percentage: 15 },
    { topic: "BlockChain", percentage: 18 },
    { topic: "Cybersecurity", percentage: 22 },
    { topic: "Machine learning", percentage: 22 },
    { topic: "Other Topics", percentage: 5 }
  ];


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


 
  // Skeleton components
  const StatCardSkeleton = () => (
    <div style={{ 
      background: '#141414',
      borderRadius: '8px',
      padding: '20px',
      border: '1px solid #303030'
    }}>
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <Skeleton.Avatar active size={40} />
        <Skeleton.Input style={{ width: 60 }} active size="small" />
      </div>
      <Skeleton.Input style={{ width: 120 }} active size="large" />
      <div style={{ marginTop: 8 }}>
        <Skeleton.Input style={{ width: 80 }} active size="small" />
      </div>
    </div>
  );

  const renderStats = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {loading ? (
        <>
          {[1, 2, 3, 4].map((i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <StatCardSkeleton />
            </Col>
          ))}
        </>
      ) : (
        data.statsData.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <div style={{ 
              background: '#141414',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #303030'
            }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  background: 'rgba(24, 144, 255, 0.1)',
                  padding: '8px',
                  borderRadius: '8px'
                }}>
                  {<DynamicIconRenderer iconName={stat.prefix} style={{ color: '#1890ff', fontSize: '20px' }} ></DynamicIconRenderer>}
                </div>
                <Text style={{ 
                  color: stat.trend === 'up' ? '#49aa19' : '#d32029',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {stat.trend === 'up' ? <RiseOutlined /> : <FallOutlined />} 
                  {stat.suffix}
                </Text>
              </div>
              <div>
                <Text style={{ 
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#fff',
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  {stat.value}
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                  {stat.title}
                </Text>
              </div>
            </div>
          </Col>
        ))
      )}
    </Row>
  );

  const renderChart = () => (
    <Col xs={24} lg={16}>
      <div style={{ 
        background: '#141414',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #303030'
      }}>
        {loading ? (
          <>
            <Skeleton active paragraph={{ rows: 1 }} />
            <Skeleton.Input style={{ width: '100%', height: 300 }} active />
          </>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <Title level={5} style={{ color: '#fff', margin: 0 }}>Reading Activity</Title>
              <Text style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Papers read over time</Text>
            </div>
            <div style={{ height: 325 }}>
              <ResponsiveContainer>
                <LineChart data={data.readingData}>
                  <XAxis 
                    dataKey="month" 
                    stroke="rgba(255, 255, 255, 0.45)"
                    tick={{ fill: 'rgba(255, 255, 255, 0.45)' }}
                  />
                  <YAxis 
                    stroke="rgba(255, 255, 255, 0.45)"
                    tick={{ fill: 'rgba(255, 255, 255, 0.45)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1f1f1f',
                      border: '1px solid #303030',
                      borderRadius: '4px'
                    }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="papers" 
                    stroke="#1890ff"
                    strokeWidth={2}
                    dot={{ fill: '#1890ff', strokeWidth: 2 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </Col>
  );

  const renderRecommendations = () => (
    <Col xs={24} lg={8}>
      <div style={{ 
        background: '#141414',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #303030'
      }}>
        {loading ? (
          <>
            <Skeleton active paragraph={{ rows: 1 }} />
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {[1, 2].map((i) => (
                <div key={i} style={{ 
                  background: '#141414',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #303030'
                }}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                  <Space>
                    <Skeleton.Button active size="small" />
                    <Skeleton.Button active size="small" />
                  </Space>
                </div>
              ))}
            </Space>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <Title level={5} style={{ color: '#fff', margin: 0 }}>Recommended</Title>
            </div>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {data.recommendations.map((paper, index) => (
                <div 
                  key={index} 
                  style={{ 
                    background: '#141414',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #303030'
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <Text style={{ 
                        color: '#fff',
                        fontWeight: 500,
                        flex: 1,
                        marginRight: '8px'
                      }}>
                        {paper.title}
                      </Text>
                      <Tag style={{ 
                        background: '#162312',
                        color: '#49aa19',
                        margin: 0,
                        border: 'none'
                      }}>
                        {paper.relevance}%
                      </Tag>
                    </div>
                    <Text style={{ 
                      color: 'rgba(255, 255, 255, 0.45)',
                      display: 'block'
                    }}>
                      {paper.authors}
                    </Text>
                  </div>

                  <Text style={{ 
                    color: 'rgba(255, 255, 255, 0.45)',
                    fontSize: '12px',
                    display: 'block',
                    marginBottom: '12px'
                  }}>
                    {paper.reason}
                  </Text>

                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Tag style={{
                      background: 'rgba(24, 144, 255, 0.1)',
                      color: '#1890ff',
                      border: 'none'
                    }}>
                      {paper.conference}
                    </Tag>
                    <Text style={{ 
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <StarOutlined /> {paper.citations} citations
                    </Text>
                  </div>
                  </div>
              ))}
            </Space>
          </>
        )}
      </div>
    </Col>
  );

  const renderResearchFocus = () => (
    <Col xs={24} lg={8}>
      <div style={{ 
        
        background: '#141414',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #303030',
        maxHeight: '530px',

      }}>
        {loading ? (
          <>
            <Skeleton active paragraph={{ rows: 1 }} />
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <Skeleton.Input style={{ width: 150 }} active size="small" />
                    <Skeleton.Input style={{ width: 50 }} active size="small" />
                  </div>
                  <Skeleton.Input style={{ width: '100%', height: 10 }} active size="small" />
                </div>
              ))}
            </Space>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <Title level={5} style={{ color: '#fff', margin: 0 }}>Research Focus</Title>
              <Text style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Topic distribution</Text>
            </div>

            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {data.topicDistribution.map((item, index) => (
                <div key={index}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <Text style={{ color: '#fff' }}>{item.topic}</Text>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                      {item.percentage}%
                    </Text>
                  </div>
                  <div style={{ 
                    width: '100%',
                    height: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${item.percentage}%`,
                      height: '100%',
                      background: '#1890ff',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              ))}
            </Space>
          </>
        )}
      </div>
    </Col>
  );


  const renderPaperslist = (data,type) => {
    let papers = [];
    console.log(data);
    switch(type) {
      case 'BookmarkedPaper':
        papers = data?.map(item => ({
          ...item.paper_details,
          bookmarked_at: item.bookmarked_at
        }));
        break;
      case 'ResearchPaper':
        papers = data;
        break;
      case 'ReadPaper':
        papers = data?.map(item => ({
          ...item.paper_details,
          read_at: item.read_at
        }));
        break;
      default:
        return null;
    }

    return papers?.map((paper, index) => {
      const author = paper.authors?.join(',');
      
      return (
        <Col xs={24} md={12} key={index}>
          <div style={{ 
            background: '#141414',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #303030',
            height: '100%'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '8px',
                  maxLines: 2
                }}>
                  {paper.title?.length > 50 ? paper.title.substring(0, 50) + "..." : paper.title}
                </Text>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.45)',
                  display: 'block'
                }}>
                  {author?.length > 50 ? author.substring(0, 50) + "..." : author}
                </Text>
              </div>
              {type === 'ResearchPaper' && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  marginLeft: '8px'
                }}>
                  <Badge 
                    status="processing" 
                    text={
                      <Text style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                        Trending
                      </Text>
                    }
                  />
                </div>
              )}
            </div>
            
            <div style={{ 
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {paper.source && (
                <Tag style={{
                  background: 'rgba(24, 144, 255, 0.1)',
                  borderColor: 'transparent',
                  color: '#1890ff'
                }}>
                  {paper.source}
                </Tag>
              )}
              {paper.categories?.map((tag, tagIndex) => (
                <Tag 
                  key={tagIndex}
                  style={{
                    background: 'rgba(0, 255, 255, 0.1)',
                    borderColor: 'transparent',
                    color: '#13c2c2'
                  }}
                >
                  {tag}
                </Tag>
              ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: 'rgba(255, 255, 255, 0.45)'
            }}>
              <Text style={{ color: 'inherit' }}>
                {type === 'BookmarkedPaper' && 'Bookmarked: ' + new Date(paper.bookmarked_at).toLocaleDateString()}
                {type === 'ReadPaper' && 'Read: ' + new Date(paper.read_at).toLocaleDateString()}
                {type === 'ResearchPaper' && 'Published: ' + new Date(paper.publication_date).toLocaleDateString()}
              </Text>
              <Text style={{ 
                color: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <StarOutlined />
                {paper.citation_count || 0}
              </Text>
            </div>
          </div>
        </Col>
      );
    });
  };


  const renderPapersGrid = () => (
    <Col xs={24} lg={16}>
      <div style={{ 
        background: '#141414',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #303030'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={5} style={{ color: '#fff', margin: 0 }}>Recent Papers</Title>
              <Text style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Your latest research papers</Text>
            </Col>
            <Col>
              <Space>
                <Select 
                  value={topicFilter} 
                  onChange={handleTopicChange}
                  style={{ width: 120 }}
                  dropdownStyle={{ background: '#1f1f1f', borderColor: '#303030' }}
                >
                  <Option value="all">All Topics</Option>
                  <Option value="llm">LLM</Option>
                  <Option value="ethics">AI Ethics</Option>
                  <Option value="vision">Vision</Option>
                </Select>
                <Select 
                  value={sortBy}
                  onChange={handleSortChange}
                  style={{ width: 120 }}
                  dropdownStyle={{ background: '#1f1f1f', borderColor: '#303030' }}
                >
                  <Option value="recent">Most Recent</Option>
                  <Option value="cited">Most Cited</Option>
                  <Option value="trending">Trending</Option>
                </Select>
              </Space>
            </Col>
          </Row>
        </div>

        <div id="scrollableDiv" style={{ maxHeight: '420px', overflow: 'auto' }}>
          <InfiniteScroll
            dataLength={data.papers.length}
            next={loadMorePapers}
            hasMore={hasMore}
            loader={
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Skeleton active paragraph={{ rows: 1 }} />
              </div>
            }
            scrollableTarget="scrollableDiv"
          >
            <Row gutter={[16, 16]}>
              {
                renderPaperslist(data.papers,defaultPapers)
              }
            </Row>
          </InfiniteScroll>
        </div>
      </div>
    </Col>
  );

  return (
    <div style={{ padding: '24px', background: '#141414', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Stats Overview */}
        {renderStats()}

        {/* Main Content */}
        <Row gutter={[16, 16]}>
          {renderChart()}
          {renderRecommendations()}
          {renderResearchFocus()}
          {renderPapersGrid()}
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;