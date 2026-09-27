# API Documentation

## Auth

### POST /api/auth/register

Registers a new user.

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### POST /api/auth/login

Logs in an existing user.

### POST /api/auth/forgot-password

Generates a password reset token.

### POST /api/auth/reset-password/:token

Resets the user password using a valid token.

## User

### GET /api/user/profile

Returns the authenticated user profile.

### PUT /api/user/profile

Updates profile fields such as name, email, password, and profile picture.

### DELETE /api/user/account

Deletes the authenticated user account and related records.

## Documents

### POST /api/document/upload

Uploads a PDF document.

Form-data:

- `file` - PDF file
- `title` - optional custom title

### GET /api/document

Lists the authenticated user’s uploaded documents.

### DELETE /api/document/:id

Deletes a document and its stored file.

## Chat

### POST /api/chat

Submits a question and receives a document-grounded answer.

Request body:

```json
{
  "question": "What were the key findings?"
}
```

### GET /api/chat/history

Returns chat history for the authenticated user.

### DELETE /api/chat/history

Deletes the authenticated user’s chat history.

## Notes

- All protected endpoints require a Bearer token in the `Authorization` header.
- The AI service returns a refusal message when the answer is not present in uploaded documents.
