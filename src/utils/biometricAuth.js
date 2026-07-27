import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Checks if biometric authentication is available on the device.
 */
export async function isBiometricAvailable() {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
}

/**
 * Gets the types of biometric authentication available on the device.
 */
export async function getBiometricTypes() {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types;
  } catch (error) {
    console.error('Error getting biometric types:', error);
    return [];
  }
}

/**
 * Triggers biometric authentication (Fingerprint or Face ID).
 * Returns true if authentication was successful, false otherwise.
 */
export async function authenticateWithBiometrics() {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      disableDeviceFallback: false,
      reason: 'Authenticate to access locked note',
    });
    return result.success;
  } catch (error) {
    console.error('Error during biometric authentication:', error);
    return false;
  }
}

/**
 * Triggers biometric authentication with custom options.
 */
export async function authenticateWithBiometricsCustom(options = {}) {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      disableDeviceFallback: false,
      reason: options.reason || 'Authenticate to access locked note',
      fallbackLabel: options.fallbackLabel || 'Use PIN',
      disableDeviceFallback: options.disableDeviceFallback || false,
    });
    return result.success;
  } catch (error) {
    console.error('Error during biometric authentication:', error);
    return false;
  }
}
