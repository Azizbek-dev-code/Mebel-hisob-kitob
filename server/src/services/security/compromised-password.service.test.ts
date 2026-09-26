import { createHash } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { envState } = vi.hoisted(() => ({
  envState: { HIBP_PASSWORD_CHECK_ENABLED: true, isTest: true },
}));

vi.mock('../../config/env.js', () => ({
  env: envState,
}));

import {
  assertPasswordNotCompromised,
  clearCompromisedPasswordCache,
  CompromisedPasswordError,
  isCompromisedPassword,
  PasswordCheckUnavailableError,
  rangeResponseContainsSuffix,
  sha1HexUpper,
  splitSha1ForHibp,
} from './compromised-password.service.js';

describe('compromised-password.service', () => {
  beforeEach(() => {
    clearCompromisedPasswordCache();
    envState.HIBP_PASSWORD_CHECK_ENABLED = true;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('computes SHA-1 uppercase hex and splits prefix/suffix', () => {
    const password = 'password';
    const expected = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    expect(sha1HexUpper(password)).toBe(expected);
    const { prefix, suffix } = splitSha1ForHibp(expected);
    expect(prefix).toHaveLength(5);
    expect(suffix).toHaveLength(35);
    expect(prefix + suffix).toBe(expected);
  });

  it('detects a compromised password via k-anonymity range response', async () => {
    const password = 'Password1!';
    const digest = sha1HexUpper(password);
    const { prefix, suffix } = splitSha1ForHibp(digest);

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(`${suffix}:12345\nAAAAABBBBBCCCCCDDDDDEEEEEFFFFF11111:2\n`, {
        status: 200,
      }),
    );

    await expect(isCompromisedPassword(password)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe(`https://api.pwnedpasswords.com/range/${prefix}`);
    expect(calledUrl).not.toContain(password);
    expect(calledUrl).not.toContain(digest);
    expect(calledUrl).not.toContain(suffix);
  });

  it('accepts a clean password when suffix is absent', async () => {
    const password = 'UniqueCleanPassphrase-9xQ';
    const digest = sha1HexUpper(password);
    const { suffix } = splitSha1ForHibp(digest);
    const otherSuffix = suffix === 'A'.repeat(35) ? 'B'.repeat(35) : 'A'.repeat(35);

    vi.mocked(fetch).mockResolvedValue(
      new Response(`${otherSuffix}:9\n`, { status: 200 }),
    );

    await expect(isCompromisedPassword(password)).resolves.toBe(false);
  });

  it('parses HIBP range lines case-insensitively', () => {
    expect(rangeResponseContainsSuffix('abcdef0123456789abcdef0123456789abcde:1', 'ABCDEF0123456789ABCDEF0123456789ABCDE')).toBe(
      true,
    );
    expect(rangeResponseContainsSuffix('DEAD:1', 'BEEF')).toBe(false);
  });

  it('fail-closes when the HIBP API returns a non-OK status', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('nope', { status: 503 }));
    await expect(isCompromisedPassword('anything-here')).rejects.toBeInstanceOf(
      PasswordCheckUnavailableError,
    );
  });

  it('fail-closes on timeout/abort', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    await expect(isCompromisedPassword('anything-here')).rejects.toBeInstanceOf(
      PasswordCheckUnavailableError,
    );
  });

  it('assertPasswordNotCompromised throws CompromisedPasswordError', async () => {
    const password = 'PwnedCheckMe!';
    const digest = sha1HexUpper(password);
    const { suffix } = splitSha1ForHibp(digest);
    vi.mocked(fetch).mockResolvedValue(new Response(`${suffix}:1\n`, { status: 200 }));

    await expect(assertPasswordNotCompromised(password)).rejects.toBeInstanceOf(
      CompromisedPasswordError,
    );
  });

  it('skips the external check when disabled', async () => {
    envState.HIBP_PASSWORD_CHECK_ENABLED = false;
    await expect(assertPasswordNotCompromised('password')).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never logs plaintext password or full hash', async () => {
    const password = 'SecretNoLog!';
    const digest = sha1HexUpper(password);
    const { suffix } = splitSha1ForHibp(digest);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.mocked(fetch).mockResolvedValue(new Response(`${suffix}:1\n`, { status: 200 }));
    await isCompromisedPassword(password).catch(() => undefined);

    const logged = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().map(String).join('\n');
    expect(logged).not.toContain(password);
    expect(logged).not.toContain(digest);
  });
});
