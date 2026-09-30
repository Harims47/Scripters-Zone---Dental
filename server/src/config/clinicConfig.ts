import fs from 'fs';
import path from 'path';

/**
 * Authoritative Backend Clinic Configuration
 * 
 * Provides configuration values for clinic branding, address, phone, email, and location.
 * Dynamic settings saved from the Settings Page take priority and are persisted to disk.
 * Falls back to environment variables and canonical defaults.
 */

export interface ClinicConfig {
  name: string;
  address?: string;
  city?: string;
  pin?: string;
  phone?: string;
  email?: string;
  language?: string;
}

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const SETTINGS_FILE = path.join(STORAGE_DIR, 'clinicProfile.json');

// In-memory cache for ultra-fast, synchronous access in PDF renderers
let cachedConfig: ClinicConfig | null = null;

const ensureStorageDir = () => {
  if (!fs.existsSync(STORAGE_DIR)) {
    try {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    } catch (err) {
      console.error('Failed to create storage directory for clinic profile:', err);
    }
  }
};

const loadConfigFromFile = (): Partial<ClinicConfig> | null => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Partial<ClinicConfig>;
      }
    }
  } catch (err) {
    console.error('Failed to read clinic profile from disk:', err);
  }
  return null;
};

export const getCanonicalClinicConfig = (): ClinicConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const diskConfig = loadConfigFromFile();

  const name = diskConfig?.name?.trim() || process.env.CLINIC_NAME || 'Rafi Dental Clinic';
  const city = diskConfig?.city?.trim() || process.env.CLINIC_CITY || 'Gobichettipalayam';
  const pin = diskConfig?.pin?.trim() || process.env.CLINIC_PIN || '638452';
  const phone = diskConfig?.phone?.trim() || process.env.CLINIC_PHONE || '094430 23648';
  const email = diskConfig?.email?.trim() || process.env.CLINIC_EMAIL || 'clinic@rafidental.com';
  const language = diskConfig?.language?.trim() || 'English';

  // Construct full address from parts if available
  let address = diskConfig?.address?.trim() || process.env.CLINIC_ADDRESS || '37, Dr.Venkatraman St, Gobichettipalayam, Tamil Nadu 638452';
  if (diskConfig?.address) {
    let addr = diskConfig.address.trim();
    const lowerAddr = addr.toLowerCase();
    const lowerCity = city.toLowerCase();
    const cityBase = lowerCity.replace(/^go[pb]i/i, '');
    const alreadyHasCity = lowerAddr.includes(lowerCity) || (cityBase.length > 3 && lowerAddr.includes(cityBase));
    
    if (city && !alreadyHasCity) {
      addr += `, ${city}`;
    }
    if (pin && !addr.includes(pin)) {
      addr += ` - ${pin}`;
    }
    address = addr;
  }

  cachedConfig = {
    name,
    address,
    city,
    pin,
    phone,
    email,
    language
  };

  return cachedConfig;
};

export const updateCanonicalClinicConfig = (updates: Partial<ClinicConfig>): ClinicConfig => {
  ensureStorageDir();
  const current = getCanonicalClinicConfig();

  const name = updates.name !== undefined && updates.name.trim() ? updates.name.trim() : current.name;
  const rawAddress = updates.address !== undefined ? updates.address.trim() : (current.address || '');
  const city = updates.city !== undefined ? updates.city.trim() : (current.city || '');
  const pin = updates.pin !== undefined ? updates.pin.trim() : (current.pin || '');
  const phone = updates.phone !== undefined && updates.phone.trim() ? updates.phone.trim() : current.phone;
  const email = updates.email !== undefined ? updates.email.trim() : (current.email || '');
  const language = updates.language !== undefined ? updates.language.trim() : (current.language || 'English');

  let fullAddress = rawAddress;
  if (rawAddress) {
    if (city && !rawAddress.toLowerCase().includes(city.toLowerCase())) {
      fullAddress += `, ${city}`;
    }
    if (pin && !fullAddress.includes(pin)) {
      fullAddress += ` - ${pin}`;
    }
  }

  const updated: ClinicConfig = {
    name,
    address: fullAddress,
    city,
    pin,
    phone,
    email,
    language
  };

  cachedConfig = updated;

  // Persist the raw fields as configured by the user in Settings
  const toSave = {
    name,
    address: rawAddress,
    city,
    pin,
    phone,
    email,
    language
  };

  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write clinic profile to disk:', err);
  }

  return updated;
};

export const clearClinicConfigCache = (): void => {
  cachedConfig = null;
};
