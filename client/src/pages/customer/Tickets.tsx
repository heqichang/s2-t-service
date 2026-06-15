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
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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

const { Title } = Typography;

const CustomerTickets: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', search: '' });

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
  }, [page, pageSize, filters]);

  const stats = [
    { label: '全部工单', value: total, color: '#1677ff' },
    {
      label: '处理中',
      value: tickets.filter((t) => ['PENDING', 'PROCESSING', 'WAITING_CUSTOMER'].includes(t.status))
        .length,
      color: '#faad14',
    },
    {
      label: '已解决',
      value: tickets.filter((t) => t.status === 'RESOLVED').length,
      color: '#52c41a',
    },
    {
      label: '已关闭',
      value: tickets.filter((t) => t.status === 'CLOSED').length,
      color: '#8c8c8c',
    },
  ];

  const columns = [
    {
      title: '工单编号',
      dataIndex: 'id',
      width: 100,
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
      title: '分类',
      dataIndex: 'category',
      width: 120,
      render: (c: string) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS],
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 100,
      render: (p: string) => (
        <Tag color={PRIORITY_COLORS[p as keyof typeof PRIORITY_COLORS]}>
          {PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS]}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
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
      render: (agent: Ticket['agent']) => (agent ? agent.user.name : '未分配'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 100,
      render: (_: any, record: Ticket) => (
        <Button type="link" onClick={() => navigate(`/tickets/${record.id}`)}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          {stats.map((s) => (
            <Col span={6} key={s.label}>
              <Statistic title={s.label} value={s.value} valueStyle={{ color: s.color }} />
            </Col>
          ))}
        </Row>
      </Card>

      <Card
        title={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Title level={4} style={{ margin: 0 }}>
              我的工单
            </Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tickets/new')}>
              提交新工单
            </Button>
          </Space>
        }
      >
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

export default CustomerTickets;
