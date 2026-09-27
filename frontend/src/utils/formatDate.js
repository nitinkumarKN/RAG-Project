export function formatDate(dateValue) {
  if (!dateValue) {
    return 'N/A';
  }

  return new Date(dateValue).toLocaleString();
}
