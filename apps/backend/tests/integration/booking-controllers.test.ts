import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import request from 'supertest';
import { app } from '../../src/index';
import { BookingService } from '../../src/services/booking.service';

// Mock the booking service
const mockBookingService = {
  getBookingById: mock(async (id: string) => ({
    success: true,
    data: {
      id,
      property_id: 'prop-1',
      tenant_id: 'user-1',
      check_in: '2026-06-01',
      check_out: '2026-06-05',
      total_price: 500,
      status: 'confirmed',
    },
  })),
  createBooking: mock(async (data: any) => ({
    success: true,
    data: { id: 'booking-1', ...data, status: 'pending' },
  })),
  updateBooking: mock(async (id: string, data: any) => ({
    success: true,
    data: { id, ...data },
  })),
  deleteBooking: mock(async (id: string) => ({
    success: true,
    data: { id },
  })),
  cancelBooking: mock(async (id: string, userId: string) => ({
    success: true,
    data: { id, status: 'cancelled' },
  })),
  confirmBooking: mock(async (id: string, userId: string) => ({
    success: true,
    data: { id, status: 'confirmed' },
  })),
};

describe('Booking API Endpoints', () => {
  describe('POST /api/bookings', () => {
    it('should create a booking with valid data', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', 'Bearer valid-token')
        .send({
          property_id: 'prop-1',
          tenant_id: 'user-1',
          check_in: '2026-06-01',
          check_out: '2026-06-05',
          total_price: 500,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should reject booking with missing fields', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', 'Bearer valid-token')
        .send({
          property_id: 'prop-1',
          // missing tenant_id, check_in, check_out, total_price
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject booking with invalid dates', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', 'Bearer valid-token')
        .send({
          property_id: 'prop-1',
          tenant_id: 'user-1',
          check_in: '2026-06-05',
          check_out: '2026-06-01', // check_out before check_in
          total_price: 500,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject booking when property not found', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', 'Bearer valid-token')
        .send({
          property_id: 'nonexistent-prop',
          tenant_id: 'user-1',
          check_in: '2026-06-01',
          check_out: '2026-06-05',
          total_price: 500,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('should retrieve a booking by id', async () => {
      const response = await request(app)
        .get('/api/bookings/booking-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'booking-1');
    });

    it('should return 404 when booking not found', async () => {
      const response = await request(app)
        .get('/api/bookings/nonexistent-booking')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/bookings/booking-1');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/bookings/:id', () => {
    it('should update a booking with valid data', async () => {
      const response = await request(app)
        .patch('/api/bookings/booking-1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'confirmed',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'booking-1');
    });

    it('should reject invalid status transition', async () => {
      const response = await request(app)
        .patch('/api/bookings/booking-1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'invalid-status',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/bookings/:id', () => {
    it('should delete a booking successfully', async () => {
      const response = await request(app)
        .delete('/api/bookings/booking-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(204);
    });

    it('should return 404 when booking not found', async () => {
      const response = await request(app)
        .delete('/api/bookings/nonexistent-booking')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
