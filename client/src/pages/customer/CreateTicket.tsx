import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Card, Typography, App, Upload, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ticketApi, adminApi } from '../../api';
import { CATEGORY_LABELS, PRIORITY_LABELS } from '../../types';
import type { Tag, UploadFile } from '../../types';
import type { UploadProps } from 'antd';

const { Title } = Typography;
const { TextArea } = Input;

interface UploadedAttachment {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

const CreateTicket: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);
  const navigate = useNavigate();
  const { message } = App.useApp();

  useEffect(() => {
    adminApi.tags().then((res: any) => setTags(res || []));
  }, []);

  const uploadProps: UploadProps = {
    fileList,
    beforeUpload: async (file) => {
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }
      try {
        const res: any = await ticketApi.upload(file as File);
        setUploadedAttachments((prev) => [...prev, res]);
        return false;
      } catch (e: any) {
        message.error(e.error || '上传失败');
        return Upload.LIST_IGNORE;
      }
    },
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
    },
    onRemove: (file) => {
      setUploadedAttachments((prev) => prev.filter((_, idx) => idx !== fileList.indexOf(file)));
    },
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await ticketApi.create({
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        tagIds: values.tagIds,
        attachments: uploadedAttachments,
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
        <Form.Item name="title" label="工单标题" rules={[{ required: true, message: '请输入工单标题' }]}>
          <Input placeholder="简要描述您的问题" size="large" />
        </Form.Item>

        <Form.Item name="category" label="问题分类" rules={[{ required: true, message: '请选择分类' }]}>
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

        <Form.Item label="附件上传（可选）">
          <Upload {...uploadProps} multiple>
            <Button icon={<UploadOutlined />}>选择文件（最大 10MB）</Button>
          </Upload>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              提交工单
            </Button>
            <Button size="large" onClick={() => navigate(-1)}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CreateTicket;
