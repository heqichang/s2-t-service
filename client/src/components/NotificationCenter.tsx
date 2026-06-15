import React, { useEffect, useState } from 'react';
import { Badge, Dropdown, List, Button, Empty, Typography, Spin } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { ticketApi } from '../api';
import type { Notification } from '../types';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';

const { Text } = Typography;

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { socket } = useAuth();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res: any = await ticketApi.notifications();
      setNotifications(res || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('notification', () => fetchNotifications());
      socket.on('ticket:update', () => fetchNotifications());
      return () => {
        socket.off('notification');
        socket.off('ticket:update');
      };
    }
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = (n: Notification) => {
    if (!n.read) {
      ticketApi.markNotificationRead(n.id).then(() => fetchNotifications());
    }
    if (n.ticketId) {
      setOpen(false);
      navigate(`/tickets/${n.ticketId}`);
    }
  };

  const markAllRead = async () => {
    await ticketApi.markAllRead();
    fetchNotifications();
  };

  const dropdownContent = (
    <div style={{ width: 360, maxHeight: 450, overflow: 'auto' }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <strong>通知</strong>
        <Button type="link" size="small" icon={<CheckOutlined />} onClick={markAllRead}>
          全部已读
        </Button>
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ padding: 40 }}>
          <Empty description="暂无通知" />
        </div>
      ) : (
        <List
          dataSource={notifications.slice(0, 20)}
          renderItem={(item) => (
            <List.Item
              onClick={() => handleClick(item)}
              style={{
                cursor: 'pointer',
                background: item.read ? 'transparent' : '#e6f4ff',
                padding: '12px 16px',
              }}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{item.title}</strong>
                    {!item.read && <Badge status="processing" />}
                  </div>
                }
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.content}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(item.createdAt).format('MM-DD HH:mm')}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      dropdownRender={() => dropdownContent}
      placement="bottomRight"
      trigger={['click']}
    >
      <Badge count={unreadCount} offset={[-2, 2]} size="small">
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Dropdown>
  );
};

export default NotificationCenter;
