import { Request, Response } from 'express';
import { getCanonicalClinicConfig, updateCanonicalClinicConfig } from '../config/clinicConfig';

/**
 * Controller for retrieving and updating clinic profile settings.
 * Ensures all PDF documents (prescriptions, receipts, invoices, etc.)
 * stay synced with the clinic details configured in the Settings page.
 */

export const getClinicSettings = async (req: Request, res: Response) => {
  try {
    const config = getCanonicalClinicConfig();
    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Failed to get clinic settings:', error);
    return res.status(500).json({ error: 'Failed to retrieve clinic settings' });
  }
};

export const updateClinicSettings = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address, city, pin, language } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Clinic name is required.' });
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: 'Clinic phone number is required.' });
    }

    const updated = updateCanonicalClinicConfig({
      name,
      phone,
      email,
      address,
      city,
      pin,
      language
    });

    return res.status(200).json({
      success: true,
      message: 'Clinic profile updated successfully.',
      data: updated
    });
  } catch (error) {
    console.error('Failed to update clinic settings:', error);
    return res.status(500).json({ error: 'Failed to update clinic settings' });
  }
};
