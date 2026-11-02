import { describe, expect, it } from 'vitest';
import { convertMinor, formatMoney, fromMinor, minorDigits, roundHalfAwayFromZero, toMinor } from './money';

describe('money', () => {
  it('knows minor units', () => {
    expect(minorDigits('EUR')).toBe(2);
    expect(minorDigits('CZK')).toBe(2);
    expect(minorDigits('JPY')).toBe(0);
    expect(minorDigits('isk')).toBe(0);
  });

  it('rounds half away from zero, ignoring float noise', () => {
    expect(roundHalfAwayFromZero(0.5)).toBe(1);
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
    expect(roundHalfAwayFromZero(2.5)).toBe(3); // not banker's rounding
    expect(roundHalfAwayFromZero(1.005 * 100)).toBe(101); // 100.49999999999999 in IEEE754
    expect(roundHalfAwayFromZero(1.4999)).toBe(1);
  });

  it('converts to and from minor units', () => {
    expect(toMinor(0.1 + 0.2, 'EUR')).toBe(30);
    expect(toMinor(19.99, 'EUR')).toBe(1999);
    expect(toMinor(1234.5, 'JPY')).toBe(1235);
    expect(fromMinor(1999, 'EUR')).toBe(19.99);
  });

  it('converts between currencies with a single rounding', () => {
    // 100.00 CHF at 1.0646 = 106.46 EUR
    expect(convertMinor(10000, 'CHF', 1.0646, 'EUR')).toBe(10646);
    // 0.01 CZK at 0.0404 = 0.000404 EUR -> 0 cents
    expect(convertMinor(1, 'CZK', 0.0404, 'EUR')).toBe(0);
    // Exactly half a cent rounds up: 12.50 CZK * 0.04 = 0.50 EUR; 0.125 * 0.04 = 0.005 -> 1 cent
    expect(convertMinor(1250, 'CZK', 0.04, 'EUR')).toBe(50);
    expect(convertMinor(12, 'CZK', 0.0425, 'EUR')).toBe(1); // 0.0051 EUR
    // Different minor units: 1000 JPY (no decimals) at 0.0061 EUR = 6.10 EUR
    expect(convertMinor(1000, 'JPY', 0.0061, 'EUR')).toBe(610);
    // ...and the other way: 10.00 EUR at 163.12 JPY = 1631 JPY
    expect(convertMinor(1000, 'EUR', 163.12, 'JPY')).toBe(1631);
  });

  it('formats without negative zero', () => {
    expect(formatMoney(0, 'EUR', 'en')).toBe('€0.00');
    expect(formatMoney(-0, 'EUR', 'en')).toBe('€0.00');
    expect(formatMoney(123456, 'EUR', 'en')).toBe('€1,234.56');
    expect(formatMoney(5000, 'JPY', 'en')).toBe('¥5,000');
  });
});
