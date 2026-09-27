import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import { databaseMode } from '../config/db.js';
import {
  addWorkspaceMemberByEmail,
  createWorkspace as createLocalWorkspace,
  deleteWorkspaceById,
  getWorkspaceById,
  listWorkspacesForUser,
  updateWorkspaceById,
  findUserByEmail,
  saveUser,
} from '../services/localStore.js';

function canManageWorkspace(workspace, user) {
  return user.role === 'Admin' || workspace.owner.toString() === user._id.toString();
}

function serializeWorkspace(workspace) {
  return {
    id: workspace._id,
    name: workspace.name,
    description: workspace.description,
    owner: workspace.owner,
    members: workspace.members,
    settings: workspace.settings,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

export async function listWorkspaces(req, res) {
  if (databaseMode.current === 'local') {
    return res.status(200).json({ workspaces: await listWorkspacesForUser(req.user._id) });
  }

  const workspaces = await Workspace.find({
    $or: [
      { owner: req.user._id },
      { 'members.user': req.user._id },
    ],
  }).sort({ updatedAt: -1 });

  return res.status(200).json({ workspaces: workspaces.map(serializeWorkspace) });
}

export async function createWorkspace(req, res) {
  const { name, description } = req.body;

  if (databaseMode.current === 'local') {
    const workspace = await createLocalWorkspace({
      name,
      description: description || '',
      ownerId: req.user._id,
      ownerRole: req.user.role,
    });

    const updatedUser = await saveUser({ ...req.user, defaultWorkspace: workspace._id });

    return res.status(201).json({ message: 'Workspace created successfully', workspace: serializeWorkspace(workspace), user: updatedUser });
  }

  const workspace = await Workspace.create({
    name,
    description: description || '',
    owner: req.user._id,
    members: [{ user: req.user._id, role: req.user.role }],
  });

  await User.findByIdAndUpdate(req.user._id, { defaultWorkspace: workspace._id });

  return res.status(201).json({ message: 'Workspace created successfully', workspace: serializeWorkspace(workspace) });
}

export async function getWorkspace(req, res) {
  if (databaseMode.current === 'local') {
    const workspace = await getWorkspaceById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    const hasAccess = workspace.owner === req.user._id || (workspace.members || []).some((member) => String(member.user) === String(req.user._id));
    if (!hasAccess) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    return res.status(200).json({ workspace });
  }

  const workspace = await Workspace.findOne({
    _id: req.params.id,
    $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
  });

  if (!workspace) {
    return res.status(404).json({ message: 'Workspace not found' });
  }

  return res.status(200).json({ workspace: serializeWorkspace(workspace) });
}

export async function updateWorkspace(req, res) {
  if (databaseMode.current === 'local') {
    const workspace = await getWorkspaceById(req.params.id);
    if (!workspace || !canManageWorkspace(workspace, req.user)) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    const updated = await updateWorkspaceById(req.params.id, {
      name: typeof req.body.name === 'string' && req.body.name.trim() ? req.body.name.trim() : workspace.name,
      description: typeof req.body.description === 'string' ? req.body.description : workspace.description,
    });
    return res.status(200).json({ message: 'Workspace updated successfully', workspace: updated });
  }

  const workspace = await Workspace.findOne({ _id: req.params.id, owner: req.user._id });
  const adminWorkspace = workspace || (await Workspace.findById(req.params.id));

  if (!adminWorkspace || !canManageWorkspace(adminWorkspace, req.user)) {
    return res.status(404).json({ message: 'Workspace not found' });
  }

  const { name, description } = req.body;
  if (typeof name === 'string' && name.trim()) {
    adminWorkspace.name = name.trim();
  }
  if (typeof description === 'string') {
    adminWorkspace.description = description;
  }

  await adminWorkspace.save();

  return res.status(200).json({ message: 'Workspace updated successfully', workspace: serializeWorkspace(adminWorkspace) });
}

export async function addWorkspaceMember(req, res) {
  if (databaseMode.current === 'local') {
    const workspace = await getWorkspaceById(req.params.id);
    if (!workspace || !canManageWorkspace(workspace, req.user)) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const { email, role } = req.body;
    const result = await addWorkspaceMemberByEmail(req.params.id, email, role);
    if (!result.memberUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ message: 'Member added successfully', workspace: result.workspace });
  }

  const workspace = await Workspace.findById(req.params.id);
  if (!workspace || !canManageWorkspace(workspace, req.user)) {
    return res.status(404).json({ message: 'Workspace not found' });
  }

  const { email, role } = req.body;
  const memberUser = await User.findOne({ email: email?.toLowerCase() });
  if (!memberUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  const existingMember = workspace.members.find((member) => member.user.toString() === memberUser._id.toString());
  if (existingMember) {
    existingMember.role = role || existingMember.role;
  } else {
    workspace.members.push({ user: memberUser._id, role: role || memberUser.role });
  }

  await workspace.save();

  return res.status(200).json({ message: 'Member added successfully', workspace: serializeWorkspace(workspace) });
}

export async function deleteWorkspace(req, res) {
  if (databaseMode.current === 'local') {
    const workspace = await getWorkspaceById(req.params.id);
    if (!workspace || !canManageWorkspace(workspace, req.user)) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    await deleteWorkspaceById(req.params.id);
    return res.status(200).json({ message: 'Workspace deleted successfully' });
  }

  const workspace = await Workspace.findById(req.params.id);

  if (!workspace || !canManageWorkspace(workspace, req.user)) {
    return res.status(404).json({ message: 'Workspace not found' });
  }

  await Workspace.deleteOne({ _id: workspace._id });

  return res.status(200).json({ message: 'Workspace deleted successfully' });
}