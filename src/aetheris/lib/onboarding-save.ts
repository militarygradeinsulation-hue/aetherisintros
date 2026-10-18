/** Require a real database acknowledgement before marking onboarding complete.
 * Rejections, malformed responses and other-member IDs never count as saved.
 */
export interface ProfileSaveReceipt {
  data: { id: string } | null
  error: { message?: string } | null
}

export async function requireConfirmedProfileSave(
  userId: string,
  write: () => Promise<ProfileSaveReceipt>,
): Promise<void> {
  let receipt: ProfileSaveReceipt
  try {
    receipt = await write()
  } catch {
    throw new Error('The profile service could not be reached. No save was confirmed. Please retry.')
  }
  if (!receipt || receipt.error) {
    throw new Error('Your profile changes could not be saved. Please retry.')
  }
  if (receipt.data?.id !== userId) {
    throw new Error('Your profile changes were not confirmed. Please retry before entering the network.')
  }
}
