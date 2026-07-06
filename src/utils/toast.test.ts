import { describe, expect, it, vi, beforeEach } from 'vitest';
import { registerToast, toast } from './toast';

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
});
