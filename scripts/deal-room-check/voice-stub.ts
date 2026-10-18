// In-browser stand-in for the server voice function (the check never speaks).
export const speakWithIntrosVoice = async () => ({ audio: null })

// Referral actions are not exercised by this deal-room browser scenario.
export const createReferral = async () => null
export const getMyReferrals = async () => []
export const markReferralConnected = async () => undefined
