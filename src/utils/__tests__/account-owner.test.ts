import AsyncStorage from '@react-native-async-storage/async-storage';
import { claimLocalData, startFreshForNewAccount } from '../account-owner';
import { onReset, resetKeepsSignIn } from '../reset';

jest.mock('expo-file-system', () => ({ Directory: jest.fn(), Paths: {} }));

describe('account ownership of phone data', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('keeps data from before ownership existed, and records the owner', async () => {
    await AsyncStorage.setItem('lexi.academic.v1', '{"courses":[1]}');
    expect(await claimLocalData('user-a')).toBe(false);
    expect(await AsyncStorage.getItem('lexi.academic.v1')).not.toBeNull();
    expect(await AsyncStorage.getItem('lexi.owner.v1')).toBe('user-a');
  });

  it('keeps data when the same account signs in again', async () => {
    await AsyncStorage.setItem('lexi.owner.v1', 'user-a');
    await AsyncStorage.setItem('lexi.lectures.v1', '[]');
    expect(await claimLocalData('user-a')).toBe(false);
    expect(await AsyncStorage.getItem('lexi.lectures.v1')).toBe('[]');
  });

  it("clears another account's data without signing the new account out", async () => {
    await AsyncStorage.setItem('lexi.owner.v1', 'user-a');
    await AsyncStorage.setItem('lexi.academic.v1', '{"courses":["MTH 201"]}');
    const seen: boolean[] = [];
    const off = onReset(() => seen.push(resetKeepsSignIn()));
    expect(await claimLocalData('user-b')).toBe(true);
    off();
    expect(await AsyncStorage.getItem('lexi.academic.v1')).toBeNull();
    expect(await AsyncStorage.getItem('lexi.owner.v1')).toBe('user-b');
    expect(seen).toEqual([true]); // listeners were told to keep the sign-in
    expect(resetKeepsSignIn()).toBe(false);
  });

  it('a new account starts with nothing from the phone', async () => {
    await AsyncStorage.setItem('lexi.planner.v1', '{"assessments":[]}');
    await startFreshForNewAccount();
    expect(await AsyncStorage.getItem('lexi.planner.v1')).toBeNull();
    expect(await AsyncStorage.getItem('lexi.owner.v1')).toBeNull();
  });
});
