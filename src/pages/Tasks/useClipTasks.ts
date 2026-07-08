import { useCallback, useEffect, useRef, useState } from 'react';
import { getClip } from '~/services/slice';
import { fetchClipTaskList, type ClipTaskItem } from '~/services/task';

const POLL_INTERVAL = 3000;

function isActiveTask(status: ClipTaskItem['status']) {
  return status === 'pending' || status === 'processing' || status === 'running';
}

export function useClipTasks() {
  const [tasks, setTasks] = useState<ClipTaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchClipTaskList();
      if (response.code === 0) {
        setTasks(response.data.list);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshActiveTasks = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;

    try {
      const response = await fetchClipTaskList();
      if (response.code !== 0) return;

      const activeTasks = response.data.list.filter((task) => isActiveTask(task.status));
      await Promise.all(activeTasks.map((task) => getClip(task.taskId)));

      const refreshed = await fetchClipTaskList();
      if (refreshed.code === 0) {
        setTasks(refreshed.data.list);
      }
    } finally {
      pollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshActiveTasks();
    }, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [refreshActiveTasks]);

  return {
    tasks,
    loading,
    reload: loadTasks,
  };
}
