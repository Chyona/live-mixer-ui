import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb, Descriptions, Empty, Modal, Spin, Typography } from 'antd';
import Hls from 'hls.js';
import VideoTimeline, { type TimeRange } from '~/components/VideoTimeline';
import tipIcon from '~/assets/videos/tip-icon.png';
import { useAppSEO } from '~/hooks/useAppSEO';
import { AppError } from '~/services/http';
import { fetchSourceVideoDetail, type SourceVideo } from '~/services/sourceVideo';
import { submitClip } from '~/services/slice';
import { showAppError, toast } from '~/utils/toast';
import { formatToDate } from '~/utils/date';
import { formatVideoDuration, isPlayableStreamUrl } from '../SourceVideos/utils';
import SelectedSegmentsPanel from './SelectedSegmentsPanel';

import './index.css';

const MAX_TOTAL_DURATION = 30 * 60;

const SourceVideoSlicePage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<SourceVideo | null>(null);
  const [tipVisible, setTipVisible] = useState(false);
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedRanges, setSelectedRanges] = useState<TimeRange[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [autoPlayOnSelect, setAutoPlayOnSelect] = useState(false);
  const [timelineZoomLevel, setTimelineZoomLevel] = useState(1);
  const [activeRangeId, setActiveRangeId] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const rafRef = useRef<number>(0);

  useAppSEO({
    title: video ? `${video.name} - 切片` : '视频切片',
    path: id ? `/source-videos/${id}/slice` : '/source-videos',
    robots: 'noindex, nofollow',
  });

  const streamUrl = video?.liveUrl ?? '';
  const canPlayStream = useMemo(() => isPlayableStreamUrl(streamUrl), [streamUrl]);

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

  const initStream = useCallback(() => {
    if (!streamUrl || !canPlayStream) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setVideoDuration(0);
    setCurrentTime(0);
    setSelectedRanges([]);
    setActiveRangeId(null);
    setStreamReady(false);

    if (/\.m3u8(\?|$)/i.test(streamUrl) && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      if (videoRef.current) {
        hls.attachMedia(videoRef.current);
      }
      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        if (videoRef.current) {
          const duration = videoRef.current.duration;
          if (Number.isFinite(duration) && duration > 0) {
            setVideoDuration(duration);
          }
        }
        setStreamReady(true);
      });
      return;
    }

    if (videoRef.current) {
      videoRef.current.src = streamUrl;
      videoRef.current.load();
      setStreamReady(true);
    }
  }, [canPlayStream, streamUrl]);

  useEffect(() => {
    initStream();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [initStream]);

  const isFiniteDuration = Number.isFinite(videoDuration) && videoDuration > 0;

  const handleDurationChange = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(Number.isFinite(duration) ? duration : 0);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
        setCurrentTime(videoRef.current.currentTime || 0);
      }
      rafRef.current = requestAnimationFrame(updateTime);
    };

    if (streamReady && isFiniteDuration) {
      rafRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isFiniteDuration, streamReady]);

  const handleTimeChange = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (videoRef.current.paused) {
        void videoRef.current.play().catch(() => undefined);
      }
    }
    setCurrentTime(time);
  }, []);

  const handleRangeSelect = useCallback(
    (range: TimeRange) => {
      setSelectedRanges((prev) => [...prev, range]);
      if (autoPlayOnSelect) {
        handleTimeChange(range.start);
      }
    },
    [autoPlayOnSelect, handleTimeChange]
  );

  const handleRangeDelete = useCallback((rangeId: string) => {
    setActiveRangeId((current) => (current === rangeId ? null : current));
    setSelectedRanges((prev) => prev.filter((item) => item.id !== rangeId));
  }, []);

  const handleActiveRangeSelect = useCallback(
    (rangeId: string, start: number) => {
      setActiveRangeId(rangeId);
      handleTimeChange(start);
    },
    [handleTimeChange]
  );

  const handleClearAllRanges = useCallback(() => {
    setSelectedRanges([]);
    setActiveRangeId(null);
  }, []);

  const handleRangeUpdate = useCallback((updated: TimeRange) => {
    setSelectedRanges((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const totalSelectedDuration = useMemo(
    () => selectedRanges.reduce((sum, range) => sum + (range.end - range.start), 0),
    [selectedRanges]
  );

  const handleSubmit = useCallback(async () => {
    if (!video || !streamUrl) return;

    if (selectedRanges.length === 0) {
      toast.warning('请先选择至少一个时间段');
      return;
    }

    const clips = selectedRanges.map((range) => ({
      start: Math.round(range.start),
      end: Math.round(range.end),
    }));

    setSubmitting(true);
    try {
      const response = await submitClip({
        m3u8_url: streamUrl,
        clips,
        prompt: '确保生成的视频整体都是在讲同一个商品',
        water_text: 'www',
        count: 1,
        source_video_id: video.id,
        source_video_name: video.name,
      });

      if (response.code !== 0) {
        toast.error(response.message || '提交失败');
        return;
      }

      if (!response.data?.task_id) {
        toast.error('提交成功但未返回任务 ID');
        return;
      }

      toast.success('任务已提交，正在跳转到任务管理');
      navigate('/tasks');
    } catch (error) {
      const msg = error instanceof AppError ? error.errorMessage : '提交失败';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [navigate, selectedRanges, streamUrl, video]);

  const handleBatchDownload = useCallback(() => {
    toast.info('批量下载功能开发中');
  }, []);

  if (loading) {
    return (
      <div className="slice-page slice-page_loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="slice-page">
        <Breadcrumb
          className="slice-breadcrumb"
          items={[{ title: <Link to="/source-videos">源视频管理</Link> }, { title: '视频切片' }]}
        />
        <Empty className="slice-empty" description="源视频不存在或无权访问" />
      </div>
    );
  }

  return (
    <div className="slice-page">
      <Breadcrumb
        className="slice-breadcrumb"
        items={[
          { title: <Link to="/source-videos">源视频管理</Link> },
          { title: `${video.name} - 切片` },
        ]}
      />

      <div className="slice-video-info">
        <div>
          <h1 className="slice-video-title">{video.name}</h1>
          <button
            type="button"
            className="slice-view-source-btn"
            onClick={() => setSourceModalVisible(true)}
          >
            查看播放源
          </button>
        </div>
        <div className="slice-video-tip">
          请自觉遵守平台链接导入规范
          <img
            src={tipIcon}
            className="slice-tip-icon"
            alt="提示"
            onClick={() => setTipVisible(true)}
          />
        </div>
      </div>

      {!canPlayStream ? (
        <Empty className="slice-empty" description="当前源视频地址暂不支持浏览器预览，请检查直播地址格式" />
      ) : (
        <>
          <div className="slice-video-section">
            <video
              ref={videoRef}
              className="slice-video"
              controls
              onLoadedMetadata={handleDurationChange}
              onDurationChange={handleDurationChange}
            />
          </div>

          {streamReady && videoDuration > 0 && (
            <div className="slice-timeline-section">
              <SelectedSegmentsPanel
                videoDuration={videoDuration}
                currentTime={currentTime}
                selectedRanges={selectedRanges}
                totalSelectedDuration={totalSelectedDuration}
                maxTotalDuration={MAX_TOTAL_DURATION}
                submitting={submitting}
                autoPlayOnSelect={autoPlayOnSelect}
                onAutoPlayChange={setAutoPlayOnSelect}
                zoomLevel={timelineZoomLevel}
                onZoomLevelChange={setTimelineZoomLevel}
                activeRangeId={activeRangeId}
                onActiveRangeSelect={handleActiveRangeSelect}
                onSubmit={() => void handleSubmit()}
                onBatchDownload={handleBatchDownload}
                onClearAll={handleClearAllRanges}
                onRangeDelete={handleRangeDelete}
              />
              <VideoTimeline
                duration={videoDuration}
                currentTime={currentTime}
                selectedRanges={selectedRanges}
                maxTotalDuration={MAX_TOTAL_DURATION}
                zoomLevel={timelineZoomLevel}
                onZoomLevelChange={setTimelineZoomLevel}
                activeRangeId={activeRangeId}
                onActiveRangeChange={setActiveRangeId}
                onTimeChange={handleTimeChange}
                onRangeSelect={handleRangeSelect}
                onRangeDelete={handleRangeDelete}
                onRangeUpdate={handleRangeUpdate}
              />
            </div>
          )}
        </>
      )}

      <Modal
        open={sourceModalVisible}
        centered
        width={520}
        footer={null}
        closable
        title={null}
        className="slice-source-modal"
        onCancel={() => setSourceModalVisible(false)}
      >
        <div className="slice-source-modal-body">
          <h3 className="slice-source-modal-title">播放源信息</h3>
          <Descriptions column={1} size="small" className="slice-source-descriptions">
            <Descriptions.Item label="源视频名称">{video.name}</Descriptions.Item>
            <Descriptions.Item label="备注名称">{video.remarkName || '-'}</Descriptions.Item>
            <Descriptions.Item label="直播地址">
              <Typography.Paragraph
                className="slice-source-url"
                copyable={{ text: video.liveUrl }}
              >
                {video.liveUrl}
              </Typography.Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="时长">
              {video.duration > 0 ? formatVideoDuration(video.duration) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="日期">{formatToDate(video.date)}</Descriptions.Item>
            <Descriptions.Item label="预览状态">
              {canPlayStream ? '支持浏览器预览' : '暂不支持浏览器预览'}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Modal>

      <Modal
        title="温馨提示"
        open={tipVisible}
        centered
        width={420}
        okText="我知道了"
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={() => setTipVisible(false)}
        onCancel={() => setTipVisible(false)}
      >
        <p className="slice-tip-text">
          坚持创作高质量且充满人文关怀的原创内容，请勿搬运或发布侵权他人、违反国家法律法规、公序良俗的不良内容；因违反上述规定而产生的一切后果，均由用户自行承担。
        </p>
      </Modal>
    </div>
  );
};

export default SourceVideoSlicePage;
