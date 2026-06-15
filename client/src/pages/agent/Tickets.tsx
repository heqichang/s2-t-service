import React, { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Select,
  Input,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Tooltip,
} from 'antd';
import { SearchOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ticketApi, adminApi } from '../../api';
import type { Ticket, Agent } from '../../types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '../../types';
import dayjs from 'dayjs';

const { Title } = Typography;

const AgentTickets: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    agentId: '',
    search: '',
  });

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res: any = await ticketApi.list({
        page,
        pageSize,
        ...filters,
      });
      setTickets(res.tickets || []);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    adminApi.agents().then((res: any) => setAgents(res || []));
  }, [page, pageSize, filters]);

  const pendingCount = tickets.filter((t) => t.status === 'PENDING').length;
  const processingCount = tickets.filter((t) => t.status === 'PROCESSING').length;
  const waitingCount = tickets.filter((t) => t.status === 'WAITING_CUSTOMER').length;
  const resolvedCount = tickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length;

  const columns = [
    {
      title: '编号',
      dataIndex: 'id',
      width: 80,
      render: (id: number) => <strong>#{id}</strong>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (title: string, record: Ticket) => (
        <a onClick={() => navigate(`/tickets/${record.id}`)}>{title}</a>
      ),
    },
    {
      title: '客户',
      dataIndex: 'customer',
      width: 120,
      render: (c: Ticket['customer']) => c.name,
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 110,
      render: (c: string) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS],
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 90,
      render: (p: string) => (
        <Tag color={PRIORITY_COLORS[p as keyof typeof PRIORITY_COLORS]}>
          {PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS]}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (s: string) => (
        <Tag color={STATUS_COLORS[s as keyof typeof STATUS_COLORS]}>
          {STATUS_LABELS[s as keyof typeof STATUS_LABELS]}
        </Tag>
      ),
    },
    {
      title: '处理客服',
      dataIndex: 'agent',
      width: 120,
      render: (agent: Ticket['agent']) =>
        agent ? (
          <Tooltip title={agent.team?.name}>
            <UserOutlined /> {agent.user.name}
          </Tooltip>
        ) : (
          <Tag color="orange">待分配</Tag>
        ),
    },
    {
      title: '回复数',
      width: 80,
      render: (_: any, r: Ticket) => r._count?.messages || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (d: string) => dayjs(d).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: Ticket) => (
        <Button type="link" onClick={() => navigate(`/tickets/${record.id}`)}>
          处理
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="待分配" value={pendingCount} valueStyle={{ color: '#fa8c16' }} />
          </Col>
          <Col span={6}>
            <Statistic title="处理中" value={processingCount} valueStyle={{ color: '#1677ff' }} />
          </Col>
          <Col span={6}>
            <Statistic
              title="等待客户"
              value={waitingCount}
              valueStyle={{ color: '#13c2c2' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已解决"
              value={resolvedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>

      <Card title={<Title level={4} style={{ margin: 0 }}>工单列表</Title>}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 140 }}
            value={filters.status || undefined}
            onChange={(v) => setFilters({ ...filters, status: v || '' })}
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <Select.Option key={k} value={k}>
                {v}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="分类"
            allowClear
            style={{ width: 140 }}
            value={filters.category || undefined}
            onChange={(v) => setFilters({ ...filters, category: v || '' })}
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <Select.Option key={k} value={k}>
                {v}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="优先级"
            allowClear
            style={{ width: 140 }}
            value={filters.priority || undefined}
            onChange={(v) => setFilters({ ...filters, priority: v || '' })}
          >
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <Select.Option key={k} value={k}>
                {v}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="处理客服"
            allowClear
            style={{ width: 160 }}
            value={filters.agentId || undefined}
            onChange={(v) => setFilters({ ...filters, agentId: v || '' })}
          >
            {agents.map((a) => (
              <Select.Option key={a.id} value={a.id}>
                {a.user.name}
              </Select.Option>
            ))}
          </Select>
          <Input.Search
            placeholder="搜索标题/描述"
            allowClear
            style={{ width: 240 }}
            prefix={<SearchOutlined />}
            onSearch={(v) => setFilters({ ...filters, search: v })}
          />
        </Space>

        <Table
          loading={loading}
          dataSource={tickets}
          columns={columns}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
};

export default AgentTickets;
