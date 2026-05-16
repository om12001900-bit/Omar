import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const code = (error as any)?.code;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const message = (error as any)?.message || String(error);

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  const jsonError = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonError);

  // ONLY throw if it's a permission denied error as per guidelines,
  // or if it's a critical error we want to catch in the ErrorBoundary.
  // We avoid throwing for 'unavailable' to prevent total UI blackout during transient network issues.
  if (code === 'permission-denied') {
    throw new Error(jsonError);
  }
}
