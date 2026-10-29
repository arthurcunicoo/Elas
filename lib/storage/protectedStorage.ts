import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { AESEncryptionKey, AESSealedData, aesEncryptAsync, aesDecryptAsync, digestStringAsync, CryptoDigestAlgorithm } from "expo-crypto";
import { createProtectedStore } from "./protectedStore";
const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const slot = async (key: string) =>
  "elas.key." + (await digestStringAsync(CryptoDigestAlgorithm.SHA256, key));
export const protectedStorage = createProtectedStore(AsyncStorage, {
  readKey: async (key) => SecureStore.getItemAsync(await slot(key), options),
  saveKey: async (key, value: string) => {
    await SecureStore.setItemAsync(await slot(key), value, options);
  },
  removeKey: async (key) => {
    await SecureStore.deleteItemAsync(await slot(key), options);
  },
  createKey: async () => (await AESEncryptionKey.generate()).encoded("base64"),
  seal: async (key, value, context) =>
    (
      await aesEncryptAsync(
        new TextEncoder().encode(value),
        await AESEncryptionKey.import(key, "base64"),
        { additionalData: new TextEncoder().encode(context) },
      )
    ).combined("base64"),
  open: async (key, value, context) =>
    new TextDecoder().decode(
      await aesDecryptAsync(
        AESSealedData.fromCombined(value),
        await AESEncryptionKey.import(key, "base64"),
        { additionalData: new TextEncoder().encode(context) },
      ),
    ),
});
