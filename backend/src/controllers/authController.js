import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import { generateToken } from '../utils/generateToken.js';
import crypto from 'crypto';
import { databaseMode } from '../config/db.js';
import {
  createUser,
  createWorkspace as createLocalWorkspace,
  findUserByEmail,
  findUserById,
  findUserByResetToken,
  saveUser,
  verifyUserPassword,
} from '../services/localStore.js';

function toUserResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profilePicture: user.profilePicture,
    defaultWorkspace: user.defaultWorkspace,
    createdAt: user.createdAt,
  };
}

function buildAuthResponse(user) {
  return {
    token: generateToken(user._id),
    user: toUserResponse(user),
  };
}

export async function registerUser(req, res) {
  const { name, email, password } = req.body;

  if (databaseMode.current === 'local') {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    const user = await createUser({ name, email, password });
    const defaultWorkspace = await createLocalWorkspace({
      name: `${user.name}'s Workspace`,
      description: 'Personal workspace created at signup',
      ownerId: user._id,
      ownerRole: user.role,
    });

    const updatedUser = await saveUser({ ...user, defaultWorkspace: defaultWorkspace._id });

    return res.status(201).json({
      message: 'Registration successful',
      ...buildAuthResponse(updatedUser),
    });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'A user with this email already exists' });
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  const defaultWorkspace = await Workspace.create({
    name: `${user.name}'s Workspace`,
    description: 'Personal workspace created at signup',
    owner: user._id,
    members: [{ user: user._id, role: user.role }],
  });

  user.defaultWorkspace = defaultWorkspace._id;
  await user.save();

  return res.status(201).json({
    message: 'Registration successful',
    ...buildAuthResponse(user),
  });
}

export async function loginUser(req, res) {
  const { email, password } = req.body;

  if (databaseMode.current === 'local') {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await verifyUserPassword(user, password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    await saveUser({ ...user, lastLoginAt: new Date().toISOString() });

    return res.status(200).json({
      message: 'Login successful',
      ...buildAuthResponse(user),
    });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  user.lastLoginAt = new Date();
  await user.save();

  return res.status(200).json({
    message: 'Login successful',
    ...buildAuthResponse(user),
  });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;

  if (databaseMode.current === 'local') {
    const user = await findUserByEmail(email?.toLowerCase());

    if (!user) {
      return res.status(200).json({
        message: 'If the email exists, a reset token has been generated.',
      });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const updatedUser = await saveUser({
      ...user,
      resetPasswordToken: crypto.createHash('sha256').update(resetToken).digest('hex'),
      resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    return res.status(200).json({
      message: 'Reset token generated for development use.',
      resetToken,
      user: toUserResponse(updatedUser),
    });
  }

  const user = await User.findOne({ email: email?.toLowerCase() });

  if (!user) {
    return res.status(200).json({
      message: 'If the email exists, a reset token has been generated.',
    });
  }

  const resetToken = crypto.randomBytes(24).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  return res.status(200).json({
    message: 'Reset token generated for development use.',
    resetToken,
  });
}

export async function resetPassword(req, res) {
  const { token } = req.params;
  const { password } = req.body;
  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

  if (databaseMode.current === 'local') {
    const user = await findUserByResetToken(resetPasswordToken);
    if (!user) {
      return res.status(400).json({ message: 'Reset token is invalid or expired' });
    }

    const expiresAt = user.resetPasswordExpires ? new Date(user.resetPasswordExpires).getTime() : 0;
    if (!expiresAt || expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Reset token is invalid or expired' });
    }

    await saveUser({
      ...user,
      password,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return res.status(200).json({ message: 'Password updated successfully' });
  }

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ message: 'Reset token is invalid or expired' });
  }

  user.password = password;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  return res.status(200).json({ message: 'Password updated successfully' });
}