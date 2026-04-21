import { sendOrderReadyForPickupEmail } from './pickupReadyEmail';

// Mock Firebase
jest.mock('../Firebase/firebaseConfig', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  doc:     jest.fn(),
  getDoc:  jest.fn().mockResolvedValue({
    exists: () => true,
    data:   () => ({ email: 'student@gmail.com' }),
  }),
}));

// Mock fetch globally
global.fetch = jest.fn().mockResolvedValue({
  ok:   true,
  text: jest.fn().mockResolvedValue('OK'),
});

// Set env vars for tests
beforeAll(() => {
  process.env.REACT_APP_EMAILJS_SERVICE_ID        = 'service_test';
  process.env.REACT_APP_EMAILJS_READY_TEMPLATE_ID = 'template_test';
  process.env.REACT_APP_EMAILJS_PUBLIC_KEY        = 'public_test';
});

afterEach(() => {
  jest.clearAllMocks();
});

const mockOrder = {
  id:            'order123',
  status:        'ready',
  customerId:    'user123',
  customerEmail: 'student@gmail.com',
  customerName:  'Test Student',
  total:         100,
  time:          '14/04/2026, 13:45',
  vendorName:    'Burger Shack',
  pickupEmailSent: false,
};

// UAT-E01
test('UAT-E01 - Returns ok:false when EmailJS env vars are missing', async () => {
  const original = process.env.REACT_APP_EMAILJS_SERVICE_ID;
  delete process.env.REACT_APP_EMAILJS_SERVICE_ID;

  const result = await sendOrderReadyForPickupEmail(mockOrder);
  expect(result.ok).toBe(false);

  process.env.REACT_APP_EMAILJS_SERVICE_ID = original;
});

// UAT-E02
test('UAT-E02 - Returns ok:false when order status is not ready', async () => {
  const result = await sendOrderReadyForPickupEmail({ ...mockOrder, status: 'pending' });
  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/not in ready status/i);
});

// UAT-E03
test('UAT-E03 - Returns ok:true when email already sent', async () => {
  const result = await sendOrderReadyForPickupEmail({ ...mockOrder, pickupEmailSent: true });
  expect(result.ok).toBe(true);
});

// UAT-E04
test('UAT-E04 - Returns ok:false when no customer email found', async () => {
  jest.mock('firebase/firestore', () => ({
    doc:     jest.fn(),
    getDoc:  jest.fn().mockResolvedValue({
      exists: () => false,
      data:   () => ({}),
    }),
  }));

  const result = await sendOrderReadyForPickupEmail({
    ...mockOrder,
    customerEmail: null,
    customerId:    null,
    customerName:  'No Email Name',
  });
  expect(result.ok).toBe(false);
});

// UAT-E05
test('UAT-E05 - Calls fetch with correct EmailJS endpoint when order is ready', async () => {
  await sendOrderReadyForPickupEmail(mockOrder);
  expect(global.fetch).toHaveBeenCalledWith(
    'https://api.emailjs.com/api/v1.0/email/send',
    expect.objectContaining({ method: 'POST' })
  );
});