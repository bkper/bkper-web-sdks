import * as themeRuntime from './runtime.js';

export type ThemePreference = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

export interface ThemeChangeMessage {
    type: typeof THEME_CHANGE_MESSAGE_TYPE;
    theme: ThemePreference;
}

export const DEFAULT_THEME: ThemePreference = themeRuntime.DEFAULT_THEME;
export const THEME_CHANGE_MESSAGE_TYPE = themeRuntime.THEME_CHANGE_MESSAGE_TYPE;

export function isThemePreference(value: unknown): value is ThemePreference {
    return themeRuntime.isThemePreference(value);
}

export function getTheme(): ThemePreference {
    return themeRuntime.getTheme();
}

export function setTheme(theme: ThemePreference): void {
    themeRuntime.setTheme(theme);
}

export function resolveTheme(theme?: ThemePreference): ResolvedTheme {
    return themeRuntime.resolveTheme(theme);
}

export function isDarkTheme(theme?: ThemePreference): boolean {
    return themeRuntime.isDarkTheme(theme);
}

export function applyTheme(theme?: ThemePreference): ResolvedTheme {
    return themeRuntime.applyTheme(theme);
}

export function createThemeChangeMessage(theme: ThemePreference): ThemeChangeMessage {
    return themeRuntime.createThemeChangeMessage(theme);
}

export function readThemeChangeMessage(data: unknown): ThemePreference | undefined {
    return themeRuntime.readThemeChangeMessage(data);
}
