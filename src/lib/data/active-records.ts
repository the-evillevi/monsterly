export function activeRecordSelector(activeOrganizationId: string) {
  return {
    $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
    organization_id: activeOrganizationId,
  };
}
