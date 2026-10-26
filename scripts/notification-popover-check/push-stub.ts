export type PushState = 'unsupported' | 'ios-install-first' | 'blocked' | 'off' | 'on'
export const pushState = async (): Promise<PushState> => 'ios-install-first'
export const disablePush = async (): Promise<PushState> => 'off'
export const enablePush = async (): Promise<PushState> => 'on'
export const isStandalone = () => false
export const onInstallChange = (_listener: () => void) => () => {}
export const canInstall = () => false
export const promptInstall = async () => false
