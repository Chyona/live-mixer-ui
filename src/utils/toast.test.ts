import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AppError } from '~/services/http';
import { handleRequestError, registerToast, showAppError, showScopedError, toast } from './toast';

describe('toast', () => {
  beforeEach(() => {
    registerToast(null);
  });

  it('calls registered message API', () => {
    const success = vi.fn();
    registerToast({
      message: { success, error: vi.fn(), info: vi.fn(), warning: vi.fn() } as never,
      notification: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
        open: vi.fn(),
        destroy: vi.fn(),
      } as never,
    });

    toast.success('ok');
    expect(success).toHaveBeenCalledWith('ok', 3);
  });

  it('enables showProgress by default on notify', () => {
    const success = vi.fn();
    registerToast({
      message: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } as never,
      notification: {
        success,
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
        open: vi.fn(),
        destroy: vi.fn(),
      } as never,
    });

    toast.notify.success('完成', '操作成功');
    expect(success).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '完成',
        description: '操作成功',
        showProgress: true,
        duration: 3,
        pauseOnHover: true,
      })
    );
  });

  it('can disable showProgress', () => {
    const error = vi.fn();
    registerToast({
      message: { success: vi.fn(), error, info: vi.fn(), warning: vi.fn() } as never,
      notification: {
        success: vi.fn(),
        error,
        info: vi.fn(),
        warning: vi.fn(),
        open: vi.fn(),
        destroy: vi.fn(),
      } as never,
    });

    toast.notify.error('失败', undefined, { showProgress: false });
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ showProgress: false }));
  });

  it('dedupes scoped errors within a short window', () => {
    const error = vi.fn();
    registerToast({
      message: { success: vi.fn(), error, info: vi.fn(), warning: vi.fn() } as never,
      notification: {
        success: vi.fn(),
        error,
        info: vi.fn(),
        warning: vi.fn(),
        open: vi.fn(),
        destroy: vi.fn(),
      } as never,
    });

    showScopedError('slices-list', '加载剪辑项目失败');
    showScopedError('slices-list', '请求未收到响应！');

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ message: '加载剪辑项目失败' })
    );
  });

  it('prefers app error message in handleRequestError', () => {
    const error = vi.fn();
    registerToast({
      message: { success: vi.fn(), error, info: vi.fn(), warning: vi.fn() } as never,
      notification: {
        success: vi.fn(),
        error,
        info: vi.fn(),
        warning: vi.fn(),
        open: vi.fn(),
        destroy: vi.fn(),
      } as never,
    });

    handleRequestError(
      'slices-list-2',
      new AppError('请求未收到响应！', 500, {} as never),
      '加载剪辑项目失败'
    );

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ message: '请求未收到响应！' })
    );
  });

  it('dedupes repeated app errors by message when no scope is provided', () => {
    const error = vi.fn();
    registerToast({
      message: { success: vi.fn(), error, info: vi.fn(), warning: vi.fn() } as never,
      notification: {
        success: vi.fn(),
        error,
        info: vi.fn(),
        warning: vi.fn(),
        open: vi.fn(),
        destroy: vi.fn(),
      } as never,
    });

    const appError = new AppError('请求未收到响应！', 500, {} as never);
    showAppError(appError);
    showAppError(appError);

    expect(error).toHaveBeenCalledTimes(1);
  });
});
