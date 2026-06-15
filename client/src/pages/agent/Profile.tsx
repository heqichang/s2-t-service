import React, { useState } from 'react';
import { Card, Form, Select, Space, Typography, App, Tag } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi } from '../../api';
import { AGENT_STATUS_LABELS, AGENT_STATUS_COLORS } from '../../types';
import type { AgentStatus } from '../../types';

const { Title } = Typography;

const AgentProfile: React.FC = () => {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (status: string) => {
    setLoading(true);
    try {
      await adminApi.updateAgentStatus(status);
      message.success('状态已更新');
      window.location.reload();
    } catch (e: any) {
      message.error(e.error || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card title={<Title level={4} style={{ margin: 0 }}>个人设置</Title>}>
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 500 }}>
          <Space size="large">
            <div style={{ fontSize: 14, color: '#666', width: 100 }}>姓名：</div>
            <div>{user?.name}</div>
          </Space>
          <Space size="large">
            <div style={{ fontSize: 14, color: '#666', width: 100 }}>邮箱：</div>
            <div>{user?.email}</div>
          </Space>
          <Space size="large">
            <div style={{ fontSize: 14, color: '#666', width: 100 }}>所属团队：</div>
            <div>{user?.agent?.team?.name || '未分组'}</div>
          </Space>
          <Space size="large" align="center">
            <div style={{ fontSize: 14, color: '#666', width: 100 }}>在线状态：</div>
            <Select
              loading={loading}
              value={user?.agent?.status}
              style={{ width: 160 }}
              onChange={handleStatusChange}
              optionRender={(option) => (
                <Space>
                  <Tag color={AGENT_STATUS_COLORS[option.value as AgentStatus]}>
                    {AGENT_STATUS_LABELS[option.value as AgentStatus]}
                  </Tag>
                </Space>
              )}
            >
              {Object.entries(AGENT_STATUS_LABELS).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  {v}
                </Select.Option>
              ))}
            </Select>
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export default AgentProfile;
