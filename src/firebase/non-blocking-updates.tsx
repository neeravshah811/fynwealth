
'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { getAuth } from 'firebase/auth';

/**
 * Log utility for Firestore operations to help debug permission issues.
 */
function logFirestoreOp(operation: string, path: string, data?: any) {
  const auth = getAuth();
  const uid = auth.currentUser?.uid || 'anonymous';
  console.log(`[Firestore ${operation}] Path: ${path} | UID: ${uid}`, data || '');
}

/**
 * Injects userId into the data payload if missing.
 */
function injectUserId(data: any): any {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  if (userId && !data.userId) {
    return { ...data, userId };
  }
  return data;
}

/**
 * Initiates a setDoc operation for a document reference.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions = {}) {
  // Only inject userId if it's not a global system collection
  const shouldInject = !docRef.path.startsWith('analytics/') && !docRef.path.startsWith('admins/');
  const finalData = shouldInject ? injectUserId(data) : data;

  logFirestoreOp('setDoc', docRef.path, finalData);

  setDoc(docRef, finalData, options).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: options && 'merge' in options ? 'update' : 'create',
      requestResourceData: finalData,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Initiates an addDoc operation for a collection reference.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const finalData = injectUserId(data);

  logFirestoreOp('addDoc', colRef.path, finalData);

  return addDoc(colRef, finalData).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: finalData,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Initiates an updateDoc operation for a document reference.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  logFirestoreOp('updateDoc', docRef.path, data);

  updateDoc(docRef, data).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: data,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Initiates a deleteDoc operation for a document reference.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  logFirestoreOp('deleteDoc', docRef.path);

  deleteDoc(docRef).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}
