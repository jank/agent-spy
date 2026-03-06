import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface PersistedState {
  windowBounds?: { x: number; y: number; width: number; height: number };
  sidebarWidth?: number;
  lastFolderPath?: string;
}

const STATE_FILE = path.join(app.getPath('userData'), 'state.json');

let state: PersistedState = {};

export function loadState(): PersistedState {
  try {
    const data = fs.readFileSync(STATE_FILE, 'utf-8');
    state = JSON.parse(data);
  } catch {
    state = {};
  }
  return state;
}

export function getState(): PersistedState {
  return state;
}

export function saveState(partial: Partial<PersistedState>): void {
  state = { ...state, ...partial };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    // ignore write errors
  }
}
