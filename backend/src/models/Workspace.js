import mongoose from 'mongoose';

const workspaceMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['User', 'Researcher', 'Doctor', 'Admin'],
      default: 'User',
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: {
      type: [workspaceMemberSchema],
      default: [],
    },
    settings: {
      allowInvites: {
        type: Boolean,
        default: true,
      },
      isArchived: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true },
);

workspaceSchema.index({ owner: 1, name: 1 }, { unique: true });

export default mongoose.model('Workspace', workspaceSchema);