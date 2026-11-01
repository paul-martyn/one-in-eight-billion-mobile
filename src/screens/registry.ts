// Реестр экранов flow.
import type { ComponentType } from 'react';
import type { Screen, ScreenId } from '../flow/flow';
import type { Nav } from '../flow/FlowHost';
import { LoadingScreen, ErrorScreen } from './SystemScreens';
import { LanguageScreen } from './language/LanguageScreen';
import { SettingsScreen } from './settings/SettingsScreen';
import { StartScreen } from './start/StartScreen';
import { RollScreen } from './roll/RollScreen';
import { CertificateScreen } from './certificate/CertificateScreen';
import { BirthOddsScreen } from './birthOdds/BirthOddsScreen';
import { LifeScreen } from './life/LifeScreen';
import { EndedScreen } from './ended/EndedScreen';
import { HubScreen } from './hub/HubScreen';

export type ScreenProps = { screen: Screen; nav: Nav; active: boolean };

export const SCREENS: Record<ScreenId, ComponentType<ScreenProps>> = {
  loading: LoadingScreen,
  error: ErrorScreen,
  language: LanguageScreen,
  settings: SettingsScreen,
  start: StartScreen,
  roll: RollScreen,
  certificate: CertificateScreen,
  birthOdds: BirthOddsScreen,
  life: LifeScreen,
  ended: EndedScreen,
  hub: HubScreen,
};
