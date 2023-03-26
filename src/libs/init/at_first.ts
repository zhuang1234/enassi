import { AppMode } from '@/types'
import { useAppStore } from '@/pinia/modules/app'
import { useSettingStore } from '@/pinia/modules/settings'
import { CmdInvoke, CmdAdapter } from '@/libs/commands'
import { i18n } from '@/libs/init/i18n'
import { initWithConfFile, InitError } from '@/libs/init/conf_file'
import { initCoreDirs, getDataDirs } from '@/libs/init/dirs'
import { runInTauri } from '@/utils/utils'
import { initStyle } from '@/libs/init/styles'
import { initEntryFile } from '@/libs/user_data/entry_file'
import { isMobileScreen } from '@/utils/media_query'

const initAppData = () => {
  const appStore = useAppStore()
  const ad = appStore.data
  if (runInTauri()) {
    ad.isWebPage = false
  } else {
    ad.isWebPage = true
  }

  if (isMobileScreen()) {
    ad.appMode = AppMode.Mobile
  } else {
    ad.appMode = AppMode.Desktop
  }

  ad.changeLocaleTimestamp = new Date().getTime()
  appStore.setData(ad) // save app data
  return ad
}

// Initialize other after configuration file initialization.
export const initSuccessCallback = async () => {
  // CmdInvoke.closeSplashscreen()// close splashscreen

  initAppData()
  initStyle()
  return initEntryFile().then(() => {
    return true
  }).catch((err: Error) => {
    const t = i18n.global.t
    const typeName = t('configuration')
    CmdAdapter.notification(t('&Error initializing file', { name: typeName }), t(err.message), '')
    return false
  })
}

const initFailedCallback = (err: InitError) => {
  const t = i18n.global.t
  switch (err) {
    case InitError.noConfFile:
      CmdInvoke.logError('initialization error: cannot find the configuration file.')
      CmdInvoke.notification(t('initialization error'), t('&cannot find conf file'), '')
      break
    case InitError.noSyncLockFileName:
      CmdInvoke.logError('initialization error: &cannot find sync lock file')
      CmdInvoke.notification(t('initialization error'), t('&cannot find sync lock file'), '')
      break
  }
}

export const initAtFirst = async (pwdSha256: string, hasConfigFile: boolean) => {
  await initCoreDirs()

  if (hasConfigFile) {
    return await initWithConfFile(pwdSha256, initSuccessCallback, initFailedCallback)
  }

  return initSuccessCallback()
}
