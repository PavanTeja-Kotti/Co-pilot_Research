import React, { use, useEffect, useState } from "react";
import {
  Card,
  Typography,
  Space,
  Row,
  Col,
  Button,
  theme,
  message,
  Layout,
} from "antd";
import * as Icons from "@ant-design/icons";
import { useAuth } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const { Title, Text } = Typography;
const { Content } = Layout;
const { useToken } = theme;


 // Import a fallback icon from Ant Design

 const DynamicIconRenderer = ({ iconName }) => {
  try {
    // Handle SVG content if iconName starts with 'svg:'
    if (iconName?.startsWith('svg:')) {
      const svgContent = iconName.substring(4); // Remove 'svg:' prefix
      return (
        <span className="anticon" role="img" aria-label="custom-icon">
          <span dangerouslySetInnerHTML={{ __html: svgContent }} />
        </span>
      );
    }

    // Original logic for Ant Design icons
    const IconComponent = Icons[iconName];
    return IconComponent ? <IconComponent /> : <Icons.QuestionCircleOutlined />;
  } catch (error) {
    // Return question mark icon for any errors
    return <Icons.QuestionCircleOutlined />;
  }
};



const ResearchInterestField = ({ field, isSelected, onToggle }) => {
  const { token } = useToken();

  return (
    <Card
      hoverable
      className={`research-field-card ${isSelected ? "selected" : ""}`}
      style={{
        cursor: "pointer",
        transition: `all ${token.motionDurationMid}`,
        transform: isSelected ? "scale(1.02)" : "scale(1)",
        borderColor: isSelected
          ? token.colorPrimary
          : token.colorBorderSecondary,
      }}
      bodyStyle={{
        padding: token.padding,
        background: isSelected ? token.colorPrimary : token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        height: "100%",
      }}
      onClick={() => onToggle(field.id)}
    >
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <div className="icon-wrapper">
          <div className="icon-container">
            {<DynamicIconRenderer iconName={field.icon} />}
            {isSelected && <div className="ripple"></div>}
          </div>
        </div>
        <Text
          strong
          style={{
            color: isSelected ? token.colorTextLightSolid : token.colorText,
            fontSize: token.fontSizeLG,
            display: "block",
            textAlign: "center",
          }}
        >
          {field.name}
        </Text>
        <Text
          style={{
            color: isSelected
              ? `${token.colorTextLightSolid}99`
              : token.colorTextSecondary,
            fontSize: token.fontSize,
            display: "block",
            textAlign: "center",
          }}
        >
          {field.description}
        </Text>
      </Space>
    </Card>
  );
};

const ResearchInterests = ({
  selectedInterests = [],
  onUpdateInterests,
  showSubmitButton = true,
  loading = false,
  containerHeight = "100%",
}) => {
 
  const { token } = useToken();
  const [localSelectedInterests, setLocalSelectedInterests] =
    useState(selectedInterests);
  const [researchFields, setResearchFields] = useState([]);
  const [category_ids, setCategory_ids] = useState([]);
  

  const toggleInterest = (interestId) => {
    setCategory_ids([...category_ids, interestId]);
    const newSelection = localSelectedInterests.includes(interestId)
      ? localSelectedInterests.filter((id) => id !== interestId)
      : [...localSelectedInterests, interestId];

    setLocalSelectedInterests(newSelection);

    if (!showSubmitButton) {
      onUpdateInterests(newSelection);
    }
  };

  

  const handleSubmit = () => {
    onUpdateInterests(category_ids);
    setCategory_ids([]);
    
  };


  useEffect(() => {
    function getResearchFields() {
      api.categories().getCategories().then((response) => {
        setResearchFields(response.data);
      }).catch((error) => {
        console.error('Error fetching research fields:', error);
      });
    }
    getResearchFields();
  }, []);



  


  return (
    <>
      <style>
        {`
          .research-field-card {
            height: 100%;
            position: relative;
            overflow: visible !important;
          }

          .research-field-card .ant-card-body {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .icon-wrapper {
            position: relative;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 8px;
          }

          .icon-container {
            position: relative;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          }

          .research-field-card:not(.selected):hover .icon-container {
            animation: bounce 0.5s ease;
          }

          .research-field-card.selected .icon-container {
            animation: pulse 2s infinite;
          }

          .ripple {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid currentColor;
            opacity: 0.8;
            animation: ripple 1.5s infinite;
          }

          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }

          @keyframes ripple {
            0% {
              transform: scale(0.8);
              opacity: 0.8;
            }
            100% {
              transform: scale(2);
              opacity: 0;
            }
          }

          .research-field-card .anticon {
            transition: all 0.3s ease;
          }

          .research-field-card.selected .anticon {
            color: ${token.colorTextLightSolid};
          }

          .research-field-card:not(.selected) .anticon {
            color: ${token.colorPrimary};
          }

          .research-field-card:not(.selected):hover {
            border-color: ${token.colorPrimary};
          }

          /* Theme-aware Ultra-thin Scrollbar Styles */
          .custom-scroll::-webkit-scrollbar {
            width: 3px;
            background-color: transparent;
          }
          
          .custom-scroll::-webkit-scrollbar-thumb {
            background-color: ${token.colorTextQuaternary};
            border-radius: 3px;
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

      <div
        className="custom-scroll"
        style={{
          height: containerHeight,
          overflowY: "auto",
          paddingRight: token.padding,
        }}
      >
        <Row gutter={[token.marginSM, token.marginSM]}>
          {researchFields.map((field) => (
            <Col xs={24} sm={12} md={8} lg={6} key={field.id}>
              <ResearchInterestField
                field={field}
                isSelected={localSelectedInterests.includes(field.id)}
                onToggle={toggleInterest}
              />
            </Col>
          ))}
        </Row>
      </div>

      {showSubmitButton && (
        <div style={{ textAlign: "center", marginTop: token.marginLG * 2 }}>
          <Space direction="vertical" size="large">
            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              loading={loading}
              disabled={localSelectedInterests.length === 0}
              style={{
                minWidth: "200px",
                height: token.controlHeightLG,
              }}
            >
              Update Interests
            </Button>
            <Text style={{ color: token.colorTextSecondary }}>
              Selected {localSelectedInterests.length} research fields
            </Text>
          </Space>
        </div>
      )}
    </>
  );
};

const InterestPage = () => {
  const { user, updateCategorylist } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { token } = useToken();

  useEffect(() => {
    if (!user?.first_login) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);



  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      <Content
        style={{ padding: token.padding, maxWidth: "1400px", margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: token.marginLG * 2 }}>
          <Title level={2} style={{ color: token.colorTextHeading }}>
            Select Your Research Interests
          </Title>
          <Text style={{ color: token.colorTextSecondary }}>
            Choose the research fields that align with your academic interests
          </Text>
        </div>

        <ResearchInterests
          selectedInterests={user.interests || []}
          onUpdateInterests={async (interests) => {
            setLoading(true);
            try {
              await updateCategorylist(interests);
              message.success("Research interests updated successfully!");
              navigate("/", { replace: true });
            } catch (error) {
              message.error("Failed to update research interests");
            } finally {
              setLoading(false);
            }
          }}
          loading={loading}
        />
      </Content>
    </Layout>
  );
};

export { InterestPage, ResearchInterests, ResearchInterestField };
