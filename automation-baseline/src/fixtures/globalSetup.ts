import { FullConfig } from '@playwright/test';
import { ConfigManager } from '../config/ConfigManager';
import { ApiService } from '../services/ApiService';

async function globalSetup(_config: FullConfig): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const appConfig = configManager.get();

  console.log('=== ShopHub Test Automation Global Setup ===');
  console.log(`Base URL:     ${appConfig.baseUrl}`);
  console.log(`API Base URL: ${appConfig.apiBaseUrl}`);
  console.log(`Environment:  ${configManager.isCI() ? 'CI' : 'Local'}`);
  console.log(`Retries:      ${appConfig.retries}`);
  console.log('============================================');

  // Validate that required environment variables are present when running in CI
  if (configManager.isCI()) {
    const required = ['BASE_URL', 'API_BASE_URL'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      console.warn(
        `[GlobalSetup] WARNING: Missing CI env vars: ${missing.join(', ')}. Using defaults.`,
      );
    }
  }

  // Verify backend API is accessible before tests start
  const api = new ApiService();
  try {
    await api.loginAsCustomer();
    console.log('[GlobalSetup] Backend API is accessible — customer login OK');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(
      `[GlobalSetup] WARNING: Backend API login failed — tests may fail. Reason: ${msg}`,
    );
  }

  // Verify admin login as well
  try {
    await api.loginAsAdmin();
    console.log('[GlobalSetup] Admin login OK');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[GlobalSetup] WARNING: Admin login failed. Reason: ${msg}`);
  }

  console.log('============================================\n');
}

export default globalSetup;
