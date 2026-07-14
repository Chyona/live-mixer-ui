import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Space } from 'antd';
import { LuDownload } from 'react-icons/lu';
import StreamVideoPlayer, { type StreamVideoPlayerHandle } from '~/components/StreamVideoPlayer';
import SlicePageHeader from '~/components/SlicePageHeader';
import SlicePageEmptyState from '~/components/SlicePageEmptyState';
import ManualVideoSlicePageSkeleton from './ManualVideoSlicePageSkeleton';
import { useAppSEO } from '~/hooks/useAppSEO';
import { AppError } from '~/services/http';
import { fetchSourceVideoDetail, type SourceVideo } from '~/services/sourceVideo';
import {
  fetchSliceProjectDetail,
  saveSliceProject,
  toSliceProjectClips,
  updateSliceProject,
} from '~/services/sliceProject';
import { submitClip } from '~/services/slice';
import { showAppError, toast } from '~/utils/toast';
import { isPlayableVideoUrl } from '~/utils/videoUrl';
import { useSliceEntryFrom } from '~/hooks/useSliceEntryFrom';
import type { SliceEditorEntryFrom } from '~/routes/links';
import {
  buildManualVideoSliceLink,
  buildSourceVideoSliceLink,
} from '~/routes/links';
import { buildSliceBreadcrumbItems } from '~/utils/sliceBreadcrumbs';
import TranscriptPanel from './components/TranscriptPanel';
import VideoTranscriptResizeHandle from './components/VideoTranscriptResizeHandle';
import SelectedCopyPanel from './components/SelectedCopyPanel';
import SegmentPreviewModal from './components/SegmentPreviewModal';
import SaveDraftModal from './components/SaveDraftModal';
import type { SelectedCopySegment, TranscriptParagraph } from './types';
import {
  buildTranscriptSrt,
  deleteSelectedRangeFromSegment,
  downloadTextFile,
  findActiveSegment,
  buildTranscriptHighlight,
  findActiveCopySegment,
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
const DRAFT_STORAGE_KEY = 'manual-slice-draft-name';

const ManualVideoSlicePage = () => {
  const { id: sourceVideoId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const playerRef = useRef<StreamVideoPlayerHandle>(null);
  const panelLeftRef = useRef<HTMLDivElement>(null);
  const videoBlockRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  /** 项目管理进入时带 ?projectId=；源视频首次保存后也会回写 */
  const projectIdFromQuery = searchParams.get('projectId')?.trim() || '';
  const [projectId, setProjectId] = useState(projectIdFromQuery);

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
  const [draftName, setDraftName] = useState(() => localStorage.getItem(DRAFT_STORAGE_KEY) ?? '');
  const [projectRemark, setProjectRemark] = useState('');

  useEffect(() => {
    setProjectId(projectIdFromQuery);
  }, [projectIdFromQuery]);

  useAppSEO({
    title: video ? `${video.name} - 人工切片` : '人工切片',
    path: sourceVideoId
      ? buildManualVideoSliceLink(sourceVideoId, { projectId: projectId || undefined })
      : '/source-videos',
    robots: 'noindex, nofollow',
  });

  const streamUrl = video?.live_url?.trim() ?? '';
  const canPreview = Boolean(streamUrl) && isPlayableVideoUrl(streamUrl);

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

  const activeCopySegment = useMemo(
    () => selectedSegments.find((segment) => segment.id === activeSegmentId) ?? null,
    [selectedSegments, activeSegmentId]
  );

  const transcriptHighlight = useMemo(
    () =>
      buildTranscriptHighlight(paragraphs, {
        activeCopySegment,
        playbackSync: activeSync,
        isVideoPlaying,
      }),
    [paragraphs, activeCopySegment, activeSync, isVideoPlaying]
  );

  const playbackActiveCopySegmentId = useMemo(() => {
    if (!isVideoPlaying) return null;
    return findActiveCopySegment(selectedSegments, currentTime)?.id ?? null;
  }, [isVideoPlaying, selectedSegments, currentTime]);

  const effectiveActiveCopySegmentId = playbackActiveCopySegmentId ?? activeSegmentId;

  const syncProjectIdInUrl = useCallback(
    (nextProjectId: string) => {
      if (!nextProjectId || nextProjectId === projectIdFromQuery) {
        setProjectId(nextProjectId);
        return;
      }
      setProjectId(nextProjectId);
      const nextSearch = new URLSearchParams(searchParams);
      nextSearch.set('projectId', nextProjectId);
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
    try {
      // 无 projectId：源视频入口，只拉源视频详情（干净页）
      // 有 projectId：项目管理入口，再拉项目详情并回填片段
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

      setVideo(videoRes.data);
      setParagraphs(
        normalizeTranscriptParagraphs(liveAsrToTranscriptParagraphs(videoRes.data.live_asr))
      );
      const defaultProjectName = `${videoRes.data.name} 剪辑项目`;
      setDraftName((current) => current || defaultProjectName);

      if (!projectIdFromQuery) {
        setProjectId('');
        setProjectRemark('');
        if (!hasAiSegments) {
          setSelectedSegments([]);
        }
        return;
      }

      const projectRes = projectSettled;
      if (projectRes?.code === 0 && projectRes.data) {
        setProjectId(projectRes.data.id || projectIdFromQuery);
        setProjectRemark(projectRes.data.remarkName || '');
        if (!hasAiSegments && projectRes.data.segments.length > 0) {
          setSelectedSegments(projectRes.data.segments);
          setDraftName(projectRes.data.projectName);
        }
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
    setSelectedSegments([]);
    setActiveSegmentId(null);
  }, [streamUrl]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [keyword, matchParagraphIds.length]);

  useEffect(() => {
    const updateTime = () => {
      const videoEl = playerRef.current?.video;
      if (videoEl) {
        setCurrentTime(videoEl.currentTime || 0);
      }
      rafRef.current = requestAnimationFrame(updateTime);
    };

    if (videoDuration > 0) {
      rafRef.current = requestAnimationFrame(updateTime);
    }

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
      };
      return [...prev, copy];
    });
    toast.notify.success('已复制片段');
  }, []);

  const handleSaveProject = useCallback(
    async (options?: { name?: string; remark?: string }) => {
      if (!sourceVideoId || !video) return;

      if (selectedSegments.length === 0) {
        toast.notify.warning('请先选择至少一个片段');
        return;
      }

      const nextName = options?.name?.trim() || draftName || `${video.name} 剪辑项目`;
      const nextRemark = options?.remark ?? projectRemark;
      const payload = {
        live_id: video.id,
        name: nextName,
        remark: nextRemark,
        clips0: [] as ReturnType<typeof toSliceProjectClips>,
        clips1: toSliceProjectClips(selectedSegments),
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
          syncProjectIdInUrl(response.data.id);
        }
        setDraftName(response.data.projectName);
        setProjectRemark(response.data.remarkName || nextRemark);
        localStorage.setItem(DRAFT_STORAGE_KEY, response.data.projectName);
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
    [draftName, projectId, projectRemark, selectedSegments, syncProjectIdInUrl, video]
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
          clips0: [],
          clips1: toSliceProjectClips(selectedSegments),
        });

        if (response.code !== 0) {
          toast.notify.error(response.message || '保存失败');
          return;
        }

        if (response.data.id) {
          syncProjectIdInUrl(response.data.id);
        }
        localStorage.setItem(DRAFT_STORAGE_KEY, response.data.projectName);
        setDraftName(response.data.projectName);
        setProjectRemark(response.data.remarkName || remark);
        setSaveModalOpen(false);
        toast.notify.success('已另存为新的剪辑项目');
      } catch (error) {
        const msg = error instanceof AppError ? error.errorMessage : '保存失败';
        toast.notify.error(msg);
      } finally {
        setSavingProject(false);
      }
    },
    [
      handleSaveProject,
      projectId,
      saveModalMode,
      selectedSegments,
      sourceVideoId,
      syncProjectIdInUrl,
      video,
    ]
  );

  const handleSubmit = useCallback(async () => {
    if (!video || !streamUrl || selectedSegments.length === 0) return;

    setSubmitting(true);
    try {
      const response = await submitClip({
        m3u8_url: streamUrl,
        clips: selectedSegments.map((segment) => ({
          start: Math.round(segment.start),
          end: Math.round(segment.end),
        })),
        prompt: '根据人工选择的文案片段生成成片',
        water_text: 'www',
        count: 1,
        source_video_id: String(video.id),
        source_video_name: video.name,
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || '提交失败');
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
  }, [navigate, selectedSegments, streamUrl, video]);

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

  const handleDownloadSubtitle = useCallback(() => {
    if (!paragraphs.length) {
      toast.notify.warning('暂无字幕文案');
      return;
    }

    const srt = buildTranscriptSrt(paragraphs);
    if (!srt.trim()) {
      toast.notify.warning('暂无字幕文案');
      return;
    }

    const filename = `${sanitizeDownloadFilename(video?.name ?? 'subtitle')}-字幕.srt`;
    downloadTextFile(srt, filename);
    toast.notify.success('字幕文件已开始下载');
  }, [paragraphs, video?.name]);

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

  const entryFrom = useSliceEntryFrom();

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
      <div className="slice-page slice-page_manual">
        <SlicePageHeader breadcrumbItems={breadcrumbItems} title="视频人工切片" />
        <div className="slice-page-empty-shell">
          <SlicePageEmptyState variant="video-unavailable" entryFrom={entryFrom} />
        </div>
      </div>
    );
  }

  return (
    <div className="slice-page slice-page_manual">
      <SlicePageHeader
        breadcrumbItems={breadcrumbItems}
        title={`${video.name} - 视频人工切片`}
        // description="通过文案选择片段，支持关键词定位、音视频同步、拖拽排序与连续预览。"
        actions={
          <Space size={12}>
            <Button icon={<LuDownload size={16} />} onClick={handleDownloadSubtitle}>
              字幕下载
            </Button>
            {entryFrom !== 'slices' ? (
              <Link to={buildSourceVideoSliceLink(sourceVideoId, { projectId: projectId || undefined })}>
                <Button>切换到时间轴切片</Button>
              </Link>
            ) : null}
          </Space>
        }
      />

      {!canPreview ? (
        <div className="slice-page-empty-shell">
          <SlicePageEmptyState
            variant={streamUrl ? 'unsupported-format' : 'no-playback-url'}
            entryFrom={entryFrom}
          />
        </div>
      ) : (
        <div className="slice-editor-layout">
          <div className="slice-editor-main">
            <div ref={panelLeftRef} className="slice-editor-panel  slice-editor-panel_left">
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
                {/* <div className="slice-editor-panel-title">视频预览</div> */}
                <StreamVideoPlayer
                  ref={playerRef}
                  url={streamUrl}
                  className="slice-editor-video"
                  onDurationChange={setVideoDuration}
                />
              </div>

              <VideoTranscriptResizeHandle
                isCustomized={videoPanelHeight != null}
                onResize={setVideoPanelHeight}
                onMeasureStart={() => videoBlockRef.current?.getBoundingClientRect().height ?? 0}
                onMeasurePanel={() => panelLeftRef.current?.getBoundingClientRect().height ?? 0}
                onReset={() => setVideoPanelHeight(null)}
              />

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
            activeSegmentId={effectiveActiveCopySegmentId}
            speakerIds={speakerIds}
            maxTotalDuration={MAX_TOTAL_DURATION}
            submitting={submitting}
            onActiveSegmentChange={setActiveSegmentId}
            onSeek={handleSeek}
            onReorder={setSelectedSegments}
            onDeleteSegment={handleDeleteSegment}
            onDeleteSelectedRange={handleDeleteSelectedRange}
            onCopySegment={handleCopySegment}
            onClearAll={() => {
              setSelectedSegments([]);
              setActiveSegmentId(null);
            }}
            onPreview={() => setPreviewOpen(true)}
            onSave={handleSaveClick}
            savingProject={savingProject}
            onSaveAs={() => openSaveModal('saveAs')}
            onExportDraft={() => openSaveModal('export')}
            onSubmit={() => void handleSubmit()}
          />
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
            ? `${draftName || video?.name || '剪辑项目'}-副本`
            : draftName || `${video?.name || '未命名'} 剪辑项目`
        }
        defaultRemark={saveModalMode === 'saveAs' ? '' : projectRemark}
        showRemark={saveModalMode !== 'export'}
        loading={savingProject}
        onCancel={() => setSaveModalOpen(false)}
        onSubmit={(values) => void handleSaveDraft(values)}
      />
    </div>
  );
};

export default ManualVideoSlicePage;
