import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Descriptions, Empty, Modal, Typography } from 'antd';
import VideoTimeline, { type TimeRange } from '~/components/VideoTimeline';
import StreamVideoPlayer, { type StreamVideoPlayerHandle } from '~/components/StreamVideoPlayer';
import SlicePageHeader from '~/components/SlicePageHeader';
import { useAppSEO } from '~/hooks/useAppSEO';
import { AppError } from '~/services/http';
import { fetchSourceVideoDetail, type SourceVideo } from '~/services/sourceVideo';
import { submitClip } from '~/services/slice';
import { submitAiSliceSelection } from '~/services/aiSlice';
import type { AiPrompt } from '~/services/aiPrompt';
import { showAppError, toast } from '~/utils/toast';
import { formatToDateTime } from '~/utils/date';
import { formatVideoDuration } from '~/utils/duration';
import { useSliceEntryFrom } from '~/hooks/useSliceEntryFrom';
import { buildManualVideoSliceLink, buildSourceVideoSliceLink } from '~/routes/links';
import { buildSliceBreadcrumbItems } from '~/utils/sliceBreadcrumbs';
import { getVideoFormatLabel, isPlayableVideoUrl } from '~/utils/videoUrl';
import PageLoading from '~/components/PageLoading';
import SelectedSegmentsPanel from './SelectedSegmentsPanel';
import TimelineLoadingSkeleton from './TimelineLoadingSkeleton';
import PromptPickerPanel from './PromptPickerPanel';

const MAX_TOTAL_DURATION = 30 * 60;

const SourceVideoSlicePage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const entryFrom = useSliceEntryFrom();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<SourceVideo | null>(null);
  const [tipVisible, setTipVisible] = useState(false);
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedRanges, setSelectedRanges] = useState<TimeRange[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiSelecting, setAiSelecting] = useState(false);
  const [autoPlayOnSelect, setAutoPlayOnSelect] = useState(true);
  const [timelineZoomLevel, setTimelineZoomLevel] = useState(1);
  const [activeRangeId, setActiveRangeId] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<AiPrompt | null>(null);
  const playerRef = useRef<StreamVideoPlayerHandle>(null);
  const rafRef = useRef<number>(0);

  useAppSEO({
    title: video ? `${video.name} - 切片` : '视频切片',
    path: id ? buildSourceVideoSliceLink(id) : '/source-videos',
    robots: 'noindex, nofollow',
  });

  const streamUrl = video?.live_url?.trim() ?? '';
  const hasVideoUrl = Boolean(streamUrl);
  const canPreview = hasVideoUrl && isPlayableVideoUrl(streamUrl);
  const videoFormatLabel = useMemo(() => getVideoFormatLabel(streamUrl), [streamUrl]);

  const loadVideo = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await fetchSourceVideoDetail(id);
      if (response.code !== 0) {
        toast.notify.error(response.message || '加载源视频失败');
        setVideo(null);
        return;
      }
      setVideo(response.data);
    } catch (error) {
      setVideo(null);
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('加载源视频失败');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadVideo();
  }, [loadVideo]);

  useEffect(() => {
    setVideoDuration(0);
    setCurrentTime(0);
    setSelectedRanges([]);
    setActiveRangeId(null);
    setVideoError(null);
  }, [streamUrl]);

  const isTimelineReady = videoDuration > 0 && !videoError;
  const isTimelineLoading = canPreview && !videoError && videoDuration === 0;

  const handleDurationChange = useCallback((duration: number) => {
    setVideoDuration(duration);
  }, []);

  const handlePlaybackError = useCallback((message: string) => {
    setVideoError(message);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const video = playerRef.current?.video;
      if (video && Number.isFinite(video.duration)) {
        setCurrentTime(video.currentTime || 0);
      }
      rafRef.current = requestAnimationFrame(updateTime);
    };

    if (isTimelineReady) {
      rafRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isTimelineReady]);

  // 选中片段播放到结尾后自动取消选中并暂停
  useEffect(() => {
    if (!activeRangeId) return;

    const activeRange = selectedRanges.find((range) => range.id === activeRangeId);
    if (!activeRange) return;

    const video = playerRef.current?.video;
    if (!video || video.paused) return;

    if (currentTime >= activeRange.end - 0.05) {
      video.pause();
      video.currentTime = Math.min(activeRange.end, video.duration || activeRange.end);
      setCurrentTime(video.currentTime);
      setActiveRangeId(null);
    }
  }, [activeRangeId, currentTime, selectedRanges]);

  const handleTimeChange = useCallback((time: number) => {
    const video = playerRef.current?.video;
    if (video) {
      video.currentTime = time;
      if (video.paused) {
        void video.play().catch(() => undefined);
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
      toast.notify.warning('请先选择至少一个时间段');
      return;
    }

    if (!selectedPrompt?.content.trim()) {
      toast.notify.warning('请先选择一个 AI 提示词');
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
        prompt: selectedPrompt.content.trim(),
        water_text: 'www',
        count: 1,
        source_video_id: String(video.id),
        source_video_name: video.name,
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || '提交失败');
        return;
      }

      if (!response.data?.task_id) {
        toast.notify.error('提交成功但未返回任务 ID');
        return;
      }

      toast.notify.success('任务已提交，正在跳转到任务管理');
      navigate('/tasks');
    } catch (error) {
      const msg = error instanceof AppError ? error.errorMessage : '提交失败';
      toast.notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [navigate, selectedPrompt, selectedRanges, streamUrl, video]);

  const handleAiSelect = useCallback(async () => {
    if (!video || !id) return;

    if (selectedRanges.length === 0) {
      toast.notify.warning('请先选择至少一个时间段');
      return;
    }

    if (!selectedPrompt?.content.trim()) {
      toast.notify.warning('请先选择一个 AI 提示词');
      return;
    }

    const clips = selectedRanges.map((range) => ({
      start: Math.round(range.start),
      end: Math.round(range.end),
    }));

    setAiSelecting(true);
    try {
      const response = await submitAiSliceSelection(String(video.id), {
        prompt: selectedPrompt.content.trim(),
        promptId: selectedPrompt.id,
        clips,
        sourceVideoName: video.name,
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || 'AI 选片任务提交失败');
        return;
      }

      toast.notify.success('AI 选片任务已提交，正在前往任务管理');
      navigate('/tasks');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('AI 选片失败');
      }
    } finally {
      setAiSelecting(false);
    }
  }, [id, navigate, selectedPrompt, selectedRanges, video]);

  const breadcrumbItems = useMemo(
    () =>
      buildSliceBreadcrumbItems({
        entryFrom,
        sourceVideoId: id,
        pageKind: 'timeline',
        videoName: video?.name,
      }),
    [entryFrom, id, video?.name]
  );

  if (loading) {
    return (
      <div className="slice-page slice-page_timeline">
        <PageLoading />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="slice-page slice-page_timeline">
        <SlicePageHeader
          breadcrumbItems={breadcrumbItems}
          title="视频切片"
          description="源视频不存在或无权访问。"
        />
        <Empty description="源视频不存在或无权访问" />
      </div>
    );
  }

  const pageHeader = (
    <SlicePageHeader
      breadcrumbItems={breadcrumbItems}
      title={`${video.name} - 视频切片`}
      actions={
        <>
          <Button onClick={() => setSourceModalVisible(true)}>查看播放源</Button>
          {entryFrom !== 'slices' ? (
            <Link to={buildManualVideoSliceLink(id)}>
              <Button>切换到人工切片</Button>
            </Link>
          ) : null}
        </>
      }
      tip={{
        text: '请自觉遵守平台链接导入规范',
        onClick: () => setTipVisible(true),
      }}
    />
  );

  return (
    <div className="slice-page slice-page_timeline">
      {pageHeader}

      {!hasVideoUrl ? (
        <div className="slice-workspace-card">
          <div className="slice-workspace-empty">
            <Empty description="当前源视频暂无播放地址" />
          </div>
        </div>
      ) : !canPreview ? (
        <div className="slice-workspace-card">
          <div className="slice-workspace-empty">
            <Empty description="当前播放地址格式不受支持，请使用 m3u8、mp4 等可播放链接" />
          </div>
        </div>
      ) : (
        <div className="slice-workspace-card">
          <div className="slice-main-section">
            <div className="slice-video-section">
              <StreamVideoPlayer
                ref={playerRef}
                url={streamUrl}
                className="slice-video"
                errorClassName="slice-video-error"
                onDurationChange={handleDurationChange}
                onPlaybackError={handlePlaybackError}
              />
            </div>

            <PromptPickerPanel
              selectedId={selectedPrompt?.id ?? null}
              onSelect={setSelectedPrompt}
            />
          </div>

          {isTimelineLoading && <TimelineLoadingSkeleton />}

          {isTimelineReady && (
            <div className="slice-timeline-section">
              <SelectedSegmentsPanel
                videoDuration={videoDuration}
                currentTime={currentTime}
                selectedRanges={selectedRanges}
                totalSelectedDuration={totalSelectedDuration}
                maxTotalDuration={MAX_TOTAL_DURATION}
                submitting={submitting}
                aiSelecting={aiSelecting}
                autoPlayOnSelect={autoPlayOnSelect}
                onAutoPlayChange={setAutoPlayOnSelect}
                zoomLevel={timelineZoomLevel}
                onZoomLevelChange={setTimelineZoomLevel}
                activeRangeId={activeRangeId}
                onActiveRangeSelect={handleActiveRangeSelect}
                onSubmit={() => void handleSubmit()}
                onAiSelect={() => void handleAiSelect()}
                onClearAll={handleClearAllRanges}
                onRangeDelete={handleRangeDelete}
                hasSelectedPrompt={Boolean(selectedPrompt?.content.trim())}
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
        </div>
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
            <Descriptions.Item label="备注名称">{video.remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="直播地址">
              <Typography.Paragraph
                className="slice-source-url"
                copyable={{ text: video.live_url }}
              >
                {video.live_url}
              </Typography.Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="时长">
              {video.duration > 0 ? formatVideoDuration(video.duration) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{formatToDateTime(video.created_at)}</Descriptions.Item>
            <Descriptions.Item label="预览状态">
              {canPreview ? `支持浏览器预览（${videoFormatLabel}）` : hasVideoUrl ? '格式不受支持' : '暂无播放地址'}
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
