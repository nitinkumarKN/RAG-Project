import mongoose from 'mongoose';

const chatSourceSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    documentName: {
      type: String,
      required: true,
    },
    pageNumber: {
      type: Number,
      default: null,
    },
    excerpt: {
      type: String,
      default: '',
    },
  },
  { _id: false },
);

const chatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    confidenceMessage: {
      type: String,
      default: 'Retrieved from uploaded document.',
    },
    sources: {
      type: [chatSourceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('Chat', chatSchema);