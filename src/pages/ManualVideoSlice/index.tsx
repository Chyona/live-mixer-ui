import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Descriptions, Drawer, Modal, Space, Typography } from 'antd';
import { LuChevronDown, LuDownload, LuX } from 'react-icons/lu';
import VideoTimeline, { type TimeRange } from '~/components/VideoTimeline';
import StreamVideoPlayer, { type StreamVideoPlayerHandle } from '~/components/StreamVideoPlayer';
import SlicePageHeader from '~/components/SlicePageHeader';
import SlicePageEmptyState from '~/components/SlicePageEmptyState';
import ManualVideoSlicePageSkeleton from './ManualVideoSlicePageSkeleton';
import { useAppSEO } from '~/hooks/useAppSEO';
import { AppError } from '~/services/http';
import {
  downloadSourceVideoAsrSubtitle,
  fetchSourceVideoDetail,
  type SourceVideo,
} from '~/services/sourceVideo';
import {
  fetchSliceProjectDetail,
  saveSliceProject,
  toSliceProjectClips,
  updateSliceProject,
  type SliceProjectClip,
} from '~/services/sliceProject';
import { submitClip, submitDraft } from '~/services/slice';
import { submitAiSliceSelection } from '~/services/aiSlice';
import { type AiPrompt } from '~/services/aiPrompt';
import { formatToDateTime } from '~/utils/date';
import { formatVideoDuration, formatVideoDurationMs } from '~/utils/duration';
import { showAppError, toast } from '~/utils/toast';
import { getVideoFormatLabel, isPlayableVideoUrl } from '~/utils/videoUrl';
import { useSliceEntryFrom } from '~/hooks/useSliceEntryFrom';
import type { SliceEditorEntryFrom } from '~/routes/links';
import { buildVideoSliceLink, parseProjectId } from '~/routes/links';
import { buildSliceBreadcrumbItems } from '~/utils/sliceBreadcrumbs';
import TranscriptPanel from './components/TranscriptPanel';
import VideoTranscriptResizeHandle from './components/VideoTranscriptResizeHandle';
import SelectedCopyPanel from './components/SelectedCopyPanel';
import SegmentPreviewModal from './components/SegmentPreviewModal';
import SaveDraftModal from './components/SaveDraftModal';
import SelectedSegmentsPanel from '~/pages/SourceVideoSlice/SelectedSegmentsPanel';
import TimelineLoadingSkeleton from '~/pages/SourceVideoSlice/TimelineLoadingSkeleton';
import PromptSelect from '~/pages/SourceVideoSlice/PromptSelect';
import type { SelectedCopySegment, TranscriptParagraph } from './types';
import {
  deleteSelectedRangeFromSegment,
  adjustSegmentEdge,
  findActiveSegment,
  buildTranscriptHighlight,
  getParagraphText,
  getTextSelectionOffsets,
  liveAsrToTranscriptParagraphs,
  normalizeTranscriptParagraphs,
  sanitizeDownloadFilename,
  scrollElementIntoViewPreferUpper,
} from './utils';

interface ManualSliceLocationState {
  from?: SliceEditorEntryFrom;
  aiSelectedSegments?: SelectedCopySegment[];
}

const MAX_TOTAL_DURATION = 30 * 60;
const MIN_TOTAL_DURATION = 5 * 60;
const DRAFT_STORAGE_KEY = 'manual-slice-draft-name';

/** 人工切片项目自动命名：人工切片_时间 */
function buildManualProjectAutoName() {
  return `人工切片_${formatToDateTime(Date.now(), 'YYYY-MM-DD_HH:mm:ss')}`;
}

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

const ManualVideoSlicePage = () => {
  const { id: sourceVideoId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const entryFrom = useSliceEntryFrom();
  const playerRef = useRef<StreamVideoPlayerHandle>(null);
  const panelLeftRef = useRef<HTMLDivElement>(null);
  const videoBlockRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  /** 项目管理进入时带 ?projectId=；源视频首次保存后也会回写 */
  const projectIdFromQuery = parseProjectId(searchParams.get('projectId'));
  const [projectId, setProjectId] = useState<number | null>(projectIdFromQuery);
  /** 保存/另存为后回写 URL，不触发整页数据重载 */
  const skipProjectReloadRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<SourceVideo | null>(null);
  const [paragraphs, setParagraphs] = useState<TranscriptParagraph[]>([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [videoPanelHeight, setVideoPanelHeight] = useState<number | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<SelectedCopySegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalMode, setSaveModalMode] = useState<'create' | 'saveAs' | 'export'>('saveAs');
  const [savingProject, setSavingProject] = useState(false);
  const [downloadingSubtitle, setDownloadingSubtitle] = useState(false);
  const [draftName, setDraftName] = useState(() => localStorage.getItem(DRAFT_STORAGE_KEY) ?? '');
  const [projectRemark, setProjectRemark] = useState('');
  const [tipVisible, setTipVisible] = useState(false);
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const [selectedRanges, setSelectedRanges] = useState<TimeRange[]>([]);
  const [timelineSubmitting, setTimelineSubmitting] = useState(false);
  const [aiSelecting, setAiSelecting] = useState(false);
  const autoPlayOnSelect = true;
  const [timelineZoomLevel, setTimelineZoomLevel] = useState(1);
  const [activeRangeId, setActiveRangeId] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<AiPrompt | null>(null);
  const [preferredPromptId, setPreferredPromptId] = useState<number | null>(null);
  /** 时间轴选片默认折叠，弱化展示 */
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const pendingRangesRef = useRef<TimeRange[] | null>(null);
  const streamUrlRef = useRef('');

  useEffect(() => {
    setProjectId(projectIdFromQuery);
  }, [projectIdFromQuery]);

  useAppSEO({
    title: video ? `${video.name} - 切片` : '切片',
    path: sourceVideoId
      ? buildVideoSliceLink(sourceVideoId, { projectId: projectId || undefined })
      : '/source-videos',
    robots: 'noindex, nofollow',
  });

  const streamUrl = video?.live_url?.trim() ?? '';
  streamUrlRef.current = streamUrl;
  const canPreview = Boolean(streamUrl) && isPlayableVideoUrl(streamUrl);
  const videoFormatLabel = useMemo(() => getVideoFormatLabel(streamUrl), [streamUrl]);
  const isTimelineReady = videoDuration > 0 && !videoError;
  const isTimelineLoading = canPreview && !videoError && videoDuration === 0;

  const speakerIds = useMemo(
    () => [...new Set(paragraphs.map((item) => item.speakerId))],
    [paragraphs]
  );

  const matchParagraphIds = useMemo(() => {
    if (!keyword.trim()) return [];
    const lower = keyword.trim().toLowerCase();
    return paragraphs
      .filter((paragraph) => getParagraphText(paragraph).toLowerCase().includes(lower))
      .map((paragraph) => paragraph.id);
  }, [keyword, paragraphs]);

  const activeSync = useMemo(
    () => findActiveSegment(paragraphs, currentTime),
    [paragraphs, currentTime]
  );

  const transcriptHighlight = useMemo(
    () => buildTranscriptHighlight({ playbackSync: activeSync }),
    [activeSync]
  );

  const syncProjectIdInUrl = useCallback(
    (nextProjectId: number, options?: { reload?: boolean }) => {
      if (!nextProjectId) return;

      setProjectId(nextProjectId);
      if (nextProjectId === projectIdFromQuery) return;

      if (options?.reload === false) {
        skipProjectReloadRef.current = true;
      }

      const nextSearch = new URLSearchParams(searchParams);
      nextSearch.set('projectId', String(nextProjectId));
      navigate(
        { pathname: location.pathname, search: `?${nextSearch.toString()}` },
        { replace: true, state: location.state }
      );
    },
    [location.pathname, location.state, navigate, projectIdFromQuery, searchParams]
  );

  const loadPageData = useCallback(async () => {
    if (!sourceVideoId) return;

    const locationState = location.state as ManualSliceLocationState | null;
    const hasAiSegments = Boolean(locationState?.aiSelectedSegments?.length);

    setLoading(true);
    pendingRangesRef.current = null;
    setPreferredPromptId(null);
    setSelectedPrompt(null);

    try {
      // 无 projectId：源视频入口，只拉源视频详情（干净页）
      // 有 projectId：项目管理入口，再拉项目详情并回填 clips0 / clips1
      const [videoRes, projectSettled] = await Promise.all([
        fetchSourceVideoDetail(sourceVideoId),
        projectIdFromQuery
          ? fetchSliceProjectDetail(projectIdFromQuery).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (videoRes.code !== 0) {
        toast.notify.error(videoRes.message || '加载源视频失败');
        setVideo(null);
        setParagraphs([]);
        return;
      }

      const nextStreamUrl = videoRes.data.live_url?.trim() ?? '';
      const sameStream = streamUrlRef.current === nextStreamUrl;

      setVideo(videoRes.data);
      setParagraphs(
        normalizeTranscriptParagraphs(liveAsrToTranscriptParagraphs(videoRes.data.live_asr))
      );
      setDraftName((current) => current || buildManualProjectAutoName());

      if (!projectIdFromQuery) {
        setProjectId(null);
        setProjectRemark('');
        if (!hasAiSegments) {
          setSelectedSegments([]);
        }
        if (sameStream) {
          setSelectedRanges([]);
        }
        return;
      }

      const projectRes = projectSettled;
      if (projectRes?.code === 0 && projectRes.data) {
        setProjectId(projectRes.data.id || projectIdFromQuery);
        setProjectRemark(projectRes.data.remark || '');
        if (!hasAiSegments && projectRes.data.segments.length > 0) {
          setSelectedSegments(projectRes.data.segments);
          setDraftName(projectRes.data.name);
        }
        const ranges = clips0ToTimeRanges(projectRes.data.clips0);
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
  }, [location.state, projectIdFromQuery, sourceVideoId]);

  useEffect(() => {
    if (skipProjectReloadRef.current) {
      skipProjectReloadRef.current = false;
      return;
    }
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    const state = location.state as ManualSliceLocationState | null;
    const aiSelectedSegments = state?.aiSelectedSegments;

    if (!aiSelectedSegments?.length) return;

    setSelectedSegments(aiSelectedSegments);
    toast.notify.success('AI 选片结果已载入，可继续编辑文案片段');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    setVideoDuration(0);
    setCurrentTime(0);
    setIsVideoPlaying(false);
    setActiveSegmentId(null);
    setActiveRangeId(null);
    setVideoError(null);

    if (pendingRangesRef.current) {
      setSelectedRanges(pendingRangesRef.current);
      pendingRangesRef.current = null;
    } else {
      setSelectedRanges([]);
    }
  }, [streamUrl]);

  useEffect(() => {
    // 切换源视频时清空文案预览；同视频加载播放地址时不要清，避免盖掉项目回填
    setSelectedSegments([]);
    setActiveSegmentId(null);
    setSelectedRanges([]);
    setActiveRangeId(null);
  }, [sourceVideoId]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [keyword, matchParagraphIds.length]);

  useEffect(() => {
    if (videoDuration <= 0) return;

    const updateTime = () => {
      const videoEl = playerRef.current?.video;
      if (videoEl) {
        setCurrentTime(videoEl.currentTime || 0);
      }
      rafRef.current = requestAnimationFrame(updateTime);
    };

    rafRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [videoDuration]);

  useEffect(() => {
    const videoEl = playerRef.current?.video;
    if (!videoEl || videoDuration <= 0) {
      setIsVideoPlaying(false);
      return;
    }

    const syncPlayingState = () => {
      setIsVideoPlaying(!videoEl.paused && !videoEl.ended);
    };

    syncPlayingState();
    videoEl.addEventListener('play', syncPlayingState);
    videoEl.addEventListener('pause', syncPlayingState);
    videoEl.addEventListener('ended', syncPlayingState);

    return () => {
      videoEl.removeEventListener('play', syncPlayingState);
      videoEl.removeEventListener('pause', syncPlayingState);
      videoEl.removeEventListener('ended', syncPlayingState);
    };
  }, [videoDuration, streamUrl]);

  const handleSeek = useCallback((time: number) => {
    const videoEl = playerRef.current?.video;
    if (videoEl) {
      videoEl.currentTime = time;
      if (videoEl.paused) {
        void videoEl.play().catch(() => undefined);
      }
    }
    setCurrentTime(time);
  }, []);

  const handlePlaybackError = useCallback((message: string) => {
    setVideoError(message);
  }, []);

  useEffect(() => {
    if (!activeRangeId) return;

    const activeRange = selectedRanges.find((range) => range.id === activeRangeId);
    if (!activeRange) return;

    const videoEl = playerRef.current?.video;
    if (!videoEl || videoEl.paused) return;

    if (currentTime >= activeRange.end - 0.05) {
      videoEl.pause();
      videoEl.currentTime = Math.min(activeRange.end, videoEl.duration || activeRange.end);
      setCurrentTime(videoEl.currentTime);
      setActiveRangeId(null);
    }
  }, [activeRangeId, currentTime, selectedRanges]);

  const handleRangeSelect = useCallback(
    (range: TimeRange) => {
      setSelectedRanges((prev) => [...prev, range]);
      if (autoPlayOnSelect) {
        handleSeek(range.start);
      }
    },
    [autoPlayOnSelect, handleSeek]
  );

  const handleRangeDelete = useCallback((rangeId: string) => {
    setActiveRangeId((current) => (current === rangeId ? null : current));
    setSelectedRanges((prev) => prev.filter((item) => item.id !== rangeId));
  }, []);

  const handleActiveRangeSelect = useCallback(
    (rangeId: string, start: number) => {
      setActiveRangeId(rangeId);
      handleSeek(start);
    },
    [handleSeek]
  );

  const handleClearAllRanges = useCallback(() => {
    setSelectedRanges([]);
    setActiveRangeId(null);
  }, []);

  const handleRangeUpdate = useCallback((updated: TimeRange) => {
    setSelectedRanges((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const totalSelectedRangeDuration = useMemo(
    () => selectedRanges.reduce((sum, range) => sum + (range.end - range.start), 0),
    [selectedRanges]
  );

  const buildProjectClipsPayload = useCallback(
    () => ({
      clips0: toSliceProjectClips(selectedRanges),
      clips1: toSliceProjectClips(selectedSegments),
    }),
    [selectedRanges, selectedSegments]
  );

  const handleSelectSegment = useCallback((segment: SelectedCopySegment | null) => {
    if (!segment) return;

    setSelectedSegments((prev) => [...prev, segment]);
    setActiveSegmentId(segment.id);
    // 选片只加入预览，不打断当前播放进度
    toast.notify.success('已添加到文案预览');
  }, []);

  const handleDeleteSegment = useCallback((segmentId: string) => {
    setSelectedSegments((prev) => prev.filter((item) => item.id !== segmentId));
    setActiveSegmentId((current) => (current === segmentId ? null : current));
  }, []);

  const handleDeleteSelectedRange = useCallback((
    segmentId: string,
    textElement: HTMLElement | null,
    savedSelection?: { start: number; end: number } | null
  ) => {
    const offsets =
      (textElement ? getTextSelectionOffsets(textElement) : null) ??
      (savedSelection ? { start: savedSelection.start, end: savedSelection.end } : null);

    if (!offsets) {
      toast.notify.warning('请先在片段文案中选中要删除的内容');
      return;
    }

    const target = selectedSegments.find((item) => item.id === segmentId);
    if (!target) return;

    const result = deleteSelectedRangeFromSegment(target, offsets.start, offsets.end);

    if (result === 'delete-all') {
      setSelectedSegments((prev) => prev.filter((item) => item.id !== segmentId));
      setActiveSegmentId((current) => (current === segmentId ? null : current));
      window.getSelection()?.removeAllRanges();
      toast.notify.success('已删除选中区间');
      return;
    }

    if (!result?.length) {
      toast.notify.warning('选中区间无法删除，请调整选区后重试');
      return;
    }

    setSelectedSegments((prev) => {
      const index = prev.findIndex((item) => item.id === segmentId);
      if (index < 0) return prev;

      const next = [...prev];
      next.splice(index, 1, ...result);
      return next;
    });

    window.getSelection()?.removeAllRanges();
    toast.notify.success('已删除选中区间');
  }, [selectedSegments]);

  const handleCopySegment = useCallback((segmentId: string) => {
    setSelectedSegments((prev) => {
      const target = prev.find((item) => item.id === segmentId);
      if (!target) return prev;

      const copy: SelectedCopySegment = {
        ...target,
        id: `copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        originStart: target.start,
        originEnd: target.end,
      };
      return [...prev, copy];
    });
    toast.notify.success('已复制片段');
  }, []);

  const handleAdjustSegment = useCallback(
    (segmentId: string, edge: 'start' | 'end', deltaSec: number) => {
      const index = selectedSegments.findIndex((item) => item.id === segmentId);
      if (index < 0) return;

      const result = adjustSegmentEdge(selectedSegments, index, edge, deltaSec, videoDuration);
      if (!result) {
        const expanding = deltaSec > 0;
        toast.notify.warning(
          expanding
            ? edge === 'start'
              ? '前方没有可扩展的留白'
              : '后方没有可扩展的留白'
            : edge === 'start'
              ? '前方没有可收回的留白'
              : '后方没有可收回的留白'
        );
        return;
      }
      setSelectedSegments(result.segments);
    },
    [selectedSegments, videoDuration]
  );

  const handleSaveProject = useCallback(
    async (options?: { name?: string; remark?: string }) => {
      if (!sourceVideoId || !video) return;

      if (selectedSegments.length === 0) {
        toast.notify.warning('请先选择至少一个片段');
        return;
      }

      const nextName = options?.name?.trim() || draftName || buildManualProjectAutoName();
      const nextRemark = options?.remark ?? projectRemark;
      const payload = {
        live_id: video.id,
        name: nextName,
        remark: nextRemark,
        project_source: 'manual' as const,
        prompt_id: selectedPrompt?.id,
        ...buildProjectClipsPayload(),
      };

      setSavingProject(true);
      try {
        // 有项目 id → 更新；无项目 id → 新建
        const response = projectId
          ? await updateSliceProject(projectId, payload)
          : await saveSliceProject(payload);

        if (response.code !== 0) {
          toast.notify.error(response.message || '保存失败');
          return;
        }

        if (response.data.id) {
          syncProjectIdInUrl(response.data.id, { reload: false });
        }
        setDraftName(response.data.name);
        setProjectRemark(response.data.remark || nextRemark);
        localStorage.setItem(DRAFT_STORAGE_KEY, response.data.name);
        setSaveModalOpen(false);
        toast.notify.success('已保存为剪辑项目，可在项目管理中查看');
      } catch (error) {
        if (error instanceof AppError) {
          showAppError(error);
        } else {
          toast.notify.error('保存失败');
        }
      } finally {
        setSavingProject(false);
      }
    },
    [buildProjectClipsPayload, draftName, projectId, projectRemark, selectedPrompt?.id, selectedSegments, syncProjectIdInUrl, video]
  );

  const handleSaveDraft = useCallback(
    async (values: { name: string; remark: string }) => {
      if (!sourceVideoId || !video) return;

      if (selectedSegments.length === 0) {
        toast.notify.warning('请先选择至少一个片段');
        return;
      }

      const { name, remark } = values;

      setSavingProject(true);
      try {
        if (saveModalMode === 'export') {
          const blob = new Blob(
            [
              JSON.stringify(
                {
                  projectName: name,
                  remark,
                  sourceVideoId,
                  projectId: projectId || undefined,
                  segments: selectedSegments,
                },
                null,
                2
              ),
            ],
            { type: 'application/json' }
          );
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `${name}.json`;
          anchor.click();
          URL.revokeObjectURL(url);
          setSaveModalOpen(false);
          toast.notify.success('草稿已导出');
          return;
        }

        if (saveModalMode === 'create') {
          await handleSaveProject({ name, remark });
          return;
        }

        // 另存为始终走新建接口
        const response = await saveSliceProject({
          live_id: video.id,
          name,
          remark,
          project_source: 'manual',
          prompt_id: selectedPrompt?.id,
          ...buildProjectClipsPayload(),
        });

        if (response.code !== 0) {
          toast.notify.error(response.message || '保存失败');
          return;
        }

        if (response.data.id) {
          syncProjectIdInUrl(response.data.id, { reload: false });
        }
        localStorage.setItem(DRAFT_STORAGE_KEY, response.data.name);
        setDraftName(response.data.name);
        setProjectRemark(response.data.remark || remark);
        setSaveModalOpen(false);
        toast.notify.success('已另存为新的剪辑项目，可在项目管理中查看');
      } catch (error) {
        if (error instanceof AppError) {
          showAppError(error);
        } else {
          toast.notify.error('保存失败');
        }
      } finally {
        setSavingProject(false);
      }
    },
    [
      buildProjectClipsPayload,
      handleSaveProject,
      projectId,
      saveModalMode,
      selectedPrompt?.id,
      selectedSegments,
      sourceVideoId,
      syncProjectIdInUrl,
      video,
    ]
  );

  const handleSubmit = useCallback(async () => {
    if (!video || selectedSegments.length === 0) return;

    if (!projectId) {
      toast.notify.warning('请先保存剪辑项目后再提交');
      return;
    }

    setSubmitting(true);
    try {
      const response = await submitDraft({
        video_project_id: projectId,
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || '提交失败');
        return;
      }

      toast.notify.success('任务已提交，正在跳转到任务管理');
      navigate('/tasks');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('提交失败');
      }
    } finally {
      setSubmitting(false);
    }
  }, [navigate, projectId, selectedSegments.length, video]);

  const handleTimelineSubmit = useCallback(async () => {
    if (!video) return;

    if (selectedRanges.length === 0) {
      toast.notify.warning('请先选择至少一个时间段');
      return;
    }

    if (totalSelectedRangeDuration < MIN_TOTAL_DURATION) {
      toast.notify.warning(`已选时长需不少于 ${MIN_TOTAL_DURATION / 60} 分钟`);
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
      ...buildProjectClipsPayload(),
    };

    setTimelineSubmitting(true);
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

      if (!projectId) {
        syncProjectIdInUrl(savedProjectId, { reload: false });
      }

      const response = await submitClip({
        video_project_id: savedProjectId,
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || '提交失败');
        return;
      }

      toast.notify.success('创建成功', '可前往任务管理查看');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('提交失败');
      }
    } finally {
      setTimelineSubmitting(false);
    }
  }, [
    buildProjectClipsPayload,
    projectId,
    selectedPrompt,
    selectedRanges.length,
    syncProjectIdInUrl,
    totalSelectedRangeDuration,
    video,
  ]);

  const handleAiSelect = useCallback(async () => {
    if (!video) return;

    if (selectedRanges.length === 0) {
      toast.notify.warning('请先选择至少一个时间段');
      return;
    }

    if (totalSelectedRangeDuration < MIN_TOTAL_DURATION) {
      toast.notify.warning(`已选时长需不少于 ${MIN_TOTAL_DURATION / 60} 分钟`);
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
      ...buildProjectClipsPayload(),
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

      if (!projectId) {
        syncProjectIdInUrl(savedProjectId, { reload: false });
      }

      const response = await submitAiSliceSelection({
        video_project_id: savedProjectId,
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || 'AI 选片任务提交失败');
        return;
      }

      toast.notify.success('创建成功', '可前往任务管理查看');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('AI 选片失败');
      }
    } finally {
      setAiSelecting(false);
    }
  }, [
    buildProjectClipsPayload,
    projectId,
    selectedPrompt,
    selectedRanges.length,
    syncProjectIdInUrl,
    totalSelectedRangeDuration,
    video,
  ]);

  const openSaveModal = (nextMode: 'create' | 'saveAs' | 'export') => {
    setSaveModalMode(nextMode);
    setSaveModalOpen(true);
  };

  const handleSaveClick = () => {
    if (selectedSegments.length === 0) {
      toast.notify.warning('请先选择至少一个片段');
      return;
    }
    if (!projectId) {
      openSaveModal('create');
      return;
    }
    void handleSaveProject();
  };

  const handleDownloadSubtitle = useCallback(async () => {
    if (!sourceVideoId) {
      toast.notify.warning('暂无字幕文案');
      return;
    }

    setDownloadingSubtitle(true);
    try {
      const filename = `${sanitizeDownloadFilename(video?.name ?? 'subtitle')}-字幕.json`;
      await downloadSourceVideoAsrSubtitle(sourceVideoId, filename);
      toast.notify.success('字幕文件已开始下载');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error(error instanceof Error ? error.message : '字幕下载失败');
      }
    } finally {
      setDownloadingSubtitle(false);
    }
  }, [sourceVideoId, video?.name]);

  const scrollToMatch = (index: number) => {
    const paragraphId = matchParagraphIds[index];
    if (!paragraphId) return;

    const node = document.querySelector<HTMLElement>(`[data-paragraph-id="${paragraphId}"]`);
    const container = node?.closest<HTMLElement>('.slice-editor-transcript-body');
    if (node && container) {
      scrollElementIntoViewPreferUpper(container, node);
    } else {
      node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const paragraph = paragraphs.find((item) => item.id === paragraphId);
    if (paragraph?.segments[0]) {
      handleSeek(paragraph.segments[0].start);
    }
  };

  const breadcrumbItems = useMemo(
    () =>
      buildSliceBreadcrumbItems({
        entryFrom,
        sourceVideoId,
        pageKind: 'manual',
        videoName: video?.name,
      }),
    [entryFrom, sourceVideoId, video?.name]
  );

  if (loading) {
    return <ManualVideoSlicePageSkeleton breadcrumbItems={breadcrumbItems} />;
  }

  if (!video) {
    return (
      <div className="slice-page slice-page_unified">
        <SlicePageHeader breadcrumbItems={breadcrumbItems} />
        <div className="slice-page-empty-shell">
          <SlicePageEmptyState variant="video-unavailable" entryFrom={entryFrom} />
        </div>
      </div>
    );
  }

  return (
    <div className="slice-page slice-page_unified">
      <SlicePageHeader
        breadcrumbItems={breadcrumbItems}
        actions={
          <Space size={12}>
            <Button onClick={() => setSourceModalVisible(true)}>查看播放源</Button>
            <Button
              icon={<LuDownload size={16} />}
              loading={downloadingSubtitle}
              onClick={() => void handleDownloadSubtitle()}
            >
              字幕下载
            </Button>
          </Space>
        }
        tip={{
          text: '请自觉遵守平台链接导入规范',
          onClick: () => setTipVisible(true),
        }}
      />

      {!canPreview ? (
        <div className="slice-page-empty-shell">
          <SlicePageEmptyState
            variant={streamUrl ? 'unsupported-format' : 'no-playback-url'}
            entryFrom={entryFrom}
          />
        </div>
      ) : (
        <div className="slice-unified-body">
          <div className="slice-editor-layout slice-unified-editor">
            <div className="slice-editor-main">
              <div ref={panelLeftRef} className="slice-editor-panel slice-editor-panel_left">
                <div
                  ref={videoBlockRef}
                  className={[
                    'slice-editor-video-block',
                    videoPanelHeight != null ? 'slice-editor-video-block_customized' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={
                    videoPanelHeight != null
                      ? { height: videoPanelHeight, flex: `0 0 ${videoPanelHeight}px` }
                      : undefined
                  }
                >
                  <StreamVideoPlayer
                    ref={playerRef}
                    url={streamUrl}
                    className="slice-editor-video"
                    onDurationChange={setVideoDuration}
                    onPlaybackError={handlePlaybackError}
                  />
                </div>

                <VideoTranscriptResizeHandle
                  isCustomized={videoPanelHeight != null}
                  onResize={setVideoPanelHeight}
                  onMeasureStart={() => videoBlockRef.current?.getBoundingClientRect().height ?? 0}
                  onMeasurePanel={() => panelLeftRef.current?.getBoundingClientRect().height ?? 0}
                  onReset={() => setVideoPanelHeight(null)}
                />

                <div
                  className={[
                    'slice-timeline-fold',
                    timelineExpanded ? 'slice-timeline-fold_expanded' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className="slice-timeline-fold__toggle"
                    aria-expanded={timelineExpanded}
                    onClick={() => setTimelineExpanded((open) => !open)}
                  >
                    <span className="slice-timeline-fold__toggle-main">
                      <LuChevronDown
                        size={16}
                        className="slice-timeline-fold__chevron"
                        aria-hidden
                      />
                      <span className="slice-timeline-fold__title">时间轴选片</span>
                      <span className="slice-timeline-fold__meta">
                        {selectedRanges.length > 0
                          ? `已选 ${selectedRanges.length} 段 · ${formatVideoDuration(totalSelectedRangeDuration)}`
                          : '点击展开，拖拽时间轴标记片段'}
                      </span>
                    </span>
                    <span className="slice-timeline-fold__hint">
                      {timelineExpanded ? '收起' : '展开'}
                    </span>
                  </button>

                  {timelineExpanded ? (
                    <div className="slice-timeline-fold__body">
                      {isTimelineLoading && <TimelineLoadingSkeleton />}
                      {isTimelineReady && (
                        <div className="slice-timeline-section slice-timeline-section_fold">
                          <SelectedSegmentsPanel
                            videoDuration={videoDuration}
                            selectedRanges={selectedRanges}
                            totalSelectedDuration={totalSelectedRangeDuration}
                            minTotalDuration={MIN_TOTAL_DURATION}
                            maxTotalDuration={MAX_TOTAL_DURATION}
                            submitting={timelineSubmitting}
                            aiSelecting={aiSelecting}
                            zoomLevel={timelineZoomLevel}
                            onZoomLevelChange={setTimelineZoomLevel}
                            activeRangeId={activeRangeId}
                            onActiveRangeSelect={handleActiveRangeSelect}
                            onSubmit={() => void handleTimelineSubmit()}
                            onAiSelect={() => void handleAiSelect()}
                            onClearAll={handleClearAllRanges}
                            onRangeDelete={handleRangeDelete}
                            hasSelectedPrompt={selectedPrompt != null}
                            compact
                            headerExtra={
                              <PromptSelect
                                selectedId={selectedPrompt?.id ?? null}
                                preferredId={preferredPromptId}
                                onSelect={setSelectedPrompt}
                              />
                            }
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
                            onTimeChange={handleSeek}
                            onRangeSelect={handleRangeSelect}
                            onRangeDelete={handleRangeDelete}
                            onRangeUpdate={handleRangeUpdate}
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <TranscriptPanel
                  embedded
                  paragraphs={paragraphs.map((paragraph) => ({
                    ...paragraph,
                    id: paragraph.id,
                  }))}
                  keyword={keyword}
                  onKeywordChange={setKeyword}
                  onPrevMatch={() => {
                    if (!matchParagraphIds.length) return;
                    const nextIndex =
                      (activeMatchIndex - 1 + matchParagraphIds.length) % matchParagraphIds.length;
                    setActiveMatchIndex(nextIndex);
                    scrollToMatch(nextIndex);
                  }}
                  onNextMatch={() => {
                    if (!matchParagraphIds.length) return;
                    const nextIndex = (activeMatchIndex + 1) % matchParagraphIds.length;
                    setActiveMatchIndex(nextIndex);
                    scrollToMatch(nextIndex);
                  }}
                  activeParagraphId={transcriptHighlight?.paragraphId ?? null}
                  transcriptHighlight={transcriptHighlight}
                  isVideoPlaying={isVideoPlaying}
                  activeMatchIndex={activeMatchIndex}
                  matchParagraphIds={matchParagraphIds}
                  onSeek={handleSeek}
                  onSelectSegment={handleSelectSegment}
                />
              </div>
            </div>

            <SelectedCopyPanel
              segments={selectedSegments}
              activeSegmentId={activeSegmentId}
              speakerIds={speakerIds}
              maxTotalDuration={MAX_TOTAL_DURATION}
              videoDuration={videoDuration}
              submitting={submitting}
              onActiveSegmentChange={setActiveSegmentId}
              onSeek={handleSeek}
              onReorder={setSelectedSegments}
              onDeleteSegment={handleDeleteSegment}
              onDeleteSelectedRange={handleDeleteSelectedRange}
              onCopySegment={handleCopySegment}
              onAdjustSegment={handleAdjustSegment}
              onClearAll={() => {
                setSelectedSegments([]);
                setActiveSegmentId(null);
              }}
              onPreview={() => {
                if (!streamUrl) {
                  toast.notify.warning('暂无可用视频，无法预览');
                  return;
                }
                if (selectedSegments.length === 0) {
                  toast.notify.warning('请先选择至少一个片段');
                  return;
                }
                setPreviewOpen(true);
              }}
              onSave={handleSaveClick}
              savingProject={savingProject}
              onSaveAs={() => openSaveModal('saveAs')}
              onExportDraft={() => openSaveModal('export')}
              onSubmit={() => void handleSubmit()}
            />
          </div>
        </div>
      )}

      <SegmentPreviewModal
        open={previewOpen}
        url={streamUrl}
        segments={selectedSegments}
        onClose={() => setPreviewOpen(false)}
      />

      <SaveDraftModal
        open={saveModalOpen}
        title={
          saveModalMode === 'export'
            ? '导出草稿'
            : saveModalMode === 'create'
              ? '保存项目'
              : '另存为项目'
        }
        defaultName={
          saveModalMode === 'saveAs'
            ? `${draftName || '人工切片'}-副本`
            : saveModalMode === 'create'
              ? buildManualProjectAutoName()
              : draftName || buildManualProjectAutoName()
        }
        defaultRemark={saveModalMode === 'saveAs' ? '' : projectRemark}
        showRemark={saveModalMode !== 'export'}
        loading={savingProject}
        onCancel={() => setSaveModalOpen(false)}
        onSubmit={(values) => void handleSaveDraft(values)}
      />

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
                  : streamUrl
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

export default ManualVideoSlicePage;
