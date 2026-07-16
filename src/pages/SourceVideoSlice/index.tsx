import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Descriptions, Drawer, Modal, Popconfirm, Typography } from 'antd';
import { LuX } from 'react-icons/lu';
import VideoTimeline, { type TimeRange } from '~/components/VideoTimeline';
import StreamVideoPlayer, { type StreamVideoPlayerHandle } from '~/components/StreamVideoPlayer';
import SlicePageHeader from '~/components/SlicePageHeader';
import SlicePageEmptyState from '~/components/SlicePageEmptyState';
import { useAppSEO } from '~/hooks/useAppSEO';
import { AppError } from '~/services/http';
import { fetchSourceVideoDetail, type SourceVideo } from '~/services/sourceVideo';
import { submitClip } from '~/services/slice';
import { submitAiSliceSelection } from '~/services/aiSlice';
import { type AiPrompt } from '~/services/aiPrompt';
import {
  fetchSliceProjectDetail,
  toSliceProjectClips,
  saveSliceProject,
  updateSliceProject,
  type SliceProjectClip,
} from '~/services/sliceProject';
import { showAppError, toast } from '~/utils/toast';
import { formatToDateTime } from '~/utils/date';
import { formatVideoDurationMs } from '~/utils/duration';
import { useSliceEntryFrom } from '~/hooks/useSliceEntryFrom';
import {
  buildManualVideoSliceLink,
  buildSourceVideoSliceLink,
  parseProjectId,
} from '~/routes/links';
import { buildSliceBreadcrumbItems } from '~/utils/sliceBreadcrumbs';
import { getVideoFormatLabel, isPlayableVideoUrl } from '~/utils/videoUrl';
import SelectedSegmentsPanel from './SelectedSegmentsPanel';
import SourceVideoSlicePageSkeleton from './SourceVideoSlicePageSkeleton';
import TimelineLoadingSkeleton from './TimelineLoadingSkeleton';
import PromptPickerPanel from './PromptPickerPanel';

const MAX_TOTAL_DURATION = 30 * 60;

function clips0ToTimeRanges(clips: SliceProjectClip[] | undefined): TimeRange[] {
  if (!clips?.length) return [];
  return clips.map((clip, index) => {
    const start = (clip.start_time ?? 0) / 1000;
    const end = (clip.end_time ?? 0) / 1000;
    return {
      id: `timeline-${index}-${Math.round(start * 1000)}-${Math.round(end * 1000)}`,
      start,
      end,
    };
  });
}

const SourceVideoSlicePage = () => {
  const { id: sourceVideoId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = parseProjectId(searchParams.get('projectId'));
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
  const [preferredPromptId, setPreferredPromptId] = useState<number | null>(null);
  const playerRef = useRef<StreamVideoPlayerHandle>(null);
  const rafRef = useRef<number>(0);
  /** streamUrl 变更会清空选区；项目回显需在其后写入 */
  const pendingRangesRef = useRef<TimeRange[] | null>(null);
  const streamUrlRef = useRef('');

  useAppSEO({
    title: video ? `${video.name} - 切片` : '视频切片',
    path: sourceVideoId
      ? buildSourceVideoSliceLink(sourceVideoId, { projectId: projectId || undefined })
      : '/source-videos',
    robots: 'noindex, nofollow',
  });

  const streamUrl = video?.live_url?.trim() ?? '';
  streamUrlRef.current = streamUrl;
  const hasVideoUrl = Boolean(streamUrl);
  const canPreview = hasVideoUrl && isPlayableVideoUrl(streamUrl);
  const videoFormatLabel = useMemo(() => getVideoFormatLabel(streamUrl), [streamUrl]);

  const loadPageData = useCallback(async () => {
    if (!sourceVideoId) return;

    setLoading(true);
    pendingRangesRef.current = null;
    setPreferredPromptId(null);
    setSelectedPrompt(null);

    try {
      // 无 projectId：源视频入口只拉详情；有 projectId：再拉项目并回填 clips0 / prompt_id
      const [videoRes, projectSettled] = await Promise.all([
        fetchSourceVideoDetail(sourceVideoId),
        projectId ? fetchSliceProjectDetail(projectId).catch(() => null) : Promise.resolve(null),
      ]);

      if (videoRes.code !== 0) {
        toast.notify.error(videoRes.message || '加载源视频失败');
        setVideo(null);
        return;
      }

      const nextStreamUrl = videoRes.data.live_url?.trim() ?? '';
      const sameStream = streamUrlRef.current === nextStreamUrl;

      setVideo(videoRes.data);

      if (!projectId) {
        if (sameStream) {
          setSelectedRanges([]);
        }
        return;
      }

      const projectRes = projectSettled;
      if (projectRes?.code === 0 && projectRes.data) {
        const ranges = clips0ToTimeRanges(projectRes.data.clips0);
        // streamUrl 不变时不会触发清理 effect，需直接回填
        if (sameStream) {
          setSelectedRanges(ranges);
          pendingRangesRef.current = null;
        } else {
          pendingRangesRef.current = ranges;
        }
        const promptId = Number(projectRes.data.prompt_id ?? 0);
        setPreferredPromptId(promptId > 0 ? promptId : null);
      } else {
        toast.notify.warning(projectRes?.message || '剪辑项目加载失败');
      }
    } catch (error) {
      setVideo(null);
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('加载页面数据失败');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, sourceVideoId]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    setVideoDuration(0);
    setCurrentTime(0);
    setActiveRangeId(null);
    setVideoError(null);

    if (pendingRangesRef.current) {
      setSelectedRanges(pendingRangesRef.current);
      pendingRangesRef.current = null;
    } else {
      setSelectedRanges([]);
    }
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
    if (!video) return;

    if (selectedRanges.length === 0) {
      toast.notify.warning('请先选择至少一个时间段');
      return;
    }

    if (!selectedPrompt) {
      toast.notify.warning('请先选择一个 AI 提示词');
      return;
    }

    const projectName = `一键成片_${formatToDateTime(Date.now(), 'YYYY-MM-DD_HH:mm:ss')}`;
    const projectPayload = {
      live_id: video.id,
      name: projectName,
      prompt_id: selectedPrompt.id,
      project_source: 'timeline' as const,
      clips0: toSliceProjectClips(selectedRanges),
      clips1: [] as ReturnType<typeof toSliceProjectClips>,
    };

    setSubmitting(true);
    try {
      const { code, message, data } = projectId
        ? await updateSliceProject(projectId, projectPayload)
        : await saveSliceProject(projectPayload);

      if (code !== 0) {
        toast.notify.error(message || '保存项目失败');
        return;
      }

      const savedProjectId = data?.id || projectId;
      if (!savedProjectId) {
        toast.notify.error('保存成功但未返回项目 ID');
        return;
      }

      const response = await submitClip({
        video_project_id: savedProjectId,
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || '提交失败');
        return;
      }

      const nextProjectName = data?.name || projectName;
      toast.notify.success('任务已提交', '可前往任务管理查看进度');
      navigate(`/slices?keyword=${encodeURIComponent(nextProjectName)}`);
    } catch (error) {
      const msg = error instanceof AppError ? error.errorMessage : '提交失败';
      toast.notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [navigate, projectId, selectedPrompt, selectedRanges, video]);

  const handleAiSelect = useCallback(async () => {
    if (!video) return;

    if (selectedRanges.length === 0) {
      toast.notify.warning('请先选择至少一个时间段');
      return;
    }

    if (!selectedPrompt) {
      toast.notify.warning('请先选择一个 AI 提示词');
      return;
    }

    const projectName = `AI选片_${formatToDateTime(Date.now(), 'YYYY-MM-DD_HH:mm:ss')}`;
    const projectPayload = {
      live_id: video.id,
      name: projectName,
      prompt_id: selectedPrompt.id,
      project_source: 'timeline' as const,
      clips0: toSliceProjectClips(selectedRanges),
      clips1: [] as ReturnType<typeof toSliceProjectClips>,
    };

    setAiSelecting(true);
    try {
      const { code, message, data } = projectId
        ? await updateSliceProject(projectId, projectPayload)
        : await saveSliceProject(projectPayload);

      if (code !== 0) {
        toast.notify.error(message || '保存项目失败');
        return;
      }

      const savedProjectId = data?.id || projectId;
      if (!savedProjectId) {
        toast.notify.error('保存成功但未返回项目 ID');
        return;
      }

      const response = await submitAiSliceSelection({
        video_project_id: savedProjectId,
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || 'AI 选片任务提交失败');
        return;
      }

      toast.notify.success('AI 选片任务已提交', '可前往任务管理查看进度');
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
  }, [navigate, projectId, selectedPrompt, selectedRanges, video]);

  const breadcrumbItems = useMemo(
    () =>
      buildSliceBreadcrumbItems({
        entryFrom,
        sourceVideoId,
        pageKind: 'timeline',
        videoName: video?.name,
      }),
    [entryFrom, sourceVideoId, video?.name]
  );

  if (loading) {
    return <SourceVideoSlicePageSkeleton breadcrumbItems={breadcrumbItems} />;
  }

  if (!video) {
    return (
      <div className="slice-page slice-page_timeline">
        <SlicePageHeader breadcrumbItems={breadcrumbItems} title="视频切片" />
        <div className="slice-page-empty-shell">
          <SlicePageEmptyState variant="video-unavailable" entryFrom={entryFrom} />
        </div>
      </div>
    );
  }

  const handleSwitchToManual = () => {
    navigate(buildManualVideoSliceLink(sourceVideoId, { projectId: projectId || undefined }), {
      state: { from: entryFrom },
    });
  };

  const pageHeader = (
    <SlicePageHeader
      breadcrumbItems={breadcrumbItems}
      title={`${video.name} - 视频切片`}
      actions={
        <>
          <Button onClick={() => setSourceModalVisible(true)}>查看播放源</Button>
          <Popconfirm
            title="切换到人工切片？"
            description="未保存的改动切换后将丢失，确定要继续吗？"
            okText="确定切换"
            cancelText="取消"
            onConfirm={handleSwitchToManual}
          >
            <Button className="slice-mode-switch-btn">切换到人工切片</Button>
          </Popconfirm>
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
        <div className="slice-page-empty-shell">
          <SlicePageEmptyState variant="no-playback-url" entryFrom={entryFrom} />
        </div>
      ) : !canPreview ? (
        <div className="slice-page-empty-shell">
          <SlicePageEmptyState variant="unsupported-format" entryFrom={entryFrom} />
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
              preferredId={preferredPromptId}
              onSelect={setSelectedPrompt}
            />
          </div>

          {isTimelineLoading && <TimelineLoadingSkeleton />}

          {isTimelineReady && (
            <div className="slice-timeline-section">
              <SelectedSegmentsPanel
                videoDuration={videoDuration}
                selectedRanges={selectedRanges}
                totalSelectedDuration={totalSelectedDuration}
                maxTotalDuration={MAX_TOTAL_DURATION}
                submitting={submitting}
                aiSelecting={aiSelecting}
                zoomLevel={timelineZoomLevel}
                onZoomLevelChange={setTimelineZoomLevel}
                activeRangeId={activeRangeId}
                onActiveRangeSelect={handleActiveRangeSelect}
                onSubmit={() => void handleSubmit()}
                onAiSelect={() => void handleAiSelect()}
                onClearAll={handleClearAllRanges}
                onRangeDelete={handleRangeDelete}
                hasSelectedPrompt={selectedPrompt != null}
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

      <Drawer
        open={sourceModalVisible}
        placement="right"
        width="min(520px, 100vw)"
        title={null}
        closable={false}
        destroyOnClose
        className="slice-source-drawer"
        onClose={() => setSourceModalVisible(false)}
      >
        <div className="slice-source-drawer__layout">
          <header className="slice-source-drawer__header">
            <div className="slice-source-drawer__header-main">
              <h3 className="slice-source-drawer__title">播放源信息</h3>
              <p className="slice-source-drawer__meta">{video.name}</p>
            </div>
            <button
              type="button"
              className="slice-source-drawer__close"
              aria-label="关闭"
              onClick={() => setSourceModalVisible(false)}
            >
              <LuX size={18} />
            </button>
          </header>

          <div className="slice-source-drawer__body">
            <Descriptions column={1} size="small" className="slice-source-descriptions">
              <Descriptions.Item label="源视频名称">{video.name}</Descriptions.Item>
              <Descriptions.Item label="备注">{video.remark || '-'}</Descriptions.Item>
              <Descriptions.Item label="直播地址">
                <Typography.Paragraph
                  className="slice-source-url"
                  copyable={{ text: video.live_url }}
                >
                  {video.live_url}
                </Typography.Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="时长">
                {video.duration > 0 ? formatVideoDurationMs(video.duration) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatToDateTime(video.created_at)}</Descriptions.Item>
              <Descriptions.Item label="预览状态">
                {canPreview
                  ? `支持浏览器预览（${videoFormatLabel}）`
                  : hasVideoUrl
                    ? '格式不受支持'
                    : '暂无播放地址'}
              </Descriptions.Item>
            </Descriptions>
          </div>
        </div>
      </Drawer>

      <Modal
        className="noanimation-modal"
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
