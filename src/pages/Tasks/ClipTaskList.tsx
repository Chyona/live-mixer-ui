import { useCallback, useState } from 'react';
import type { ClipTaskItem } from '~/services/task';

interface ClipTaskListProps {
  tasks: ClipTaskItem[];
}

function ClipTaskList({ tasks }: ClipTaskListProps) {
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const handleCopyDraft = useCallback(async (url: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      alert('草稿链接已复制，请打开「剪映小助手」粘贴导入');
    } catch {
      alert('复制失败，请手动复制链接');
    }
  }, []);

  if (!tasks.length) {
    return <div className="tasks-empty">暂无剪辑任务，请从源视频管理进入切片页提交任务。</div>;
  }

  return (
    <>
      <div className="tasks-result-list">
        {tasks.map((task, index) => (
          <div key={task.taskId} className={`tasks-result-item tasks-result-${task.status}`}>
            <div className="tasks-result-head">
              <span className="tasks-result-taskid">任务 #{tasks.length - index}</span>
              <span className="tasks-result-status">
                {(task.status === 'pending' ||
                  task.status === 'processing' ||
                  task.status === 'running') &&
                  `生成中 ${task.progress}%`}
                {task.status === 'success' && '已完成'}
                {task.status === 'failed' && `失败：${task.message || '未知错误'}`}
              </span>
            </div>
            <div className="tasks-result-meta">
              <span>源视频：{task.sourceVideoName || '-'}</span>
            </div>
            {(task.status === 'pending' ||
              task.status === 'processing' ||
              task.status === 'running') && (
              <div className="tasks-result-progress">
                <div className="tasks-result-progress-bar" style={{ width: `${task.progress}%` }} />
              </div>
            )}
            {task.status === 'success' && (
              <div className="tasks-result-body">
                {task.videoUrls.length > 0 && (
                  <div className="tasks-result-block">
                    <div className="tasks-result-block-title">成品视频：</div>
                    <div className="tasks-result-links">
                      {task.videoUrls.map((url, i) => (
                        <div key={url + i} className="tasks-result-link-row">
                          <span className="tasks-result-url" title={url}>
                            {url}
                          </span>
                          <div className="tasks-result-actions">
                            <button
                              type="button"
                              className="tasks-result-action"
                              onClick={() => setPreviewVideoUrl(url)}
                            >
                              预览
                            </button>
                            <a
                              className="tasks-result-action"
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              download
                            >
                              下载
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {task.draftUrls.length > 0 && (
                  <div className="tasks-result-block">
                    <div className="tasks-result-block-title">剪映草稿：</div>
                    <div className="tasks-result-draft-tip">
                      草稿链接需在{' '}
                      <a
                        href="https://jcaigc.cn/download"
                        target="_blank"
                        rel="noreferrer"
                        className="tasks-result-draft-link"
                        title="去下载剪映小助手"
                      >
                        剪映小助手
                      </a>{' '}
                      中导入使用，请先安装后复制下方链接导入。
                    </div>
                    <div className="tasks-result-links">
                      {task.draftUrls.map((url, i) => (
                        <div key={url + i} className="tasks-result-link-row">
                          <span className="tasks-result-url" title={url}>
                            {url}
                          </span>
                          <button
                            type="button"
                            className="tasks-result-action"
                            onClick={() => void handleCopyDraft(url)}
                          >
                            复制链接
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {previewVideoUrl && (
        <div className="tasks-modal-mask" onClick={() => setPreviewVideoUrl(null)}>
          <div className="tasks-preview-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="tasks-preview-close"
              onClick={() => setPreviewVideoUrl(null)}
            >
              关闭
            </button>
            <video className="tasks-preview-video" src={previewVideoUrl} controls autoPlay />
          </div>
        </div>
      )}
    </>
  );
}

export default ClipTaskList;
