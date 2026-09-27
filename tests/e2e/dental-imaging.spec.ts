import { test, expect, APIRequestContext } from '@playwright/test';
import { loginAs, logout, TEST_USERS } from './helpers/auth';
import { queryOne } from './helpers/pgDb';
import { ensureActiveTestPatient } from './helpers/ensureActivePatient';

// Valid 1x1 base64 PNG and JPEG data URLs
const SAMPLE_PNG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SAMPLE_JPEG_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

const API_BASE = 'http://localhost:3001';

async function getAuthCookie(request: APIRequestContext, roleKey: keyof typeof TEST_USERS): Promise<string> {
  const user = TEST_USERS[roleKey];
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: { username: user.username, password: user.password }
  });
  const body = await res.json();
  return `token=${body.token}`;
}

test.describe('DentalCore — OPG & RVG Dental Imaging Suite (PostgreSQL)', () => {
  let testPatient: { id: string; visitId: string };

  test.beforeAll(async () => {
    testPatient = await ensureActiveTestPatient();
  });

  // 1. OPG Upload
  test('01: OPG upload succeeds via API and returns created DentalImage record', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'OPG',
        fileName: 'full_panoramic_01.png',
        mimeType: 'image/png',
        fileSize: 1200,
        imageUrl: SAMPLE_PNG_BASE64,
        title: 'Initial Panoramic X-Ray',
        notes: 'Full mouth panoramic baseline'
      }
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    const item = body.data || body;
    expect(item.id).toBeTruthy();
    expect(item.type).toBe('OPG');
    expect(item.toothNumber).toBeNull();
    expect(item.patientId).toBe(testPatient.id);
  });

  // 2. OPG Persistence
  test('02: OPG persistence verifies record is accurately stored in PostgreSQL', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    const res = await request.get(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = Array.isArray(body) ? body : (body.data || []);
    const opg = list.find((img: any) => img.type === 'OPG');
    expect(opg).toBeTruthy();
    expect(opg.patientId).toBe(testPatient.id);
    expect(opg.toothNumber).toBeNull();

    // Direct DB query verification
    const dbRow = await queryOne(`SELECT * FROM "DentalImage" WHERE id = $1`, [opg.id]);
    expect(dbRow).toBeTruthy();
    expect(dbRow.type).toBe('OPG');
    expect(dbRow.toothNumber).toBeNull();
    expect(dbRow.mimeType).toBe('image/png');
  });

  // 3. Multiple OPG Images
  test('03: Multiple OPG images can be uploaded and retrieved for the same patient', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    
    // Upload second OPG
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'OPG',
        fileName: 'panoramic_followup.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1800,
        imageUrl: SAMPLE_JPEG_BASE64,
        title: '6-Month Followup Panoramic',
        notes: 'Healing evaluation'
      }
    });
    expect(res.status()).toBe(201);

    // Retrieve all OPGs
    const listRes = await request.get(`${API_BASE}/api/patients/${testPatient.id}/images?type=OPG`, {
      headers: { Cookie: cookie }
    });
    expect(listRes.status()).toBe(200);
    const body = await listRes.json();
    const list = Array.isArray(body) ? body : (body.data || []);
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  // 4. RVG Upload
  test('04: RVG upload succeeds and returns created DentalImage record', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'RVG',
        fileName: 'rvg_quadrant_1.png',
        mimeType: 'image/png',
        fileSize: 850,
        imageUrl: SAMPLE_PNG_BASE64,
        title: 'Quadrant 1 Intraoral',
        notes: 'Check periapical region'
      }
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    const item = body.data || body;
    expect(item.type).toBe('RVG');
  });

  // 5. RVG Associated with Tooth 16
  test('05: RVG associated with tooth 16 persists toothNumber 16 in PostgreSQL', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'RVG',
        fileName: 'rvg_tooth_16.png',
        mimeType: 'image/png',
        fileSize: 920,
        imageUrl: SAMPLE_PNG_BASE64,
        toothNumber: 16,
        title: 'Tooth 16 PA Radiograph',
        notes: 'Root apex radiolucency'
      }
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    const item = body.data || body;
    expect(item.toothNumber).toBe(16);

    const dbRow = await queryOne(`SELECT * FROM "DentalImage" WHERE id = $1`, [item.id]);
    expect(dbRow.toothNumber).toBe(16);
  });

  // 6. RVG Associated with Tooth 26
  test('06: RVG associated with tooth 26 persists toothNumber 26 in PostgreSQL', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'RVG',
        fileName: 'rvg_tooth_26.png',
        mimeType: 'image/png',
        fileSize: 940,
        imageUrl: SAMPLE_PNG_BASE64,
        toothNumber: 26,
        title: 'Tooth 26 PA Radiograph',
        notes: 'Distal caries evaluation'
      }
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    const item = body.data || body;
    expect(item.toothNumber).toBe(26);

    const dbRow = await queryOne(`SELECT * FROM "DentalImage" WHERE id = $1`, [item.id]);
    expect(dbRow.toothNumber).toBe(26);
  });

  // 7. RVG Without Tooth Association
  test('07: RVG without tooth association persists with toothNumber = NULL', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'RVG',
        fileName: 'rvg_general.png',
        mimeType: 'image/png',
        fileSize: 800,
        imageUrl: SAMPLE_PNG_BASE64,
        toothNumber: null,
        title: 'General Bitewing',
        notes: 'Interproximal check'
      }
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    const item = body.data || body;
    expect(item.toothNumber).toBeNull();

    const dbRow = await queryOne(`SELECT * FROM "DentalImage" WHERE id = $1`, [item.id]);
    expect(dbRow.toothNumber).toBeNull();
  });

  // 8. Image Preview in UI
  test('08: Dental imaging UI renders switcher, gallery, and image preview cards', async ({ page }) => {
    await loginAs(page, 'dutyDoctor');
    await page.goto(`/doctor/patient/${testPatient.id}?visitId=${testPatient.visitId}`);
    await page.waitForLoadState('networkidle');

    // Open Treatment Plan modal
    await page.getByRole('button', { name: 'Treatment', exact: true }).click();
    await expect(page.getByText('Treatment Planning & FDI Chart')).toBeVisible();
    await expect(page.getByText('Dental Imaging')).toBeVisible();

    // Click Dental Imaging view switcher
    await page.getByRole('button', { name: 'Dental Imaging' }).click();

    // Verify OPG / RVG subtabs and galleries
    await expect(page.getByRole('button', { name: /OPG \(Panoramic X-Rays\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /RVG \(Intraoral Radiographs\)/ })).toBeVisible();

    // Verify preview card elements
    await expect(page.locator('text=Initial Panoramic X-Ray').first()).toBeVisible();

    // Switch to RVG tab
    await page.getByRole('button', { name: /RVG \(Intraoral Radiographs\)/ }).click();
    await expect(page.getByText('Tooth 16 PA Radiograph').first()).toBeVisible();

    await page.getByRole('button', { name: 'Done' }).click();
    await logout(page);
  });

  // 9. Full-Size Viewer
  test('09: Full-size viewer lightbox opens with zoom, rotate, and image controls', async ({ page }) => {
    await loginAs(page, 'dutyDoctor');
    await page.goto(`/doctor/patient/${testPatient.id}?visitId=${testPatient.visitId}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Treatment', exact: true }).click();
    await page.getByRole('button', { name: 'Dental Imaging' }).click();

    // Open full-size viewer by clicking "View Full Size" button
    const viewButton = page.getByTitle('View Full Size').first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    // Verify lightbox dialog is visible with controls
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTitle('Zoom In')).toBeVisible();
    await expect(page.getByTitle('Zoom Out')).toBeVisible();
    await expect(page.getByTitle('Rotate 90°')).toBeVisible();
    await expect(page.getByTitle('Invert Colors (Diagnostic)')).toBeVisible();

    // Test zoom in interaction
    await page.getByTitle('Zoom In').click();
    await expect(page.getByText('125%')).toBeVisible();

    // Close lightbox
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();

    await page.getByRole('button', { name: 'Done' }).click();
    await logout(page);
  });

  // 10. Patient Isolation
  test('10: Patient isolation prevents cross-patient image retrieval or modification', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    
    // Create a secondary patient via API
    const uniquePhone = `99999${Math.floor(10000 + Math.random() * 90000)}`;
    const createPatientRes = await request.post(`${API_BASE}/api/patients`, {
      headers: { Cookie: cookie },
      data: {
        name: 'Other Isolated Patient',
        phone: uniquePhone,
        age: 42,
        gender: 'Female'
      }
    });
    expect(createPatientRes.status()).toBe(201);
    const otherPatient = await createPatientRes.json();
    const otherPatientId = otherPatient.id || otherPatient.data?.id;

    // Get an image belonging to testPatient
    const imagesRes = await request.get(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie }
    });
    const images = await imagesRes.json();
    const list = Array.isArray(images) ? images : (images.data || []);
    const testImageId = list[0].id;

    // Attempting to patch or delete testPatient's image using otherPatient's endpoint is strictly rejected
    const patchRes = await request.patch(`${API_BASE}/api/patients/${otherPatientId}/images/${testImageId}`, {
      headers: { Cookie: cookie },
      data: { title: 'Hijacked Title' }
    });
    expect([400, 404]).toContain(patchRes.status());

    const deleteRes = await request.delete(`${API_BASE}/api/patients/${otherPatientId}/images/${testImageId}`, {
      headers: { Cookie: cookie }
    });
    expect([400, 403, 404]).toContain(deleteRes.status());

    // Other patient image list is isolated and empty
    const otherImagesRes = await request.get(`${API_BASE}/api/patients/${otherPatientId}/images`, {
      headers: { Cookie: cookie }
    });
    const otherImages = await otherImagesRes.json();
    const otherList = Array.isArray(otherImages) ? otherImages : (otherImages.data || []);
    expect(otherList.length).toBe(0);
  });

  // 11. Receptionist Cannot Upload
  test('11: Receptionist role is forbidden from uploading dental images (403)', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'receptionist');
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'OPG',
        fileName: 'unauthorized_opg.png',
        mimeType: 'image/png',
        fileSize: 1000,
        imageUrl: SAMPLE_PNG_BASE64
      }
    });

    expect(res.status()).toBe(403);
  });

  // 12. Receptionist Can View
  test('12: Receptionist role can view patient dental images (200)', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'receptionist');
    const res = await request.get(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = Array.isArray(body) ? body : (body.data || []);
    expect(Array.isArray(list)).toBe(true);
  });

  // 13. Duty Doctor Can Upload
  test('13: Duty Doctor role can upload dental images (201)', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'OPG',
        fileName: 'dutydoctor_opg.png',
        mimeType: 'image/png',
        fileSize: 1100,
        imageUrl: SAMPLE_PNG_BASE64,
        title: 'Duty Doctor Upload'
      }
    });

    expect(res.status()).toBe(201);
  });

  // 14. Head Doctor Can Delete
  test('14: Head Doctor role can delete dental image records (200)', async ({ request }) => {
    const doctorCookie = await getAuthCookie(request, 'dutyDoctor');
    const headDocCookie = await getAuthCookie(request, 'headDoctor');

    // Create an image to delete
    const createRes = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: doctorCookie },
      data: {
        type: 'OPG',
        fileName: 'to_be_deleted.png',
        mimeType: 'image/png',
        fileSize: 500,
        imageUrl: SAMPLE_PNG_BASE64,
        title: 'Delete Target'
      }
    });
    const created = await createRes.json();
    const imageId = created.id || created.data?.id;

    // Delete as Head Doctor
    const delRes = await request.delete(`${API_BASE}/api/patients/${testPatient.id}/images/${imageId}`, {
      headers: { Cookie: headDocCookie }
    });
    expect(delRes.status()).toBe(200);

    // Verify deletion in DB
    const checkRow = await queryOne(`SELECT * FROM "DentalImage" WHERE id = $1`, [imageId]);
    expect(checkRow).toBeNull();
  });

  // 15. Unauthorized Delete Rejected
  test('15: Duty Doctor and Receptionist delete attempts are rejected with 403', async ({ request }) => {
    const doctorCookie = await getAuthCookie(request, 'dutyDoctor');
    const recepCookie = await getAuthCookie(request, 'receptionist');

    // Create an image
    const createRes = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: doctorCookie },
      data: {
        type: 'RVG',
        fileName: 'protected_image.png',
        mimeType: 'image/png',
        fileSize: 600,
        imageUrl: SAMPLE_PNG_BASE64
      }
    });
    const created = await createRes.json();
    const imageId = created.id || created.data?.id;

    // Duty Doctor attempts delete
    const docDel = await request.delete(`${API_BASE}/api/patients/${testPatient.id}/images/${imageId}`, {
      headers: { Cookie: doctorCookie }
    });
    expect(docDel.status()).toBe(403);

    // Receptionist attempts delete
    const recepDel = await request.delete(`${API_BASE}/api/patients/${testPatient.id}/images/${imageId}`, {
      headers: { Cookie: recepCookie }
    });
    expect(recepDel.status()).toBe(403);
  });

  // 16. Invalid MIME Type Rejected
  test('16: Unsupported MIME types (e.g. text/plain, application/pdf) are rejected (400)', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'OPG',
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        fileSize: 5000,
        imageUrl: 'data:application/pdf;base64,JVBERi0xLjQK...'
      }
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/mimeType|Validation failed/i);
  });

  // 17. >10 MB Upload Rejected
  test('17: File size exceeding 10 MB limit is rejected (400)', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'OPG',
        fileName: 'huge_xray.png',
        mimeType: 'image/png',
        fileSize: 11 * 1024 * 1024, // 11 MB
        imageUrl: SAMPLE_PNG_BASE64
      }
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/fileSize|limit|Validation failed/i);
  });

  // 18. OPG with toothNumber Rejected
  test('18: OPG with non-null toothNumber is strictly rejected (400)', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'OPG',
        fileName: 'invalid_opg.png',
        mimeType: 'image/png',
        fileSize: 1200,
        imageUrl: SAMPLE_PNG_BASE64,
        toothNumber: 16 // OPG MUST NOT have toothNumber
      }
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/OPG images cannot be associated with/i);
  });

  // 19. Invalid FDI Tooth Number Rejected
  test('19: RVG with invalid FDI tooth number (e.g. 99 or 55) is rejected (400)', async ({ request }) => {
    const cookie = await getAuthCookie(request, 'dutyDoctor');
    const res = await request.post(`${API_BASE}/api/patients/${testPatient.id}/images`, {
      headers: { Cookie: cookie },
      data: {
        type: 'RVG',
        fileName: 'invalid_fdi_rvg.png',
        mimeType: 'image/png',
        fileSize: 900,
        imageUrl: SAMPLE_PNG_BASE64,
        toothNumber: 99 // Invalid FDI number
      }
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/Invalid FDI tooth number/i);
  });

  // 20. Existing FDI Treatment Functionality Still Passes
  test('20: FDI tooth selection, planned procedures, and camera indicator co-exist cleanly', async ({ page }) => {
    await loginAs(page, 'dutyDoctor');
    await page.goto(`/doctor/patient/${testPatient.id}?visitId=${testPatient.visitId}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Treatment', exact: true }).click();
    await expect(page.getByText('FDI Dental Chart')).toBeVisible();

    // Tooth 16 button has a subtle camera indicator because tooth 16 has an RVG image
    const tooth16Btn = page.getByRole('button', { name: /Tooth 16:/i });
    await expect(tooth16Btn).toBeVisible();
    await tooth16Btn.click();

    // Verify tooth 16 metadata displays
    await expect(page.getByText('Upper Right First Molar').first()).toBeVisible();

    // Check that RVG indicator appears in the selected tooth banner
    await expect(page.getByText('Tooth 16 has RVG radiograph')).toBeVisible();

    // Close treatment modal
    await page.getByRole('button', { name: 'Done' }).click();
    await logout(page);
  });
});
