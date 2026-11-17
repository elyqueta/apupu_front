import { TestBed } from '@angular/core/testing';
import { Resettable, SessionCache } from './session-cache';

function resettableStub(): Resettable & { resets: number } {
  const stub = {
    resets: 0,
    reset(): void {
      stub.resets += 1;
    },
  };
  return stub;
}

describe('SessionCache', () => {
  let cache: SessionCache;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    cache = TestBed.inject(SessionCache);
  });

  it('resets every registered repository', () => {
    const first = resettableStub();
    const second = resettableStub();
    cache.register(first);
    cache.register(second);

    cache.resetAll();

    expect(first.resets).toBe(1);
    expect(second.resets).toBe(1);
  });

  it('does nothing when no repository is registered', () => {
    expect(() => cache.resetAll()).not.toThrow();
  });

  it('stops resetting repositories that were unregistered', () => {
    const stub = resettableStub();
    cache.register(stub);
    cache.unregister(stub);

    cache.resetAll();

    expect(stub.resets).toBe(0);
  });
});
