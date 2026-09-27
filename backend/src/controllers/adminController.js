import Chat from '../models/Chat.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import { databaseMode } from '../config/db.js';
import { countChats, countDocuments, countUsers, countUsersByRole, countWorkspaces } from '../services/localStore.js';

function startOfDayDaysAgo(daysAgo) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

export async function getAnalytics(req, res) {
  if (databaseMode.current === 'local') {
    const [totalUsers, totalWorkspaces, totalDocuments, totalChats, roleCounts] = await Promise.all([
      countUsers(),
      countWorkspaces(),
      countDocuments(),
      countChats(),
      countUsersByRole(),
    ]);

    return res.status(200).json({
      analytics: {
        totals: {
          users: totalUsers,
          workspaces: totalWorkspaces,
          activeWorkspaces: totalWorkspaces,
          documents: totalDocuments,
          chats: totalChats,
        },
        recent: {
          documents: totalDocuments,
          chats: totalChats,
        },
        usersByRole: roleCounts,
      },
    });
  }

  const [totalUsers, totalWorkspaces, activeWorkspaces, totalDocuments, totalChats, recentDocuments, recentChats, roleCounts] = await Promise.all([
    User.countDocuments(),
    Workspace.countDocuments(),
    Workspace.countDocuments({ 'settings.isArchived': false }),
    Document.countDocuments(),
    Chat.countDocuments(),
    Document.countDocuments({ createdAt: { $gte: startOfDayDaysAgo(7) } }),
    Chat.countDocuments({ createdAt: { $gte: startOfDayDaysAgo(7) } }),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
  ]);

  const usersByRole = roleCounts.reduce((accumulator, entry) => {
    accumulator[entry._id || 'Unknown'] = entry.count;
    return accumulator;
  }, {});

  return res.status(200).json({
    analytics: {
      totals: {
        users: totalUsers,
        workspaces: totalWorkspaces,
        activeWorkspaces,
        documents: totalDocuments,
        chats: totalChats,
      },
      recent: {
        documents: recentDocuments,
        chats: recentChats,
      },
      usersByRole,
    },
  });
}