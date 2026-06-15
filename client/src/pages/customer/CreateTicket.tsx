import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Card, Typography, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ticketApi, adminApi } from '../../api';
import { CATEGORY_LABELS, PRIORITY_LABELS } from '../../types';
import type { Tag } from '../../types';

const { Title } = Typography;
const { TextArea } = Input;

const CreateTicket: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const navigate = useNavigate();
  const { message } = App.useApp();

  useEffect(() => {
    adminApi.tags().then((res: any) => setTags(res || []));
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await ticketApi.create({
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        tagIds: values.tagIds,
      });
      message.success('工单提交成功');
      navigate('/tickets');
    } catch (e: any) {
      message.error(e.error || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Title level={4} style={{ marginBottom: 24 }}>
        提交新工单
      </Title>
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 700 }}>
        <Form.Item
          name="title"
          label="工单标题"
          rules={[{ required: true, message: '请输入工单标题' }]}
        >
          <Input placeholder="简要描述您的问题" size="large" />
        </Form.Item>

        <Form.Item
          name="category"
          label="问题分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select size="large" placeholder="请选择问题分类">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <Select.Option key={k} value={k}>
                {v}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="priority"
          label="优先级"
          rules={[{ required: true, message: '请选择优先级' }]}
          initialValue="MEDIUM"
        >
          <Select size="large" placeholder="请选择优先级">
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <Select.Option key={k} value={k}>
                {v}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="tagIds" label="标签">
          <Select mode="multiple" size="large" placeholder="选择标签（可选）">
            {tags.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                {t.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="description"
          label="详细描述"
          rules={[{ required: true, message: '请输入详细描述' }]}
        >
          <TextArea rows={6} placeholder="请详细描述您遇到的问题或需求..." />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} size="large">
            提交工单
          </Button>
          <Button style={{ marginLeft: 12 }} size="large" onClick={() => navigate(-1)}>
            取消
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CreateTicket;
