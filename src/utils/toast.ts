import { message as staticMessage, notification as staticNotification } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';
import type { AppError } from '~/services/http';

type ToastApis = {
  message: MessageInstance;
  notification: NotificationInstance;
};

let apis: ToastApis | null = null;

/** 由 ToastProvider 注册，使 toast 能消费 ConfigProvider 主题 */
export function registerToast(instance: ToastApis | null) {
  apis = instance;
}

function msg() {
  return apis?.message ?? staticMessage;
}

function notify() {
  return apis?.notification ?? staticNotification;
}

const DEFAULT_DURATION = 3;
const NOTIFY_PLACEMENT = 'topRight' as const;

export interface ToastNotifyOptions {
  title: string;
  description?: string;
  duration?: number;
  /** 显示自动关闭倒计时进度条，默认 true（antd ≥5.18） */
  showProgress?: boolean;
  pauseOnHover?: boolean;
  key?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

type NotifyExtra = Partial<
  Pick<ToastNotifyOptions, 'duration' | 'showProgress' | 'pauseOnHover' | 'key'>
>;

function openNotify(
  type: 'success' | 'error' | 'info' | 'warning',
  options: ToastNotifyOptions
) {
  const {
    title,
    description,
    duration = DEFAULT_DURATION,
    showProgress = true,
    pauseOnHover = true,
    key,
  } = options;

  notify()[type]({
    key,
    message: title,
    description,
    placement: NOTIFY_PLACEMENT,
    duration,
    showProgress,
    pauseOnHover,
  });
}

function notifyMethod(type: 'success' | 'error' | 'info' | 'warning') {
  return (title: string, description?: string, extra?: NotifyExtra) => {
    openNotify(type, { title, description, ...extra });
  };
}

/** 全局轻提示（message 为短提示，notify 为右上角通知并默认带 showProgress 倒计时条） */
export const toast = {
  success(content: string, duration = DEFAULT_DURATION) {
    msg().success(content, duration);
  },
  error(content: string, duration = DEFAULT_DURATION) {
    msg().error(content, duration);
  },
  info(content: string, duration = DEFAULT_DURATION) {
    msg().info(content, duration);
  },
  warning(content: string, duration = DEFAULT_DURATION) {
    msg().warning(content, duration);
  },

  notify: {
    success: notifyMethod('success'),
    error: notifyMethod('error'),
    info: notifyMethod('info'),
    warning: notifyMethod('warning'),

    open(options: ToastNotifyOptions) {
      const { type = 'info', ...rest } = options;
      openNotify(type, rest);
    },
  },
};

/** 展示 HTTP / 业务层 AppError */
export function showAppError(error: AppError) {
  toast.error(error.errorMessage);
}
