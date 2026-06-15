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
  Select,
  Divider,
  Modal,
  Switch,
  Tooltip,
  Avatar,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  SwapOutlined,
  MergeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ticketApi, adminApi } from '../../api';
import type { Ticket, Agent, Message } from '../../types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS as _STATUS_COLORS,
} from '../../types';
import dayjs from 'dayjs';
import MessageList from '../../components/MessageList';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const AgentTicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { socket, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [replyLoading, setReplyLoading] = useState(false);
  const [form] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [mergeForm] = Form.useForm();
  const [transferVisible, setTransferVisible] = useState(false);
  const [mergeVisible, setMergeVisible] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    adminApi.agents().then((res: any) => setAgents(res || []));
  }, [id]);

  useEffect(() => {
    if (socket && id) {
      socket.emit('ticket:join', Number(id));
      socket.on('message:new', () => fetchTicket());
      socket.on('ticket:update', () => fetchTicket());
      socket.on('ticket:merged', () => fetchTicket());
      return () => {
        socket.emit('ticket:leave', Number(id));
        socket.off('message:new');
        socket.off('ticket:update');
        socket.off('ticket:merged');
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
      await ticketApi.reply(Number(id), values.content, isInternal);
      form.resetFields();
      setIsInternal(false);
      fetchTicket();
    } catch (e: any) {
      message.error(e.error || '回复失败');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await ticketApi.updateStatus(Number(id), status);
      message.success('状态更新成功');
      fetchTicket();
    } catch (e: any) {
      message.error(e.error || '更新失败');
    }
  };

  const handleAssign = async (agentId: number) => {
    try {
      await ticketApi.assign(Number(id), agentId);
      message.success('分配成功');
      fetchTicket();
    } catch (e: any) {
      message.error(e.error || '分配失败');
    }
  };

  const handleTransfer = async (values: { agentId: number }) => {
    try {
      await ticketApi.transfer(Number(id), values.agentId);
      message.success('转交成功');
      setTransferVisible(false);
      fetchTicket();
    } catch (e: any) {
      message.error(e.error || '转交失败');
    }
  };

  const handleMerge = async (values: { targetTicketId: number }) => {
    if (values.targetTicketId === Number(id)) {
      message.error('不能合并到当前工单');
      return;
    }
    modal.confirm({
      title: '确认合并工单',
      content: `将工单 #${id} 合并到 #${values.targetTicketId}？合并后当前工单会被关闭。`,
      onOk: async () => {
        try {
          await ticketApi.merge(Number(id), values.targetTicketId);
          message.success('合并成功');
          setMergeVisible(false);
          fetchTicket();
        } catch (e: any) {
          message.error(e.error || '合并失败');
        }
      },
    });
  };

  if (!ticket) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  }

  const statusFlowButtons = [
    { status: 'PROCESSING', label: '开始处理', show: ticket.status === 'PENDING' || ticket.status === 'WAITING_CUSTOMER' },
    { status: 'WAITING_CUSTOMER', label: '等待客户', show: ticket.status === 'PROCESSING' },
    { status: 'RESOLVED', label: '标记解决', show: ['PROCESSING', 'WAITING_CUSTOMER'].includes(ticket.status) },
    { status: 'CLOSED', label: '关闭工单', show: ticket.status !== 'CLOSED' },
  ];

  const visibleMessages = ticket.messages?.filter((m) => !m.isInternal || m.agentId === user?.agentId) || [];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        返回列表
      </Button>

      <Card loading={loading} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
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
          <Space wrap>
            {statusFlowButtons
              .filter((b) => b.show)
              .map((b) => (
                <Button key={b.status} type={b.status === 'RESOLVED' ? 'primary' : 'default'} onClick={() => handleStatusChange(b.status)}>
                  {b.label}
                </Button>
              ))}
            <Button icon={<SwapOutlined />} onClick={() => setTransferVisible(true)}>
              转交
            </Button>
            <Button icon={<MergeOutlined />} onClick={() => setMergeVisible(true)}>
              合并
            </Button>
          </Space>
        </div>

        <Divider />

        <Descriptions column={2} size="small">
          <Descriptions.Item label="提交人">
            <Space>
              <Avatar size="small" icon={<UserOutlined />} />
              {ticket.customer.name}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="联系电话">{ticket.customer.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="客户邮箱">{ticket.customer.email}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(ticket.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="处理客服" span={2}>
            {ticket.agent ? (
              <Space>
                <Text>{ticket.agent.user.name}</Text>
                <Tag>{ticket.agent.team?.name || '未分组'}</Tag>
              </Space>
            ) : (
              <Select
                placeholder="未分配，点击分配"
                style={{ width: 240 }}
                onChange={handleAssign}
                showSearch
                optionFilterProp="children"
              >
                {agents.map((a) => (
                  <Select.Option key={a.id} value={a.id}>
                    {a.user.name} ({a.team?.name || '未分组'})
                  </Select.Option>
                ))}
              </Select>
            )}
          </Descriptions.Item>
        </Descriptions>

        <Divider orientation="left">问题描述</Divider>
        <div style={{ padding: '12px 16px', background: '#f6f6f6', borderRadius: 4 }}>
          <Text>{ticket.description}</Text>
        </div>

        {ticket.mergedTo && (
          <>
            <Divider />
            <Tag color="blue">已合并到工单 #{ticket.mergedTo.id}</Tag>
            <Button type="link" onClick={() => navigate(`/tickets/${ticket.mergedTo!.id}`)}>
              查看主工单：{ticket.mergedTo.title}
            </Button>
          </>
        )}

        {ticket.mergedFrom && ticket.mergedFrom.length > 0 && (
          <>
            <Divider orientation="left">已合并工单</Divider>
            {ticket.mergedFrom.map((t) => (
              <Button key={t.id} type="link" onClick={() => navigate(`/tickets/${t.id}`)}>
                #{t.id} {t.title}
              </Button>
            ))}
          </>
        )}

        {ticket.rating && (
          <>
            <Divider orientation="left">客户评价</Divider>
            <Space>
              <span>评分：</span>
              <span style={{ color: '#faad14', fontSize: 18 }}>
                {'★'.repeat(ticket.rating.rating)}
                {'☆'.repeat(5 - ticket.rating.rating)}
              </span>
              {ticket.rating.comment && <Text type="secondary">（{ticket.rating.comment}）</Text>}
            </Space>
          </>
        )}
      </Card>

      <Card title="对话记录" style={{ marginBottom: 16 }}>
        <MessageList messages={visibleMessages as Message[]} />
        <div ref={messagesEndRef} />
      </Card>

      {ticket.status !== 'CLOSED' && (
        <Card title="回复工单">
          <Form form={form} layout="vertical" onFinish={handleReply}>
            <Form.Item
              name="content"
              rules={[{ required: true, message: '请输入回复内容' }]}
              style={{ marginBottom: 12 }}
            >
              <TextArea rows={4} placeholder={isInternal ? '输入内部备注（客户不可见）...' : '输入回复内容...'} />
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Tooltip title="内部备注仅客服可见">
                  <Space>
                    <Switch checked={isInternal} onChange={setIsInternal} size="small" />
                    <span style={{ fontSize: 12, color: isInternal ? '#d46b08' : '#999' }}>
                      {isInternal ? '内部备注模式' : '普通回复模式'}
                    </span>
                  </Space>
                </Tooltip>
              </Space>
              <Button type="primary" htmlType="submit" loading={replyLoading} icon={<SendOutlined />}>
                {isInternal ? '添加备注' : '发送回复'}
              </Button>
            </div>
          </Form>
        </Card>
      )}

      <Modal
        title="转交工单"
        open={transferVisible}
        onCancel={() => setTransferVisible(false)}
        footer={null}
      >
        <Form form={transferForm} layout="vertical" onFinish={handleTransfer}>
          <Form.Item name="agentId" label="选择目标客服" rules={[{ required: true, message: '请选择客服' }]}>
            <Select placeholder="请选择要转交给的客服">
              {agents
                .filter((a) => a.id !== ticket.agent?.id)
                .map((a) => (
                  <Select.Option key={a.id} value={a.id}>
                    {a.user.name} ({a.team?.name || '未分组'})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setTransferVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit" style={{ marginLeft: 8 }}>
              确认转交
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="合并工单"
        open={mergeVisible}
        onCancel={() => setMergeVisible(false)}
        footer={null}
      >
        <Form form={mergeForm} layout="vertical" onFinish={handleMerge}>
          <Form.Item
            name="targetTicketId"
            label="输入目标工单编号"
            rules={[{ required: true, message: '请输入目标工单编号' }]}
          >
            <Input type="number" placeholder="请输入要合并到的工单编号" />
          </Form.Item>
          <Text type="warning">合并后当前工单将被关闭，对话记录保留在目标工单中。</Text>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setMergeVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit" style={{ marginLeft: 8 }}>
              确认合并
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AgentTicketDetail;
