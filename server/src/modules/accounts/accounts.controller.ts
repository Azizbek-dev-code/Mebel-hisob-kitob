import type {
  AccountListResponse,
  CreateAuthenticatedBusinessRequestBody,
  CreatePersonalAccountRequest,
  LoginResponse,
  PersonalAccountCreatedResponse,
  RegisterPersonalAccountRequest,
  SwitchWorkspaceRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { readAuthCookie, setAuthCookie } from '../../lib/auth-cookie.js';
import { authenticate, switchWorkspace } from '../../services/auth.service.js';
import { createAuthenticatedBusinessRequest } from '../../services/store-creation.service.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../utils/http-response.js';
import { ensureIdentityForUser } from './account-layer.service.js';
import {
  createPersonalAccountForUser,
  listWorkspacesForIdentity,
  listWorkspacesForUser,
  registerPersonalAccount,
} from './personal-account.service.js';
import { readReferralAttribution } from '../referrals/referral-cookie.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

async function requireIdentityId(req: Request): Promise<string> {
  if (req.personalAuth) return req.personalAuth.identityId;
  const user = requireUser(req);
  return ensureIdentityForUser(user.id);
}

export const postRegisterPersonalAccount = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as RegisterPersonalAccountRequest;
  const attribution = readReferralAttribution(req);
  const created = await registerPersonalAccount({
    ...body,
    referralCode: attribution.code,
    visitorKey: attribution.visitorKey,
  });
  sendCreated<PersonalAccountCreatedResponse>(res, created);
});

export const postCreatePersonalAccount = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreatePersonalAccountRequest;
  const attribution = readReferralAttribution(req);
  const created = await createPersonalAccountForUser(user.id, {
    ...body,
    referralCode: attribution.code,
    visitorKey: attribution.visitorKey,
  });
  sendCreated<PersonalAccountCreatedResponse>(res, created);
});

export const getAccounts = asyncHandler(async (req: Request, res: Response) => {
  if (req.personalAuth) {
    const items = await listWorkspacesForIdentity(req.personalAuth.identityId);
    sendSuccess<AccountListResponse>(res, { items });
    return;
  }
  const user = requireUser(req);
  const items = await listWorkspacesForUser(user.id);
  sendSuccess<AccountListResponse>(res, { items });
});

export const postSwitchWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const identityId = await requireIdentityId(req);
  const body = req.body as SwitchWorkspaceRequest;
  let rememberMe = false;
  const token = readAuthCookie(req);
  if (token) {
    try {
      const session = await authenticate(token);
      rememberMe = session.claims.rememberMe;
    } catch {
      rememberMe = false;
    }
  }
  const session = await switchWorkspace(identityId, body.workspaceId, { rememberMe });
  setAuthCookie(res, session.accessToken.token, session.accessToken.expiresAt);
  sendSuccess<LoginResponse>(res, { user: session.user });
});

export const postCreateBusinessRequest = asyncHandler(async (req: Request, res: Response) => {
  const identityId = await requireIdentityId(req);
  const body = req.body as CreateAuthenticatedBusinessRequestBody;
  const request = await createAuthenticatedBusinessRequest(identityId, body, req.auth?.id);
  sendCreated(res, { request });
});
