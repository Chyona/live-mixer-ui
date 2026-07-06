import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumb, Button, Descriptions, Empty, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { LuPlus, LuScissors } from 'react-icons/lu';

import { useAppSEO } from '~/hooks/useAppSEO';
import { AppError } from '~/services/http';
import { fetchSourceVideoDetail, type SourceVideo } from '~/services/sourceVideo';
import { formatToDate } from '~/utils/date';
import { showAppError, toast } from '~/utils/toast';

import { formatVideoDuration } from '../SourceVideos/utils';
import './index.css';

interface VideoClip {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
}

function buildMockClips(video: SourceVideo): VideoClip[] {
  const count = Math.min(video.clipCount, 5);
  if (!count) return [];

  const step = Math.max(Math.floor(video.duration / (count + 1)), 60);

  return Array.from({ length: count }, (_, index) => {
    const startTime = step * (index + 1);
    const endTime = Math.min(startTime + 120, video.duration);

    return {
      id: `clip-${video.id}-${index + 1}`,
      title: `切片 ${index + 1}`,
      startTime,
      endTime,
    };
  });
}

const SourceVideoSlicePage = () => {
  const { id = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<SourceVideo | null>(null);
  const [clips, setClips] = useState<VideoClip[]>([]);

  useAppSEO({
    title: video ? `${video.name} - 切片` : '视频切片',
    path: id ? `/source-videos/${id}/slice` : '/source-videos',
    robots: 'noindex, nofollow',
  });

  const loadVideo = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await fetchSourceVideoDetail(id);
      if (response.code !== 0) {
        toast.error(response.message || '加载源视频失败');
        setVideo(null);
        return;
      }

      setVideo(response.data);
      setClips(buildMockClips(response.data));
    } catch (error) {
      setVideo(null);
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.error('加载源视频失败');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadVideo();
  }, [loadVideo]);

  const handleAddClip = () => {
    if (!video) return;

    const nextIndex = clips.length + 1;
    const startTime = clips.at(-1)?.endTime ?? 0;
    const endTime = Math.min(startTime + 120, video.duration);

    setClips((prev) => [
      ...prev,
      {
        id: `clip-${video.id}-${Date.now()}`,
        title: `切片 ${nextIndex}`,
        startTime,
        endTime,
      },
    ]);
    toast.success('已添加切片');
  };

  const columns: ColumnsType<VideoClip> = [
    {
      title: '切片名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (value: number) => formatVideoDuration(value),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (value: number) => formatVideoDuration(value),
    },
    {
      title: '时长',
      key: 'clipDuration',
      render: (_, record) => formatVideoDuration(Math.max(record.endTime - record.startTime, 0)),
    },
  ];

  if (loading) {
    return (
      <div className="source-video-slice-page source-video-slice-page_loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="source-video-slice-page">
        <Breadcrumb
          className="source-video-slice-breadcrumb"
          items={[{ title: <Link to="/source-videos">源视频管理</Link> }, { title: '视频切片' }]}
        />
        <Empty className="source-video-slice-empty" description="源视频不存在或无权访问" />
      </div>
    );
  }

  return (
    <div className="source-video-slice-page">
      <Breadcrumb
        className="source-video-slice-breadcrumb"
        items={[
          { title: <Link to="/source-videos">源视频管理</Link> },
          { title: `${video.name} - 切片` },
        ]}
      />

      <div className="source-video-slice-content">
        <section className="source-video-slice-panel source-video-slice-preview">
          <h2 className="source-video-slice-panel-title">直播预览</h2>
          <div className="source-video-slice-player">
            <LuScissors size={40} />
            <p>直播流预览区域</p>
            <a href={video.liveUrl} target="_blank" rel="noopener noreferrer">
              {video.liveUrl}
            </a>
          </div>
          <Descriptions column={1} size="small" className="source-video-slice-meta">
            <Descriptions.Item label="直播地址">{video.liveUrl}</Descriptions.Item>
            <Descriptions.Item label="备注名称">{video.remarkName || '-'}</Descriptions.Item>
            <Descriptions.Item label="视频时长">{formatVideoDuration(video.duration)}</Descriptions.Item>
            <Descriptions.Item label="日期">{formatToDate(video.date)}</Descriptions.Item>
          </Descriptions>
        </section>

        <section className="source-video-slice-panel source-video-slice-clips">
          <div className="source-video-slice-panel-head">
            <h2 className="source-video-slice-panel-title">切片列表</h2>
            <Button type="primary" icon={<LuPlus size={16} />} onClick={handleAddClip}>
              添加切片
            </Button>
          </div>
          <Table<VideoClip>
            rowKey="id"
            columns={columns}
            dataSource={clips}
            pagination={false}
            locale={{ emptyText: '暂无切片，点击添加切片' }}
          />
        </section>
      </div>
    </div>
  );
};

export default SourceVideoSlicePage;
