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


const { useToken } = theme;

const { Title, Text } = Typography;
const { Option } = Select;

const Dashboard = () => {
  
  const token = useToken();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    readingData: [],
    bookmarks: [],
    recommendations: [],
    topicDistribution: [],
    statsData: []
  });

  // Mock data - same as original
  const readingData = [
    { month: 'Jan', papers: 12, avgTime: 2.5 },
    { month: 'Feb', papers: 15, avgTime: 2.8 },
    { month: 'Mar', papers: 18, avgTime: 2.3 },
    { month: 'Apr', papers: 22, avgTime: 2.6 },
    { month: 'May', papers: 25, avgTime: 2.4 },
    { month: 'Jun', papers: 28, avgTime: 2.7 },
    { month: 'Jul', papers: 24, avgTime: 2.5 },
    { month: 'Aug', papers: 20, avgTime: 2.9 },
    { month: 'Sep', papers: 26, avgTime: 2.4 },
    { month: 'Oct', papers: 30, avgTime: 2.6 },
    { month: 'Nov', papers: 32, avgTime: 2.3 },
    { month: 'Dec', papers: 35, avgTime: 2.5 }
  ];

  const bookmarks = [
    {
      title: "PaLM 2: Feature-Rich Language Models Scale Well with Many Tasks and Contexts",
      authors: "Aakanksha Chowdhery, et al.",
      conference: "arXiv 2023",
      tags: ["LLM", "Scaling", "ML"],
      impact: 89.5,
      trending: true,
      citations: 1205,
      relevance: 98
    },
    {
      title: "Constitutional AI: A Framework for Machine Learning Ethics",
      authors: "Askell, A., Brundage, M., Hadfield, G.",
      conference: "NeurIPS 2023",
      tags: ["AI Ethics", "ML", "Safety"],
      impact: 76.8,
      trending: true,
      citations: 892,
      relevance: 99
    },
    {
      title: "Self-Instruct: Aligning Language Models with Self-Generated Instructions",
      authors: "Wang, Y., et al.",
      conference: "ACL 2023",
      tags: ["NLP", "LLM", "Instruction Tuning"],
      impact: 82.3,
      trending: false,
      citations: 645,
      relevance: 94
    },
    {
      title: "Scaling Laws for Neural Language Models: Empirical Trends and Future Predictions",
      authors: "Brown, T., et al.",
      conference: "ICLR 2023",
      tags: ["ML", "Scaling", "Theory"],
      impact: 91.2,
      trending: true,
      citations: 1567,
      relevance: 97
    }
  ];

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


  const fetchReadingData = async () => {
    try {
      // Simulate API call for reading data
     return (await api.scraping().readingstats()).data; // Replace with actual API call
    } catch (error) {
      console.error('Error fetching reading data:', error);
      throw error;
    }
  };
  
  const fetchBookmarks = async () => {
    try {
      // Simulate API call for bookmarks
      return (await api.scraping().getbookmarked()).data; // Replace with actual API call
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      throw error;
    }
  };
  
  const fetchRecommendations = async () => {
    try {
      // Simulate API call for recommendations
      await new Promise(resolve => setTimeout(resolve, 1800));
      return recommendations; // Replace with actual API call
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  };
  
  const fetchTopicDistribution = async () => {
    try {
      // Simulate API call for topic distribution
      await new Promise(resolve => setTimeout(resolve, 1500));
      return topicDistribution; // Replace with actual API call
    } catch (error) {
      console.error('Error fetching topic distribution:', error);
      throw error;
    }
  };
  
  const fetchStatsData = async () => {
    try {
      // Simulate API call for stats data
      return (await api.scraping().statsdata()).data
       // Replace with actual API call
    } catch (error) {
      console.error('Error fetching stats data:', error);
      throw error;
    }
  };
  

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call delay
        const [
          readingDataResult,
          bookmarksResult,
          recommendationsResult,
          topicDistributionResult,
          statsDataResult
        ] = await Promise.all([
          fetchReadingData(),
          fetchBookmarks(),
          fetchRecommendations(),
          fetchTopicDistribution(),
          fetchStatsData()
        ]);
        console.log('Data fetched:', readingDataResult,bookmarksResult,recommendationsResult,topicDistributionResult,statsDataResult);
        setData({
         readingData: readingDataResult,
        bookmarks:bookmarksResult,
        recommendations:recommendationsResult,
          topicDistribution:topicDistributionResult,
          statsData:statsDataResult
        });
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

  const renderPapersGrid = () => (
    <Col xs={24} lg={16}>
      <div style={{ 
        background: '#141414',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #303030'
      }}>
        {loading ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Skeleton active paragraph={{ rows: 1 }} />
                </Col>
                <Col>
                  <Space>
                    <Skeleton.Button active />
                    <Skeleton.Button active />
                  </Space>
                </Col>
              </Row>
            </div>

            <Row gutter={[16, 16]}>
              {[1, 2, 3, 4].map((i) => (
                <Col xs={24} md={12} key={i}>
                  <div style={{ 
                    background: '#141414',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #303030'
                  }}>
                    <Skeleton active paragraph={{ rows: 2 }} />
                    <Space>
                      <Skeleton.Button active size="small" />
                      <Skeleton.Button active size="small" />
                      <Skeleton.Button active size="small" />
                    </Space>
                  </div>
                </Col>
              ))}
            </Row>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Title level={5} style={{ color: '#fff', margin: 0 }}>Recent Papers</Title>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Your latest research papers</Text>
                </Col>
                <Col>
                  <Space>
                    <Select 
                      defaultValue="all" 
                      style={{ width: 120 }}
                      dropdownStyle={{ 
                        background: '#1f1f1f', 
                        borderColor: '#303030'
                      }}
                    >
                      <Option value="all">All Topics</Option>
                      <Option value="llm">LLM</Option>
                      <Option value="ethics">AI Ethics</Option>
                      <Option value="vision">Vision</Option>
                    </Select>
                    <Select 
                      defaultValue="recent" 
                      style={{ width: 120 }}
                      dropdownStyle={{ 
                        background: '#1f1f1f', 
                        borderColor: '#303030'
                      }}
                    >
                      <Option value="recent">Most Recent</Option>
                      <Option value="cited">Most Cited</Option>
                      <Option value="trending">Trending</Option>
                    </Select>
                  </Space>
                </Col>
              </Row>
            </div>

            <Row  className="custom-scroll"  gutter={[16, 16]} style={{maxHeight: '420px', overflowY: 'auto'}}>
            <style>
          {`
            .custom-scroll::-webkit-scrollbar {
              width: 1px;
              background-color: transparent;
            }
            .custom-scroll::-webkit-scrollbar-thumb {
              background-color: ${token.colorTextQuaternary};
              border-radius: 20px;
            }
            .custom-scroll::-webkit-scrollbar-track {
              background-color: ${token.colorBgContainer};
            }
            .custom-scroll:hover::-webkit-scrollbar-thumb {
              background-color: ${token.colorTextTertiary};
            }
            .custom-scroll {
              
              scrollbar-width: thin;
              scrollbar-color: ${token.colorTextQuaternary} transparent;
            }
            .custom-scroll:hover {
              scrollbar-color: ${token.colorTextTertiary} transparent;
            }
            .custom-scroll::-webkit-scrollbar-thumb {
              transition: background-color 0.2s;
            }
          `}
        </style>

              {data.bookmarks.map((paper, index) => {
                var author=paper.paper_details.authors.join()
            
                return <Col xs={24} md={12} key={index}>
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
                          maxLines:2
                        }}>
                          {paper.paper_details?.title.length>50?paper.paper_details.title.substring(0,50)+"...":paper.paper_details.title}
                        </Text>
                        <Text style={{ 
                          color: 'rgba(255, 255, 255, 0.45)',
                          display: 'block'
                        }}>
                          {
                            author.length>50?author.substring(0,50)+"...":author
                          }
                        </Text>
                      </div>
                      {true && (
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
                      <Tag style={{
                        background: 'rgba(24, 144, 255, 0.1)',
                        borderColor: 'transparent',
                        color: '#1890ff'
                      }}>
                        {paper.paper_details?.source||""}
                      </Tag>
                      {paper.paper_details.categories.map((tag, tagIndex) => (
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
                        Impact: {paper.paper_details?.impact}
                      </Text>
                      <Text style={{ 
                        color: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <StarOutlined />
                        {paper.paper_details?.citations}
                      </Text>
                    </div>
                  </div>
                </Col>
})}
            </Row>
          </>
        )}
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