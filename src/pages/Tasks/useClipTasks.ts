import { useCallback, useEffect, useRef, useState } from 'react';

import { getClip } from '~/services/slice';
import {
  fetchClipTaskList,
  type ClipTaskItem,
  type ClipTaskListParams,
} from '~/services/task';

import { isClipTaskActive, mergeClipTaskPollResult } from './utils';

const POLL_INTERVAL = 3000;

export function useClipTasks(filters: ClipTaskListParams = {}) {
  const [tasks, setTasks] = useState<ClipTaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef(false);
  const tasksRef = useRef<ClipTaskItem[]>([]);
  const totalRef = useRef(0);
  const filtersRef = useRef(filters);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const applyTaskList = useCallback((list: ClipTaskItem[], nextTotal: number) => {
    tasksRef.current = list;
    totalRef.current = nextTotal;
    setTasks(list);
    setTotal(nextTotal);
  }, []);

  const pollActiveTasks = useCallback(async (list: ClipTaskItem[]) => {
    const activeTasks = list.filter((task) => isClipTaskActive(task.status));
    if (!activeTasks.length) {
      return list;
    }

    setPolling(true);

    try {
      const pollResults = await Promise.all(
        activeTasks.map(async (task) => {
          try {
            const response = await getClip(task.taskId);
            if (response.code !== 0 || !response.data) return null;
            return { taskId: task.taskId, data: response.data };
          } catch {
            return null;
          }
        })
      );

      const polledMap = new Map(
        pollResults
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .map((item) => [item.taskId, item.data])
      );

      if (!polledMap.size) {
        return list;
      }

      return list.map((task) => {
        const polled = polledMap.get(task.taskId);
        return polled ? mergeClipTaskPollResult(task, polled) : task;
      });
    } finally {
      setPolling(false);
    }
  }, []);

  const refreshTasks = useCallback(
    async (options?: { withPoll?: boolean; showLoading?: boolean; refresh?: boolean }) => {
      if (pollingRef.current) return;

      const { withPoll = true, showLoading = false, refresh = false } = options ?? {};
      pollingRef.current = true;

      if (refresh) {
        setRefreshing(true);
      } else if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await fetchClipTaskList(filtersRef.current);
        if (response.code !== 0) return;

        let nextTasks = response.data.list;
        let nextTotal = response.data.total;

        if (withPoll) {
          nextTasks = await pollActiveTasks(nextTasks);

          const refreshed = await fetchClipTaskList(filtersRef.current);
          if (refreshed.code === 0) {
            nextTasks = refreshed.data.list;
            nextTotal = refreshed.data.total;
          }
        }

        applyTaskList(nextTasks, nextTotal);
      } finally {
        pollingRef.current = false;
        if (refresh) {
          setRefreshing(false);
        } else if (showLoading) {
          setLoading(false);
        }
      }
    },
    [applyTaskList, pollActiveTasks]
  );

  const reload = useCallback(async () => {
    await refreshTasks({ withPoll: true, refresh: true });
  }, [refreshTasks]);

  const refreshTask = useCallback(
    async (taskId: string) => {
      const task = tasksRef.current.find((item) => item.taskId === taskId);
      if (!task) return;

      try {
        const response = await getClip(taskId);
        if (response.code === 0 && response.data) {
          applyTaskList(
            tasksRef.current.map((item) =>
              item.taskId === taskId ? mergeClipTaskPollResult(item, response.data!) : item
            ),
            totalRef.current
          );
        }

        const refreshed = await fetchClipTaskList(filtersRef.current);
        if (refreshed.code === 0) {
          const serverTask = refreshed.data.list.find((item) => item.taskId === taskId);
          if (serverTask) {
            applyTaskList(
              tasksRef.current.map((item) => (item.taskId === taskId ? serverTask : item)),
              refreshed.data.total
            );
          } else {
            applyTaskList(refreshed.data.list, refreshed.data.total);
          }
        }
      } catch {
        throw new Error('refresh failed');
      }
    },
    [applyTaskList]
  );

  useEffect(() => {
    void refreshTasks({
      withPoll: true,
      showLoading: tasksRef.current.length === 0,
    });
  }, [
    filters.date,
    filters.dateEnd,
    filters.keyword,
    filters.status,
    filters.page,
    filters.pageSize,
    refreshTasks,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const hasActive = tasksRef.current.some((task) => isClipTaskActive(task.status));
      if (!hasActive) return;
      void refreshTasks({ withPoll: true, showLoading: false });
    }, POLL_INTERVAL);

    return () => window.clearInterval(timer);
  }, [refreshTasks]);

  const hasActiveTasks = tasks.some((task) => isClipTaskActive(task.status));

  return {
    tasks,
    total,
    loading,
    refreshing,
    polling,
    hasActiveTasks,
    reload,
    refreshTask,
  };
}
