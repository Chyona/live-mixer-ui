import { describe, expect, it } from 'vitest';
import { openLogin, closeLogin } from './loginFlow';
import { getLoginModalStore } from '~/components/LoginModal/store';

describe('loginFlow', () => {
  it('closeLogin resets modal store', () => {
    const store = getLoginModalStore();
    store.open = true;
    store.returnTo = '/home';

    closeLogin();

    expect(store.open).toBe(false);
    expect(store.returnTo).toBeNull();
  });

  it('openLogin is callable', () => {
    expect(() => openLogin({ pathname: '/home', search: '', hash: '' })).not.toThrow();
  });
});
