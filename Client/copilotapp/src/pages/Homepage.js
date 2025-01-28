import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Row, Col, Typography, Select, Tag, Space, Badge, Skeleton, theme, message, Button } from 'antd';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { StarOutlined, RiseOutlined, FallOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../utils/api';
import InfiniteScroll from 'react-infinite-scroll-component';
import { CardModel } from './Dashboard1';
import { data } from 'react-router-dom';

const { useToken } = theme;
const { Title, Text } = Typography;
const { Option } = Select;

const ITEMS_PER_PAGE = 10;

const Dashboard = () => {
  const { token } = useToken();

  // Styles
  const styles = {
    container: {
      padding: '24px',
      background: token.colorBgLayout,
      minHeight: '100vh',
      color: token.colorText
    },
    wrapper: {
      maxWidth: 1400,
      margin: '0 auto'
    },
    card: {
      background: token.colorBgContainer,
      borderRadius: token.borderRadiusLG,
      padding: '20px',
      border: `1px solid ${token.colorBorder}`
    },
    paperCard: {
      background: token.colorBgContainer,
      borderRadius: token.borderRadiusLG,
      padding: '16px',
      border: `1px solid ${token.colorBorder}`,
      height: '100%'
    },
    scrollable: {
      overflowX: 'hidden',
      maxHeight: '420px',
      overflowY: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      padding: '0 4px',
      width: '100%'
    },
    tagBase: {
      borderColor: 'transparent',
    },
    sourceTag: {
      background: `${token.colorPrimary}15`,
      color: token.colorPrimary
    },
    categoryTag: {
      background: `${token.colorInfo}15`,
      color: token.colorInfo
    }
  };

  const [state, setState] = useState({
    loading: true,
    paperLoading: true,
    recommendationsLoading: true,
    data: {
      readingData: [],
      papers: [],
      recommendations: [],
      topicDistribution: [],
      statsData: []
    },
    offset: 0,
    hasMore: true,
    topicFilter: 'all',
    sortBy: 'recent',
    defaultPapers: 'ResearchPaper'
  });

  const totalItems = useRef(0);

  const StatCardSkeleton = React.memo(() => (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <Skeleton.Avatar active size={40} />
        <Skeleton.Input style={{ width: 60 }} active size="small" />
      </div>
      <Skeleton.Input style={{ width: 120 }} active size="large" />
      <div style={{ marginTop: 8 }}>
        <Skeleton.Input style={{ width: 80 }} active size="small" />
      </div>
    </div>
  ));
  
  // StatCard component
  const StatCard = React.memo(({ stat }) => {
    if (!stat) return <StatCardSkeleton />;
    
    const icon = stat.prefix || 'StarOutlined';
    
    return (
      <Col xs={24} sm={12} lg={6}>
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ background: `${token.colorPrimary}15`, padding: '8px', borderRadius: token.borderRadiusLG }}>
              <StarOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />
            </div>
            <Text style={{ 
              color: stat?.trend === 'up' ? token.colorSuccess : token.colorError, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px' 
            }}>
              {stat?.trend === 'up' ? <RiseOutlined /> : <FallOutlined />}
              {stat?.suffix || ''}
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: '24px', fontWeight: 600, color: token.colorText, display: 'block', marginBottom: '4px' }}>
              {stat?.value || '0'}
            </Text>
            <Text style={{ color: token.colorTextSecondary }}>{stat?.title || ''}</Text>
          </div>
        </div>
      </Col>
    );
  });

  const ItemCard = React.memo(({ paper, author, type,recomended=false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const handleModalOpen = useCallback(() => setIsModalOpen(true), []);
    const { token } = useToken();
    
    const cardStyle = useMemo(() => ({
      background: token.colorBgContainer,
      borderRadius: token.borderRadiusLG,
      padding: '16px',
      border: `1px solid ${token.colorBorder}`,
      height: '100%'
    }), [token]);
  
    const tagStyle = useMemo(() => ({
      sourceTag: {
        background: `${token.colorPrimary}15`,
        color: token.colorPrimary,
        borderColor: 'transparent'
      },
      categoryTag: {
        background: `${token.colorInfo}15`,
        color: token.colorInfo,
        borderColor: 'transparent'
      }
    }), [token]);
  
    const formattedDate = useMemo(() => {
      const date = type === 'BookmarkedPaper' ? paper.bookmarked_at :
                  type === 'ReadPaper' ? paper.read_at :
                  paper.publication_date;
      return new Date(date).toLocaleDateString();
    }, [paper, type]);
  
    const datePrefix = type === 'BookmarkedPaper' ? 'Bookmarked: ' : 
                      type === 'ReadPaper' ? 'Read: ' : 
                      'Published: ';
  
    return (
      <>
        <CardModel item={paper} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
        
        { recomended?

<div  style={styles.paperCard}>
<div style={{ marginBottom: '12px' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
    <Text style={{ color: token.colorText, fontWeight: 500, flex: 1, marginRight: '8px' }}>
    {paper.title?.length > 50 ? `${paper.title.substring(0, 50)}...` : paper.title}
    <Button type="text" icon={<EyeOutlined />} onClick={handleModalOpen} title="View Details"/>
    </Text>
    <Tag style={{ background: token.colorSuccessBg, color: token.colorSuccess, margin: 0, border: 'none' }}>
      {Math.round(paper.recommendation_score*100)||'0'}%
    </Tag>
  </div>
  <Text style={{ color: token.colorTextSecondary, display: 'block' }}>
    {paper.authors.join(', ').length > 30 ? `${paper.authors.join(', ').substring(0, 30)}...` : paper.authors.join(', ')}
  </Text>
</div>
{/* <Text style={{ color: token.colorTextSecondary, fontSize: '12px', display: 'block', marginBottom: '12px' }}>

</Text> */}
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
  <Tag style={{ ...styles.tagBase, ...styles.sourceTag }}>
    {paper.source}

  </Tag>
  {paper.categories.map((tag, index) => (
                  <Tag key={index} style={{
                    ...tagStyle.categoryTag,
                    color:"#6abe39"
                  } }>{tag}</Tag>
                ))}
  <Text style={{ fontSize: '12px', color: token.colorTextSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
    <StarOutlined /> {paper.citation_count||'0'} citations
  </Text>
</div>
</div>
        :
        
        <Col xs={24} md={12}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: token.colorText, 
                  fontSize: '16px', 
                  fontWeight: 500, 
                  display: 'block', 
                  marginBottom: '8px',
                  wordBreak: 'break-word'
                }}>
                  {paper.title?.length > 50 ? `${paper.title.substring(0, 50)}...` : paper.title}
                  <Button type="text" icon={<EyeOutlined />} onClick={handleModalOpen} title="View Details" />
                </Text>
                <Text style={{ color: token.colorTextSecondary, display: 'block' }}>
                  {author?.length > 50 ? `${author.substring(0, 50)}...` : author}
                </Text>
              </div>
              {type === 'ResearchPaper' && (
                <Badge status="processing" text={<Text style={{ color: token.colorTextSecondary }}>Trending</Text>} />
              )}
            </div>
            
            {paper.categories && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {paper.source && (
                  <Tag style={tagStyle.sourceTag}>{paper.source}</Tag>
                )}
                {paper.categories.map((tag, index) => (
                  <Tag key={index} style={{
                    ...tagStyle.categoryTag,
                    color:"#6abe39"
                  } }>{tag}</Tag>
                ))}
              </div>
            )}
  
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: token.colorTextSecondary }}>
              <Text style={{ color: 'inherit' }}>
                {datePrefix}
                {formattedDate}
              </Text>
              <Text style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <StarOutlined />
                {paper.active_bookmarks_count || 0}
              </Text>
            </div>
          </div>
        </Col>
         
  }
      </>
    );
  });

  const ChartComponent = React.memo(({ loading, readingData }) => (
    <Col xs={24} lg={16}>
      <div style={styles.card}>
        {loading ? (
          <>
            <Skeleton active paragraph={{ rows: 1 }} />
            <Skeleton.Input style={{ width: '100%', height: 300 }} active />
          </>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <Title level={5} style={{ color: token.colorText, margin: 0 }}>Reading Activity</Title>
              <Text style={{ color: token.colorTextSecondary }}>Papers read over time</Text>
            </div>
            <div style={{ height: 308 }}>
              <ResponsiveContainer>
                <LineChart data={readingData}>
                  <XAxis dataKey="month" stroke={token.colorTextSecondary} />
                  <YAxis stroke={token.colorTextSecondary} />
                  <Tooltip 
                    contentStyle={{ 
                      background: token.colorBgElevated,
                      border: `1px solid ${token.colorBorder}`,
                      borderRadius: token.borderRadiusLG
                    }}
                    labelStyle={{ color: token.colorText }}
                    itemStyle={{ color: token.colorText }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="papers" 
                    stroke={token.colorPrimary}
                    strokeWidth={2}
                    dot={{ fill: token.colorPrimary, strokeWidth: 2 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </Col>
  ));

  const RecommendationsComponent = React.memo(({ loading, recommendations }) => {
    return (
    <Col xs={24} lg={8}>
      <div style={styles.card}>
        {loading ? (
          <>
            {/* <Skeleton active paragraph={{ rows: 1 }} /> */}
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {[1, 2].map((i) => (
                <div key={i} style={styles.paperCard}>
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
              <Title level={5} style={{ color: token.colorText, margin: 0 }}>Recommended</Title>
            </div>
            <Space direction="vertical" style={{ width: '100%' ,height:"330px",overflowY:"auto",
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',

            }}size={8}>
              {recommendations.map((paper, index) => <ItemCard   key={`${paper.id || index}-recond${index}`}  paper={paper} type="ResearchPaper"  recomended={true}   /> )}
            </Space>
          </>
        )}
      </div>
    </Col>
  )});

  const ResearchFocusComponent = React.memo(({ loading, topicDistribution }) => (
    <Col xs={24} lg={8}>
      <div style={{ ...styles.card, maxHeight: '530px' }}>
        {loading ? (
          <>
            <Skeleton active paragraph={{ rows: 1 }} />
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {Array(7).fill(null).map((_, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
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
              <Title level={5} style={{ color: token.colorText, margin: 0 }}>Research Focus</Title>
              <Text style={{ color: token.colorTextSecondary }}>Topic distribution</Text>
            </div>
            <Space direction="vertical" style={styles.scrollable} size={16}>
              {topicDistribution?.research_focus?.topic_distribution.map((item, index) => (
                <div key={index}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Text style={{ color: token.colorText }}>{item.category}</Text>
                    <Text style={{ color: token.colorTextSecondary }}>{item.percentage}%</Text>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: token.colorFillSecondary, borderRadius: token.borderRadiusLG }}>
                    <div style={{
                      width: `${item.percentage}%`,
                      height: '100%',
                      background: token.colorPrimary,
                      borderRadius: token.borderRadiusLG,
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
  ));

  // API calls and other logic remain the same
  const fetchPapers = useCallback(async (currentOffset = 0, append = false) => {
    try {
      const response = await api.scraping().dynamicPaper({
        limit: ITEMS_PER_PAGE,
        offset: currentOffset,
        category: state.topicFilter,
        sort: state.sortBy,
        Table: state.defaultPapers,
        pagginated: 'True'
      });

      if (response.success) {
        totalItems.current = response.data.count || 0;
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            papers: append ? [...prev.data.papers, ...(response.data.results || [])] : (response.data.results || [])
          },
          hasMore: response.data.next !== null,
          paperLoading: false
        }));
        return true;
      }
      message.error(response.error || 'Failed to fetch papers');
      return false;
    } catch (error) {
      console.error('Error fetching papers:', error);
      message.error('Failed to fetch papers');
      return false;
    }
  }, [state.topicFilter, state.sortBy, state.defaultPapers]);

  const resetPapers = useCallback(() => {
    setState(prev => ({
      ...prev,
      offset: 0,
      hasMore: true,
      data: { ...prev.data, papers: [] }
    }));
  }, []);

  const handleFilterChange = useCallback((type, value) => {
    setState(prev => ({ ...prev, [type]: value }));
    resetPapers();
  }, [resetPapers]);
  

  const fetchRecoMdationPaper = async () => {
    try {

      setState(prev => ({ ...prev, recommendationsLoading: true }));
      const response =await api.scraping().getPapers(
        0,
        10,
      );
      if (response.success) {
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            recommendations: response.data.results || [],
          }
        }));
      } else {
        message.error(response.error || 'Failed to fetch recommendations');
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      message.error('Failed to fetch recommendations');
    }
    finally {
      setState(prev => ({ ...prev, recommendationsLoading: false }));
    }

  }



  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [readingResponse, statsResponse, researchfocus] = await Promise.all([
          api.scraping().readingstats(),
          api.scraping().statsdata(),
          api.scraping().getresearchfocus(),
       
        ]);

      
  
        setState(prev => ({
          ...prev,
          loading: false,
          data: {
            ...prev.data,
            readingData: readingResponse.data,
            statsData: statsResponse.data || [], // Add fallback empty array
            topicDistribution: researchfocus.data
          }
        }));
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };
   
    fetchRecoMdationPaper();
    fetchInitialData();
  }, []);

  
  useEffect(() => {
    setState(prev => ({ ...prev, paperLoading: true }));
    fetchPapers(0, false);
  }, [state.topicFilter, state.sortBy, state.defaultPapers, fetchPapers]);

  const loadMorePapers = useCallback(async () => {
    if (state.paperLoading || !state.hasMore) return;
    
    setState(prev => ({ ...prev, paperLoading: true }));
    const newOffset = state.offset + ITEMS_PER_PAGE;
    setState(prev => ({ ...prev, offset: newOffset }));
    await fetchPapers(newOffset, true);
  }, [state.paperLoading, state.hasMore, state.offset, fetchPapers]);

  const renderPapersList = useCallback((papers, type) => {
    let processedPapers = papers;
    switch(type) {
      case 'BookmarkedPaper':
      case 'ReadPaper':
        processedPapers = papers?.map(item => ({
          ...item.paper_details,
          [type === 'BookmarkedPaper' ? 'bookmarked_at' : 'read_at']: item[type === 'BookmarkedPaper' ? 'bookmarked_at' : 'read_at']
        }));
        break;
      case 'ResearchPaper':
      default:
        break;
    }

    return processedPapers?.map((paper, index) => {
      const author = paper.authors?.join(',');
      return (
        <ItemCard 
          key={`${paper.id || index}-${index}`} 
          paper={paper} 
          author={author} 
          type={type} 
        />
      );
    });
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {state.loading ? (
            Array(4).fill(null).map((_, i) => (
              <Col xs={24} sm={12} lg={6} key={i}>
                <StatCard key={i} skeleton />
              </Col>
            ))
          ) : (
            state.data.statsData.map((stat, index) => (
              <StatCard key={index} stat={stat} />
            ))
          )}
        </Row>

        <Row gutter={[16, 16]}>
          <ChartComponent 
            loading={state.loading} 
            readingData={state.data.readingData} 
          />
          <RecommendationsComponent 
            loading={state.recommendationsLoading} 
            recommendations={state.data.recommendations} 
          />
          <ResearchFocusComponent 
            loading={state.loading} 
            topicDistribution={state.data.topicDistribution} 
          />
          <Col xs={24} lg={16}>
            <div style={styles.card}>
              <div style={{ marginBottom: '20px' }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Title level={5} style={{ color: token.colorText, margin: 0 }}>Recent Papers</Title>
                    <Text style={{ color: token.colorTextSecondary }}>Your latest research papers</Text>
                  </Col>
                  <Col>
                    <Space>
                      <Select 
                        value={state.defaultPapers} 
                        onChange={(value) => handleFilterChange('defaultPapers', value)}
                        style={{ width: 150 }}
                        dropdownStyle={{ background: token.colorBgElevated, borderColor: token.colorBorder }}
                      >
                        <Option value="ResearchPaper">Research Papers</Option>
                        <Option value="ReadPaper">Read Papers</Option>
                        <Option value="BookmarkedPaper">Bookmarked Papers</Option>
                      </Select>
                      <Select 
                        value={state.topicFilter} 
                        onChange={(value) => handleFilterChange('topicFilter', value)}
                        style={{ width: 120 }}
                        dropdownStyle={{ background: token.colorBgElevated, borderColor: token.colorBorder }}
                      >
                        <Option value="all">All Topics</Option>
                        {state.data.topicDistribution?.research_focus?.topic_distribution.map((item, index) => (
                          <Option key={index} value={item.category}>{item.category}</Option>
                        ))}
                      </Select>
                      <Select 
                        value={state.sortBy}
                        onChange={(value) => handleFilterChange('sortBy', value)}
                        style={{ width: 120 }}
                        dropdownStyle={{ background: token.colorBgElevated, borderColor: token.colorBorder }}
                      >
                        <Option value="recent">Most Recent</Option>
                        <Option value="cited">Most Cited</Option>
                        <Option value="trending">Trending</Option>
                      </Select>
                    </Space>
                  </Col>
                </Row>
              </div>

              <div style={styles.scrollable} id="scrollableDiv">
                <InfiniteScroll
                  dataLength={state.data.papers.length}
                  next={loadMorePapers}
                  hasMore={state.hasMore}
                  loader={
                    <Row gutter={[16, 16]}>
                      {Array(2).fill(null).map((_, i) => (
                        <Col xs={24} md={12} key={i}>
                          <div style={styles.paperCard}>
                            <Skeleton 
                              active 
                              title={{ width: '60%' }}
                              paragraph={{ rows: 2, width: ['80%', '40%'] }}
                            />
                            <Space>
                              <Skeleton.Button active size="small" />
                              <Skeleton.Button active size="small" />
                            </Space>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  }
                  scrollableTarget="scrollableDiv"
                  endMessage={
                    <Text style={{ 
                      textAlign: 'center', 
                      padding: '20px', 
                      display: 'block', 
                      color: token.colorTextSecondary 
                    }}>
                      No more papers to load
                    </Text>
                  }
                >
                  <Row gutter={[16, 16]}>
                    {renderPapersList(state.data.papers, state.defaultPapers)}
                  </Row>
                </InfiniteScroll>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default React.memo(Dashboard);