import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { Message } from '../types';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  messages: Message[];
}

const MessageList: React.FC<Props> = ({ messages }) => {
  const { user } = useAuth();

  if (!messages || messages.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无对话</div>;
  }

  return (
    <div className="ticket-messages">
      {messages.map((msg) => {
        if (msg.type === 'SYSTEM') {
          return (
            <div key={msg.id} className="system-message">
              {msg.content} · {dayjs(msg.createdAt).format('MM-DD HH:mm')}
            </div>
          );
        }

        const isCustomer = !!msg.userId;
        const isMe = isCustomer ? msg.userId === user?.id : false;
        const senderName = isCustomer ? msg.user?.name : msg.agent?.user?.name;
        const avatar = isCustomer ? msg.user?.avatar : msg.agent?.user?.avatar;

        return (
          <div key={msg.id} className={`message-item ${isMe ? 'right' : 'left'}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
              <Avatar icon={<UserOutlined />} src={avatar} size={32} />
              <div style={{ maxWidth: '70%' }}>
                <div
                  style={{
                    fontSize: 12,
                    color: '#999',
                    marginBottom: 4,
                    textAlign: isMe ? 'right' : 'left',
                  }}
                >
                  {senderName}
                  {msg.isInternal && <span style={{ color: '#d46b08' }}>（内部备注）</span>}
                </div>
                <div
                  className={`message-bubble ${msg.isInternal ? 'internal-note' : ''}`}
                  style={{ textAlign: 'left' }}
                >
                  {msg.content}
                </div>
                <div className="message-meta" style={{ textAlign: isMe ? 'right' : 'left' }}>
                  {dayjs(msg.createdAt).format('MM-DD HH:mm')}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
