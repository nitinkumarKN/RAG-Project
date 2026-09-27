import User from '../models/User.js';
import Document from '../models/Document.js';
import Chat from '../models/Chat.js';
import { databaseMode } from '../config/db.js';
import { deleteUser, deleteChatsByUser, deleteDocumentById, findUserById, saveUser } from '../services/localStore.js';

export async function getProfile(req, res) {
  if (databaseMode.current === 'local') {
    const user = await findUserById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        lastLoginAt: user.lastLoginAt,
        defaultWorkspace: user.defaultWorkspace,
        createdAt: user.createdAt,
      },
    });
  }

  return res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      profilePicture: req.user.profilePicture,
      lastLoginAt: req.user.lastLoginAt,
      defaultWorkspace: req.user.defaultWorkspace,
      createdAt: req.user.createdAt,
    },
  });
}

export async function deleteAccount(req, res) {
  if (databaseMode.current === 'local') {
    await deleteChatsByUser(req.user._id);
    const storeRemoved = await deleteUser(req.user._id);
    if (!storeRemoved) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ message: 'Account deleted successfully' });
  }

  await Document.deleteMany({ owner: req.user._id });
  await Chat.deleteMany({ user: req.user._id });
  await User.findByIdAndDelete(req.user._id);

  return res.status(200).json({ message: 'Account deleted successfully' });
}

export async function updateProfile(req, res) {
  const { name, email, password, profilePicture } = req.body;

  if (databaseMode.current === 'local') {
    const user = await findUserById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = await saveUser({
      ...user,
      name: typeof name === 'string' ? name : user.name,
      email: typeof email === 'string' ? email.toLowerCase() : user.email,
      profilePicture: typeof profilePicture === 'string' ? profilePicture : user.profilePicture,
      password: typeof password === 'string' && password.trim() ? password : user.password,
    });

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profilePicture: updatedUser.profilePicture,
        defaultWorkspace: updatedUser.defaultWorkspace,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (typeof name === 'string') {
    user.name = name;
  }

  if (typeof email === 'string') {
    user.email = email.toLowerCase();
  }

  if (typeof profilePicture === 'string') {
    user.profilePicture = profilePicture;
  }

  if (typeof password === 'string' && password.trim()) {
    user.password = password;
  }

  await user.save();

  return res.status(200).json({
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      defaultWorkspace: user.defaultWorkspace,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
}