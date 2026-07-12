import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Empty, Space, Spin } from 'antd';
import { LuDownload } from 'react-icons/lu';
import StreamVideoPlayer, { type StreamVideoPlayerHandle } from '~/components/StreamVideoPlayer';
import SlicePageHeader from '~/components/SlicePageHeader';
import { useAppSEO } from '~/hooks/useAppSEO';
import { AppError } from '~/services/http';
import { fetchSourceVideoDetail, type SourceVideo } from '~/services/sourceVideo';
import { saveManualSliceDraft, fetchVideoTranscript } from '~/services/transcript';
import { submitClip } from '~/services/slice';
import { showAppError, toast } from '~/utils/toast';
import { isPlayableVideoUrl } from '~/utils/videoUrl';
import KeywordSearchBar from './components/KeywordSearchBar';
import TranscriptPanel from './components/TranscriptPanel';
import SelectedCopyPanel from './components/SelectedCopyPanel';
import SegmentPreviewModal from './components/SegmentPreviewModal';
import SaveDraftModal from './components/SaveDraftModal';
import type { ManualSliceMode, SelectedCopySegment, TranscriptParagraph } from './types';
import {
  buildTranscriptSrt,
  downloadTextFile,
  findActiveSegment,
  getParagraphText,
  sanitizeDownloadFilename,
  splitCopySegment,
} from './utils';

import './index.css';

const MAX_TOTAL_DURATION = 30 * 60;
const DRAFT_STORAGE_KEY = 'manual-slice-draft-name';

const ManualVideoSlicePage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const playerRef = useRef<StreamVideoPlayerHandle>(null);
  const rafRef = useRef<number>(0);

  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<SourceVideo | null>(null);
  const [paragraphs, setParagraphs] = useState<TranscriptParagraph[]>([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [mode, setMode] = useState<ManualSliceMode>('select');
  const [keyword, setKeyword] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [selectedSegments, setSelectedSegments] = useState<SelectedCopySegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalMode, setSaveModalMode] = useState<'save' | 'saveAs' | 'export'>('save');
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftName, setDraftName] = useState(() => localStorage.getItem(DRAFT_STORAGE_KEY) ?? '');

  useAppSEO({
    title: video ? `${video.name} - 人工切片` : '人工切片',
    path: id ? `/source-videos/${id}/manual-slice` : '/source-videos',
    robots: 'noindex, nofollow',
  });

  const streamUrl = video?.liveUrl?.trim() ?? '';
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

  const loadPageData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [videoRes, transcriptRes] = await Promise.all([
        fetchSourceVideoDetail(id),
        fetchVideoTranscript(id),
      ]);

      if (videoRes.code !== 0) {
        toast.notify.error(videoRes.message || '加载源视频失败');
        setVideo(null);
        return;
      }

      if (transcriptRes.code !== 0) {
        toast.notify.error(transcriptRes.message || '加载文案失败');
        setParagraphs([]);
      } else {
        setParagraphs(transcriptRes.data.paragraphs);
      }

      setVideo(videoRes.data);
      setDraftName((current) => current || `${videoRes.data.name}-人工切片`);
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
  }, [id]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    const state = location.state as { aiSelectedSegments?: SelectedCopySegment[] } | null;
    const aiSelectedSegments = state?.aiSelectedSegments;

    if (!aiSelectedSegments?.length) return;

    setSelectedSegments(aiSelectedSegments);
    setMode('edit');
    toast.notify.success('AI 选片结果已载入，可继续编辑文案片段');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    setVideoDuration(0);
    setCurrentTime(0);
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
    setMode('edit');
    handleSeek(segment.start);
    toast.notify.success('已添加到文案预览');
  }, [handleSeek]);

  const handleUpdateSegment = useCallback((segment: SelectedCopySegment) => {
    setSelectedSegments((prev) => prev.map((item) => (item.id === segment.id ? segment : item)));
  }, []);

  const handleDeleteSegment = useCallback((segmentId: string) => {
    setSelectedSegments((prev) => prev.filter((item) => item.id !== segmentId));
    setActiveSegmentId((current) => (current === segmentId ? null : current));
  }, []);

  const handleSplitSegment = useCallback((segmentId: string) => {
    setSelectedSegments((prev) => {
      const index = prev.findIndex((item) => item.id === segmentId);
      if (index < 0) return prev;

      const target = prev[index];
      if (!target) return prev;

      const splitResult = splitCopySegment(target);
      if (!splitResult) {
        toast.notify.warning('片段过短，无法拆分');
        return prev;
      }

      const next = [...prev];
      next.splice(index, 1, ...splitResult);
      return next;
    });
  }, []);

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

  const handleSaveDraft = useCallback(
    async (name: string) => {
      if (!id) return;

      setSavingDraft(true);
      try {
        const response = await saveManualSliceDraft(id, {
          name,
          segments: selectedSegments,
        });

        if (response.code !== 0) {
          toast.notify.error(response.message || '保存失败');
          return;
        }

        localStorage.setItem(DRAFT_STORAGE_KEY, name);
        setDraftName(name);
        setSaveModalOpen(false);

        if (saveModalMode === 'export') {
          const blob = new Blob([JSON.stringify(response.data, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `${name}.json`;
          anchor.click();
          URL.revokeObjectURL(url);
          toast.notify.success('草稿已导出');
          return;
        }

        toast.notify.success(saveModalMode === 'saveAs' ? '已另存为新草稿' : '草稿已保存');
      } catch (error) {
        const msg = error instanceof AppError ? error.errorMessage : '保存失败';
        toast.notify.error(msg);
      } finally {
        setSavingDraft(false);
      }
    },
    [id, saveModalMode, selectedSegments]
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
        source_video_id: video.id,
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

  const openSaveModal = (nextMode: 'save' | 'saveAs' | 'export') => {
    setSaveModalMode(nextMode);
    setSaveModalOpen(true);
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

    const node = document.querySelector(`[data-paragraph-id="${paragraphId}"]`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const paragraph = paragraphs.find((item) => item.id === paragraphId);
    if (paragraph?.segments[0]) {
      handleSeek(paragraph.segments[0].start);
    }
  };

  if (loading) {
    return (
      <div className="manual-slice-page manual-slice-page_loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="manual-slice-page">
        <SlicePageHeader
          breadcrumbItems={[
            { title: <Link to="/source-videos">源视频管理</Link> },
            { title: '人工切片' },
          ]}
          title="视频人工切片"
          description="源视频不存在或无权访问。"
        />
        <Empty description="源视频不存在或无权访问" />
      </div>
    );
  }

  return (
    <div className="manual-slice-page">
      <SlicePageHeader
        breadcrumbItems={[
          { title: <Link to="/source-videos">源视频管理</Link> },
          { title: <Link to={`/source-videos/${id}/slice`}>时间轴切片</Link> },
          { title: `${video.name} - 人工切片` },
        ]}
        title={`${video.name} - 视频人工切片`}
        description="通过文案选择片段，支持关键词定位、音视频同步、拖拽排序与连续预览。"
        actions={
          <Space size={12}>
            <Button icon={<LuDownload size={16} />} onClick={handleDownloadSubtitle}>
              字幕下载
            </Button>
            <Link to={`/source-videos/${id}/slice`}>
              <Button type="primary">切换到时间轴切片</Button>
            </Link>
          </Space>
        }
      />

      {!canPreview ? (
        <Empty description="当前源视频暂无可用播放地址" />
      ) : (
        <div className="manual-slice-layout">
          <div className="manual-slice-left">
            <div className="manual-slice-video-panel">
              <div className="manual-slice-panel-title">视频预览</div>
              <StreamVideoPlayer
                ref={playerRef}
                url={streamUrl}
                className="manual-slice-video"
                onDurationChange={setVideoDuration}
              />
            </div>

            <KeywordSearchBar
              value={keyword}
              onChange={setKeyword}
              matchCount={matchParagraphIds.length}
              activeMatchIndex={activeMatchIndex}
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
            />

            <TranscriptPanel
              paragraphs={paragraphs.map((paragraph) => ({
                ...paragraph,
                id: paragraph.id,
              }))}
              keyword={keyword}
              activeParagraphId={activeSync?.paragraphId ?? null}
              activeSegmentId={activeSync?.segmentId ?? null}
              activeMatchIndex={activeMatchIndex}
              matchParagraphIds={matchParagraphIds}
              onSeek={handleSeek}
              onSelectSegment={handleSelectSegment}
            />
          </div>

          <SelectedCopyPanel
            mode={mode}
            segments={selectedSegments}
            activeSegmentId={activeSegmentId}
            speakerIds={speakerIds}
            videoDuration={videoDuration}
            maxTotalDuration={MAX_TOTAL_DURATION}
            submitting={submitting}
            onModeChange={setMode}
            onActiveSegmentChange={setActiveSegmentId}
            onSeek={handleSeek}
            onReorder={setSelectedSegments}
            onUpdateSegment={handleUpdateSegment}
            onDeleteSegment={handleDeleteSegment}
            onSplitSegment={handleSplitSegment}
            onCopySegment={handleCopySegment}
            onClearAll={() => {
              setSelectedSegments([]);
              setActiveSegmentId(null);
            }}
            onPreview={() => setPreviewOpen(true)}
            onSave={() => openSaveModal('save')}
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
            : saveModalMode === 'saveAs'
              ? '另存为草稿'
              : '保存草稿'
        }
        defaultName={
          saveModalMode === 'saveAs' ? `${draftName}-副本` : draftName || `${video.name}-人工切片`
        }
        loading={savingDraft}
        onCancel={() => setSaveModalOpen(false)}
        onSubmit={(name) => void handleSaveDraft(name)}
      />
    </div>
  );
};

export default ManualVideoSlicePage;
