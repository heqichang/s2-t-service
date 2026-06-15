import React, { useEffect, useRef, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Input,
  Form,
  Space,
  Typography,
  App,
  Modal,
  Rate,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  StarFilled,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ticketApi } from '../../api';
import type { Ticket } from '../../types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '../../types';
import dayjs from 'dayjs';
import MessageList from '../../components/MessageList';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CustomerTicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { socket } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [form] = Form.useForm();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ratingVisible, setRatingVisible] = useState(false);
  const [ratingForm] = Form.useForm();

  const fetchTicket = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res: any = await ticketApi.detail(Number(id));
      setTicket(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (socket && id) {
      socket.emit('ticket:join', Number(id));
      socket.on('message:new', () => fetchTicket());
      socket.on('ticket:update', () => fetchTicket());
      return () => {
        socket.emit('ticket:leave', Number(id));
        socket.off('message:new');
        socket.off('ticket:update');
      };
    }
  }, [socket, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const handleReply = async (values: { content: string }) => {
    if (!id || !values.content.trim()) return;
    setReplyLoading(true);
    try {
      await ticketApi.reply(Number(id), values.content);
      form.resetFields();
      fetchTicket();
    } catch (e: any) {
      message.error(e.error || '回复失败');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleClose = () => {
    modal.confirm({
      title: '确认关闭工单',
      content: '关闭后将无法继续沟通，是否确认？',
      onOk: async () => {
        try {
          await ticketApi.updateStatus(Number(id), 'CLOSED');
          message.success('工单已关闭');
          fetchTicket();
        } catch (e: any) {
          message.error(e.error || '关闭失败');
        }
      },
    });
  };

  const handleRating = async (values: { rating: number; comment: string }) => {
    try {
      await ticketApi.rate(Number(id), values.rating, values.comment);
      message.success('评价成功');
      setRatingVisible(false);
      fetchTicket();
    } catch (e: any) {
      message.error(e.error || '评价失败');
    }
  };

  if (!ticket) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  }

  const canRate = ['RESOLVED', 'CLOSED'].includes(ticket.status) && !ticket.rating;
  const canReply = !['CLOSED'].includes(ticket.status);

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        返回
      </Button>

      <Card loading={loading} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={4} style={{ marginBottom: 8 }}>
              #{ticket.id} {ticket.title}
            </Title>
            <Space wrap>
              <Tag color={STATUS_COLORS[ticket.status]}>{STATUS_LABELS[ticket.status]}</Tag>
              <Tag>{CATEGORY_LABELS[ticket.category]}</Tag>
              <Tag color={PRIORITY_COLORS[ticket.priority]}>
                {PRIORITY_LABELS[ticket.priority]}
              </Tag>
              {ticket.tags.map((t) => (
                <Tag key={t.tag.id} color={t.tag.color}>
                  {t.tag.name}
                </Tag>
              ))}
            </Space>
          </div>
          <Space>
            {canRate && (
              <Button type="primary" icon={<StarFilled />} onClick={() => setRatingVisible(true)}>
                评价服务
              </Button>
            )}
            {canReply && ticket.status !== 'PENDING' && (
              <Button danger icon={<CloseCircleOutlined />} onClick={handleClose}>
                关闭工单
              </Button>
            )}
          </Space>
        </div>

        <Divider />

        <Descriptions column={2} size="small">
          <Descriptions.Item label="提交人">{ticket.customer.name}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{ticket.customer.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="处理客服">
            {ticket.agent ? `${ticket.agent.user.name}（${ticket.agent.team?.name || '未分组'}）` : '未分配'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(ticket.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          {ticket.resolvedAt && (
            <Descriptions.Item label="解决时间">
              {dayjs(ticket.resolvedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          )}
          {ticket.closedAt && (
            <Descriptions.Item label="关闭时间">
              {dayjs(ticket.closedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider orientation="left">问题描述</Divider>
        <div style={{ padding: '12px 16px', background: '#f6f6f6', borderRadius: 4 }}>
          <Text>{ticket.description}</Text>
        </div>

        {ticket.mergedTo && (
          <>
            <Divider />
            <Tag color="blue">已合并到工单 #{ticket.mergedTo.id}</Tag>
            <Button
              type="link"
              onClick={() => navigate(`/tickets/${ticket.mergedTo!.id}`)}
            >
              查看主工单：{ticket.mergedTo.title}
            </Button>
          </>
        )}

        {ticket.mergedFrom && ticket.mergedFrom.length > 0 && (
          <>
            <Divider orientation="left">已合并工单</Divider>
            {ticket.mergedFrom.map((t) => (
              <Button
                key={t.id}
                type="link"
                onClick={() => navigate(`/tickets/${t.id}`)}
              >
                #{t.id} {t.title}
              </Button>
            ))}
          </>
        )}

        {ticket.rating && (
          <>
            <Divider orientation="left">我的评价</Divider>
            <Row gutter={16} align="middle">
              <Col>
                <Rate disabled value={ticket.rating.rating} />
              </Col>
              {ticket.rating.comment && (
                <Col>
                  <Text type="secondary">{ticket.rating.comment}</Text>
                </Col>
              )}
            </Row>
          </>
        )}
      </Card>

      <Card title="对话记录" style={{ marginBottom: 16 }}>
        <MessageList messages={ticket.messages || []} />
        <div ref={messagesEndRef} />
      </Card>

      {canReply && (
        <Card title="发送回复">
          <Form form={form} layout="vertical" onFinish={handleReply}>
            <Form.Item
              name="content"
              rules={[{ required: true, message: '请输入回复内容' }]}
              style={{ marginBottom: 12 }}
            >
              <TextArea rows={4} placeholder="输入您的回复..." />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={replyLoading} icon={<SendOutlined />}>
                发送
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Modal
        title="服务评价"
        open={ratingVisible}
        onCancel={() => setRatingVisible(false)}
        footer={null}
      >
        <Form form={ratingForm} layout="vertical" onFinish={handleRating}>
          <Form.Item
            name="rating"
            label="评分"
            rules={[{ required: true, message: '请选择评分' }]}
          >
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="评价内容">
            <TextArea rows={4} placeholder="请分享您的服务体验..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setRatingVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit" style={{ marginLeft: 8 }}>
              提交评价
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomerTicketDetail;
