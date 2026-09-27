import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const storePath = path.join(process.cwd(), 'storage', 'local-store.json');

async function ensureStore() {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify({ users: [], workspaces: [], documents: [], chats: [] }, null, 2), 'utf8');
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(storePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return { users: [], workspaces: [], documents: [], chats: [] };
  }
}

async function writeStore(store) {
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), 'utf8');
}

function now() {
  return new Date().toISOString();
}

function matchValue(actual, expected) {
  return String(actual) === String(expected);
}

function serializeUser(user) {
  if (!user) return null;
  return {
    ...user,
    _id: user._id,
    id: user._id,
  };
}

function serializeWorkspace(workspace) {
  if (!workspace) return null;
  return {
    ...workspace,
    _id: workspace._id,
    id: workspace._id,
  };
}

function serializeDocument(document) {
  if (!document) return null;
  return {
    ...document,
    _id: document._id,
    id: document._id,
  };
}

function serializeChat(chat) {
  if (!chat) return null;
  return {
    ...chat,
    _id: chat._id,
    id: chat._id,
  };
}

export async function findUserByEmail(email) {
  const store = await readStore();
  return serializeUser(store.users.find((user) => user.email === String(email).toLowerCase()));
}

export async function findUserById(id) {
  const store = await readStore();
  return serializeUser(store.users.find((user) => matchValue(user._id, id)));
}

export async function createUser({ name, email, password, role = 'User' }) {
  const store = await readStore();
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    _id: crypto.randomUUID(),
    name,
    email: String(email).toLowerCase(),
    role,
    password: hashedPassword,
    profilePicture: '',
    lastLoginAt: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    defaultWorkspace: null,
    createdAt: now(),
    updatedAt: now(),
  };
  store.users.push(user);
  await writeStore(store);
  return serializeUser(user);
}

export async function saveUser(user) {
  const store = await readStore();
  const index = store.users.findIndex((item) => matchValue(item._id, user._id));
  if (index === -1) {
    return null;
  }
  let nextPassword = user.password;
  if (typeof nextPassword === 'string' && nextPassword && !nextPassword.startsWith('$2')) {
    nextPassword = await bcrypt.hash(nextPassword, 10);
  }
  const nextUser = {
    ...store.users[index],
    ...user,
    password: nextPassword ?? store.users[index].password,
    updatedAt: now(),
  };
  store.users[index] = nextUser;
  await writeStore(store);
  return serializeUser(nextUser);
}

export async function deleteUser(id) {
  const store = await readStore();
  const remaining = store.users.filter((user) => !matchValue(user._id, id));
  const removed = store.users.find((user) => matchValue(user._id, id));
  store.users = remaining;
  store.workspaces = store.workspaces.filter((workspace) => !matchValue(workspace.owner, id));
  store.documents = store.documents.filter((document) => !matchValue(document.owner, id));
  store.chats = store.chats.filter((chat) => !matchValue(chat.user, id));
  await writeStore(store);
  return serializeUser(removed);
}

export async function verifyUserPassword(user, password) {
  return bcrypt.compare(password, user.password);
}

export async function findUserByResetToken(tokenHash) {
  const store = await readStore();
  return serializeUser(store.users.find((user) => user.resetPasswordToken === tokenHash));
}

export async function createWorkspace({ name, description = '', ownerId, ownerRole = 'User' }) {
  const store = await readStore();
  const workspace = {
    _id: crypto.randomUUID(),
    name,
    description,
    owner: ownerId,
    members: [{ user: ownerId, role: ownerRole, invitedAt: now() }],
    settings: { allowInvites: true, isArchived: false },
    createdAt: now(),
    updatedAt: now(),
  };
  store.workspaces.push(workspace);
  await writeStore(store);
  return serializeWorkspace(workspace);
}

export async function listWorkspacesForUser(userId) {
  const store = await readStore();
  return store.workspaces
    .filter((workspace) => matchValue(workspace.owner, userId) || (workspace.members || []).some((member) => matchValue(member.user, userId)))
    .map(serializeWorkspace)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getWorkspaceById(id) {
  const store = await readStore();
  return serializeWorkspace(store.workspaces.find((workspace) => matchValue(workspace._id, id)));
}

export async function updateWorkspaceById(id, updates) {
  const store = await readStore();
  const index = store.workspaces.findIndex((workspace) => matchValue(workspace._id, id));
  if (index === -1) return null;
  store.workspaces[index] = {
    ...store.workspaces[index],
    ...updates,
    updatedAt: now(),
  };
  await writeStore(store);
  return serializeWorkspace(store.workspaces[index]);
}

export async function addWorkspaceMemberByEmail(workspaceId, email, role = 'User') {
  const store = await readStore();
  const workspaceIndex = store.workspaces.findIndex((workspace) => matchValue(workspace._id, workspaceId));
  if (workspaceIndex === -1) return { workspace: null, memberUser: null };
  const memberUser = store.users.find((user) => user.email === String(email).toLowerCase()) || null;
  if (!memberUser) return { workspace: serializeWorkspace(store.workspaces[workspaceIndex]), memberUser: null };
  const workspace = store.workspaces[workspaceIndex];
  const existingMember = workspace.members.find((member) => matchValue(member.user, memberUser._id));
  if (existingMember) {
    existingMember.role = role || existingMember.role;
  } else {
    workspace.members.push({ user: memberUser._id, role: role || memberUser.role, invitedAt: now() });
  }
  workspace.updatedAt = now();
  await writeStore(store);
  return { workspace: serializeWorkspace(workspace), memberUser: serializeUser(memberUser) };
}

export async function deleteWorkspaceById(id) {
  const store = await readStore();
  const removed = store.workspaces.find((workspace) => matchValue(workspace._id, id));
  store.workspaces = store.workspaces.filter((workspace) => !matchValue(workspace._id, id));
  store.documents = store.documents.filter((document) => !matchValue(document.workspace, id));
  store.chats = store.chats.filter((chat) => !matchValue(chat.workspace, id));
  await writeStore(store);
  return serializeWorkspace(removed);
}

export async function createDocument(document) {
  const store = await readStore();
  const record = {
    _id: crypto.randomUUID(),
    ...document,
    createdAt: now(),
    updatedAt: now(),
  };
  store.documents.push(record);
  await writeStore(store);
  return serializeDocument(record);
}

export async function listDocumentsByUser(userId, workspaceId = null) {
  const store = await readStore();
  const documents = store.documents.filter((document) => matchValue(document.owner, userId) && (!workspaceId || matchValue(document.workspace, workspaceId)));
  return documents.map(serializeDocument);
}

export async function findDocumentById(id) {
  const store = await readStore();
  return serializeDocument(store.documents.find((document) => matchValue(document._id, id)));
}

export async function deleteDocumentById(id) {
  const store = await readStore();
  const removed = store.documents.find((document) => matchValue(document._id, id));
  store.documents = store.documents.filter((document) => !matchValue(document._id, id));
  await writeStore(store);
  return serializeDocument(removed);
}

export async function createChat(chat) {
  const store = await readStore();
  const record = {
    _id: crypto.randomUUID(),
    ...chat,
    createdAt: now(),
    updatedAt: now(),
  };
  store.chats.push(record);
  await writeStore(store);
  return serializeChat(record);
}

export async function listChatsByUser(userId, workspaceId = null) {
  const store = await readStore();
  return store.chats
    .filter((chat) => matchValue(chat.user, userId) && (!workspaceId || matchValue(chat.workspace, workspaceId)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(serializeChat);
}

export async function deleteChatsByUser(userId, workspaceId = null) {
  const store = await readStore();
  const removed = store.chats.filter((chat) => matchValue(chat.user, userId) && (!workspaceId || matchValue(chat.workspace, workspaceId)));
  store.chats = store.chats.filter((chat) => !(matchValue(chat.user, userId) && (!workspaceId || matchValue(chat.workspace, workspaceId))));
  await writeStore(store);
  return removed.map(serializeChat);
}

export async function countUsers() {
  const store = await readStore();
  return store.users.length;
}

export async function countWorkspaces(filter = {}) {
  const store = await readStore();
  if (filter.activeOnly) {
    return store.workspaces.filter((workspace) => !workspace.settings?.isArchived).length;
  }
  return store.workspaces.length;
}

export async function countDocuments(filter = {}) {
  const store = await readStore();
  const since = filter.since ? new Date(filter.since) : null;
  return store.documents.filter((document) => {
    if (since && new Date(document.createdAt) < since) return false;
    return true;
  }).length;
}

export async function countChats(filter = {}) {
  const store = await readStore();
  const since = filter.since ? new Date(filter.since) : null;
  return store.chats.filter((chat) => {
    if (since && new Date(chat.createdAt) < since) return false;
    return true;
  }).length;
}

export async function countUsersByRole() {
  const store = await readStore();
  return store.users.reduce((accumulator, user) => {
    accumulator[user.role || 'Unknown'] = (accumulator[user.role || 'Unknown'] || 0) + 1;
    return accumulator;
  }, {});
}

export async function countDocumentsByWorkspace(workspaceId) {
  const store = await readStore();
  return store.documents.filter((document) => matchValue(document.workspace, workspaceId)).length;
}

export async function isLocalStoreEnabled() {
  return env.mongoUri === '' || process.env.DB_MODE === 'local';
}
