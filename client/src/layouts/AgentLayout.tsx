import React from 'react';
import { Layout, Menu, Dropdown, Avatar, Tag } from 'antd';
import {
  FileTextOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from '../components/NotificationCenter';
import { AGENT_STATUS_COLORS, AGENT_STATUS_LABELS } from '../types';

const { Header, Sider, Content } = Layout;

const AgentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/tickets', icon: <FileTextOutlined />, label: '工单处理' },
    { key: '/profile', icon: <SettingOutlined />, label: '个人设置' },
  ];

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') {
        logout();
        navigate('/login');
      }
    },
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          🎧 客服工作台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 500 }}>客服工作台</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {user?.agent && (
              <Tag color={AGENT_STATUS_COLORS[user.agent.status]}>
                <SwapOutlined /> {AGENT_STATUS_LABELS[user.agent.status]}
              </Tag>
            )}
            <NotificationCenter />
            <Dropdown menu={userMenu}>
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user?.name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AgentLayout;
