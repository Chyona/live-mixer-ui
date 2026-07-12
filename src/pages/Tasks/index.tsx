import { useMemo, useState } from 'react';

import { Button, DatePicker, Input, Spin } from 'antd';

import type { Dayjs } from 'dayjs';

import { LuSearch } from 'react-icons/lu';

import { useAppSEO } from '~/hooks/useAppSEO';

import ClipTaskList from './ClipTaskList';

import { useClipTasks } from './useClipTasks';

import { buildDateRange } from './utils';

import './index.css';



const TasksPage = () => {

  useAppSEO({

    title: '任务管理',

    path: '/tasks',

    robots: 'noindex, nofollow',

  });



  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const [keyword, setKeyword] = useState('');

  const [appliedKeyword, setAppliedKeyword] = useState('');



  const filters = useMemo(() => {

    const { date, dateEnd } = buildDateRange(dateRange);

    return {

      date,

      dateEnd,

      keyword: appliedKeyword || undefined,

    };

  }, [appliedKeyword, dateRange]);



  const { tasks, loading, polling, hasActiveTasks, reload, refreshTask } = useClipTasks(filters);



  const applySearch = () => {

    setAppliedKeyword(keyword.trim());

  };



  const handleDateChange = (value: [Dayjs | null, Dayjs | null] | null) => {

    setDateRange(value);

  };



  return (

    <div className="tasks-page">

      <div className="tasks-header">

        <h1 className="tasks-title">任务管理</h1>

        <p className="tasks-desc">
          统一查看「一键成片」与「AI 选片」生成任务的执行进度、状态与操作。
          {hasActiveTasks && (
            <span className="tasks-polling-hint">{polling ? '进度刷新中...' : '进行中任务将每 3 秒自动刷新'}</span>
          )}
        </p>

      </div>



      <div className="tasks-toolbar">

        <div className="tasks-toolbar-filters">

          <DatePicker.RangePicker

            className="tasks-date-picker"

            value={dateRange}

            allowClear

            placeholder={['开始日期', '结束日期']}

            onChange={handleDateChange}

          />

          <Input

            className="tasks-search-input"

            allowClear

            prefix={<LuSearch size={14} />}

            placeholder="标题搜索：源视频名称 / 成片名称（支持 关键词A+关键词B）"

            value={keyword}

            onChange={(event) => setKeyword(event.target.value)}

            onPressEnter={applySearch}

          />

          <Button type="primary" onClick={applySearch}>

            搜索

          </Button>

        </div>

      </div>



      <div className="tasks-panel">

        {loading ? (

          <div className="tasks-loading">

            <Spin />

          </div>

        ) : (

          <ClipTaskList tasks={tasks} onChanged={reload} onRefreshTask={refreshTask} />

        )}

      </div>

    </div>

  );

};



export default TasksPage;

